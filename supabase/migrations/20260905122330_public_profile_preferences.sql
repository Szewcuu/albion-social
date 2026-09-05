ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS favorite_roles TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  ADD COLUMN IF NOT EXISTS featured_build_ids UUID[] NOT NULL DEFAULT '{}'::UUID[];

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_favorite_roles_valid,
  ADD CONSTRAINT profiles_favorite_roles_valid CHECK (
    cardinality(favorite_roles) <= 4
    AND favorite_roles <@ ARRAY['Tank', 'Healer', 'DPS', 'Support']::TEXT[]
  ),
  DROP CONSTRAINT IF EXISTS profiles_featured_build_ids_limit,
  ADD CONSTRAINT profiles_featured_build_ids_limit CHECK (
    cardinality(featured_build_ids) <= 3
  );

REVOKE ALL (favorite_roles, featured_build_ids) ON public.profiles FROM anon, authenticated;
GRANT SELECT (favorite_roles, featured_build_ids) ON public.profiles TO anon, authenticated;

COMMENT ON COLUMN public.profiles.favorite_roles IS
  'Publiczne role wybrane przez właściciela profilu; zapisywane wyłącznie przez chronione API.';
COMMENT ON COLUMN public.profiles.featured_build_ids IS
  'Uporządkowane identyfikatory maksymalnie trzech publicznych buildów właściciela; zapisywane wyłącznie przez chronione API.';
