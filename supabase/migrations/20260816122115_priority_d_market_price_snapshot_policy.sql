-- Make the intentional server-only access model explicit to the RLS linter.

BEGIN;

CREATE POLICY "Clients cannot read market price snapshots"
  ON public.market_price_snapshots FOR SELECT TO anon, authenticated
  USING (false);

COMMIT;
