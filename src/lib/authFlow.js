export const AUTH_CALLBACK_PATH = '/auth/callback'

export function safePortalNext(value, fallback = '/') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return fallback
  return value
}

export function authCallbackUrl(next = '/') {
  if (typeof window === 'undefined') return AUTH_CALLBACK_PATH
  const url = new URL(AUTH_CALLBACK_PATH, window.location.origin)
  url.searchParams.set('next', safePortalNext(next))
  return url.toString()
}

export function validatePortalPassword(password) {
  const value = String(password || '')
  const checks = {
    length: value.length >= 10,
    lowercase: /[a-ząćęłńóśźż]/.test(value),
    uppercase: /[A-ZĄĆĘŁŃÓŚŹŻ]/.test(value),
    number: /\d/.test(value),
    special: /[^A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż\d]/.test(value),
  }

  return {
    checks,
    valid: Object.values(checks).every(Boolean),
  }
}

export function friendlyAuthError(error, fallback = 'Nie udało się wykonać operacji. Spróbuj ponownie.') {
  const message = String(error?.message || '').toLowerCase()

  if (message.includes('invalid login credentials')) return 'Nieprawidłowy e-mail lub hasło.'
  if (message.includes('email not confirmed')) return 'Najpierw potwierdź adres e-mail przez wiadomość, którą wysłaliśmy.'
  if (message.includes('user already registered')) return 'Konto z tym adresem już istnieje. Zaloguj się albo odzyskaj hasło.'
  if (message.includes('password should be')) return 'Hasło nie spełnia wymagań bezpieczeństwa.'
  if (message.includes('rate limit') || message.includes('over_email_send_rate_limit')) return 'Wysłano zbyt wiele próśb. Odczekaj chwilę i spróbuj ponownie.'
  if (message.includes('provider is not enabled') || message.includes('unsupported provider')) return 'Ta metoda logowania nie została jeszcze włączona przez administratora.'
  if (message.includes('email signups are disabled') || error?.code === 'email_provider_disabled') return 'Rejestracja przez e-mail jest chwilowo wyłączona w konfiguracji portalu.'
  if (message.includes('manual linking is disabled')) return 'Łączenie kont nie jest jeszcze włączone w konfiguracji portalu.'
  if (message.includes('identity is already linked')) return 'To konto jest już połączone z innym profilem.'
  if (message.includes('same password')) return 'Nowe hasło musi różnić się od obecnego.'
  if (message.includes('captcha') || message.includes('turnstile')) return 'Nie udało się przejść ochrony przed botami. Odśwież zabezpieczenie i spróbuj ponownie.'

  return fallback
}

export function hasAuthIdentity(user, provider) {
  return Boolean(user?.identities?.some((identity) => identity.provider === provider))
}
