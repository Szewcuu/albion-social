import { NextResponse } from 'next/server'

import { isModerationId } from '@/lib/server/moderation'
import { createNotification } from '@/lib/server/notifications'
import { activityTypesForCategory, parseActivityCategory } from '@/lib/activityCenter'
import { applyCreatedAtCursor, decodeCreatedAtCursor, pageFromRows } from '@/lib/server/pagination'
import { checkRateLimit } from '@/lib/server/rateLimit'
import {
  createSupabaseAdminClient,
  createSupabaseRequestClient,
  getPortalRole,
  requireApiUser,
} from '@/lib/server/supabaseAdmin'
import { cleanInteger, cleanText } from '@/lib/server/validation'

const jsonError = (message, status, headers) => (
  NextResponse.json({ error: message }, { status, headers })
)

function displayNameFor(user, profile) {
  return cleanText(
    profile?.ingame_nick
      || profile?.username
      || user.user_metadata?.full_name
      || user.user_metadata?.name
      || 'Gracz',
    { min: 1, max: 80 },
  ) || 'Gracz'
}

export async function GET(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const supabase = createSupabaseRequestClient(request)
    const url = new URL(request.url)
    const activityView = url.searchParams.get('view') === 'activity'

    if (activityView) {
      const category = parseActivityCategory(url.searchParams.get('category'))
      const cursor = decodeCreatedAtCursor(url.searchParams.get('cursor'), isModerationId)
      if (cursor === undefined) return jsonError('Nieprawidłowy kursor paginacji.', 400)

      const requestedLimit = Number(url.searchParams.get('limit') || 24)
      const pageSize = Number.isInteger(requestedLimit) && requestedLimit >= 1 && requestedLimit <= 50
        ? requestedLimit
        : 24
      const types = activityTypesForCategory(category)
      let listQuery = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(pageSize + 1)
      if (types) listQuery = listQuery.in('type', types)
      listQuery = applyCreatedAtCursor(listQuery, cursor)

      const countFor = (categoryId) => {
        let query = supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', auth.user.id)
        const categoryTypes = activityTypesForCategory(categoryId)
        if (categoryTypes) query = query.in('type', categoryTypes)
        return query
      }

      const [listResult, allResult, repliesResult, likesResult, expeditionsResult, marketResult, unreadResult] = await Promise.all([
        listQuery,
        countFor('all'),
        countFor('replies'),
        countFor('likes'),
        countFor('expeditions'),
        countFor('market'),
        supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', auth.user.id).eq('is_read', false),
      ])
      const firstError = [listResult, allResult, repliesResult, likesResult, expeditionsResult, marketResult, unreadResult]
        .find((result) => result.error)?.error
      if (firstError) throw firstError

      const { page, hasMore, nextCursor } = pageFromRows(listResult.data || [], pageSize)
      return NextResponse.json({
        notifications: page,
        category,
        counts: {
          all: allResult.count || 0,
          replies: repliesResult.count || 0,
          likes: likesResult.count || 0,
          expeditions: expeditionsResult.count || 0,
          market: marketResult.count || 0,
          unread: unreadResult.count || 0,
        },
        pagination: { hasMore, nextCursor },
      }, { headers: { 'Cache-Control': 'no-store' } })
    }

    const [{ data, error }, role] = await Promise.all([
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
        .limit(20),
      getPortalRole(supabase, auth.user.id),
    ])
    if (error) throw error

    return NextResponse.json(
      { notifications: data || [], role },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('Błąd pobierania danych konta:', error)
    return jsonError('Nie udało się pobrać danych konta.', 500)
  }
}

export async function PATCH(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const body = await request.json().catch(() => ({}))
    const notificationId = body?.notificationId == null
      ? null
      : (isModerationId(body.notificationId) ? body.notificationId : undefined)
    if (notificationId === undefined) return jsonError('Nieprawidłowy identyfikator powiadomienia.', 400)

    const supabase = createSupabaseRequestClient(request)
    let query = supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', auth.user.id)
      .eq('is_read', false)
    if (notificationId) query = query.eq('id', notificationId)

    const { error } = await query
    if (error) throw error

    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Błąd aktualizacji powiadomień:', error)
    return jsonError('Nie udało się zaktualizować powiadomień.', 500)
  }
}

