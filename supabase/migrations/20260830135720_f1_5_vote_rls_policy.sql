-- Keep an explicit deny policy as defense in depth and to make the intended
-- server-only access model visible to Supabase security tooling.

CREATE POLICY product_direction_votes_no_direct_access
ON public.product_direction_votes
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);
