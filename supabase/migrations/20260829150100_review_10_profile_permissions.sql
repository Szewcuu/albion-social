-- Review 10: ograniczenie publicznego odczytu profili i bezpieczny zapis karty gracza.

BEGIN;

-- Nowe konto nie powinno być automatycznie przypisywane do Europy.
ALTER TABLE public.profiles
  ALTER COLUMN main_server DROP DEFAULT;

-- Anonimowy klient otrzymuje wyłącznie kolumny rzeczywiście prezentowane
-- na publicznej karcie gracza. RLS nadal określa dostępne wiersze.
REVOKE SELECT ON TABLE public.profiles FROM anon;
GRANT SELECT (
  id,
  username,
  avatar_url,
  created_at,
  ingame_nick,
  main_server,
  guild_name,
  main_role,
  avg_ip,
  is_verified,
  verified_player_id,
  verified_server,
  verified_region,
  pvp_fame,
  pve_fame,
  verified_at,
  bio,
  favorite_builds_public
) ON TABLE public.profiles TO anon;

-- Późniejsza migracja publicznych profili ponownie nadała pełne UPDATE,
-- przez co klient mógł próbować zmieniać pola role/is_admin. Przywracamy
-- zapis tylko pól edytowalnych z formularza profilu.
REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (
  ingame_nick,
  main_server,
  guild_name,
  main_role,
  avg_ip,
  bio,
  favorite_builds_public
) ON TABLE public.profiles TO authenticated;

COMMIT;