async function createMarketOfferNotification({ auth, supabase, body }) {
  const offerId = isModerationId(body?.offerId) ? body.offerId : null
  const offeredPrice = cleanInteger(body?.offeredPrice, { min: 1, max: 1_000_000_000_000 })
  const message = cleanText(body?.message || '', { max: 500 })
  if (!offerId || !offeredPrice || message === null) {
    return { error: 'Nieprawidłowe dane propozycji.', status: 400 }
  }

  const [{ data: offer, error: offerError }, { data: profile, error: profileError }] = await Promise.all([
    supabase
      .from('market_items')
      .select('id, user_id, title, price, status')
      .eq('id', offerId)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('username, ingame_nick')
      .eq('id', auth.user.id)
      .maybeSingle(),
  ])
  if (offerError || profileError) throw offerError || profileError
  if (!offer || offer.status === 'removed') return { error: 'Oferta nie jest już dostępna.', status: 404 }
  if (offer.user_id === auth.user.id) return { error: 'Nie możesz wysłać propozycji do własnej oferty.', status: 400 }

  const buyerName = displayNameFor(auth.user, profile)
  const notification = await createNotification({
    userId: offer.user_id,
    title: '💬 Nowa oferta zakupu na rynku!',
    message: `${buyerName} proponuje ${offeredPrice.toLocaleString('pl-PL')} Silver za „${offer.title}”. Wiadomość: „${message || 'Chcę dokonać transakcji.'}”`,
    type: 'market_message',
    link: `/profil/${auth.user.id}`,
  })
  if (!notification) throw new Error('Nie udało się utworzyć powiadomienia rynkowego.')

  return { created: 1 }
}

async function createExpeditionNotification({ auth, supabase, body }) {
  const expeditionId = isModerationId(body?.expeditionId) ? body.expeditionId : null
  if (!expeditionId) return { error: 'Nieprawidłowy identyfikator wyprawy.', status: 400 }

  const [{ data: expedition, error: expeditionError }, { data: signup, error: signupError }] = await Promise.all([
    supabase
      .from('expeditions')
      .select('id, user_id, title, max_tanks, max_healers, max_dps, max_supports, status')
      .eq('id', expeditionId)
      .maybeSingle(),
    supabase
      .from('expedition_signups')
      .select('role_type, ingame_nick, player_ip')
      .eq('expedition_id', expeditionId)
      .eq('user_id', auth.user.id)
      .maybeSingle(),
  ])
  if (expeditionError || signupError) throw expeditionError || signupError
  if (!expedition || !signup || expedition.status === 'removed') {
    return { error: 'Nie znaleziono aktywnego zapisu na tę wyprawę.', status: 404 }
  }
  const { count, error: countError } = await supabase
    .from('expedition_signups')
    .select('id', { count: 'exact', head: true })
    .eq('expedition_id', expeditionId)
  if (countError) throw countError

  const totalMax = Number(expedition.max_tanks || 0)
    + Number(expedition.max_healers || 0)
    + Number(expedition.max_dps || 0)
    + Number(expedition.max_supports || 0)
  const partyFull = totalMax > 0 && (count || 0) >= totalMax

  let created = 0
  if (expedition.user_id !== auth.user.id) {
    const joined = await createNotification({
      userId: expedition.user_id,
      title: '⚔️ Nowy gracz w drużynie!',
      message: `${signup.ingame_nick || 'Gracz'} dołączył do wyprawy „${expedition.title}” jako ${signup.role_type} (${signup.player_ip} IP).`,
      type: 'expedition_joined',
      link: `/wyprawy?expedition=${expedition.id}`,
    })
    if (!joined) throw new Error('Nie udało się utworzyć powiadomienia wyprawy.')
    created += 1
  }

  if (partyFull) {
    const fullNotification = await createNotification({
      userId: expedition.user_id,
      title: '🎉 Skład skompletowany!',
      message: `Twoja wyprawa „${expedition.title}” ma już komplet graczy!`,
      type: 'expedition_full',
      link: `/wyprawy?expedition=${expedition.id}`,
      sourceKey: `expedition-full:${expedition.id}`,
    })
    if (!fullNotification) throw new Error('Nie udało się utworzyć powiadomienia o pełnym składzie.')
    created += 1
  }

  return { created, partyFull }
}

export async function POST(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const rateLimit = await checkRateLimit(`notification-action:${auth.user.id}`, {
      limit: 12,
      windowMs: 10 * 60 * 1000,
    })
    if (!rateLimit.allowed) {
      return jsonError('Wysyłasz zbyt wiele powiadomień. Spróbuj ponownie później.', 429, {
        'Retry-After': String(rateLimit.retryAfter),
      })
    }

    const body = await request.json().catch(() => null)
    const supabase = createSupabaseAdminClient()
    let result
    if (body?.kind === 'market_offer') {
      result = await createMarketOfferNotification({ auth, supabase, body })
    } else if (body?.kind === 'expedition_joined') {
      result = await createExpeditionNotification({ auth, supabase, body })
    } else {
      return jsonError('Nieobsługiwany rodzaj powiadomienia.', 400)
    }

    if (result.error) return jsonError(result.error, result.status)
    return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Błąd walidowanego powiadomienia:', error)
    return jsonError('Nie udało się wysłać powiadomienia.', 500)
  }
}
