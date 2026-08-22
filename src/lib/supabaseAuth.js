import { GoTrueClient } from '@supabase/auth-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Brak publicznej konfiguracji Supabase.')
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
const isBrowser = typeof window !== 'undefined'

// The portal shell only needs Auth. Keeping it separate prevents PostgREST,
// Realtime, Storage and Functions from blocking the first interaction.
export const portalAuth = new GoTrueClient({
  url: `${supabaseUrl}/auth/v1`,
  headers: {
    Authorization: `Bearer ${supabaseAnonKey}`,
    apikey: supabaseAnonKey,
  },
  storageKey: `sb-${projectRef}-auth-token`,
  // Client modules can also be evaluated while Next renders on the server.
  // Never start the auth refresh interval outside the browser.
  autoRefreshToken: isBrowser,
  persistSession: isBrowser,
  detectSessionInUrl: isBrowser,
  flowType: 'implicit',
})
