import { createClient } from '@supabase/supabase-js'

function requiredEnvironment(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export async function createE2EUserSession() {
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
    throw new Error(`E2E session link failed: ${linkError?.message || 'missing one-time token'}`)
  }

  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('role, is_admin')
    .eq('id', link.user.id)
    .maybeSingle()

  if (profileError || !profile) {
    throw new Error(`E2E member verification failed: ${profileError?.message || 'missing profile'}`)
  }
  if (profile.is_admin === true || ['moderator', 'admin'].includes(profile.role)) {
    throw new Error('E2E account must be a dedicated non-staff member.')
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.verifyOtp({
    token_hash: link.properties.hashed_token,
    type: link.properties.verification_type || 'magiclink',
  })

  if (error || !data.session) {
    throw new Error(`E2E session exchange failed: ${error?.message || 'missing session'}`)
  }

  return {
    session: data.session,
    projectRef: new URL(supabaseUrl).hostname.split('.')[0],
  }
}
