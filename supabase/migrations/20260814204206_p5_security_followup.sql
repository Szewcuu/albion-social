-- Helpery roli odczytują wyłącznie profil widoczny przez RLS i nie muszą
-- wykonywać się z uprawnieniami właściciela bazy.

BEGIN;

ALTER FUNCTION public.portal_role() SECURITY INVOKER;
ALTER FUNCTION public.is_portal_admin() SECURITY INVOKER;
ALTER FUNCTION public.is_portal_staff() SECURITY INVOKER;

COMMIT;
