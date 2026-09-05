-- Keep the activity centre fast without introducing a second source of truth.
CREATE INDEX IF NOT EXISTS notifications_user_created_at_id_idx
  ON public.notifications (user_id, created_at DESC, id DESC);

-- Classify legacy rows so existing activity appears under the new filters.
UPDATE public.notifications
SET type = 'market_message'
WHERE type IN ('info', 'success')
  AND (
    lower(COALESCE(title, '')) LIKE ANY (ARRAY['%rynek%', '%ofert%', '%wiadomość handlowa%'])
    OR lower(COALESCE(message, '')) LIKE ANY (ARRAY['%rynek%', '%ofert%', '%wiadomość handlowa%'])
  );

UPDATE public.notifications
SET type = CASE
  WHEN lower(COALESCE(title, '')) LIKE '%skład skompletowany%' THEN 'expedition_full'
  ELSE 'expedition_joined'
END
WHERE type IN ('info', 'success')
  AND (
    lower(COALESCE(title, '')) LIKE ANY (ARRAY['%wypraw%', '%skład skompletowany%', '%gracz w drużynie%'])
    OR lower(COALESCE(message, '')) LIKE '%wypraw%'
  );

COMMENT ON INDEX public.notifications_user_created_at_id_idx IS
  'Cursor pagination for the authenticated activity centre.';
