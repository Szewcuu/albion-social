-- Priority C.6: private buyer/seller conversations for marketplace listings.

ALTER TABLE public.market_items
  ADD COLUMN IF NOT EXISTS server TEXT NOT NULL DEFAULT 'Wszystkie serwery';
ALTER TABLE public.market_items
  DROP CONSTRAINT IF EXISTS market_items_server_check;
ALTER TABLE public.market_items
  ADD CONSTRAINT market_items_server_check
  CHECK (server IN ('Europa', 'Ameryka', 'Azja', 'Wszystkie serwery'));

CREATE TABLE public.market_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_item_id UUID REFERENCES public.market_items(id) ON DELETE SET NULL,
  offer_title TEXT NOT NULL CHECK (char_length(offer_title) BETWEEN 1 AND 160),
  offer_price BIGINT NOT NULL CHECK (offer_price > 0),
  offered_price BIGINT CHECK (offered_price IS NULL OR offered_price > 0),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  buyer_last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seller_last_read_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT market_conversations_distinct_participants CHECK (buyer_id <> seller_id)
);

CREATE UNIQUE INDEX market_conversations_listing_buyer_unique
  ON public.market_conversations (market_item_id, buyer_id)
  WHERE market_item_id IS NOT NULL;
CREATE INDEX market_conversations_buyer_activity_idx
  ON public.market_conversations (buyer_id, last_message_at DESC);
CREATE INDEX market_conversations_seller_activity_idx
  ON public.market_conversations (seller_id, last_message_at DESC);

CREATE TABLE public.market_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.market_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX market_messages_conversation_created_idx
  ON public.market_messages (conversation_id, created_at ASC);

ALTER TABLE public.market_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read market conversations"
  ON public.market_conversations FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) IN (buyer_id, seller_id));

CREATE POLICY "Participants read market messages"
  ON public.market_messages FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.market_conversations conversation
    WHERE conversation.id = market_messages.conversation_id
      AND (SELECT auth.uid()) IN (conversation.buyer_id, conversation.seller_id)
  ));

-- Conversations are intentionally available only through rate-limited server routes.
REVOKE ALL ON public.market_conversations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.market_messages FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.market_conversations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.market_messages TO service_role;

CREATE OR REPLACE FUNCTION private.touch_market_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.market_conversations
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.touch_market_conversation() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.touch_market_conversation() TO service_role;

CREATE TRIGGER market_messages_touch_conversation
AFTER INSERT ON public.market_messages
FOR EACH ROW EXECUTE FUNCTION private.touch_market_conversation();

