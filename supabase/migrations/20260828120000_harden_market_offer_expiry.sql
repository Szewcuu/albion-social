-- Review 06: expired listings must not open or reopen private negotiations.

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
  WHERE id = p_market_item_id
    AND status = 'visible'
    AND created_at > now() - INTERVAL '7 days';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Oferta wygasła albo nie jest dostępna.' USING ERRCODE = 'P0002';
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

REVOKE ALL ON FUNCTION public.service_open_market_conversation(UUID, UUID, BIGINT, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.service_open_market_conversation(UUID, UUID, BIGINT, TEXT)
  TO service_role;

COMMENT ON FUNCTION public.service_open_market_conversation(UUID, UUID, BIGINT, TEXT) IS
  'Opens a private market negotiation only for visible listings newer than seven days.';
