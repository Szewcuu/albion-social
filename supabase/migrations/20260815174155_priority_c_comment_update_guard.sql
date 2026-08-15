-- Autor edytuje wyłącznie treść; wspólny grant kolumn moderacyjnych pozostaje
-- dostępny dla panelu personelu, ale trigger blokuje jego użycie przez członków.

BEGIN;

CREATE OR REPLACE FUNCTION private.guard_build_comment_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT (SELECT public.is_portal_staff()) THEN
    IF NEW.id IS DISTINCT FROM OLD.id
      OR NEW.build_id IS DISTINCT FROM OLD.build_id
      OR NEW.user_id IS DISTINCT FROM OLD.user_id
      OR NEW.parent_id IS DISTINCT FROM OLD.parent_id
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
      OR NEW.moderated_at IS DISTINCT FROM OLD.moderated_at
      OR NEW.moderated_by IS DISTINCT FROM OLD.moderated_by
    THEN
      RAISE EXCEPTION 'build_comment_protected_fields' USING ERRCODE = '42501';
    END IF;

    NEW.updated_at := pg_catalog.timezone('utc', pg_catalog.now());
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.guard_build_comment_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_build_comment_update_trigger ON public.build_comments;
CREATE TRIGGER guard_build_comment_update_trigger
BEFORE UPDATE ON public.build_comments
FOR EACH ROW
EXECUTE FUNCTION private.guard_build_comment_update();

COMMIT;
