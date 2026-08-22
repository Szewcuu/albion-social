import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Brak publicznej konfiguracji Supabase.')
}

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components nie mogą zapisywać cookies. Odświeżanie sesji
          // wykonuje src/proxy.js, a Route Handlers mogą zapisać je normalnie.
        }
      },
    },
  })
}

export async function getServerPortalUser() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getClaims()
  const claims = data?.claims

  if (error || !claims?.sub) return null

  return {
    id: claims.sub,
    email: claims.email || null,
    app_metadata: claims.app_metadata || {},
    user_metadata: claims.user_metadata || {},
  }
}
