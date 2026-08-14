-- P5.0/P5.1: blokada podatnego legacy RPC, synchronizacja profili,
-- minimalne uprawnienia funkcji, uporządkowanie RLS i indeksy FK.

BEGIN;

-- Produkcyjna tabela profiles powstała przed późniejszymi rozszerzeniami.
-- CREATE TABLE IF NOT EXISTS nie synchronizuje istniejącego schematu,
-- dlatego brakujące pola dodajemy jawnie i idempotentnie.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS verified_player_id TEXT,
  ADD COLUMN IF NOT EXISTS verified_server TEXT,
  ADD COLUMN IF NOT EXISTS pvp_fame BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pve_fame BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now());

CREATE INDEX IF NOT EXISTS profiles_verified_player_id_idx
  ON public.profiles (verified_player_id)
  WHERE is_verified = TRUE;

-- Nie używa go aktualny kod. Dotychczas przyjmował dowolne p_user_id,
-- działał jako właściciel i był dostępny bez logowania.
DROP FUNCTION IF EXISTS public.handle_build_vote(UUID, UUID, TEXT);

-- Funkcje triggerów nie są publicznymi endpointami RPC.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      'Gracz Albiona'
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_chat_role_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  is_admin_check BOOLEAN;
BEGIN
  SELECT profiles.is_admin
  INTO is_admin_check
  FROM public.profiles
  WHERE profiles.id = NEW.user_id;

  NEW.role := CASE WHEN COALESCE(is_admin_check, FALSE) THEN 'ADMIN' ELSE 'USER' END;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (
      SELECT CASE
        WHEN profiles.is_admin = TRUE THEN 'admin'
        WHEN profiles.role IN ('member', 'moderator', 'admin') THEN profiles.role
        ELSE 'member'
      END
      FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
    ),
    'member'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_portal_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.portal_role() = 'admin';
$$;

CREATE OR REPLACE FUNCTION public.is_portal_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT public.portal_role() IN ('moderator', 'admin');
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_chat_role_on_insert() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.portal_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_portal_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_portal_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_portal_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_portal_staff() TO authenticated;

