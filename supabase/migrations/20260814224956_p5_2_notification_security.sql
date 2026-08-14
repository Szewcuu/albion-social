-- P5.2: powiadomienia do innych użytkowników tworzy wyłącznie backend.

BEGIN;

DROP POLICY IF EXISTS "Zalogowani mogą tworzyć powiadomienia"
ON public.notifications;

REVOKE INSERT ON public.notifications FROM anon, authenticated;
GRANT INSERT ON public.notifications TO service_role;

COMMIT;
