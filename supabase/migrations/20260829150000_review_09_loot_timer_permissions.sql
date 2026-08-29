-- Review 09: raporty Loot Splitu są niezmiennymi wersjami i nie mogą być aktualizowane przez klienta.

BEGIN;

REVOKE ALL ON public.loot_split_drafts FROM anon;
REVOKE ALL ON public.loot_split_reports FROM anon;

REVOKE UPDATE ON public.loot_split_reports FROM authenticated;
GRANT SELECT, INSERT, DELETE ON public.loot_split_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loot_split_drafts TO authenticated;

GRANT ALL ON public.loot_split_drafts TO service_role;
GRANT ALL ON public.loot_split_reports TO service_role;

COMMIT;
