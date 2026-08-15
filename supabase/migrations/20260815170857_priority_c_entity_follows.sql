-- Priority C.4: obserwowanie buildów, gildii, ofert i graczy z powiadomieniami.

BEGIN;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;

CREATE TABLE public.entity_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('build', 'guild', 'market', 'player')),
  entity_id TEXT NOT NULL CHECK (char_length(entity_id) BETWEEN 1 AND 80),
  label TEXT NOT NULL DEFAULT '' CHECK (char_length(label) <= 120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT entity_follows_one_per_user UNIQUE (user_id, entity_type, entity_id)
);

CREATE INDEX entity_follows_entity_idx
  ON public.entity_follows (entity_type, entity_id, created_at);
CREATE INDEX entity_follows_user_created_idx
  ON public.entity_follows (user_id, created_at DESC);

ALTER TABLE public.entity_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own entity follows"
  ON public.entity_follows FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON TABLE public.entity_follows FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.entity_follows TO authenticated;
GRANT ALL ON TABLE public.entity_follows TO service_role;

CREATE OR REPLACE FUNCTION private.notify_entity_followers(
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT,
  p_notification_type TEXT,
  p_actor_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  delivered INTEGER;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link)
  SELECT follows.user_id,
         pg_catalog.left(p_title, 140),
         pg_catalog.left(p_message, 600),
         pg_catalog.left(p_notification_type, 80),
         pg_catalog.left(p_link, 500)
  FROM public.entity_follows AS follows
  WHERE follows.entity_type = p_entity_type
    AND follows.entity_id = p_entity_id
    AND (p_actor_id IS NULL OR follows.user_id <> p_actor_id);

  GET DIAGNOSTICS delivered = ROW_COUNT;
  RETURN delivered;
END;
$$;

