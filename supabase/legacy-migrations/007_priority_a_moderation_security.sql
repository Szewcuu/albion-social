-- Priorytet A: role personelu, jednolita moderacja, audyt RLS i trwały rate limiting.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'member';

UPDATE public.profiles
SET role = 'admin'
WHERE is_admin = true AND role <> 'admin';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_role_check'
      AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check CHECK (role IN ('member', 'moderator', 'admin'));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT CASE
        WHEN profiles.is_admin = true THEN 'admin'
        WHEN profiles.role IN ('member', 'moderator', 'admin') THEN profiles.role
        ELSE 'member'
      END
      FROM public.profiles
      WHERE profiles.id = auth.uid()
    ),
    'member'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_portal_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.portal_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_portal_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.portal_role() IN ('moderator', 'admin');
$$;

REVOKE ALL ON FUNCTION public.portal_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_portal_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_portal_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_portal_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_portal_staff() TO authenticated;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'visible',
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.builds
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'visible',
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.market_items
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'visible',
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.guilds
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'visible',
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.expeditions
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'visible',
ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- The market UI has used these names since its rebuild, while the original
-- database kept the legacy description/contact columns.
ALTER TABLE public.market_items
ADD COLUMN IF NOT EXISTS item_name TEXT,
ADD COLUMN IF NOT EXISTS contact_info TEXT;

UPDATE public.market_items
SET
  item_name = COALESCE(NULLIF(item_name, ''), NULLIF(description, ''), title),
  contact_info = COALESCE(NULLIF(contact_info, ''), contact)
WHERE item_name IS NULL OR contact_info IS NULL;
ALTER TABLE public.build_comments
  ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS moderated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

DO $$
DECLARE
  table_name TEXT;
  constraint_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['chat_messages', 'builds', 'market_items', 'guilds', 'expeditions']
  LOOP
    constraint_name := table_name || '_moderation_status_check';
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = constraint_name
        AND conrelid = ('public.' || table_name)::regclass
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (status IN (''visible'', ''hidden'', ''removed''))',
        table_name,
        constraint_name
      );
    END IF;
  END LOOP;
END;
$$;

CREATE INDEX IF NOT EXISTS chat_messages_moderation_idx ON public.chat_messages (status, created_at DESC);
CREATE INDEX IF NOT EXISTS builds_moderation_idx ON public.builds (status, created_at DESC);
CREATE INDEX IF NOT EXISTS market_items_moderation_idx ON public.market_items (status, created_at DESC);
CREATE INDEX IF NOT EXISTS guilds_moderation_idx ON public.guilds (status, created_at DESC);
CREATE INDEX IF NOT EXISTS expeditions_moderation_idx ON public.expeditions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS build_comments_moderation_all_idx ON public.build_comments (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.moderation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  before_state JSONB,
  after_state JSONB,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT moderation_audit_action_check CHECK (action IN ('hide', 'restore', 'remove', 'role_change', 'review_report', 'dismiss_report')),
  CONSTRAINT moderation_audit_reason_length CHECK (char_length(btrim(reason)) BETWEEN 3 AND 500)
);

