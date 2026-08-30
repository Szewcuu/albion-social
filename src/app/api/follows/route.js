import { NextResponse } from 'next/server'

import { getWatchEventIds } from '@/lib/playerWatch'
import { marketOfferCutoff } from '@/lib/marketOffers'
import { ALBION_REGIONS, AlbionApiError, getAlbionPlayerWatchSnapshot } from '@/lib/server/albionApi'
import { runPlayerWatchSync } from '@/lib/server/playerWatchSync'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { createSupabaseAdminClient, requireApiUser } from '@/lib/server/supabaseAdmin'
import { cleanAlbionId, cleanEnum, cleanText } from '@/lib/server/validation'

const TYPES = ['build', 'guild', 'market', 'player', 'albion_player']
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const jsonError = (error, status, headers) => NextResponse.json({ error }, { status, headers })

async function readEntity(admin, type, id, region = null) {
  if (type === 'build') {
    if (!UUID_PATTERN.test(id)) return null
    const { data, error } = await admin.from('builds').select('id, user_id, title, status').eq('id', id).eq('status', 'visible').maybeSingle()
    if (error) throw error
    return data && { ownerId: data.user_id, label: data.title }
  }
  if (type === 'guild') {
    if (!/^\d{1,18}$/.test(id)) return null
    const { data, error } = await admin.from('guilds').select('id, user_id, name, status').eq('id', id).eq('status', 'visible').maybeSingle()
    if (error) throw error
    return data && { ownerId: data.user_id, label: data.name }
  }
  if (type === 'market') {
    if (!UUID_PATTERN.test(id)) return null
    const { data, error } = await admin.from('market_items').select('id, user_id, title, status').eq('id', id).eq('status', 'visible').maybeSingle()
    if (error) throw error
    return data && { ownerId: data.user_id, label: data.title }
  }
  if (type === 'albion_player') {
    const playerId = cleanAlbionId(id)
    if (!playerId || !region) return null
    const snapshot = await getAlbionPlayerWatchSnapshot(playerId, region, 20)
    if (!snapshot.player?.id || !snapshot.player?.name) return null
    return {
      ownerId: null,
      label: snapshot.player.name,
      region,
      seenEventIds: getWatchEventIds(snapshot),
      lastEventAt: [...snapshot.kills, ...snapshot.deaths]
        .map((event) => event.timestamp)
        .filter(Boolean)
        .sort()
        .at(-1) || null,
    }
  }
  if (!UUID_PATTERN.test(id)) return null
  const { data, error } = await admin.from('profiles').select('id, username, ingame_nick').eq('id', id).maybeSingle()
  if (error) throw error
  return data && { ownerId: data.id, label: data.ingame_nick || data.username || 'Gracz' }
}

export async function GET(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const admin = createSupabaseAdminClient()
    const [followsResult, buildsResult, guildsResult, marketResult, profilesResult, favoritesResult] = await Promise.all([
      admin
        .from('entity_follows')
        .select('entity_type, entity_id, label, region, last_event_at, last_checked_at, last_summary, last_error, created_at')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
        .limit(500),
      admin.from('builds').select('id', { count: 'exact', head: true }).eq('status', 'visible'),
      admin.from('guilds').select('id', { count: 'exact', head: true }).eq('status', 'visible'),
      admin.from('market_items').select('id', { count: 'exact', head: true }).eq('status', 'visible').gt('created_at', marketOfferCutoff()),
      admin.from('profiles').select('id', { count: 'exact', head: true }),
      admin.from('build_favorites').select('build_id', { count: 'exact', head: true }).eq('user_id', auth.user.id),
    ])
    const { data, error } = followsResult
    if (error) throw error
    const countError = [buildsResult, guildsResult, marketResult, profilesResult, favoritesResult].find((result) => result.error)?.error
    if (countError) throw countError
    return NextResponse.json({
      follows: data || [],
      catalogCounts: {
        build: buildsResult.count || 0,
        guild: guildsResult.count || 0,
        market: marketResult.count || 0,
        player: profilesResult.count || 0,
      },
      savedCounts: { build: favoritesResult.count || 0 },
    })
  } catch (error) {
    console.error('Błąd odczytu obserwowanych:', error)
    return jsonError('Nie udało się pobrać obserwowanych elementów.', 500)
  }
}

