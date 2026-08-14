-- P5.2: kompletne usuwanie konta z zachowaniem zanonimizowanego audytu.

BEGIN;

ALTER TABLE public.moderation_audit_log
  ALTER COLUMN actor_id DROP NOT NULL;

ALTER TABLE public.moderation_audit_log
  DROP CONSTRAINT IF EXISTS moderation_audit_log_actor_id_fkey;

ALTER TABLE public.moderation_audit_log
  ADD CONSTRAINT moderation_audit_log_actor_id_fkey
  FOREIGN KEY (actor_id)
  REFERENCES public.profiles(id)
  ON DELETE SET NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

COMMIT;
