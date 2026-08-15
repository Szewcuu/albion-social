-- Priorytet C.5: wątkowane komentarze, bezpieczna edycja autora i sortowanie dyskusji.

BEGIN;

ALTER TABLE public.build_comments
  ADD COLUMN IF NOT EXISTS parent_id UUID
    REFERENCES public.build_comments(id)
    ON DELETE SET NULL;

ALTER TABLE public.build_comments
  DROP CONSTRAINT IF EXISTS build_comments_parent_not_self;
ALTER TABLE public.build_comments
  ADD CONSTRAINT build_comments_parent_not_self
    CHECK (parent_id IS NULL OR parent_id <> id);

CREATE INDEX IF NOT EXISTS build_comments_parent_created_idx
  ON public.build_comments (parent_id, created_at ASC)
  WHERE parent_id IS NOT NULL AND status = 'visible';

CREATE OR REPLACE FUNCTION private.validate_build_comment_parent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  ancestor_id UUID := NEW.parent_id;
  ancestor_build_id UUID;
  ancestor_parent_id UUID;
  ancestor_status TEXT;
  current_depth INTEGER := 0;
BEGIN
  WHILE ancestor_id IS NOT NULL LOOP
    current_depth := current_depth + 1;
    IF current_depth > 3 THEN
      RAISE EXCEPTION 'build_comment_thread_too_deep' USING ERRCODE = '23514';
    END IF;

    SELECT build_id, parent_id, status
      INTO ancestor_build_id, ancestor_parent_id, ancestor_status
      FROM public.build_comments
      WHERE id = ancestor_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'build_comment_parent_not_found' USING ERRCODE = '23503';
    END IF;

    IF ancestor_build_id <> NEW.build_id THEN
      RAISE EXCEPTION 'build_comment_parent_build_mismatch' USING ERRCODE = '23514';
    END IF;

    IF current_depth = 1 AND ancestor_status <> 'visible' THEN
      RAISE EXCEPTION 'build_comment_parent_not_visible' USING ERRCODE = '23514';
    END IF;

    ancestor_id := ancestor_parent_id;
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.validate_build_comment_parent() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS validate_build_comment_parent_trigger ON public.build_comments;
CREATE TRIGGER validate_build_comment_parent_trigger
BEFORE INSERT OR UPDATE OF parent_id, build_id ON public.build_comments
FOR EACH ROW
EXECUTE FUNCTION private.validate_build_comment_parent();

DROP POLICY IF EXISTS "Edit own visible comments" ON public.build_comments;
CREATE POLICY "Edit own visible comments"
  ON public.build_comments
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) = user_id
    AND status = 'visible'
  )
  WITH CHECK (
    (SELECT auth.uid()) = user_id
    AND status = 'visible'
  );

-- Od października 2026 Supabase wymaga jawnych grantów Data API. Ograniczamy
-- je przy okazji do kolumn rzeczywiście potrzebnych klientowi.
REVOKE ALL ON TABLE public.build_comments FROM anon, authenticated;
GRANT SELECT ON TABLE public.build_comments TO anon, authenticated;
GRANT INSERT (build_id, user_id, content, parent_id) ON TABLE public.build_comments TO authenticated;
GRANT DELETE ON TABLE public.build_comments TO authenticated;
GRANT UPDATE (content, updated_at) ON TABLE public.build_comments TO authenticated;
GRANT UPDATE (status, moderated_at, moderated_by) ON TABLE public.build_comments TO authenticated;

COMMIT;
