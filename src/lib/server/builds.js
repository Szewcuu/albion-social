import 'server-only'

import { cache } from 'react'

import { createSupabasePublicServerClient } from '@/lib/server/supabaseAdmin'

export const isBuildId = (value) => (
  typeof value === 'string'
  && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
)

export const getPublicBuild = cache(async (id) => {
  if (!isBuildId(id)) return null

  const supabase = createSupabasePublicServerClient()
  const { data, error } = await supabase
    .from('builds')
    .select('*, profiles!builds_user_id_fkey(username, avatar_url), build_votes(id, vote_type)')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Nie udało się pobrać publicznego buildu:', error.message)
    throw new Error('Nie udało się pobrać publicznego buildu.')
  }

  return data
})
