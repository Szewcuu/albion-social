export const PUBLIC_PORTAL_PATHS = new Set([
  '/',
  '/regulamin',
  '/prywatnosc',
  '/auth/callback',
])

export function isPublicPortalPath(pathname) {
  return PUBLIC_PORTAL_PATHS.has(pathname)
}
