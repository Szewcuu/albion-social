-- P5.2: synchronizacja bezpiecznych preferencji użytkownika między urządzeniami.

BEGIN;

CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  favorites JSONB NOT NULL DEFAULT '[]'::JSONB,
  favorites_updated_at TIMESTAMPTZ,
  follows JSONB NOT NULL DEFAULT '[]'::JSONB,
  follows_updated_at TIMESTAMPTZ,
  timers JSONB NOT NULL DEFAULT '[]'::JSONB,
  timers_updated_at TIMESTAMPTZ,
  reminders JSONB NOT NULL DEFAULT '{}'::JSONB,
  reminders_updated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT user_preferences_favorites_array CHECK (jsonb_typeof(favorites) = 'array'),
  CONSTRAINT user_preferences_follows_array CHECK (jsonb_typeof(follows) = 'array'),
  CONSTRAINT user_preferences_timers_array CHECK (jsonb_typeof(timers) = 'array'),
  CONSTRAINT user_preferences_reminders_object CHECK (jsonb_typeof(reminders) = 'object'),
  CONSTRAINT user_preferences_payload_size CHECK (
    pg_column_size(favorites) <= 65536
    AND pg_column_size(follows) <= 65536
    AND pg_column_size(timers) <= 65536
    AND pg_column_size(reminders) <= 65536
  )
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own preferences" ON public.user_preferences;
CREATE POLICY "Users read own preferences"
ON public.user_preferences FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users insert own preferences" ON public.user_preferences;
CREATE POLICY "Users insert own preferences"
ON public.user_preferences FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users update own preferences" ON public.user_preferences;
CREATE POLICY "Users update own preferences"
ON public.user_preferences FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users delete own preferences" ON public.user_preferences;
CREATE POLICY "Users delete own preferences"
ON public.user_preferences FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON public.user_preferences FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_preferences TO authenticated;
GRANT ALL ON public.user_preferences TO service_role;

COMMIT;
