-- E.2: stabilne indeksy dla stronicowania kursorowego długich kolejek.

BEGIN;

CREATE INDEX IF NOT EXISTS chat_messages_channel_status_created_id_idx
ON public.chat_messages (channel, status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS builds_status_created_id_idx
ON public.builds (status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS market_items_status_created_id_idx
ON public.market_items (status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS build_comments_build_status_created_id_idx
ON public.build_comments (build_id, status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS build_reports_status_created_id_idx
ON public.build_reports (status, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS build_reports_created_id_idx
ON public.build_reports (created_at DESC, id DESC);

COMMIT;
