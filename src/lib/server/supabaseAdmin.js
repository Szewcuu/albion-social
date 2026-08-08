import 'server-only'

import { createClient } from '@supabase/supabase-js'

function readServerConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !anonKey || !serviceRoleKey) {
    throw new Error('Brak wymaganej konfiguracji Supabase po stronie serwera.')
  }

  return { url, anonKey, serviceRoleKey }
}

function readPublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error('Brak publicznej konfiguracji Supabase po stronie serwera.')
  }

  return { url, anonKey }
}

function readBearerToken(request) {
  const authorization = request.headers.get('authorization') || ''
  return authorization.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : ''
}

export function createSupabasePublicServerClient() {
  const { url, anonKey } = readPublicConfig()

  return createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function createSupabaseRequestClient(request) {
  const token = readBearerToken(request)
  if (!token) throw new Error('Brak tokenu użytkownika.')

  const { url, anonKey } = readPublicConfig()
  return createClient(url, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export function createSupabaseAdminClient() {
  const { url, serviceRoleKey } = readServerConfig()

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export async function requireApiUser(request) {
  const token = readBearerToken(request)

  if (!token) {
    return { error: 'Brak autoryzacji.', status: 401 }
  }

  const { url, anonKey } = readPublicConfig()
  const authClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
  const { data, error } = await authClient.auth.getUser(token)

  if (error || !data.user) {
    return { error: 'Sesja wygasła lub jest nieprawidłowa.', status: 401 }
  }

  return { user: data.user }
}

export async function getPortalRole(supabaseClient, userId) {
  const { data, error } = await supabaseClient
    .from('profiles')
    .select('role, is_admin')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw new Error('Nie udało się sprawdzić roli użytkownika.')
  }

  if (data?.is_admin === true) return 'admin'
  return ['member', 'moderator', 'admin'].includes(data?.role) ? data.role : 'member'
}

export async function isPortalAdmin(supabaseClient, userId) {
  return (await getPortalRole(supabaseClient, userId)) === 'admin'
}

export async function isPortalStaff(supabaseClient, userId) {
  return ['moderator', 'admin'].includes(await getPortalRole(supabaseClient, userId))
}