REVOKE ALL ON FUNCTION public.moderate_content_batch(TEXT, UUID[], TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_build_report(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_build_reports_batch(UUID[], TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_portal_role(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_content_batch(TEXT, UUID[], TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_build_report(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_build_reports_batch(UUID[], TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_portal_role(UUID, TEXT, TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.enforce_content_write_rate_limit() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(TEXT, INTEGER, INTEGER) TO service_role;

-- Nowe funkcje w public nie powinny automatycznie stawać się publicznym API.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM authenticated;

-- Profile: usuwamy dwie pary równoważnych polityk i jawnie rozdzielamy role.
DROP POLICY IF EXISTS "Profile są widoczne dla każdego" ON public.profiles;
DROP POLICY IF EXISTS "Profile widoczne dla wszystkich" ON public.profiles;
DROP POLICY IF EXISTS "Użytkownik edytuje swój profil" ON public.profiles;
DROP POLICY IF EXISTS "Użytkownik może edytować swój profil" ON public.profiles;

CREATE POLICY "Public profiles are readable"
  ON public.profiles FOR SELECT TO anon, authenticated
  USING (TRUE);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- Powiadomienia: jedna polityka na operację zamiast duplikatów.
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Użytkownik widzi swoje powiadomienia" ON public.notifications;
DROP POLICY IF EXISTS "Users can mark own notifications as read" ON public.notifications;
DROP POLICY IF EXISTS "Użytkownik może aktualizować swoje powiadomienia" ON public.notifications;

CREATE POLICY "Users read own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Stare oferty: łączymy dwie polityki DELETE i usuwamy dostęp roli anon.
DROP POLICY IF EXISTS "Admin usuwa każdą ofertę" ON public.market_posts;
DROP POLICY IF EXISTS "Właściciel usuwa ofertę" ON public.market_posts;
CREATE POLICY "Owner or admin deletes market posts"
  ON public.market_posts FOR DELETE TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    OR (SELECT public.is_portal_admin())
  );

ALTER POLICY "Zalogowani dodają oferty" ON public.market_posts TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Polityki własności i moderacji korzystają z InitPlan zamiast wywołania per rekord.
ALTER POLICY "Delete own comments" ON public.build_comments
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Publish own visible comments" ON public.build_comments
  WITH CHECK ((SELECT auth.uid()) = user_id AND status = 'visible');
ALTER POLICY "Staff moderate comments" ON public.build_comments
  USING ((SELECT public.is_portal_staff()))
  WITH CHECK ((SELECT public.is_portal_staff()));

ALTER POLICY "Users can remove own build favorites" ON public.build_favorites
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can add own build favorites" ON public.build_favorites
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can read own build favorites" ON public.build_favorites
  USING ((SELECT auth.uid()) = user_id);

ALTER POLICY "Publish own pending reports" ON public.build_reports
  WITH CHECK (
    (SELECT auth.uid()) = reporter_id
    AND status = 'pending'
    AND reviewed_at IS NULL
    AND reviewed_by IS NULL
  );
ALTER POLICY "Read own reports or staff" ON public.build_reports
  USING ((SELECT auth.uid()) = reporter_id OR (SELECT public.is_portal_staff()));
ALTER POLICY "Staff review reports" ON public.build_reports
  USING ((SELECT public.is_portal_staff()))
  WITH CHECK ((SELECT public.is_portal_staff()));

ALTER POLICY "Gracz może cofnąć polubienie" ON public.build_upvotes TO authenticated
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Zalogowani mogą dawać polubienia" ON public.build_upvotes TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Users can remove own build vote" ON public.build_votes
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can add own build vote" ON public.build_votes
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Users can update own build vote" ON public.build_votes
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

ALTER POLICY "Delete own builds" ON public.builds
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Publish own visible builds" ON public.builds
  WITH CHECK ((SELECT auth.uid()) = user_id AND status = 'visible');
ALTER POLICY "Staff moderate builds" ON public.builds
  USING ((SELECT public.is_portal_staff()))
  WITH CHECK ((SELECT public.is_portal_staff()));

ALTER POLICY "Delete own chat" ON public.chat_messages
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Publish own visible chat" ON public.chat_messages
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND status = 'visible'
    AND channel = 'GLOBALNY'
    AND char_length(btrim(text)) BETWEEN 1 AND 500
  );
ALTER POLICY "Staff moderate chat" ON public.chat_messages
  USING ((SELECT public.is_portal_staff()))
  WITH CHECK ((SELECT public.is_portal_staff()));

ALTER POLICY "Zalogowani zapisują się" ON public.expedition_signups TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);
ALTER POLICY "Gracz/Admin usuwa zapis" ON public.expedition_signups TO authenticated
  USING ((SELECT auth.uid()) = user_id OR (SELECT public.is_portal_admin()));

ALTER POLICY "Delete own expeditions" ON public.expeditions
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Publish own visible expeditions" ON public.expeditions
  WITH CHECK ((SELECT auth.uid()) = user_id AND status = 'visible');
ALTER POLICY "Staff moderate expeditions" ON public.expeditions
  USING ((SELECT public.is_portal_staff()))
  WITH CHECK ((SELECT public.is_portal_staff()));

ALTER POLICY "Delete own guilds" ON public.guilds
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Publish own visible guilds" ON public.guilds
  WITH CHECK ((SELECT auth.uid()) = user_id AND status = 'visible');
ALTER POLICY "Staff moderate guilds" ON public.guilds
  USING ((SELECT public.is_portal_staff()))
  WITH CHECK ((SELECT public.is_portal_staff()));

ALTER POLICY "Staff can read integration checks" ON public.integration_checks
  USING ((SELECT public.is_portal_staff()));

ALTER POLICY "Delete own market" ON public.market_items
  USING ((SELECT auth.uid()) = user_id);
ALTER POLICY "Publish own visible market" ON public.market_items
  WITH CHECK ((SELECT auth.uid()) = user_id AND status = 'visible');
ALTER POLICY "Staff moderate market" ON public.market_items
  USING ((SELECT public.is_portal_staff()))
  WITH CHECK ((SELECT public.is_portal_staff()));

ALTER POLICY "Staff can read moderation audit" ON public.moderation_audit_log
  USING ((SELECT public.is_portal_staff()));
ALTER POLICY "Staff can read system events" ON public.system_events
  USING ((SELECT public.is_portal_staff()));

-- Publiczne odczyty widzą tylko treści visible. Własne i moderowane rekordy
-- są dostępne wyłącznie zalogowanym, więc helpery personelu nie muszą być RPC anon.
DROP POLICY IF EXISTS "Read visible comments or own and staff" ON public.build_comments;
CREATE POLICY "Anon reads visible comments" ON public.build_comments
  FOR SELECT TO anon USING (status = 'visible');
CREATE POLICY "Members read visible own or staff comments" ON public.build_comments
  FOR SELECT TO authenticated
  USING (status = 'visible' OR (SELECT auth.uid()) = user_id OR (SELECT public.is_portal_staff()));

DROP POLICY IF EXISTS "Read visible builds or own and staff" ON public.builds;
CREATE POLICY "Anon reads visible builds" ON public.builds
  FOR SELECT TO anon USING (status = 'visible');
CREATE POLICY "Members read visible own or staff builds" ON public.builds
  FOR SELECT TO authenticated
  USING (status = 'visible' OR (SELECT auth.uid()) = user_id OR (SELECT public.is_portal_staff()));

DROP POLICY IF EXISTS "Read visible chat or own and staff" ON public.chat_messages;
CREATE POLICY "Anon reads visible chat" ON public.chat_messages
  FOR SELECT TO anon USING (status = 'visible');
CREATE POLICY "Members read visible own or staff chat" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (status = 'visible' OR (SELECT auth.uid()) = user_id OR (SELECT public.is_portal_staff()));

DROP POLICY IF EXISTS "Read visible expeditions or own and staff" ON public.expeditions;
CREATE POLICY "Anon reads visible expeditions" ON public.expeditions
  FOR SELECT TO anon USING (status = 'visible');
CREATE POLICY "Members read visible own or staff expeditions" ON public.expeditions
  FOR SELECT TO authenticated
  USING (status = 'visible' OR (SELECT auth.uid()) = user_id OR (SELECT public.is_portal_staff()));

DROP POLICY IF EXISTS "Read visible guilds or own and staff" ON public.guilds;
CREATE POLICY "Anon reads visible guilds" ON public.guilds
  FOR SELECT TO anon USING (status = 'visible');
CREATE POLICY "Members read visible own or staff guilds" ON public.guilds
  FOR SELECT TO authenticated
  USING (status = 'visible' OR (SELECT auth.uid()) = user_id OR (SELECT public.is_portal_staff()));

DROP POLICY IF EXISTS "Read visible market or own and staff" ON public.market_items;
CREATE POLICY "Anon reads visible market" ON public.market_items
  FOR SELECT TO anon USING (status = 'visible');
CREATE POLICY "Members read visible own or staff market" ON public.market_items
  FOR SELECT TO authenticated
  USING (status = 'visible' OR (SELECT auth.uid()) = user_id OR (SELECT public.is_portal_staff()));

-- Indeksy pokrywające wszystkie klucze obce zgłoszone przez Database Advisor.
CREATE INDEX IF NOT EXISTS build_comments_moderated_by_idx ON public.build_comments (moderated_by);
CREATE INDEX IF NOT EXISTS build_reports_build_id_idx ON public.build_reports (build_id);
CREATE INDEX IF NOT EXISTS build_reports_comment_build_idx ON public.build_reports (comment_id, build_id);
CREATE INDEX IF NOT EXISTS build_reports_reviewed_by_idx ON public.build_reports (reviewed_by);
CREATE INDEX IF NOT EXISTS build_upvotes_user_id_idx ON public.build_upvotes (user_id);
CREATE INDEX IF NOT EXISTS builds_moderated_by_idx ON public.builds (moderated_by);
CREATE INDEX IF NOT EXISTS builds_user_id_idx ON public.builds (user_id);
CREATE INDEX IF NOT EXISTS chat_messages_moderated_by_idx ON public.chat_messages (moderated_by);
CREATE INDEX IF NOT EXISTS chat_messages_user_id_idx ON public.chat_messages (user_id);
CREATE INDEX IF NOT EXISTS expedition_signups_expedition_id_idx ON public.expedition_signups (expedition_id);
CREATE INDEX IF NOT EXISTS expedition_signups_user_id_idx ON public.expedition_signups (user_id);
CREATE INDEX IF NOT EXISTS expeditions_moderated_by_idx ON public.expeditions (moderated_by);
CREATE INDEX IF NOT EXISTS expeditions_user_id_idx ON public.expeditions (user_id);
CREATE INDEX IF NOT EXISTS guilds_moderated_by_idx ON public.guilds (moderated_by);
CREATE INDEX IF NOT EXISTS guilds_user_id_idx ON public.guilds (user_id);
CREATE INDEX IF NOT EXISTS market_items_moderated_by_idx ON public.market_items (moderated_by);
CREATE INDEX IF NOT EXISTS market_items_user_id_idx ON public.market_items (user_id);
CREATE INDEX IF NOT EXISTS market_posts_user_id_idx ON public.market_posts (user_id);

COMMIT;
