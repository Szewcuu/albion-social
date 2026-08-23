-- Review 04: real expedition dates, deterministic expiry and calendar queries.

BEGIN;

ALTER TABLE public.expeditions
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

UPDATE public.expeditions
SET starts_at = COALESCE(starts_at, created_at + INTERVAL '72 hours'),
    expires_at = COALESCE(expires_at, created_at + INTERVAL '84 hours')
WHERE starts_at IS NULL OR expires_at IS NULL;

ALTER TABLE public.expeditions
  ALTER COLUMN starts_at SET NOT NULL,
  ALTER COLUMN expires_at SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.expeditions'::regclass
      AND conname = 'expeditions_expiry_after_start_check'
  ) THEN
    ALTER TABLE public.expeditions
      ADD CONSTRAINT expeditions_expiry_after_start_check
      CHECK (expires_at > starts_at);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS expeditions_active_schedule_idx
  ON public.expeditions (starts_at, expires_at)
  WHERE status = 'visible';

COMMIT;
