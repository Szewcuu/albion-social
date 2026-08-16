import 'server-only'

import { cache } from 'react'

import { isBuildId } from '@/lib/server/builds'
import { createSupabasePublicServerClient } from '@/lib/server/supabaseAdmin'

function validPublicIdentifier(value) {
  return typeof value === 'string' && value.length >= 1 && value.length <= 100
}

export const getPublicGuildMetadata = cache(async (identifier) => {
  if (!validPublicIdentifier(identifier)) return null
  const supabase = createSupabasePublicServerClient()
  let query = supabase
    .from('guilds')
    .select('id, name, description, server, activity_type')
    .eq('status', 'visible')
  query = /^\d+$/.test(identifier) ? query.eq('id', identifier) : query.eq('name', identifier)
  const { data, error } = await query.maybeSingle()
  if (error) {
    console.error('Nie udało się pobrać metadanych gildii:', error.message)
    return null
  }
  return data
})

export const getPublicProfileMetadata = cache(async (identifier) => {
  if (!validPublicIdentifier(identifier)) return null
  const supabase = createSupabasePublicServerClient()
  let query = supabase
    .from('profiles')
    .select('id, username, ingame_nick, bio, main_server, is_verified')
  query = isBuildId(identifier) ? query.eq('id', identifier) : query.eq('username', identifier)
  const { data, error } = await query.maybeSingle()
  if (error) {
    console.error('Nie udało się pobrać metadanych profilu:', error.message)
    return null
  }
  return data
})
