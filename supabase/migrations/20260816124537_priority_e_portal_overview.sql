-- Priority E.1: one inexpensive aggregate for the authenticated portal dashboard.
-- The Next.js API calls this with service_role after validating the user's JWT.
CREATE OR REPLACE FUNCTION public.portal_overview_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT jsonb_build_object(
    'verifiedPlayers', (SELECT count(*) FROM public.profiles WHERE is_verified IS TRUE),
    'totalPvpFame', (SELECT COALESCE(sum(pvp_fame), 0) FROM public.profiles WHERE is_verified IS TRUE),
    'activeBuilds', (SELECT count(*) FROM public.builds WHERE status = 'visible'),
    'activeMarketOffers', (SELECT count(*) FROM public.market_items WHERE status = 'visible'),
    'guildsCount', (SELECT count(*) FROM public.guilds WHERE status = 'visible')
  );
$$;

REVOKE ALL ON FUNCTION public.portal_overview_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.portal_overview_stats() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_overview_stats() TO service_role;
