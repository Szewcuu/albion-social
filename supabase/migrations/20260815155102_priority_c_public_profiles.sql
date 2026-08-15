-- Priority C: publiczne profile graczy i świadome udostępnianie ulubionych buildów.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS favorite_builds_public BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.profiles'::regclass
      AND conname = 'profiles_bio_length_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_bio_length_check
      CHECK (char_length(bio) <= 500);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS build_favorites_user_created_idx
  ON public.build_favorites (user_id, created_at DESC);

DROP POLICY IF EXISTS "Users can read own build favorites" ON public.build_favorites;
DROP POLICY IF EXISTS "Users can read shared build favorites" ON public.build_favorites;

CREATE POLICY "Users can read shared build favorites"
  ON public.build_favorites
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = build_favorites.user_id
        AND profiles.favorite_builds_public = TRUE
    )
  );

-- Minimalne uprawnienia tabel; RLS nadal rozstrzyga dostęp do konkretnych rekordów.
REVOKE ALL ON TABLE public.profiles FROM anon, authenticated;
GRANT SELECT ON TABLE public.profiles TO anon, authenticated;
GRANT UPDATE ON TABLE public.profiles TO authenticated;

REVOKE ALL ON TABLE public.build_favorites FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.build_favorites TO authenticated;

COMMIT;
