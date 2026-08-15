import { NextResponse } from 'next/server'

import { checkRateLimit } from '@/lib/server/rateLimit'
import { createSupabaseAdminClient, requireApiUser } from '@/lib/server/supabaseAdmin'
import { cleanEnum, cleanText } from '@/lib/server/validation'

const TYPES = ['build', 'guild', 'market', 'player']
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const jsonError = (error, status, headers) => NextResponse.json({ error }, { status, headers })

async function readEntity(admin, type, id) {
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
    const { data, error } = await admin
      .from('entity_follows')
      .select('entity_type, entity_id, label, created_at')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw error
    return NextResponse.json({ follows: data || [] })
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
    if (!type || !id || typeof body.following !== 'boolean') return jsonError('Nieprawidłowe dane obserwowanego elementu.', 400)

    const admin = createSupabaseAdminClient()
    if (!body.following) {
      const { error } = await admin.from('entity_follows').delete().eq('user_id', auth.user.id).eq('entity_type', type).eq('entity_id', id)
      if (error) throw error
      return NextResponse.json({ following: false })
    }

    const entity = await readEntity(admin, type, id)
    if (!entity) return jsonError('Element nie istnieje lub nie jest publicznie dostępny.', 404)
    if (entity.ownerId === auth.user.id) return jsonError('Nie musisz obserwować własnych treści.', 409)

    const { error } = await admin.from('entity_follows').upsert({
      user_id: auth.user.id,
      entity_type: type,
      entity_id: id,
      label: entity.label.slice(0, 120),
    }, { onConflict: 'user_id,entity_type,entity_id' })
    if (error) throw error

    return NextResponse.json({ following: true, label: entity.label })
  } catch (error) {
    console.error('Błąd zmiany obserwowanych:', error)
    return jsonError('Nie udało się zmienić obserwowania.', 500)
  }
}
