-- F1.4: bounded operational history and a low-cost signal for deciding
-- whether a first-party combat archive is justified by real usage.

BEGIN;

ALTER TABLE public.system_events
  ADD COLUMN IF NOT EXISTS occurrence_count BIGINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

UPDATE public.system_events
SET last_seen_at = created_at
WHERE last_seen_at IS NULL;

ALTER TABLE public.system_events
  ALTER COLUMN last_seen_at SET DEFAULT timezone('utc', now()),
  ALTER COLUMN last_seen_at SET NOT NULL;

WITH ranked AS (
  SELECT id, fingerprint,
    row_number() OVER (PARTITION BY fingerprint ORDER BY created_at DESC, id DESC) AS row_number,
    count(*) OVER (PARTITION BY fingerprint) AS occurrences,
    max(created_at) OVER (PARTITION BY fingerprint) AS last_seen
  FROM public.system_events
  WHERE fingerprint IS NOT NULL
)
UPDATE public.system_events AS event
SET occurrence_count = ranked.occurrences,
    last_seen_at = ranked.last_seen
FROM ranked
WHERE event.id = ranked.id AND ranked.row_number = 1;

WITH ranked AS (
  SELECT id,
    row_number() OVER (PARTITION BY fingerprint ORDER BY created_at DESC, id DESC) AS row_number
  FROM public.system_events
  WHERE fingerprint IS NOT NULL
)
DELETE FROM public.system_events AS event
USING ranked
WHERE event.id = ranked.id AND ranked.row_number > 1;

DROP INDEX IF EXISTS public.system_events_fingerprint_idx;
CREATE UNIQUE INDEX IF NOT EXISTS system_events_fingerprint_unique_idx
  ON public.system_events (fingerprint)
  WHERE fingerprint IS NOT NULL;

ALTER TABLE public.system_events
  DROP CONSTRAINT IF EXISTS system_events_occurrence_count_check;
ALTER TABLE public.system_events
  ADD CONSTRAINT system_events_occurrence_count_check CHECK (occurrence_count > 0);

CREATE OR REPLACE FUNCTION public.service_record_system_event(
  p_source TEXT,
  p_level TEXT,
  p_event_type TEXT,
  p_message TEXT,
  p_fingerprint TEXT,
  p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.system_events (
    source, level, event_type, message, fingerprint, context, occurrence_count, last_seen_at
  )
  VALUES (
    p_source, p_level, p_event_type, p_message, p_fingerprint,
    COALESCE(p_context, '{}'::jsonb), 1, timezone('utc', now())
  )
  ON CONFLICT (fingerprint) WHERE fingerprint IS NOT NULL DO UPDATE
  SET level = EXCLUDED.level,
      message = EXCLUDED.message,
      context = EXCLUDED.context,
      occurrence_count = public.system_events.occurrence_count + 1,
      last_seen_at = timezone('utc', now());
END;
$$;

REVOKE ALL ON FUNCTION public.service_record_system_event(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_record_system_event(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB)
  TO service_role;

REVOKE INSERT ON TABLE public.system_events FROM service_role;

CREATE TABLE public.feature_usage_daily (
  usage_day DATE NOT NULL DEFAULT (timezone('utc', now()))::date,
  feature TEXT NOT NULL,
  region TEXT NOT NULL,
  request_count BIGINT NOT NULL DEFAULT 0,
  success_count BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  PRIMARY KEY (usage_day, feature, region),
  CONSTRAINT feature_usage_daily_feature_check
    CHECK (feature IN ('killboard_search')),
  CONSTRAINT feature_usage_daily_region_check
    CHECK (region IN ('europe', 'america', 'asia')),
  CONSTRAINT feature_usage_daily_counts_check
    CHECK (request_count >= 0 AND success_count >= 0 AND success_count <= request_count)
);

COMMENT ON TABLE public.feature_usage_daily IS
  'Privacy-safe daily counters used to decide whether costly first-party data archives are justified.';

ALTER TABLE public.feature_usage_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.feature_usage_daily FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.feature_usage_daily TO service_role;

CREATE OR REPLACE FUNCTION public.service_record_feature_usage(
  p_feature TEXT,
  p_region TEXT,
  p_success BOOLEAN DEFAULT true
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_feature <> 'killboard_search'
     OR p_region NOT IN ('europe', 'america', 'asia') THEN
    RAISE EXCEPTION 'Unsupported feature usage dimension';
  END IF;

  INSERT INTO public.feature_usage_daily (
    usage_day,
    feature,
    region,
    request_count,
    success_count,
    updated_at
  )
  VALUES (
    (timezone('utc', now()))::date,
    p_feature,
    p_region,
    1,
    CASE WHEN p_success THEN 1 ELSE 0 END,
    timezone('utc', now())
  )
  ON CONFLICT (usage_day, feature, region) DO UPDATE
  SET request_count = public.feature_usage_daily.request_count + 1,
      success_count = public.feature_usage_daily.success_count + CASE WHEN p_success THEN 1 ELSE 0 END,
      updated_at = timezone('utc', now());
END;
$$;

REVOKE ALL ON FUNCTION public.service_record_feature_usage(TEXT, TEXT, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_record_feature_usage(TEXT, TEXT, BOOLEAN)
  TO service_role;

CREATE OR REPLACE FUNCTION public.service_run_operational_retention()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  deleted_checks BIGINT;
  deleted_events BIGINT;
  deleted_usage BIGINT;
  deleted_cron_runs BIGINT;
BEGIN
  DELETE FROM public.integration_checks
  WHERE checked_at < timezone('utc', now()) - interval '90 days';
  GET DIAGNOSTICS deleted_checks = ROW_COUNT;

  DELETE FROM public.system_events
  WHERE last_seen_at < timezone('utc', now()) - interval '30 days';
  GET DIAGNOSTICS deleted_events = ROW_COUNT;

  DELETE FROM public.feature_usage_daily
  WHERE usage_day < (timezone('utc', now()))::date - 400;
  GET DIAGNOSTICS deleted_usage = ROW_COUNT;

  DELETE FROM cron.job_run_details
  WHERE start_time < timezone('utc', now()) - interval '30 days';
  GET DIAGNOSTICS deleted_cron_runs = ROW_COUNT;

  RETURN jsonb_build_object(
    'integrationChecks', deleted_checks,
    'systemEvents', deleted_events,
    'featureUsageDays', deleted_usage,
    'cronRuns', deleted_cron_runs
  );
END;
$$;

REVOKE ALL ON FUNCTION public.service_run_operational_retention()
  FROM PUBLIC, anon, authenticated, service_role;

DO $$
DECLARE
  existing_job_id BIGINT;
BEGIN
  SELECT jobid INTO existing_job_id
  FROM cron.job
  WHERE jobname = 'operational-retention';

  IF existing_job_id IS NOT NULL THEN
    PERFORM cron.unschedule(existing_job_id);
  END IF;

  PERFORM cron.schedule(
    'operational-retention',
    '35 3 * * *',
    'SELECT public.service_run_operational_retention();'
  );
END;
$$;

COMMIT;
