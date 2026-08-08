-- Priorytet B: monitoring zależności oraz trwałe szkice i raporty Loot Splitu.

BEGIN;

CREATE TABLE IF NOT EXISTS public.system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'error',
  event_type TEXT NOT NULL,
  message TEXT NOT NULL,
  fingerprint TEXT,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT system_events_source_check CHECK (source IN ('frontend', 'backend', 'supabase', 'discord', 'albion_api', 'market_api')),
  CONSTRAINT system_events_level_check CHECK (level IN ('info', 'warning', 'error')),
  CONSTRAINT system_events_message_length CHECK (char_length(message) BETWEEN 1 AND 1000)
);

CREATE INDEX IF NOT EXISTS system_events_created_idx ON public.system_events (created_at DESC);
CREATE INDEX IF NOT EXISTS system_events_open_idx ON public.system_events (level, created_at DESC) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS system_events_fingerprint_idx ON public.system_events (fingerprint, created_at DESC) WHERE fingerprint IS NOT NULL;

ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can read system events" ON public.system_events;
CREATE POLICY "Staff can read system events" ON public.system_events FOR SELECT TO authenticated
USING (public.is_portal_staff());
GRANT SELECT ON public.system_events TO authenticated;
GRANT INSERT ON public.system_events TO service_role;

CREATE TABLE IF NOT EXISTS public.integration_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  status TEXT NOT NULL,
  latency_ms INTEGER,
  message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT integration_checks_service_check CHECK (service IN ('supabase', 'discord', 'albion_api', 'market_api')),
  CONSTRAINT integration_checks_status_check CHECK (status IN ('operational', 'degraded', 'down', 'not_configured')),
  CONSTRAINT integration_checks_latency_check CHECK (latency_ms IS NULL OR latency_ms >= 0)
);

CREATE INDEX IF NOT EXISTS integration_checks_service_time_idx
ON public.integration_checks (service, checked_at DESC);

ALTER TABLE public.integration_checks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff can read integration checks" ON public.integration_checks;
CREATE POLICY "Staff can read integration checks" ON public.integration_checks FOR SELECT TO authenticated
USING (public.is_portal_staff());
GRANT SELECT ON public.integration_checks TO authenticated;
GRANT SELECT, INSERT ON public.integration_checks TO service_role;

CREATE TABLE IF NOT EXISTS public.loot_split_drafts (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Szkic rozliczenia',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT loot_split_draft_title_length CHECK (char_length(btrim(title)) BETWEEN 1 AND 100)
);

ALTER TABLE public.loot_split_drafts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own loot split draft" ON public.loot_split_drafts;
CREATE POLICY "Users manage own loot split draft" ON public.loot_split_drafts FOR ALL TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loot_split_drafts TO authenticated;

CREATE TABLE IF NOT EXISTS public.loot_split_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  version INTEGER NOT NULL,
  payload JSONB NOT NULL,
  report_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT loot_split_report_title_length CHECK (char_length(btrim(title)) BETWEEN 1 AND 100),
  CONSTRAINT loot_split_report_version_positive CHECK (version > 0),
  CONSTRAINT loot_split_report_text_length CHECK (char_length(report_text) BETWEEN 1 AND 20000),
  UNIQUE (user_id, title, version)
);

CREATE INDEX IF NOT EXISTS loot_split_reports_user_time_idx
ON public.loot_split_reports (user_id, created_at DESC);

ALTER TABLE public.loot_split_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users read own loot split reports" ON public.loot_split_reports;
CREATE POLICY "Users read own loot split reports" ON public.loot_split_reports FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users create own loot split reports" ON public.loot_split_reports;
CREATE POLICY "Users create own loot split reports" ON public.loot_split_reports FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);
DROP POLICY IF EXISTS "Users delete own loot split reports" ON public.loot_split_reports;
CREATE POLICY "Users delete own loot split reports" ON public.loot_split_reports FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);
GRANT SELECT, INSERT, DELETE ON public.loot_split_reports TO authenticated;

CREATE OR REPLACE FUNCTION public.save_loot_split_report(
  p_title TEXT,
  p_payload JSONB,
  p_report_text TEXT
)
RETURNS public.loot_split_reports
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  clean_title TEXT := btrim(p_title);
  current_user_id UUID := auth.uid();
  next_version INTEGER;
  saved_report public.loot_split_reports;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Brak autoryzacji.' USING ERRCODE = '42501';
  END IF;
  IF clean_title IS NULL OR char_length(clean_title) NOT BETWEEN 1 AND 100 THEN
    RAISE EXCEPTION 'Nazwa raportu musi mieć od 1 do 100 znaków.' USING ERRCODE = '22023';
  END IF;
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RAISE EXCEPTION 'Nieprawidłowe dane raportu.' USING ERRCODE = '22023';
  END IF;
  IF p_report_text IS NULL OR char_length(p_report_text) NOT BETWEEN 1 AND 20000 THEN
    RAISE EXCEPTION 'Nieprawidłowa treść raportu.' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(current_user_id::text || ':' || lower(clean_title)));
  SELECT COALESCE(max(version), 0) + 1 INTO next_version
  FROM public.loot_split_reports
  WHERE user_id = current_user_id AND lower(title) = lower(clean_title);

  INSERT INTO public.loot_split_reports (user_id, title, version, payload, report_text)
  VALUES (current_user_id, clean_title, next_version, p_payload, p_report_text)
  RETURNING * INTO saved_report;

  RETURN saved_report;
END;
$$;

REVOKE ALL ON FUNCTION public.save_loot_split_report(TEXT, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_loot_split_report(TEXT, JSONB, TEXT) TO authenticated;

COMMIT;
