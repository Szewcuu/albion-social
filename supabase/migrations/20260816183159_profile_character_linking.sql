-- P1: bezpieczne przypięcie jednej postaci Albion Online do jednego profilu portalu.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS verified_region TEXT;

UPDATE public.profiles
SET verified_region = CASE lower(verified_server)
  WHEN 'europa' THEN 'europe'
  WHEN 'europe' THEN 'europe'
  WHEN 'ameryka' THEN 'america'
  WHEN 'america' THEN 'america'
  WHEN 'azja' THEN 'asia'
  WHEN 'asia' THEN 'asia'
  ELSE NULL
END
WHERE verified_region IS NULL
  AND verified_server IS NOT NULL;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_verified_region_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_verified_region_check
  CHECK (verified_region IS NULL OR verified_region IN ('europe', 'america', 'asia'));

CREATE UNIQUE INDEX IF NOT EXISTS profiles_unique_linked_character_idx
  ON public.profiles (verified_region, lower(verified_player_id))
  WHERE is_verified IS TRUE
    AND verified_region IS NOT NULL
    AND verified_player_id IS NOT NULL;

CREATE OR REPLACE FUNCTION private.protect_profile_character_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  -- Pola przypięcia zapisuje wyłącznie serwer korzystający z service_role.
  IF (SELECT auth.role()) = 'authenticated' THEN
    NEW.is_verified := OLD.is_verified;
    NEW.verified_player_id := OLD.verified_player_id;
    NEW.verified_server := OLD.verified_server;
    NEW.verified_region := OLD.verified_region;
    NEW.pvp_fame := OLD.pvp_fame;
    NEW.pve_fame := OLD.pve_fame;
    NEW.verified_at := OLD.verified_at;

    IF OLD.is_verified IS TRUE THEN
      NEW.ingame_nick := OLD.ingame_nick;
      NEW.guild_name := OLD.guild_name;
      NEW.main_server := OLD.main_server;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.protect_profile_character_link() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS protect_profile_character_link_on_update ON public.profiles;
CREATE TRIGGER protect_profile_character_link_on_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION private.protect_profile_character_link();

COMMIT;