CREATE INDEX IF NOT EXISTS moderation_audit_created_idx
ON public.moderation_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS moderation_audit_entity_idx
ON public.moderation_audit_log (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS moderation_audit_actor_idx
ON public.moderation_audit_log (actor_id, created_at DESC);

ALTER TABLE public.moderation_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read moderation audit" ON public.moderation_audit_log;
CREATE POLICY "Staff can read moderation audit"
ON public.moderation_audit_log FOR SELECT TO authenticated
USING (public.is_portal_staff());

GRANT SELECT ON public.moderation_audit_log TO authenticated;

CREATE OR REPLACE FUNCTION public.moderate_content_batch(
  p_entity_type TEXT,
  p_entity_ids UUID[],
  p_action TEXT,
  p_reason TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_table TEXT;
  target_status TEXT;
  target_id UUID;
  before_row JSONB;
  after_row JSONB;
  affected_count INTEGER := 0;
  actor_role TEXT;
BEGIN
  actor_role := public.portal_role();
  IF actor_role NOT IN ('moderator', 'admin') THEN
    RAISE EXCEPTION 'Brak uprawnień personelu.' USING ERRCODE = '42501';
  END IF;

  IF p_action NOT IN ('hide', 'restore', 'remove') THEN
    RAISE EXCEPTION 'Nieprawidłowa akcja moderacyjna.' USING ERRCODE = '22023';
  END IF;
  IF p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Powód musi mieć od 3 do 500 znaków.' USING ERRCODE = '22023';
  END IF;
  IF array_length(p_entity_ids, 1) IS NULL OR array_length(p_entity_ids, 1) > 50 THEN
    RAISE EXCEPTION 'Jedna operacja może obejmować od 1 do 50 rekordów.' USING ERRCODE = '22023';
  END IF;

  target_table := CASE p_entity_type
    WHEN 'chat_message' THEN 'chat_messages'
    WHEN 'build' THEN 'builds'
    WHEN 'market_item' THEN 'market_items'
    WHEN 'guild' THEN 'guilds'
    WHEN 'expedition' THEN 'expeditions'
    WHEN 'build_comment' THEN 'build_comments'
    ELSE NULL
  END;
  IF target_table IS NULL THEN
    RAISE EXCEPTION 'Nieobsługiwany typ treści.' USING ERRCODE = '22023';
  END IF;

  target_status := CASE p_action
    WHEN 'restore' THEN 'visible'
    WHEN 'hide' THEN 'hidden'
    WHEN 'remove' THEN 'removed'
  END;

  FOR target_id IN SELECT DISTINCT unnest(p_entity_ids)
  LOOP
    EXECUTE format('SELECT to_jsonb(row_data) FROM public.%I row_data WHERE id = $1', target_table)
      INTO before_row USING target_id;
    IF before_row IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE format(
      'UPDATE public.%I SET status = $1, moderated_at = timezone(''utc'', now()), moderated_by = auth.uid() WHERE id = $2',
      target_table
    ) USING target_status, target_id;

    EXECUTE format('SELECT to_jsonb(row_data) FROM public.%I row_data WHERE id = $1', target_table)
      INTO after_row USING target_id;

    INSERT INTO public.moderation_audit_log (
      actor_id,
      actor_role,
      action,
      entity_type,
      entity_id,
      before_state,
      after_state,
      reason
    ) VALUES (
      auth.uid(),
      actor_role,
      p_action,
      p_entity_type,
      target_id,
      before_row - 'webhook_url' - 'contact_info',
      after_row - 'webhook_url' - 'contact_info',
      btrim(p_reason)
    );

    affected_count := affected_count + 1;
  END LOOP;

  RETURN affected_count;
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_content_batch(TEXT, UUID[], TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.moderate_content_batch(TEXT, UUID[], TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_build_report(
  p_report_id UUID,
  p_action TEXT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  report_row public.build_reports%ROWTYPE;
  next_status TEXT;
  audit_action TEXT;
BEGIN
  IF NOT public.is_portal_staff() THEN
    RAISE EXCEPTION 'Brak uprawnień personelu.' USING ERRCODE = '42501';
  END IF;
  IF p_action NOT IN ('review', 'dismiss', 'hide_comment') THEN
    RAISE EXCEPTION 'Nieprawidłowa akcja zgłoszenia.' USING ERRCODE = '22023';
  END IF;
  IF p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Powód musi mieć od 3 do 500 znaków.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO report_row FROM public.build_reports WHERE id = p_report_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nie znaleziono zgłoszenia.' USING ERRCODE = 'P0002';
  END IF;
  IF report_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Zgłoszenie zostało już rozpatrzone.' USING ERRCODE = '22023';
  END IF;
  IF p_action = 'hide_comment' AND report_row.comment_id IS NULL THEN
    RAISE EXCEPTION 'Zgłoszenie nie dotyczy komentarza.' USING ERRCODE = '22023';
  END IF;

  IF p_action = 'hide_comment' THEN
    PERFORM public.moderate_content_batch(
      'build_comment', ARRAY[report_row.comment_id], 'hide', btrim(p_reason)
    );
    next_status := 'actioned';
    audit_action := 'review_report';
  ELSIF p_action = 'dismiss' THEN
    next_status := 'dismissed';
    audit_action := 'dismiss_report';
  ELSE
    next_status := 'reviewed';
    audit_action := 'review_report';
  END IF;

  UPDATE public.build_reports
  SET status = next_status,
      reviewed_at = timezone('utc', now()),
      reviewed_by = auth.uid()
  WHERE id = report_row.id;

  INSERT INTO public.moderation_audit_log (
    actor_id, actor_role, action, entity_type, entity_id,
    before_state, after_state, reason
  ) VALUES (
    auth.uid(), public.portal_role(), audit_action, 'build_report', report_row.id,
    jsonb_build_object('status', report_row.status),
    jsonb_build_object('status', next_status),
    btrim(p_reason)
  );

  RETURN jsonb_build_object(
    'id', report_row.id,
    'status', next_status,
    'commentStatus', CASE WHEN p_action = 'hide_comment' THEN 'hidden' ELSE NULL END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.review_build_report(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_build_report(UUID, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_build_reports_batch(
  p_report_ids UUID[],
  p_action TEXT,
  p_reason TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  report_id UUID;
  affected_count INTEGER := 0;
BEGIN
  IF NOT public.is_portal_staff() THEN
    RAISE EXCEPTION 'Brak uprawnień personelu.' USING ERRCODE = '42501';
  END IF;
  IF p_action NOT IN ('review', 'dismiss') THEN
    RAISE EXCEPTION 'Nieprawidłowa akcja zbiorcza.' USING ERRCODE = '22023';
  END IF;
  IF p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Powód musi mieć od 3 do 500 znaków.' USING ERRCODE = '22023';
  END IF;
  IF array_length(p_report_ids, 1) IS NULL OR array_length(p_report_ids, 1) > 50 THEN
    RAISE EXCEPTION 'Wybierz od 1 do 50 zgłoszeń.' USING ERRCODE = '22023';
  END IF;

  FOREACH report_id IN ARRAY p_report_ids
  LOOP
    PERFORM public.review_build_report(report_id, p_action, p_reason);
    affected_count := affected_count + 1;
  END LOOP;

  RETURN affected_count;
END;
$$;

REVOKE ALL ON FUNCTION public.review_build_reports_batch(UUID[], TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.review_build_reports_batch(UUID[], TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_portal_role(
  p_user_id UUID,
  p_role TEXT,
  p_reason TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  before_row JSONB;
  after_row JSONB;
BEGIN
  IF NOT public.is_portal_admin() THEN
    RAISE EXCEPTION 'Tylko administrator może zmieniać role.' USING ERRCODE = '42501';
  END IF;
  IF p_role NOT IN ('member', 'moderator', 'admin') THEN
    RAISE EXCEPTION 'Nieprawidłowa rola.' USING ERRCODE = '22023';
  END IF;
  IF p_reason IS NULL OR char_length(btrim(p_reason)) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Powód musi mieć od 3 do 500 znaków.' USING ERRCODE = '22023';
  END IF;

  SELECT jsonb_build_object('role', role, 'is_admin', is_admin)
  INTO before_row
  FROM public.profiles
  WHERE id = p_user_id;
  IF before_row IS NULL THEN
    RAISE EXCEPTION 'Nie znaleziono profilu.' USING ERRCODE = 'P0002';
  END IF;

  IF p_user_id = auth.uid() AND p_role <> 'admin' AND (
    SELECT count(*) FROM public.profiles WHERE role = 'admin' OR is_admin = true
  ) <= 1 THEN
    RAISE EXCEPTION 'Nie można zdegradować ostatniego administratora.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
  SET role = p_role, is_admin = (p_role = 'admin')
  WHERE id = p_user_id;

  SELECT jsonb_build_object('role', role, 'is_admin', is_admin)
  INTO after_row
  FROM public.profiles
  WHERE id = p_user_id;

  INSERT INTO public.moderation_audit_log (
    actor_id, actor_role, action, entity_type, entity_id,
    before_state, after_state, reason
  ) VALUES (
    auth.uid(), 'admin', 'role_change', 'profile_role', p_user_id,
    before_row, after_row, btrim(p_reason)
  );

  RETURN p_role;
END;
$$;

REVOKE ALL ON FUNCTION public.set_portal_role(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_portal_role(UUID, TEXT, TEXT) TO authenticated;

CREATE TABLE IF NOT EXISTS public.rate_limit_buckets (
  key_hash TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (key_hash, window_start),
  CONSTRAINT rate_limit_count_positive CHECK (request_count > 0)
);

CREATE INDEX IF NOT EXISTS rate_limit_window_idx
ON public.rate_limit_buckets (window_start);

ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limit_buckets FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_key TEXT,
  p_limit INTEGER,
  p_window_seconds INTEGER
)
RETURNS TABLE (allowed BOOLEAN, retry_after INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

  hashed_key := encode(digest(p_key, 'sha256'), 'hex');
  bucket_start := to_timestamp(
    floor(extract(epoch FROM clock_timestamp()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO public.rate_limit_buckets (key_hash, window_start, request_count)
  VALUES (hashed_key, bucket_start, 1)
  ON CONFLICT (key_hash, window_start)
  DO UPDATE SET request_count = public.rate_limit_buckets.request_count + 1
  RETURNING request_count INTO current_count;

  seconds_remaining := greatest(
    1,
    ceil(extract(epoch FROM (bucket_start + make_interval(secs => p_window_seconds) - clock_timestamp())))::INTEGER
  );

  IF random() < 0.02 THEN
    DELETE FROM public.rate_limit_buckets
    WHERE window_start < timezone('utc', now()) - interval '2 days';
  END IF;

  RETURN QUERY SELECT current_count <= p_limit, CASE WHEN current_count <= p_limit THEN 0 ELSE seconds_remaining END;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- Enforce durable write limits even for features that write directly through
-- the Supabase client. Server routes use the same bucket store, while these
-- triggers close the gap for chat and user-created listings.
CREATE OR REPLACE FUNCTION public.enforce_content_write_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID := auth.uid();
  limit_value INTEGER;
  window_value INTEGER;
  decision RECORD;
BEGIN
  -- Trusted backend jobs do not carry an authenticated user JWT.
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

REVOKE ALL ON FUNCTION public.enforce_content_write_rate_limit() FROM PUBLIC;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'chat_messages', 'build_comments', 'builds',
    'market_items', 'guilds', 'expeditions'
  ]
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS enforce_content_write_rate_limit ON public.%I',
      table_name
    );
    EXECUTE format(
      'CREATE TRIGGER enforce_content_write_rate_limit BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_content_write_rate_limit()',
      table_name
    );
  END LOOP;
END;
$$;

-- RLS: wszystkie publiczne treści czytamy tylko jako visible; właściciel i personel widzą własne/ukryte.
DO $$
DECLARE
  table_name TEXT;
  policy_record RECORD;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'chat_messages', 'builds', 'market_items', 'guilds', 'expeditions',
    'build_comments', 'build_reports'
  ]
  LOOP
    FOR policy_record IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = table_name
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_record.policyname, table_name);
    END LOOP;
  END LOOP;
END;
$$;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.builds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guilds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expeditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read visible chat or own and staff" ON public.chat_messages FOR SELECT
USING (status = 'visible' OR auth.uid() = user_id OR public.is_portal_staff());
CREATE POLICY "Publish own visible chat" ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'visible' AND channel = 'GLOBALNY' AND char_length(btrim(text)) BETWEEN 1 AND 500);
CREATE POLICY "Delete own chat" ON public.chat_messages FOR DELETE TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Staff moderate chat" ON public.chat_messages FOR UPDATE TO authenticated
USING (public.is_portal_staff()) WITH CHECK (public.is_portal_staff());

CREATE POLICY "Read visible builds or own and staff" ON public.builds FOR SELECT
USING (status = 'visible' OR auth.uid() = user_id OR public.is_portal_staff());
CREATE POLICY "Publish own visible builds" ON public.builds FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'visible');
CREATE POLICY "Delete own builds" ON public.builds FOR DELETE TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Staff moderate builds" ON public.builds FOR UPDATE TO authenticated
USING (public.is_portal_staff()) WITH CHECK (public.is_portal_staff());

CREATE POLICY "Read visible market or own and staff" ON public.market_items FOR SELECT
USING (status = 'visible' OR auth.uid() = user_id OR public.is_portal_staff());
CREATE POLICY "Publish own visible market" ON public.market_items FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'visible');
CREATE POLICY "Delete own market" ON public.market_items FOR DELETE TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Staff moderate market" ON public.market_items FOR UPDATE TO authenticated
USING (public.is_portal_staff()) WITH CHECK (public.is_portal_staff());

CREATE POLICY "Read visible guilds or own and staff" ON public.guilds FOR SELECT
USING (status = 'visible' OR auth.uid() = user_id OR public.is_portal_staff());
CREATE POLICY "Publish own visible guilds" ON public.guilds FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'visible');
CREATE POLICY "Delete own guilds" ON public.guilds FOR DELETE TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Staff moderate guilds" ON public.guilds FOR UPDATE TO authenticated
USING (public.is_portal_staff()) WITH CHECK (public.is_portal_staff());

CREATE POLICY "Read visible expeditions or own and staff" ON public.expeditions FOR SELECT
USING (status = 'visible' OR auth.uid() = user_id OR public.is_portal_staff());
CREATE POLICY "Publish own visible expeditions" ON public.expeditions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'visible');
CREATE POLICY "Delete own expeditions" ON public.expeditions FOR DELETE TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Staff moderate expeditions" ON public.expeditions FOR UPDATE TO authenticated
USING (public.is_portal_staff()) WITH CHECK (public.is_portal_staff());

CREATE POLICY "Read visible comments or own and staff" ON public.build_comments FOR SELECT
USING (status = 'visible' OR auth.uid() = user_id OR public.is_portal_staff());
CREATE POLICY "Publish own visible comments" ON public.build_comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'visible');
CREATE POLICY "Delete own comments" ON public.build_comments FOR DELETE TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Staff moderate comments" ON public.build_comments FOR UPDATE TO authenticated
USING (public.is_portal_staff()) WITH CHECK (public.is_portal_staff());

CREATE POLICY "Read own reports or staff" ON public.build_reports FOR SELECT TO authenticated
USING (auth.uid() = reporter_id OR public.is_portal_staff());
CREATE POLICY "Publish own pending reports" ON public.build_reports FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = reporter_id
  AND status = 'pending'
  AND reviewed_at IS NULL
  AND reviewed_by IS NULL
);
CREATE POLICY "Staff review reports" ON public.build_reports FOR UPDATE TO authenticated
USING (public.is_portal_staff()) WITH CHECK (public.is_portal_staff());

GRANT SELECT ON public.chat_messages, public.builds, public.market_items, public.guilds, public.expeditions, public.build_comments TO anon, authenticated;
GRANT INSERT, DELETE ON public.chat_messages, public.builds, public.market_items, public.guilds, public.expeditions, public.build_comments TO authenticated;
GRANT UPDATE (status, moderated_at, moderated_by) ON public.chat_messages, public.builds, public.market_items, public.guilds, public.expeditions, public.build_comments TO authenticated;
GRANT SELECT, INSERT ON public.build_reports TO authenticated;
GRANT UPDATE (status, reviewed_at, reviewed_by) ON public.build_reports TO authenticated;

COMMIT;
