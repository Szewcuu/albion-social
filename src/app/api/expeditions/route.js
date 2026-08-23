import { NextResponse } from 'next/server'

import { isModerationId } from '@/lib/server/moderation'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { createSupabaseRequestClient, requireApiUser } from '@/lib/server/supabaseAdmin'
import { cleanEnum, cleanInteger, cleanText } from '@/lib/server/validation'
import { getExpeditionExpiry } from '@/lib/expeditionSchedule'

const EXPEDITION_ROLES = ['Tank', 'Healer', 'DPS', 'Support']
const EXPEDITION_SERVERS = ['Europa', 'Ameryka', 'Azja']

const jsonError = (message, status, headers) => (
  NextResponse.json({ error: message }, { status, headers })
)

async function requireExpeditionUser(request) {
  const auth = await requireApiUser(request)
  if (auth.error) return { response: jsonError(auth.error, auth.status) }
  return { auth, supabase: createSupabaseRequestClient(request) }
}

async function enforceMutationLimit(userId) {
  return checkRateLimit(`expedition-mutation:${userId}`, {
    limit: 30,
    windowMs: 10 * 60 * 1000,
  })
}

export async function GET(request) {
  try {
    const context = await requireExpeditionUser(request)
    if (context.response) return context.response
    const { auth, supabase } = context

    const now = new Date().toISOString()
    const [{ data: expeditions, error: expeditionsError }, { data: profile, error: profileError }] = await Promise.all([
      supabase
        .from('expeditions')
        .select('id, created_at, user_id, title, activity_type, min_ip, start_time, starts_at, expires_at, server, description, max_tanks, max_healers, max_dps, max_supports, status, discord_message_id, profiles!expeditions_user_id_fkey(username), expedition_signups(id, user_id, role_type, ingame_nick, player_ip, created_at)')
        .eq('status', 'visible')
        .gt('expires_at', now)
        .order('starts_at', { ascending: true }),
      supabase
        .from('profiles')
        .select('ingame_nick, username, avg_ip')
        .eq('id', auth.user.id)
        .maybeSingle(),
    ])
    if (expeditionsError || profileError) throw expeditionsError || profileError

    return NextResponse.json(
      {
        expeditions: (expeditions || []).map(({ discord_message_id: discordMessageId, ...expedition }) => ({
          ...expedition,
          discord_published: Boolean(discordMessageId),
        })),
        profile: profile || null,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('Błąd pobierania wypraw:', error)
    return jsonError('Nie udało się pobrać wypraw.', 500)
  }
}

function readCreatePayload(body) {
  const title = cleanText(body?.title, { min: 3, max: 120 })
  const activityType = cleanText(body?.activity_type, { min: 2, max: 100 })
  const minIp = cleanInteger(body?.min_ip, { min: 0, max: 3_000 })
  const startsAt = new Date(body?.starts_at)
  const server = cleanEnum(body?.server, EXPEDITION_SERVERS)
  const description = cleanText(body?.description || '', { max: 1_000 })
  const maxTanks = cleanInteger(body?.max_tanks, { min: 0, max: 5 })
  const maxHealers = cleanInteger(body?.max_healers, { min: 0, max: 5 })
  const maxDps = cleanInteger(body?.max_dps, { min: 0, max: 20 })
  const maxSupports = cleanInteger(body?.max_supports, { min: 0, max: 5 })

  if (
    !title || !activityType || minIp === null || Number.isNaN(startsAt.getTime()) || !server || description === null
    || maxTanks === null || maxHealers === null || maxDps === null || maxSupports === null
    || maxTanks + maxHealers + maxDps + maxSupports < 1
  ) return null

  const now = Date.now()
  if (startsAt.getTime() < now + 10 * 60 * 1000 || startsAt.getTime() > now + 30 * 24 * 60 * 60 * 1000) return null

  const startTime = new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
  }).format(startsAt)

  return {
    title,
    activity_type: activityType,
    min_ip: minIp,
    start_time: `${startTime} UTC`,
    starts_at: startsAt.toISOString(),
    expires_at: getExpeditionExpiry(startsAt).toISOString(),
    server,
    description,
    max_tanks: maxTanks,
    max_healers: maxHealers,
    max_dps: maxDps,
    max_supports: maxSupports,
  }
}

