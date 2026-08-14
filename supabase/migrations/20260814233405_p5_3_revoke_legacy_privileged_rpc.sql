-- P5.3 faza 2: kod produkcyjny korzysta już wyłącznie z serwerowych RPC.
-- Stare sygnatury pozostają dla zgodności historii, ale żadna rola API nie
-- może ich już wywołać bezpośrednio.

BEGIN;

REVOKE ALL ON FUNCTION public.moderate_content_batch(TEXT, UUID[], TEXT, TEXT)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.review_build_report(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.review_build_reports_batch(UUID[], TEXT, TEXT)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.set_portal_role(UUID, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated, service_role;

COMMIT;
