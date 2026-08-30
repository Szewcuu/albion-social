-- F1.5: a private, account-scoped product-direction pulse. Raw votes are
-- available only to the trusted backend; the portal exposes aggregates.

BEGIN;

CREATE TABLE public.product_direction_votes (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT product_direction_votes_direction_check
    CHECK (direction IN ('community', 'market', 'guild_tools'))
);

COMMENT ON TABLE public.product_direction_votes IS
  'Private account-scoped choices for the F1.5 product-direction test. Only aggregate results are shown in the portal.';

ALTER TABLE public.product_direction_votes ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.product_direction_votes
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.product_direction_votes TO service_role;

COMMIT;