REVOKE ALL ON FUNCTION private.notify_entity_followers(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.on_build_created_followers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  author_name TEXT;
BEGIN
  IF NEW.status = 'visible' THEN
    SELECT COALESCE(profiles.ingame_nick, profiles.username, 'Obserwowany gracz')
      INTO author_name FROM public.profiles WHERE id = NEW.user_id;
    PERFORM private.notify_entity_followers(
      'player', NEW.user_id::TEXT, 'Nowy build obserwowanego gracza',
      author_name || ' opublikował build „' || NEW.title || '”.',
      '/buildy/' || NEW.id::TEXT, 'follow_player_build', NEW.user_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.on_build_updated_followers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF ROW(OLD.title, OLD.description, OLD.activity_type, OLD.build_data, OLD.status)
     IS DISTINCT FROM ROW(NEW.title, NEW.description, NEW.activity_type, NEW.build_data, NEW.status) THEN
    PERFORM private.notify_entity_followers(
      'build', NEW.id::TEXT,
      CASE WHEN NEW.status <> 'visible' THEN 'Obserwowany build jest niedostępny' ELSE 'Obserwowany build został zaktualizowany' END,
      CASE WHEN NEW.status <> 'visible' THEN 'Build „' || NEW.title || '” nie jest już publicznie dostępny.' ELSE 'Autor zaktualizował build „' || NEW.title || '”.' END,
      CASE WHEN NEW.status = 'visible' THEN '/buildy/' || NEW.id::TEXT ELSE '/buildy' END,
      'follow_build_update', NEW.user_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.on_build_comment_followers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  build_title TEXT;
BEGIN
  IF NEW.status = 'visible' THEN
    SELECT title INTO build_title FROM public.builds WHERE id = NEW.build_id AND status = 'visible';
    IF build_title IS NOT NULL THEN
      PERFORM private.notify_entity_followers(
        'build', NEW.build_id::TEXT, 'Nowy komentarz pod obserwowanym buildem',
        'Pod buildem „' || build_title || '” pojawił się nowy komentarz.',
        '/buildy/' || NEW.build_id::TEXT || '#comments', 'follow_build_comment', NEW.user_id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.on_guild_event_followers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  guild_name TEXT;
BEGIN
  SELECT name INTO guild_name FROM public.guilds WHERE id = NEW.guild_id AND status = 'visible';
  IF guild_name IS NOT NULL AND NEW.status = 'scheduled' THEN
    PERFORM private.notify_entity_followers(
      'guild', NEW.guild_id::TEXT, 'Nowe wydarzenie obserwowanej gildii',
      guild_name || ' zaplanowała wydarzenie „' || NEW.title || '”.',
      '/kalendarz?event=' || NEW.id::TEXT, 'follow_guild_event', NEW.creator_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.on_guild_updated_followers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF ROW(OLD.recruitment_open, OLD.recruitment_headline, OLD.status)
     IS DISTINCT FROM ROW(NEW.recruitment_open, NEW.recruitment_headline, NEW.status) THEN
    PERFORM private.notify_entity_followers(
      'guild', NEW.id::TEXT,
      CASE WHEN NEW.status <> 'visible' THEN 'Obserwowana gildia jest niedostępna' ELSE 'Zmiana rekrutacji obserwowanej gildii' END,
      CASE
        WHEN NEW.status <> 'visible' THEN 'Gildia „' || NEW.name || '” nie jest już widoczna w rejestrze.'
        WHEN NEW.recruitment_open THEN 'Gildia „' || NEW.name || '” otworzyła rekrutację.'
        ELSE 'Gildia „' || NEW.name || '” zamknęła rekrutację.'
      END,
      CASE WHEN NEW.status = 'visible' THEN '/gildie/' || NEW.id::TEXT ELSE '/gildie' END,
      'follow_guild_update', NEW.user_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.on_market_created_followers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  seller_name TEXT;
BEGIN
  IF NEW.status = 'visible' THEN
    SELECT COALESCE(profiles.ingame_nick, profiles.username, 'Obserwowany gracz')
      INTO seller_name FROM public.profiles WHERE id = NEW.user_id;
    PERFORM private.notify_entity_followers(
      'player', NEW.user_id::TEXT, 'Nowa oferta obserwowanego gracza',
      seller_name || ' wystawił ofertę „' || NEW.title || '”.',
      '/rynek?offer=' || NEW.id::TEXT, 'follow_player_market', NEW.user_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.on_market_updated_followers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  change_message TEXT;
BEGIN
  IF OLD.price IS DISTINCT FROM NEW.price THEN
    change_message := 'Cena oferty „' || NEW.title || '” zmieniła się na ' || NEW.price || ' srebra.';
  ELSIF OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    change_message := 'Oferta „' || NEW.title || '” została odnowiona na kolejne 7 dni.';
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    change_message := CASE WHEN NEW.status = 'visible' THEN 'Oferta „' || NEW.title || '” wróciła na rynek.' ELSE 'Oferta „' || NEW.title || '” nie jest już dostępna.' END;
  END IF;

  IF change_message IS NOT NULL THEN
    PERFORM private.notify_entity_followers(
      'market', NEW.id::TEXT, 'Zmiana obserwowanej oferty', change_message,
      CASE WHEN NEW.status = 'visible' THEN '/rynek?offer=' || NEW.id::TEXT ELSE '/rynek' END,
      'follow_market_update', NEW.user_id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION private.on_market_deleted_followers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.notify_entity_followers(
    'market', OLD.id::TEXT, 'Obserwowana oferta została usunięta',
    'Oferta „' || OLD.title || '” została usunięta z rynku.',
    '/rynek', 'follow_market_deleted', OLD.user_id
  );
  DELETE FROM public.entity_follows WHERE entity_type = 'market' AND entity_id = OLD.id::TEXT;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION private.on_profile_updated_followers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  profile_name TEXT := COALESCE(NEW.ingame_nick, NEW.username, 'Obserwowany gracz');
BEGIN
  IF ROW(OLD.ingame_nick, OLD.main_server, OLD.guild_name, OLD.main_role, OLD.is_verified)
     IS DISTINCT FROM ROW(NEW.ingame_nick, NEW.main_server, NEW.guild_name, NEW.main_role, NEW.is_verified) THEN
    PERFORM private.notify_entity_followers(
      'player', NEW.id::TEXT, 'Profil obserwowanego gracza został zaktualizowany',
      profile_name || ' zaktualizował publiczne informacje o postaci.',
      '/profil/' || NEW.id::TEXT, 'follow_player_update', NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.on_build_created_followers(), private.on_build_updated_followers(), private.on_build_comment_followers(), private.on_guild_event_followers(), private.on_guild_updated_followers(), private.on_market_created_followers(), private.on_market_updated_followers(), private.on_market_deleted_followers(), private.on_profile_updated_followers() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER notify_player_followers_on_build
AFTER INSERT ON public.builds FOR EACH ROW EXECUTE FUNCTION private.on_build_created_followers();
CREATE TRIGGER notify_build_followers_on_update
AFTER UPDATE ON public.builds FOR EACH ROW EXECUTE FUNCTION private.on_build_updated_followers();
CREATE TRIGGER notify_build_followers_on_comment
AFTER INSERT ON public.build_comments FOR EACH ROW EXECUTE FUNCTION private.on_build_comment_followers();
CREATE TRIGGER notify_guild_followers_on_event
AFTER INSERT ON public.guild_events FOR EACH ROW EXECUTE FUNCTION private.on_guild_event_followers();
CREATE TRIGGER notify_guild_followers_on_update
AFTER UPDATE ON public.guilds FOR EACH ROW EXECUTE FUNCTION private.on_guild_updated_followers();
CREATE TRIGGER notify_player_followers_on_market
AFTER INSERT ON public.market_items FOR EACH ROW EXECUTE FUNCTION private.on_market_created_followers();
CREATE TRIGGER notify_market_followers_on_update
AFTER UPDATE ON public.market_items FOR EACH ROW EXECUTE FUNCTION private.on_market_updated_followers();
CREATE TRIGGER notify_market_followers_on_delete
AFTER DELETE ON public.market_items FOR EACH ROW EXECUTE FUNCTION private.on_market_deleted_followers();
CREATE TRIGGER notify_player_followers_on_profile_update
AFTER UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.on_profile_updated_followers();

COMMIT;
