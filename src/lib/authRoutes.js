export const PUBLIC_PORTAL_PATHS = new Set([
  '/',
  '/regulamin',
  '/prywatnosc',
  '/auth/callback',
  '/auth/confirm',
  '/auth/nowe-haslo',
])

export function isPublicPortalPath(pathname) {
  return PUBLIC_PORTAL_PATHS.has(pathname)
}
