-- Review 11: wewnętrzne dane panelu administratora są dostępne wyłącznie
-- przez autoryzowane Route Handlery używające klucza service_role.

BEGIN;

REVOKE ALL PRIVILEGES ON TABLE public.integration_checks FROM anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TABLE public.system_events FROM anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TABLE public.moderation_audit_log FROM anon, authenticated, service_role;

GRANT SELECT, INSERT ON TABLE public.integration_checks TO service_role;
GRANT SELECT, INSERT ON TABLE public.system_events TO service_role;
GRANT SELECT, INSERT ON TABLE public.moderation_audit_log TO service_role;

COMMIT;
