-- P4.2: moderowalne komentarze i prywatne zgłoszenia nadużyć pod buildami.

BEGIN;

CREATE OR REPLACE FUNCTION public.is_portal_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT profiles.is_admin FROM public.profiles WHERE profiles.id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_portal_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_portal_admin() TO authenticated;

CREATE TABLE IF NOT EXISTS public.build_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL REFERENCES public.builds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT build_comments_content_length CHECK (char_length(btrim(content)) BETWEEN 2 AND 1000),
  CONSTRAINT build_comments_status_check CHECK (status IN ('visible', 'hidden', 'removed')),
  CONSTRAINT build_comments_id_build_unique UNIQUE (id, build_id)
);

CREATE TABLE IF NOT EXISTS public.build_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  build_id UUID NOT NULL REFERENCES public.builds(id) ON DELETE CASCADE,
  comment_id UUID,
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT build_reports_comment_target_fk
    FOREIGN KEY (comment_id, build_id)
    REFERENCES public.build_comments(id, build_id)
    ON DELETE CASCADE,
  CONSTRAINT build_reports_reason_check
    CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'misinformation', 'other')),
  CONSTRAINT build_reports_details_length
    CHECK (details IS NULL OR char_length(btrim(details)) BETWEEN 2 AND 500),
  CONSTRAINT build_reports_status_check
    CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned'))
);

CREATE INDEX IF NOT EXISTS build_comments_build_created_idx
ON public.build_comments (build_id, created_at DESC)
WHERE status = 'visible';

CREATE INDEX IF NOT EXISTS build_comments_user_idx
ON public.build_comments (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS build_reports_moderation_queue_idx
ON public.build_reports (status, created_at ASC);

CREATE UNIQUE INDEX IF NOT EXISTS build_reports_one_build_report_per_user
ON public.build_reports (reporter_id, build_id)
WHERE comment_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS build_reports_one_comment_report_per_user
ON public.build_reports (reporter_id, comment_id)
WHERE comment_id IS NOT NULL;

ALTER TABLE public.build_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.build_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read visible build comments"
ON public.build_comments FOR SELECT
USING (status = 'visible');

CREATE POLICY "Admins can read all build comments"
ON public.build_comments FOR SELECT TO authenticated
USING (public.is_portal_admin());

CREATE POLICY "Users can add own build comments"
ON public.build_comments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'visible');

CREATE POLICY "Users can remove own build comments"
ON public.build_comments FOR DELETE TO authenticated
USING (auth.uid() = user_id OR public.is_portal_admin());

CREATE POLICY "Admins can moderate build comments"
ON public.build_comments FOR UPDATE TO authenticated
USING (public.is_portal_admin())
WITH CHECK (public.is_portal_admin());

CREATE POLICY "Users can read own build reports"
ON public.build_reports FOR SELECT TO authenticated
USING (auth.uid() = reporter_id OR public.is_portal_admin());

CREATE POLICY "Users can add own build reports"
ON public.build_reports FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = reporter_id
  AND status = 'pending'
  AND reviewed_at IS NULL
  AND reviewed_by IS NULL
  AND (
    comment_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.build_comments
      WHERE build_comments.id = build_reports.comment_id
        AND build_comments.build_id = build_reports.build_id
        AND build_comments.status = 'visible'
    )
  )
);

CREATE POLICY "Admins can moderate build reports"
ON public.build_reports FOR UPDATE TO authenticated
USING (public.is_portal_admin())
WITH CHECK (public.is_portal_admin());

GRANT SELECT ON public.build_comments TO anon, authenticated;
GRANT INSERT, DELETE ON public.build_comments TO authenticated;
GRANT UPDATE (status, updated_at) ON public.build_comments TO authenticated;
GRANT SELECT, INSERT ON public.build_reports TO authenticated;
GRANT UPDATE (status, reviewed_at, reviewed_by) ON public.build_reports TO authenticated;

COMMIT;
