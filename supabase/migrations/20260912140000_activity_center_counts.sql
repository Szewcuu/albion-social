CREATE OR REPLACE FUNCTION public.get_notification_counts(p_user_id UUID)
RETURNS TABLE (
  all_count BIGINT,
  replies_count BIGINT,
  likes_count BIGINT,
  expeditions_count BIGINT,
  market_count BIGINT,
  unread_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    COUNT(*) AS all_count,
    COUNT(*) FILTER (WHERE type IN ('build_comment', 'build_comment_reply')) AS replies_count,
    COUNT(*) FILTER (WHERE type = 'build_like') AS likes_count,
    COUNT(*) FILTER (WHERE type IN ('expedition_invite', 'expedition_joined', 'expedition_full')) AS expeditions_count,
    COUNT(*) FILTER (WHERE type = 'market_message') AS market_count,
    COUNT(*) FILTER (WHERE is_read = false) AS unread_count
  FROM public.notifications
  WHERE user_id = p_user_id;
$$;

REVOKE ALL ON FUNCTION public.get_notification_counts(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_notification_counts(UUID) TO authenticated;
