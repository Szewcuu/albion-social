-- Keep the persisted region key aligned with the Albion API adapter.

BEGIN;

ALTER TABLE public.entity_follows
  DROP CONSTRAINT IF EXISTS entity_follows_region_check;

ALTER TABLE public.entity_follows
  ADD CONSTRAINT entity_follows_region_check
  CHECK (
    (entity_type = 'albion_player' AND region IN ('europe', 'america', 'asia'))
    OR (entity_type <> 'albion_player' AND region IS NULL)
  );

COMMIT;
