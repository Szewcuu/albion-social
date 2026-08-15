-- Priority C.3: indeks pokrywający relację zapisów z profilami.

CREATE INDEX IF NOT EXISTS guild_event_signups_user_id_idx
  ON public.guild_event_signups (user_id);
