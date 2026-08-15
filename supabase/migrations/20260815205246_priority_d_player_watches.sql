-- Priority D.3: persistent Albion player watches and idempotent combat summaries.

BEGIN;

ALTER TABLE public.entity_follows
  DROP CONSTRAINT IF EXISTS entity_follows_entity_type_check;

ALTER TABLE public.entity_follows
  ADD CONSTRAINT entity_follows_entity_type_check
  CHECK (entity_type IN ('build', 'guild', 'market', 'player', 'albion_player')),
  ADD COLUMN IF NOT EXISTS region TEXT,
  ADD COLUMN IF NOT EXISTS seen_event_ids JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_summary JSONB NOT NULL DEFAULT '{}'::JSONB,
  ADD COLUMN IF NOT EXISTS last_error TEXT;

ALTER TABLE public.entity_follows
  ADD CONSTRAINT entity_follows_region_check
  CHECK (
    (entity_type = 'albion_player' AND region IN ('europe', 'america', 'asia'))
    OR (entity_type <> 'albion_player' AND region IS NULL)
  ),
  ADD CONSTRAINT entity_follows_seen_events_check
  CHECK (jsonb_typeof(seen_event_ids) = 'array' AND pg_column_size(seen_event_ids) <= 16384),
  ADD CONSTRAINT entity_follows_last_summary_check
  CHECK (jsonb_typeof(last_summary) = 'object' AND pg_column_size(last_summary) <= 4096),
  ADD CONSTRAINT entity_follows_last_error_check
  CHECK (last_error IS NULL OR char_length(last_error) <= 300);

CREATE INDEX entity_follows_player_watch_poll_idx
  ON public.entity_follows (last_checked_at ASC NULLS FIRST)
  WHERE entity_type = 'albion_player';

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS source_key TEXT;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_source_key_length_check
  CHECK (source_key IS NULL OR char_length(source_key) BETWEEN 1 AND 180),
  ADD CONSTRAINT notifications_user_source_key_unique
  UNIQUE (user_id, source_key);

COMMENT ON COLUMN public.entity_follows.seen_event_ids IS
  'Bounded cursor of Albion combat event identifiers already summarized for this observer.';
COMMENT ON COLUMN public.notifications.source_key IS
  'Server-generated idempotency key for notifications produced by scheduled jobs.';

REVOKE ALL ON TABLE public.entity_follows FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.entity_follows TO authenticated;
GRANT ALL ON TABLE public.entity_follows TO service_role;

REVOKE ALL ON TABLE public.notifications FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.notifications TO authenticated;
GRANT UPDATE (is_read) ON TABLE public.notifications TO authenticated;
GRANT ALL ON TABLE public.notifications TO service_role;

COMMIT;