export async function PUT(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const rateLimit = await checkRateLimit(`entity-follow:${auth.user.id}`, { limit: 60, windowMs: 60_000 })
    if (!rateLimit.allowed) return jsonError('Zbyt wiele zmian obserwowanych. Spróbuj ponownie za chwilę.', 429, { 'Retry-After': String(rateLimit.retryAfter) })

    const body = await request.json()
    const type = cleanEnum(body.type, TYPES)
    const id = cleanText(body.id, { min: 1, max: 80 })
    const region = type === 'albion_player' ? cleanEnum(body.region, Object.keys(ALBION_REGIONS)) : null
    if (!type || !id || typeof body.following !== 'boolean') return jsonError('Nieprawidłowe dane obserwowanego elementu.', 400)
    if (type === 'albion_player' && (!cleanAlbionId(id) || !region)) return jsonError('Nieprawidłowa postać lub region Albionu.', 400)

    const admin = createSupabaseAdminClient()
    if (!body.following) {
      const { error } = await admin.from('entity_follows').delete().eq('user_id', auth.user.id).eq('entity_type', type).eq('entity_id', id)
      if (error) throw error
      return NextResponse.json({ following: false })
    }

    const { data: existing, error: existingError } = await admin
      .from('entity_follows')
      .select('label')
      .eq('user_id', auth.user.id)
      .eq('entity_type', type)
      .eq('entity_id', id)
      .maybeSingle()
    if (existingError) throw existingError
    if (existing) return NextResponse.json({ following: true, label: existing.label })

    const entity = await readEntity(admin, type, id, region)
    if (!entity) return jsonError('Element nie istnieje lub nie jest publicznie dostępny.', 404)
    if (entity.ownerId === auth.user.id) return jsonError('Nie musisz obserwować własnych treści.', 409)

    if (type === 'albion_player') {
      const { data: ownProfile, error: profileError } = await admin
        .from('profiles')
        .select('verified_player_id')
        .eq('id', auth.user.id)
        .maybeSingle()
      if (profileError) throw profileError
      if (ownProfile?.verified_player_id === id) return jsonError('Nie musisz obserwować własnej postaci.', 409)
    }

    const { error } = await admin.from('entity_follows').upsert({
      user_id: auth.user.id,
      entity_type: type,
      entity_id: id,
      label: entity.label.slice(0, 120),
      ...(type === 'albion_player' ? {
        region: entity.region,
        seen_event_ids: entity.seenEventIds,
        last_event_at: entity.lastEventAt,
        last_checked_at: new Date().toISOString(),
        last_summary: {},
        last_error: null,
      } : {}),
    }, { onConflict: 'user_id,entity_type,entity_id' })
    if (error) throw error

    return NextResponse.json({ following: true, label: entity.label })
  } catch (error) {
    if (error instanceof AlbionApiError) return jsonError(error.message, error.status || 503)
    console.error('Błąd zmiany obserwowanych:', error)
    return jsonError('Nie udało się zmienić obserwowania.', 500)
  }
}

export async function POST(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const rateLimit = await checkRateLimit(`player-watch-sync:${auth.user.id}`, { limit: 4, windowMs: 60 * 60_000 })
    if (!rateLimit.allowed) return jsonError('Postacie można sprawdzić ręcznie cztery razy na godzinę.', 429, { 'Retry-After': String(rateLimit.retryAfter) })

    const result = await runPlayerWatchSync({ userId: auth.user.id, limit: 30 })
    return NextResponse.json({ success: result.failed === 0, result })
  } catch (error) {
    console.error('Błąd ręcznej synchronizacji obserwowanych postaci:', error)
    return jsonError('Nie udało się sprawdzić nowych walk.', 500)
  }
}
