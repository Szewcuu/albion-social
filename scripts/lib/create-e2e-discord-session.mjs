import { createClient } from '@supabase/supabase-js'

function requiredEnvironment(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

function userProviders(user) {
  return new Set([
    user?.app_metadata?.provider,
    ...(Array.isArray(user?.app_metadata?.providers) ? user.app_metadata.providers : []),
    ...(Array.isArray(user?.identities) ? user.identities.map((identity) => identity.provider) : []),
  ].filter(Boolean))
}

export async function createE2EDiscordSession() {
  const supabaseUrl = requiredEnvironment('NEXT_PUBLIC_SUPABASE_URL')
  const supabaseAnonKey = requiredEnvironment('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  const serviceRoleKey = requiredEnvironment('SUPABASE_SERVICE_ROLE_KEY')
  const email = requiredEnvironment('E2E_USER_EMAIL')

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  if (linkError || !link?.properties?.hashed_token || !link.user) {
    throw new Error(`E2E Discord session link failed: ${linkError?.message || 'missing one-time token'}`)
  }

  if (!userProviders(link.user).has('discord')) {
    throw new Error('E2E user must be an existing account linked through Discord OAuth.')
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: link.properties.verification_type || 'magiclink',
  })

  if (error || !data.session) {
    throw new Error(`E2E Discord session exchange failed: ${error?.message || 'missing session'}`)
  }

  return {
    session: data.session,
    projectRef: new URL(supabaseUrl).hostname.split('.')[0],
  }
}
