-- Priority C.3: globalny kalendarz wydarzeń, zapisy i przypomnienia.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pg_cron;

ALTER TABLE public.guild_events
  ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'public',
  ADD COLUMN IF NOT EXISTS capacity SMALLINT NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS signup_open BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.guild_events'::regclass AND conname = 'guild_events_location_length_check') THEN
    ALTER TABLE public.guild_events ADD CONSTRAINT guild_events_location_length_check CHECK (char_length(location) <= 120);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.guild_events'::regclass AND conname = 'guild_events_audience_check') THEN
    ALTER TABLE public.guild_events ADD CONSTRAINT guild_events_audience_check CHECK (audience IN ('public', 'guild'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.guild_events'::regclass AND conname = 'guild_events_capacity_check') THEN
    ALTER TABLE public.guild_events ADD CONSTRAINT guild_events_capacity_check CHECK (capacity BETWEEN 2 AND 200);
  END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.guild_event_signups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.guild_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'flex' CHECK (role IN ('tank', 'healer', 'dps', 'support', 'flex')),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlist', 'cancelled')),
  reminder_minutes SMALLINT CHECK (reminder_minutes IN (15, 30, 60, 120, 1440)),
  reminder_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT guild_event_signups_one_user UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS guild_events_calendar_idx
  ON public.guild_events (status, starts_at, server);
CREATE INDEX IF NOT EXISTS guild_event_signups_event_status_idx
  ON public.guild_event_signups (event_id, status, created_at);
CREATE INDEX IF NOT EXISTS guild_event_signups_reminders_idx
  ON public.guild_event_signups (reminder_sent_at, reminder_minutes)
  WHERE status = 'confirmed' AND reminder_minutes IS NOT NULL;

ALTER TABLE public.guild_event_signups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read visible event signups" ON public.guild_event_signups;
CREATE POLICY "Authenticated read visible event signups"
  ON public.guild_event_signups FOR SELECT TO authenticated
  USING (
    status IN ('confirmed', 'waitlist')
    AND EXISTS (
      SELECT 1
      FROM public.guild_events
      JOIN public.guilds ON guilds.id = guild_events.guild_id
      WHERE guild_events.id = guild_event_signups.event_id
        AND guild_events.status IN ('scheduled', 'completed')
        AND guilds.status = 'visible'
    )
  );

REVOKE ALL ON TABLE public.guild_event_signups FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.guild_event_signups TO authenticated;
GRANT ALL ON TABLE public.guild_event_signups TO service_role;

CREATE OR REPLACE FUNCTION public.service_set_guild_event_signup(
  p_event_id UUID,
  p_user_id UUID,
  p_role TEXT,
  p_reminder_minutes SMALLINT,
  p_action TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  event_row public.guild_events%ROWTYPE;
  existing_row public.guild_event_signups%ROWTYPE;
  next_status TEXT;
  active_count INTEGER;
  saved_row public.guild_event_signups%ROWTYPE;
BEGIN
  IF p_action NOT IN ('join', 'cancel') THEN
    RAISE EXCEPTION 'Nieprawidłowa akcja zapisu.' USING ERRCODE = '22023';
  END IF;
  IF p_role NOT IN ('tank', 'healer', 'dps', 'support', 'flex') THEN
    RAISE EXCEPTION 'Nieprawidłowa rola.' USING ERRCODE = '22023';
  END IF;
  IF p_reminder_minutes IS NOT NULL AND p_reminder_minutes NOT IN (15, 30, 60, 120, 1440) THEN
    RAISE EXCEPTION 'Nieprawidłowe przypomnienie.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO event_row FROM public.guild_events WHERE id = p_event_id FOR UPDATE;
  IF NOT FOUND OR event_row.status <> 'scheduled' OR event_row.starts_at <= pg_catalog.now() THEN
    RAISE EXCEPTION 'Wydarzenie nie przyjmuje już zapisów.' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Nie znaleziono profilu gracza.' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO existing_row
  FROM public.guild_event_signups
  WHERE event_id = p_event_id AND user_id = p_user_id;

  IF p_action = 'cancel' THEN
    IF existing_row.id IS NULL OR existing_row.status = 'cancelled' THEN
      RAISE EXCEPTION 'Nie masz aktywnego zapisu.' USING ERRCODE = '22023';
    END IF;
    UPDATE public.guild_event_signups
    SET status = 'cancelled', reminder_sent_at = NULL, updated_at = pg_catalog.timezone('utc', pg_catalog.now())
    WHERE id = existing_row.id RETURNING * INTO saved_row;
  ELSE
    IF NOT event_row.signup_open THEN
      RAISE EXCEPTION 'Zapisy na to wydarzenie są zamknięte.' USING ERRCODE = '22023';
    END IF;
    IF event_row.audience = 'guild' AND NOT EXISTS (
      SELECT 1 FROM public.guild_members
      WHERE guild_id = event_row.guild_id AND user_id = p_user_id AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'To wydarzenie jest tylko dla członków gildii.' USING ERRCODE = '42501';
    END IF;

    IF existing_row.status IN ('confirmed', 'waitlist') THEN
      next_status := existing_row.status;
    ELSE
      SELECT count(*) INTO active_count
      FROM public.guild_event_signups
      WHERE event_id = p_event_id AND status = 'confirmed';
      next_status := CASE WHEN active_count < event_row.capacity THEN 'confirmed' ELSE 'waitlist' END;
    END IF;

    INSERT INTO public.guild_event_signups (event_id, user_id, role, status, reminder_minutes, reminder_sent_at)
    VALUES (p_event_id, p_user_id, p_role, next_status, p_reminder_minutes, NULL)
    ON CONFLICT ON CONSTRAINT guild_event_signups_one_user DO UPDATE
    SET role = EXCLUDED.role,
        status = EXCLUDED.status,
        reminder_minutes = EXCLUDED.reminder_minutes,
        reminder_sent_at = NULL,
        updated_at = pg_catalog.timezone('utc', pg_catalog.now())
    RETURNING * INTO saved_row;
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'id', saved_row.id,
    'event_id', saved_row.event_id,
    'user_id', saved_row.user_id,
    'role', saved_row.role,
    'status', saved_row.status,
    'reminder_minutes', saved_row.reminder_minutes
  );
END;
$$;

REVOKE ALL ON FUNCTION public.service_set_guild_event_signup(UUID, UUID, TEXT, SMALLINT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_set_guild_event_signup(UUID, UUID, TEXT, SMALLINT, TEXT) TO service_role;

CREATE OR REPLACE FUNCTION public.service_cancel_guild_event(
  p_event_id UUID,
  p_guild_id BIGINT,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  event_row public.guild_events%ROWTYPE;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.guilds
    WHERE id = p_guild_id AND user_id = p_actor_id
  ) AND NOT EXISTS (
    SELECT 1 FROM public.guild_members
    WHERE guild_id = p_guild_id AND user_id = p_actor_id AND status = 'active' AND role IN ('leader', 'officer')
  ) THEN
    RAISE EXCEPTION 'Brak uprawnień do odwołania wydarzenia.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO event_row
  FROM public.guild_events
  WHERE id = p_event_id AND guild_id = p_guild_id AND status = 'scheduled'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wydarzenie nie istnieje lub zostało już odwołane.' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.guild_events
  SET status = 'cancelled', signup_open = FALSE, updated_at = pg_catalog.timezone('utc', pg_catalog.now())
  WHERE id = event_row.id;

  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT signups.user_id,
         'Wydarzenie zostało odwołane',
         'Gildia odwołała wydarzenie „' || event_row.title || '”.',
         'guild_event_cancelled',
         '/kalendarz'
  FROM public.guild_event_signups AS signups
  WHERE signups.event_id = event_row.id AND signups.status IN ('confirmed', 'waitlist');

  UPDATE public.guild_event_signups
  SET status = 'cancelled', reminder_sent_at = NULL, updated_at = pg_catalog.timezone('utc', pg_catalog.now())
  WHERE event_id = event_row.id AND status IN ('confirmed', 'waitlist');

  RETURN pg_catalog.jsonb_build_object('id', event_row.id, 'title', event_row.title);
END;
$$;

REVOKE ALL ON FUNCTION public.service_cancel_guild_event(UUID, BIGINT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_cancel_guild_event(UUID, BIGINT, UUID) TO service_role;

CREATE OR REPLACE FUNCTION public.service_dispatch_guild_event_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  delivered INTEGER;
BEGIN
  WITH due AS (
    SELECT signups.id, signups.user_id, events.id AS event_id, events.title, events.starts_at
    FROM public.guild_event_signups AS signups
    JOIN public.guild_events AS events ON events.id = signups.event_id
    WHERE signups.status = 'confirmed'
      AND signups.reminder_minutes IS NOT NULL
      AND signups.reminder_sent_at IS NULL
      AND events.status = 'scheduled'
      AND events.starts_at > pg_catalog.now()
      AND events.starts_at <= pg_catalog.now() + pg_catalog.make_interval(mins => signups.reminder_minutes)
    FOR UPDATE OF signups SKIP LOCKED
  ), inserted AS (
    INSERT INTO public.notifications (user_id, title, message, type, link)
    SELECT due.user_id,
           'Nadchodzi wydarzenie gildii',
           '„' || due.title || '” rozpocznie się ' || pg_catalog.to_char(due.starts_at AT TIME ZONE 'UTC', 'DD.MM.YYYY HH24:MI') || ' UTC.',
           'guild_event_reminder',
           '/kalendarz?event=' || due.event_id::TEXT
    FROM due
    RETURNING user_id
  )
  UPDATE public.guild_event_signups AS signups
  SET reminder_sent_at = pg_catalog.timezone('utc', pg_catalog.now()),
      updated_at = pg_catalog.timezone('utc', pg_catalog.now())
  FROM due
  WHERE signups.id = due.id;

  GET DIAGNOSTICS delivered = ROW_COUNT;
  RETURN delivered;
END;
$$;

REVOKE ALL ON FUNCTION public.service_dispatch_guild_event_reminders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_dispatch_guild_event_reminders() TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'guild-event-reminders') THEN
    PERFORM cron.schedule(
      'guild-event-reminders',
      '*/5 * * * *',
      'SELECT public.service_dispatch_guild_event_reminders();'
    );
  END IF;
END;
$$;

COMMIT;