async function createExpedition({ auth, supabase, body }) {
  const payload = readCreatePayload(body)
  if (!payload) return jsonError('Sprawdź dane wyprawy i liczbę miejsc w drużynie.', 400)

  const { data, error } = await supabase
    .from('expeditions')
    .insert({ ...payload, user_id: auth.user.id })
    .select('id')
    .single()
  if (error) throw error

  return NextResponse.json({ expeditionId: data.id }, { status: 201 })
}

async function joinExpedition({ auth, supabase, body }) {
  const expeditionId = isModerationId(body?.expeditionId) ? body.expeditionId : null
  const role = cleanEnum(body?.role_type, EXPEDITION_ROLES)
  const ingameNick = cleanText(body?.ingame_nick, { min: 2, max: 80 })
  const playerIp = cleanInteger(body?.player_ip, { min: 0, max: 3_000 })
  if (!expeditionId || !role || !ingameNick || playerIp === null) {
    return jsonError('Nieprawidłowe dane zapisu na wyprawę.', 400)
  }

  const { data: expedition, error: expeditionError } = await supabase
    .from('expeditions')
    .select('id, min_ip, max_tanks, max_healers, max_dps, max_supports, status, expires_at')
    .eq('id', expeditionId)
    .maybeSingle()
  if (expeditionError) throw expeditionError
  if (!expedition || expedition.status === 'removed' || new Date(expedition.expires_at).getTime() <= Date.now()) return jsonError('Ta wyprawa nie jest już dostępna.', 404)
  if (playerIp < Number(expedition.min_ip || 0)) return jsonError('Twoje IP jest niższe niż wymagane dla tej wyprawy.', 400)

  const maxByRole = {
    Tank: Number(expedition.max_tanks || 0),
    Healer: Number(expedition.max_healers || 0),
    DPS: Number(expedition.max_dps || 0),
    Support: Number(expedition.max_supports || 0),
  }
  const { count, error: countError } = await supabase
    .from('expedition_signups')
    .select('id', { count: 'exact', head: true })
    .eq('expedition_id', expeditionId)
    .eq('role_type', role)
  if (countError) throw countError
  if (maxByRole[role] <= 0 || (count || 0) >= maxByRole[role]) {
    return jsonError(`Brak wolnych miejsc dla roli ${role}.`, 409)
  }

  const { error } = await supabase.from('expedition_signups').insert({
    expedition_id: expeditionId,
    user_id: auth.user.id,
    role_type: role,
    ingame_nick: ingameNick,
    player_ip: playerIp,
  })
  if (error?.code === '23505') return jsonError('Jesteś już zapisany na tę wyprawę.', 409)
  if (error) throw error

  return NextResponse.json({ success: true }, { status: 201 })
}

export async function POST(request) {
  try {
    const context = await requireExpeditionUser(request)
    if (context.response) return context.response
    const { auth, supabase } = context

    const rateLimit = await enforceMutationLimit(auth.user.id)
    if (!rateLimit.allowed) {
      return jsonError('Wykonujesz zbyt wiele operacji. Spróbuj ponownie później.', 429, {
        'Retry-After': String(rateLimit.retryAfter),
      })
    }

    const body = await request.json().catch(() => null)
    if (body?.action === 'create') return createExpedition({ auth, supabase, body })
    if (body?.action === 'join') return joinExpedition({ auth, supabase, body })
    return jsonError('Nieobsługiwana operacja wyprawy.', 400)
  } catch (error) {
    console.error('Błąd zapisu wyprawy:', error)
    return jsonError('Nie udało się zapisać zmian wyprawy.', 500)
  }
}

export async function DELETE(request) {
  try {
    const context = await requireExpeditionUser(request)
    if (context.response) return context.response
    const { auth, supabase } = context

    const rateLimit = await enforceMutationLimit(auth.user.id)
    if (!rateLimit.allowed) {
      return jsonError('Wykonujesz zbyt wiele operacji. Spróbuj ponownie później.', 429, {
        'Retry-After': String(rateLimit.retryAfter),
      })
    }

    const body = await request.json().catch(() => null)
    const signupId = isModerationId(body?.signupId) ? body.signupId : null
    if (!signupId) return jsonError('Nieprawidłowy identyfikator zapisu.', 400)

    const { error } = await supabase
      .from('expedition_signups')
      .delete()
      .eq('id', signupId)
      .eq('user_id', auth.user.id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Błąd opuszczania wyprawy:', error)
    return jsonError('Nie udało się opuścić wyprawy.', 500)
  }
}