CREATE OR REPLACE FUNCTION public.service_open_market_conversation(
  p_actor_id UUID,
  p_market_item_id UUID,
  p_offered_price BIGINT,
  p_body TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  listing public.market_items%ROWTYPE;
  conversation_id UUID;
  listing_price BIGINT;
BEGIN
  IF p_actor_id IS NULL OR p_market_item_id IS NULL
    OR p_offered_price IS NULL OR p_offered_price <= 0
    OR char_length(pg_catalog.btrim(COALESCE(p_body, ''))) NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'Nieprawidłowe dane rozmowy.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO listing
  FROM public.market_items
  WHERE id = p_market_item_id AND status = 'visible';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Oferta nie jest dostępna.' USING ERRCODE = 'P0002';
  END IF;
  IF listing.user_id = p_actor_id THEN
    RAISE EXCEPTION 'Nie można rozpocząć rozmowy z samym sobą.' USING ERRCODE = '22023';
  END IF;

  listing_price := COALESCE(
    NULLIF(pg_catalog.regexp_replace(listing.price, '[^0-9]', '', 'g'), '')::BIGINT,
    1
  );

  INSERT INTO public.market_conversations (
    market_item_id, offer_title, offer_price, offered_price, buyer_id, seller_id, status
  ) VALUES (
    listing.id, listing.title, listing_price, p_offered_price, p_actor_id, listing.user_id, 'open'
  )
  ON CONFLICT (market_item_id, buyer_id) WHERE market_item_id IS NOT NULL
  DO UPDATE SET
    offered_price = EXCLUDED.offered_price,
    status = 'open',
    updated_at = now()
  RETURNING id INTO conversation_id;

  INSERT INTO public.market_messages (conversation_id, sender_id, body)
  VALUES (conversation_id, p_actor_id, pg_catalog.btrim(p_body));

  RETURN conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.service_send_market_message(
  p_actor_id UUID,
  p_conversation_id UUID,
  p_body TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  conversation public.market_conversations%ROWTYPE;
  message_id UUID;
BEGIN
  IF p_actor_id IS NULL OR p_conversation_id IS NULL
    OR char_length(pg_catalog.btrim(COALESCE(p_body, ''))) NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'Nieprawidłowa wiadomość.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO conversation
  FROM public.market_conversations
  WHERE id = p_conversation_id;

  IF NOT FOUND OR p_actor_id NOT IN (conversation.buyer_id, conversation.seller_id) THEN
    RAISE EXCEPTION 'Rozmowa nie istnieje.' USING ERRCODE = 'P0002';
  END IF;
  IF conversation.status <> 'open' THEN
    RAISE EXCEPTION 'Rozmowa jest zamknięta.' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.market_messages (conversation_id, sender_id, body)
  VALUES (conversation.id, p_actor_id, pg_catalog.btrim(p_body))
  RETURNING id INTO message_id;

  RETURN message_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.service_market_conversation_inbox(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  market_item_id UUID,
  offer_title TEXT,
  offer_price BIGINT,
  offered_price BIGINT,
  status TEXT,
  counterpart_id UUID,
  counterpart_name TEXT,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  unread_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    conversation.id,
    conversation.market_item_id,
    conversation.offer_title,
    conversation.offer_price,
    conversation.offered_price,
    conversation.status,
    counterpart.id,
    COALESCE(NULLIF(counterpart.ingame_nick, ''), counterpart.username, 'Gracz'),
    latest.body,
    conversation.last_message_at,
    (
      SELECT count(*)
      FROM public.market_messages unread
      WHERE unread.conversation_id = conversation.id
        AND unread.sender_id <> p_user_id
        AND unread.created_at > COALESCE(
          CASE WHEN conversation.buyer_id = p_user_id
            THEN conversation.buyer_last_read_at
            ELSE conversation.seller_last_read_at
          END,
          '-infinity'::TIMESTAMPTZ
        )
    )
  FROM public.market_conversations conversation
  JOIN public.profiles counterpart
    ON counterpart.id = CASE
      WHEN conversation.buyer_id = p_user_id THEN conversation.seller_id
      ELSE conversation.buyer_id
    END
  LEFT JOIN LATERAL (
    SELECT message.body
    FROM public.market_messages message
    WHERE message.conversation_id = conversation.id
    ORDER BY message.created_at DESC
    LIMIT 1
  ) latest ON true
  WHERE p_user_id IN (conversation.buyer_id, conversation.seller_id)
  ORDER BY conversation.last_message_at DESC
  LIMIT 100;
$$;

REVOKE ALL ON FUNCTION public.service_open_market_conversation(UUID, UUID, BIGINT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.service_send_market_message(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.service_market_conversation_inbox(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_open_market_conversation(UUID, UUID, BIGINT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.service_send_market_message(UUID, UUID, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.service_market_conversation_inbox(UUID)
  TO service_role;

-- Keep historical values for recoverability, but remove all client access below.
-- Every future listing is normalized to portal-only contact.
CREATE OR REPLACE FUNCTION private.sanitize_market_contact()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.contact := 'Kontakt przez portal';
  NEW.contact_info := NULL;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.sanitize_market_contact() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.sanitize_market_contact() TO service_role;

CREATE TRIGGER market_items_sanitize_contact
BEFORE INSERT OR UPDATE OF contact, contact_info ON public.market_items
FOR EACH ROW EXECUTE FUNCTION private.sanitize_market_contact();

-- Replace historical broad grants with the smallest client-facing surface.
REVOKE ALL ON public.market_items FROM anon, authenticated;
GRANT SELECT (id, created_at, user_id, title, price, city, category, description, status, item_name, server)
  ON public.market_items TO anon, authenticated;
GRANT INSERT (user_id, title, price, city, category, description, contact, contact_info, item_name, server)
  ON public.market_items TO authenticated;
GRANT DELETE ON public.market_items TO authenticated;

COMMENT ON TABLE public.market_conversations IS
  'Private marketplace inbox threads. Client roles have no direct table privileges.';
COMMENT ON TABLE public.market_messages IS
  'Private marketplace messages served only by authenticated, rate-limited application routes.';
