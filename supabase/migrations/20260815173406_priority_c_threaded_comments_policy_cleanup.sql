-- Łączymy dwie polityki UPDATE, aby Postgres oceniał jeden warunek na rekord.

BEGIN;

DROP POLICY IF EXISTS "Edit own visible comments" ON public.build_comments;
DROP POLICY IF EXISTS "Staff moderate comments" ON public.build_comments;

CREATE POLICY "Owners edit and staff moderate comments"
  ON public.build_comments
  FOR UPDATE
  TO authenticated
  USING (
    (
      (SELECT auth.uid()) = user_id
      AND status = 'visible'
    )
    OR (SELECT public.is_portal_staff())
  )
  WITH CHECK (
    (
      (SELECT auth.uid()) = user_id
      AND status = 'visible'
    )
    OR (SELECT public.is_portal_staff())
  );

COMMIT;
