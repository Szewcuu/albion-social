-- P5.3 faza 1: uprzywilejowane mutacje wykonuje wyłącznie backend.
-- Stare RPC pozostają tymczasowo dostępne, aby wdrożenie aplikacji nie miało
-- okna niedostępności. Osobna migracja fazy 2 odbierze im EXECUTE po deployu.

BEGIN;

-- Własny profil pozostaje edytowalny, ale pola autoryzacyjne nigdy nie mogą
-- być ustawiane bezpośrednio przez klienta. Samo RLS ograniczające UPDATE do
-- własnego wiersza nie chroni przed samodzielną zmianą role/is_admin.
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (
  ingame_nick,
  main_server,
  guild_name,
  main_role,
  avg_ip
) ON TABLE public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.service_moderate_content_batch(
  p_actor_id UUID,
  p_entity_type TEXT,
  p_entity_ids UUID[],
  p_action TEXT,
  p_reason TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_table TEXT;
  target_status TEXT;
  target_id UUID;
  before_row JSONB;
  after_row JSONB;
  affected_count INTEGER := 0;
  actor_role TEXT;
BEGIN
  SELECT CASE
    WHEN profiles.is_admin = TRUE THEN 'admin'
    WHEN profiles.role IN ('member', 'moderator', 'admin') THEN profiles.role
    ELSE 'member'
  END
  INTO actor_role
  FROM public.profiles
  WHERE profiles.id = p_actor_id;

  IF actor_role NOT IN ('moderator', 'admin') THEN
    RAISE EXCEPTION 'Brak uprawnień personelu.' USING ERRCODE = '42501';
  END IF;
  IF p_action NOT IN ('hide', 'restore', 'remove') THEN
    RAISE EXCEPTION 'Nieprawidłowa akcja moderacyjna.' USING ERRCODE = '22023';
  END IF;
  IF p_reason IS NULL OR char_length(pg_catalog.btrim(p_reason)) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Powód musi mieć od 3 do 500 znaków.' USING ERRCODE = '22023';
  END IF;
  IF pg_catalog.array_length(p_entity_ids, 1) IS NULL
    OR pg_catalog.array_length(p_entity_ids, 1) > 50 THEN
    RAISE EXCEPTION 'Jedna operacja może obejmować od 1 do 50 rekordów.' USING ERRCODE = '22023';
  END IF;

  target_table := CASE p_entity_type
    WHEN 'chat_message' THEN 'chat_messages'
    WHEN 'build' THEN 'builds'
    WHEN 'market_item' THEN 'market_items'
    WHEN 'guild' THEN 'guilds'
    WHEN 'expedition' THEN 'expeditions'
    WHEN 'build_comment' THEN 'build_comments'
    ELSE NULL
  END;
  IF target_table IS NULL THEN
    RAISE EXCEPTION 'Nieobsługiwany typ treści.' USING ERRCODE = '22023';
  END IF;

  target_status := CASE p_action
    WHEN 'restore' THEN 'visible'
    WHEN 'hide' THEN 'hidden'
    WHEN 'remove' THEN 'removed'
  END;

  FOR target_id IN
    SELECT DISTINCT pg_catalog.unnest(p_entity_ids) AS entity_id
    ORDER BY entity_id
  LOOP
    EXECUTE pg_catalog.format(
      'SELECT pg_catalog.to_jsonb(row_data) FROM public.%I row_data WHERE id = $1',
      target_table
    ) INTO before_row USING target_id;
    IF before_row IS NULL THEN
      CONTINUE;
    END IF;

    EXECUTE pg_catalog.format(
      'UPDATE public.%I SET status = $1, moderated_at = pg_catalog.timezone(''utc'', pg_catalog.now()), moderated_by = $2 WHERE id = $3',
      target_table
    ) USING target_status, p_actor_id, target_id;

    EXECUTE pg_catalog.format(
      'SELECT pg_catalog.to_jsonb(row_data) FROM public.%I row_data WHERE id = $1',
      target_table
    ) INTO after_row USING target_id;

    INSERT INTO public.moderation_audit_log (
      actor_id, actor_role, action, entity_type, entity_id,
      before_state, after_state, reason
    ) VALUES (
      p_actor_id, actor_role, p_action, p_entity_type, target_id,
      before_row - 'webhook_url' - 'contact_info',
      after_row - 'webhook_url' - 'contact_info',
      pg_catalog.btrim(p_reason)
    );

    affected_count := affected_count + 1;
  END LOOP;

  RETURN affected_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.service_review_build_report(
  p_actor_id UUID,
  p_report_id UUID,
  p_action TEXT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  report_row public.build_reports%ROWTYPE;
  next_status TEXT;
  audit_action TEXT;
  actor_role TEXT;
BEGIN
  SELECT CASE
    WHEN profiles.is_admin = TRUE THEN 'admin'
    WHEN profiles.role IN ('member', 'moderator', 'admin') THEN profiles.role
    ELSE 'member'
  END
  INTO actor_role
  FROM public.profiles
  WHERE profiles.id = p_actor_id;

  IF actor_role NOT IN ('moderator', 'admin') THEN
    RAISE EXCEPTION 'Brak uprawnień personelu.' USING ERRCODE = '42501';
  END IF;
  IF p_action NOT IN ('review', 'dismiss', 'hide_comment') THEN
    RAISE EXCEPTION 'Nieprawidłowa akcja zgłoszenia.' USING ERRCODE = '22023';
  END IF;
  IF p_reason IS NULL OR char_length(pg_catalog.btrim(p_reason)) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Powód musi mieć od 3 do 500 znaków.' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO report_row
  FROM public.build_reports
  WHERE id = p_report_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nie znaleziono zgłoszenia.' USING ERRCODE = 'P0002';
  END IF;
  IF report_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Zgłoszenie zostało już rozpatrzone.' USING ERRCODE = '22023';
  END IF;
  IF p_action = 'hide_comment' AND report_row.comment_id IS NULL THEN
    RAISE EXCEPTION 'Zgłoszenie nie dotyczy komentarza.' USING ERRCODE = '22023';
  END IF;

  IF p_action = 'hide_comment' THEN
    PERFORM public.service_moderate_content_batch(
      p_actor_id, 'build_comment', ARRAY[report_row.comment_id], 'hide', pg_catalog.btrim(p_reason)
    );
    next_status := 'actioned';
    audit_action := 'review_report';
  ELSIF p_action = 'dismiss' THEN
    next_status := 'dismissed';
    audit_action := 'dismiss_report';
  ELSE
    next_status := 'reviewed';
    audit_action := 'review_report';
  END IF;

  UPDATE public.build_reports
  SET status = next_status,
      reviewed_at = pg_catalog.timezone('utc', pg_catalog.now()),
      reviewed_by = p_actor_id
  WHERE id = report_row.id;

  INSERT INTO public.moderation_audit_log (
    actor_id, actor_role, action, entity_type, entity_id,
    before_state, after_state, reason
  ) VALUES (
    p_actor_id, actor_role, audit_action, 'build_report', report_row.id,
    pg_catalog.jsonb_build_object('status', report_row.status),
    pg_catalog.jsonb_build_object('status', next_status),
    pg_catalog.btrim(p_reason)
  );

  RETURN pg_catalog.jsonb_build_object(
    'id', report_row.id,
    'status', next_status,
    'commentStatus', CASE WHEN p_action = 'hide_comment' THEN 'hidden' ELSE NULL END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.service_review_build_reports_batch(
  p_actor_id UUID,
  p_report_ids UUID[],
  p_action TEXT,
  p_reason TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  report_id UUID;
  affected_count INTEGER := 0;
  actor_role TEXT;
BEGIN
  SELECT CASE
    WHEN profiles.is_admin = TRUE THEN 'admin'
    WHEN profiles.role IN ('member', 'moderator', 'admin') THEN profiles.role
    ELSE 'member'
  END
  INTO actor_role
  FROM public.profiles
  WHERE profiles.id = p_actor_id;

  IF actor_role NOT IN ('moderator', 'admin') THEN
    RAISE EXCEPTION 'Brak uprawnień personelu.' USING ERRCODE = '42501';
  END IF;
  IF p_action NOT IN ('review', 'dismiss') THEN
    RAISE EXCEPTION 'Nieprawidłowa akcja zbiorcza.' USING ERRCODE = '22023';
  END IF;
  IF p_reason IS NULL OR char_length(pg_catalog.btrim(p_reason)) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Powód musi mieć od 3 do 500 znaków.' USING ERRCODE = '22023';
  END IF;
  IF pg_catalog.array_length(p_report_ids, 1) IS NULL
    OR pg_catalog.array_length(p_report_ids, 1) > 50 THEN
    RAISE EXCEPTION 'Wybierz od 1 do 50 zgłoszeń.' USING ERRCODE = '22023';
  END IF;

  FOR report_id IN
    SELECT DISTINCT pg_catalog.unnest(p_report_ids) AS id
    ORDER BY id
  LOOP
    PERFORM public.service_review_build_report(
      p_actor_id, report_id, p_action, p_reason
    );
    affected_count := affected_count + 1;
  END LOOP;

  RETURN affected_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.service_set_portal_role(
  p_actor_id UUID,
  p_user_id UUID,
  p_role TEXT,
  p_reason TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_role TEXT;
  before_row JSONB;
  after_row JSONB;
BEGIN
  SELECT CASE
    WHEN profiles.is_admin = TRUE THEN 'admin'
    WHEN profiles.role IN ('member', 'moderator', 'admin') THEN profiles.role
    ELSE 'member'
  END
  INTO actor_role
  FROM public.profiles
  WHERE profiles.id = p_actor_id;

  IF actor_role <> 'admin' THEN
    RAISE EXCEPTION 'Tylko administrator może zmieniać role.' USING ERRCODE = '42501';
  END IF;
  IF p_role NOT IN ('member', 'moderator', 'admin') THEN
    RAISE EXCEPTION 'Nieprawidłowa rola.' USING ERRCODE = '22023';
  END IF;
  IF p_reason IS NULL OR char_length(pg_catalog.btrim(p_reason)) NOT BETWEEN 3 AND 500 THEN
    RAISE EXCEPTION 'Powód musi mieć od 3 do 500 znaków.' USING ERRCODE = '22023';
  END IF;

  SELECT pg_catalog.jsonb_build_object('role', role, 'is_admin', is_admin)
  INTO before_row
  FROM public.profiles
  WHERE id = p_user_id;
  IF before_row IS NULL THEN
    RAISE EXCEPTION 'Nie znaleziono profilu.' USING ERRCODE = 'P0002';
  END IF;

  IF COALESCE((before_row->>'is_admin')::BOOLEAN, FALSE)
    AND p_role <> 'admin'
    AND (SELECT count(*) FROM public.profiles WHERE role = 'admin' OR is_admin = TRUE) <= 1 THEN
    RAISE EXCEPTION 'Nie można zdegradować ostatniego administratora.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
  SET role = p_role,
      is_admin = (p_role = 'admin')
  WHERE id = p_user_id;

  SELECT pg_catalog.jsonb_build_object('role', role, 'is_admin', is_admin)
  INTO after_row
  FROM public.profiles
  WHERE id = p_user_id;

  INSERT INTO public.moderation_audit_log (
    actor_id, actor_role, action, entity_type, entity_id,
    before_state, after_state, reason
  ) VALUES (
    p_actor_id, 'admin', 'role_change', 'profile_role', p_user_id,
    before_row, after_row, pg_catalog.btrim(p_reason)
  );

  RETURN p_role;
END;
$$;

REVOKE ALL ON FUNCTION public.service_moderate_content_batch(UUID, TEXT, UUID[], TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.service_review_build_report(UUID, UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.service_review_build_reports_batch(UUID, UUID[], TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.service_set_portal_role(UUID, UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.service_moderate_content_batch(UUID, TEXT, UUID[], TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.service_review_build_report(UUID, UUID, TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.service_review_build_reports_batch(UUID, UUID[], TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.service_set_portal_role(UUID, UUID, TEXT, TEXT)
  TO service_role;

COMMIT;
