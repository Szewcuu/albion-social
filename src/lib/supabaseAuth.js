import { GoTrueClient } from '@supabase/auth-js'
import {
  combineChunks,
  createChunks,
  stringFromBase64URL,
  stringToBase64URL,
} from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Brak publicznej konfiguracji Supabase.')
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
export const LEGACY_AUTH_STORAGE_KEY = `sb-${projectRef}-auth-token`

function browserCookies() {
  if (typeof document === 'undefined') return new Map()

  return new Map(document.cookie.split(';').flatMap((entry) => {
    const separator = entry.indexOf('=')
    if (separator < 0) return []
    const name = decodeURIComponent(entry.slice(0, separator).trim())
    const value = decodeURIComponent(entry.slice(separator + 1))
    return [[name, value]]
  }))
}

function writeCookie(name, value, maxAge = 400 * 24 * 60 * 60) {
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`
}

const cookieStorage = {
  isServer: typeof window === 'undefined',
  async getItem(key) {
    const cookies = browserCookies()
    const value = await combineChunks(key, (name) => cookies.get(name) || null)
    if (!value) return null
    return value.startsWith('base64-')
      ? stringFromBase64URL(value.slice('base64-'.length))
      : value
  },
  async setItem(key, value) {
    const cookies = browserCookies()
    const oldNames = [...cookies.keys()].filter((name) => name === key || name.startsWith(`${key}.`))
    const chunks = createChunks(key, `base64-${stringToBase64URL(value)}`)
    const newNames = new Set(chunks.map(({ name }) => name))

    oldNames.filter((name) => !newNames.has(name)).forEach((name) => writeCookie(name, '', 0))
    chunks.forEach(({ name, value: chunk }) => writeCookie(name, chunk))
  },
  async removeItem(key) {
    const cookies = browserCookies()
    ;[...cookies.keys()]
      .filter((name) => name === key || name.startsWith(`${key}.`))
      .forEach((name) => writeCookie(name, '', 0))
  },
}

const authClient = new GoTrueClient({
  url: `${supabaseUrl}/auth/v1`,
  headers: {
    Authorization: `Bearer ${supabaseAnonKey}`,
    apikey: supabaseAnonKey,
  },
  storageKey: LEGACY_AUTH_STORAGE_KEY,
  storage: cookieStorage,
  autoRefreshToken: typeof window !== 'undefined',
  persistSession: true,
  detectSessionInUrl: false,
  flowType: 'pkce',
})

// Zachowuje spójny interfejs z pełnym SupabaseClient, nie dołączając do
// startowego bundla PostgREST, Realtime, Storage ani Functions.
export const portalAuth = { auth: authClient }

function hasCookieSession() {
  return document.cookie
    .split(';')
    .some((entry) => entry.trim().split('=')[0]?.startsWith(LEGACY_AUTH_STORAGE_KEY))
}

export async function migrateLegacyBrowserSession() {
  if (typeof window === 'undefined') return false

  const rawSession = window.localStorage.getItem(LEGACY_AUTH_STORAGE_KEY)
  if (!rawSession) return false

  if (hasCookieSession()) {
    window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY)
    return false
  }

  try {
    const legacySession = JSON.parse(rawSession)
    if (!legacySession?.access_token || !legacySession?.refresh_token) return false

    const { error } = await portalAuth.auth.setSession({
      access_token: legacySession.access_token,
      refresh_token: legacySession.refresh_token,
    })
    if (error) return false

    window.localStorage.removeItem(LEGACY_AUTH_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
