-- Keep older open browser sessions compatible while the scheduled-date client rolls out.

BEGIN;

CREATE OR REPLACE FUNCTION public.set_expedition_schedule_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.starts_at := COALESCE(NEW.starts_at, NEW.created_at + INTERVAL '72 hours');
  NEW.expires_at := COALESCE(NEW.expires_at, NEW.starts_at + INTERVAL '12 hours');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_expedition_schedule_defaults ON public.expeditions;
CREATE TRIGGER set_expedition_schedule_defaults
  BEFORE INSERT ON public.expeditions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_expedition_schedule_defaults();

REVOKE ALL ON FUNCTION public.set_expedition_schedule_defaults() FROM PUBLIC, anon, authenticated;

COMMIT;
