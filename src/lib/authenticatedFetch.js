import { supabase } from '@/lib/supabase'

export async function authenticatedFetch(input, init = {}) {
  const { data: { session }, error } = await supabase.auth.getSession()

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
