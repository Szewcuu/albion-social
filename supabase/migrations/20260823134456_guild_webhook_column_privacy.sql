-- Guild Discord webhooks are backend credentials, not public profile data.
-- RLS limits rows; column privileges prevent clients from selecting the secret.
REVOKE SELECT ON TABLE public.guilds FROM anon, authenticated;

GRANT SELECT (
  id,
  user_id,
  name,
  description,
  activity_type,
  main_city,
  discord_link,
  created_at,
  server,
  status,
  moderated_at,
  moderated_by,
  recruitment_open,
  recruitment_headline,
  updated_at
) ON TABLE public.guilds TO anon, authenticated;

COMMENT ON COLUMN public.guilds.webhook_url IS
  'Private Discord recruitment webhook. Accessible only through trusted backend roles.';
