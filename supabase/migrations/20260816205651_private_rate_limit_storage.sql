BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

ALTER TABLE public.rate_limit_buckets SET SCHEMA private;
REVOKE ALL ON TABLE private.rate_limit_buckets FROM PUBLIC, anon, authenticated, service_role;

ALTER TABLE private.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.rate_limit_buckets FORCE ROW LEVEL SECURITY;

CREATE POLICY rate_limit_buckets_no_client_access
ON private.rate_limit_buckets
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS TABLE (allowed BOOLEAN, retry_after INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  bucket_start TIMESTAMPTZ;
  current_count INTEGER;
  seconds_remaining INTEGER;
  hashed_key TEXT;
BEGIN
  IF p_key IS NULL OR char_length(p_key) NOT BETWEEN 3 AND 300
    OR p_limit NOT BETWEEN 1 AND 10000
    OR p_window_seconds NOT BETWEEN 1 AND 86400 THEN
    RAISE EXCEPTION 'Nieprawidłowe parametry limitu.' USING ERRCODE = '22023';
  END IF;

  hashed_key := encode(extensions.digest(p_key, 'sha256'), 'hex');
  bucket_start := to_timestamp(
    floor(extract(epoch FROM clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO private.rate_limit_buckets (key_hash, window_start, request_count)
  VALUES (hashed_key, bucket_start, 1)
  ON CONFLICT (key_hash, window_start)
  DO UPDATE SET request_count = private.rate_limit_buckets.request_count + 1
  RETURNING request_count INTO current_count;

  seconds_remaining := greatest(
    1,
    ceil(extract(epoch FROM (bucket_start + make_interval(secs => p_window_seconds) - clock_timestamp())))::INTEGER
  );

  IF random() < 0.02 THEN
    DELETE FROM private.rate_limit_buckets
    WHERE window_start < timezone('utc', now()) - interval '2 days';
  END IF;

  RETURN QUERY
  SELECT
    current_count <= p_limit,
    CASE WHEN current_count <= p_limit THEN 0 ELSE seconds_remaining END;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER)
  TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_content_write_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := auth.uid();
  limit_value INTEGER;
  window_value INTEGER;
  decision RECORD;
BEGIN
  IF actor_id IS NULL THEN
    RETURN NEW;
  END IF;

  CASE TG_TABLE_NAME
    WHEN 'chat_messages' THEN limit_value := 12; window_value := 60;
    WHEN 'build_comments' THEN limit_value := 10; window_value := 60;
    WHEN 'builds' THEN limit_value := 10; window_value := 3600;
    WHEN 'market_items' THEN limit_value := 20; window_value := 3600;
    WHEN 'guilds' THEN limit_value := 5; window_value := 86400;
    WHEN 'expeditions' THEN limit_value := 10; window_value := 3600;
    ELSE RETURN NEW;
  END CASE;

  SELECT * INTO decision
  FROM public.consume_rate_limit(
    format('content-write:%s:%s', TG_TABLE_NAME, actor_id),
    limit_value,
    window_value
  );

  IF NOT decision.allowed THEN
    RAISE EXCEPTION USING
      ERRCODE = 'P0001',
      MESSAGE = format(
        'RATE_LIMITED: Spróbuj ponownie za %s s.',
        GREATEST(COALESCE(decision.retry_after, 1), 1)
      );
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_content_write_rate_limit()
  FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
