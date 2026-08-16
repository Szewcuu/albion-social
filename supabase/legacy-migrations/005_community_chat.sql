-- P4.5: trwała tawerna społeczności z bezpiecznym zapisem i Realtime.
-- Uruchom w Supabase SQL Editor przed publikacją nowego interfejsu.

BEGIN;

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'GLOBALNY',
  username TEXT NOT NULL,
  text TEXT NOT NULL,
  reply_to UUID CONSTRAINT chat_messages_reply_to_fk REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS reply_to UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chat_messages_reply_to_fk'
      AND conrelid = 'public.chat_messages'::regclass
  ) THEN
    ALTER TABLE public.chat_messages
    ADD CONSTRAINT chat_messages_reply_to_fk
    FOREIGN KEY (reply_to) REFERENCES public.chat_messages(id) ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS chat_messages_channel_created_idx
ON public.chat_messages (channel, created_at DESC);

CREATE INDEX IF NOT EXISTS chat_messages_reply_to_idx
ON public.chat_messages (reply_to)
WHERE reply_to IS NOT NULL;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Community can read chat messages" ON public.chat_messages;
CREATE POLICY "Community can read chat messages"
ON public.chat_messages FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can publish chat messages" ON public.chat_messages;
CREATE POLICY "Authenticated users can publish chat messages"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND channel = 'GLOBALNY'
  AND char_length(btrim(username)) BETWEEN 1 AND 80
  AND char_length(btrim(text)) BETWEEN 1 AND 500
);

DROP POLICY IF EXISTS "Authors and admins can delete chat messages" ON public.chat_messages;
CREATE POLICY "Authors and admins can delete chat messages"
ON public.chat_messages FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.is_portal_admin());

GRANT SELECT ON public.chat_messages TO anon, authenticated;
GRANT INSERT, DELETE ON public.chat_messages TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  END IF;
END;
$$;

COMMIT;
