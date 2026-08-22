import { portalAuth } from '@/lib/supabaseAuth'

export async function authenticatedFetch(input, init = {}) {
  const { data: { session }, error } = await portalAuth.auth.getSession()

  if (error || !session?.access_token) {
    throw new Error('Musisz być zalogowany, aby wykonać tę operację.')
  }

  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${session.access_token}`)

  return fetch(input, {
    ...init,
    headers,
  })
}
