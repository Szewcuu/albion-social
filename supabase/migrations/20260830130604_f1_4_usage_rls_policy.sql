BEGIN;

CREATE POLICY "No direct feature usage access"
ON public.feature_usage_daily
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

COMMIT;
