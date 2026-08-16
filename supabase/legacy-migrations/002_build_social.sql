-- P4.1: jeden głos użytkownika na build oraz prywatne ulubione.
-- Migracja jest idempotentna i zachowuje istniejącą tabelę build_votes.

BEGIN;

ALTER TABLE public.build_votes
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now());

-- Przed założeniem ograniczenia zachowaj tylko jeden historyczny głos użytkownika.
DELETE FROM public.build_votes current_vote
USING public.build_votes duplicate_vote
WHERE current_vote.build_id = duplicate_vote.build_id
  AND current_vote.user_id = duplicate_vote.user_id
  AND current_vote.id > duplicate_vote.id;

CREATE UNIQUE INDEX IF NOT EXISTS build_votes_one_per_user
ON public.build_votes (build_id, user_id);

CREATE INDEX IF NOT EXISTS build_votes_build_id_idx
ON public.build_votes (build_id);

CREATE TABLE IF NOT EXISTS public.build_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL REFERENCES public.builds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT build_favorites_one_per_user UNIQUE (build_id, user_id)
);

CREATE INDEX IF NOT EXISTS build_favorites_user_id_idx
ON public.build_favorites (user_id, created_at DESC);

ALTER TABLE public.build_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_favorites ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'build_votes'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.build_votes', policy_record.policyname);
  END LOOP;

  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'build_favorites'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.build_favorites', policy_record.policyname);
  END LOOP;
END $$;

CREATE POLICY "Public can read build votes"
ON public.build_votes FOR SELECT
USING (true);

CREATE POLICY "Users can add own build vote"
ON public.build_votes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own build vote"
ON public.build_votes FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own build vote"
ON public.build_votes FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can read own build favorites"
ON public.build_favorites FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can add own build favorites"
ON public.build_favorites FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own build favorites"
ON public.build_favorites FOR DELETE TO authenticated
USING (auth.uid() = user_id);

GRANT SELECT ON public.build_votes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.build_votes TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.build_favorites TO authenticated;

COMMIT;
