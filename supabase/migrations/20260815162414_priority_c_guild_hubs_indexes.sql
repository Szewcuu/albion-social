-- Priority C.2 follow-up: indeksy FK i jawna blokada bezpośredniego dostępu do podań.

BEGIN;

CREATE INDEX IF NOT EXISTS guild_activity_actor_id_idx
  ON public.guild_activity (actor_id);
CREATE INDEX IF NOT EXISTS guild_applications_applicant_user_id_idx
  ON public.guild_applications (applicant_user_id);
CREATE INDEX IF NOT EXISTS guild_applications_reviewed_by_idx
  ON public.guild_applications (reviewed_by);
CREATE INDEX IF NOT EXISTS guild_events_creator_id_idx
  ON public.guild_events (creator_id);

DROP POLICY IF EXISTS "No direct access to guild applications" ON public.guild_applications;
CREATE POLICY "No direct access to guild applications"
  ON public.guild_applications
  FOR ALL
  TO anon, authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

COMMIT;
