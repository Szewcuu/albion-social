import { NextResponse } from 'next/server'

import { isModerationId } from '@/lib/server/moderation'
import { applyCreatedAtCursor, decodeCreatedAtCursor, pageFromRows } from '@/lib/server/pagination'
import { checkRateLimit } from '@/lib/server/rateLimit'
import {
  createSupabaseAdminClient,
  createSupabaseRequestClient,
  requireApiUser,
} from '@/lib/server/supabaseAdmin'
import { cleanEnum, cleanInteger, cleanText } from '@/lib/server/validation'
import { marketOfferCutoff } from '@/lib/marketOffers'

const MARKET_PAGE_SIZE = 12
const MARKET_FIELDS = 'id, created_at, user_id, title, price, city, category, description, status, item_name, server, profiles!market_items_user_id_fkey(username)'
const MARKET_CITIES = ['Caerleon', 'Bridgewatch', 'Fort Sterling', 'Lymhurst', 'Martlock', 'Thetford', 'Brecilien']
const MARKET_CATEGORIES = ['Ekwipunek', 'Wierzchowce', 'Surowce', 'Jedzenie & Potiony', 'Inne']
const MARKET_SERVERS = ['Wszystkie serwery', 'Europa', 'Ameryka', 'Azja']
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' }

const jsonError = (message, status, headers) => NextResponse.json(
  { error: message },
  { status, headers: { ...NO_STORE_HEADERS, ...headers } },
)

async function authorize(request) {
  const auth = await requireApiUser(request)
  if (auth.error) return { response: jsonError(auth.error, auth.status) }
  return { auth, supabase: createSupabaseRequestClient(request) }
}

async function enforceMutationLimit(userId) {
  return checkRateLimit(`market-offer-mutation:${userId}`, {
    limit: 30,
    windowMs: 10 * 60 * 1000,
  })
}

export async function GET(request) {
  try {
    const context = await authorize(request)
    if (context.response) return context.response

    const searchParams = new URL(request.url).searchParams
    const cursor = decodeCreatedAtCursor(searchParams.get('cursor'), isModerationId)
    if (cursor === undefined) return jsonError('Nieprawidłowy kursor ofert.', 400)
    const scope = cleanEnum(searchParams.get('scope') || 'active', ['active', 'mine'])
    if (!scope) return jsonError('Nieprawidłowy zakres ofert.', 400)
    const focusOfferId = searchParams.get('offer')
    if (focusOfferId && !isModerationId(focusOfferId)) return jsonError('Nieprawidłowy identyfikator oferty.', 400)
    const city = searchParams.get('city') ? cleanEnum(searchParams.get('city'), MARKET_CITIES) : null
    const category = searchParams.get('category') ? cleanEnum(searchParams.get('category'), MARKET_CATEGORIES) : null
    if (searchParams.get('city') && !city) return jsonError('Nieprawidłowy filtr miasta.', 400)
    if (searchParams.get('category') && !category) return jsonError('Nieprawidłowy filtr kategorii.', 400)
    const rawSearch = cleanText(searchParams.get('q') || '', { max: 80 })
    if (rawSearch === null) return jsonError('Wyszukiwana fraza jest zbyt długa.', 400)
    const search = rawSearch.replace(/[,()%"'\\]/g, ' ').replace(/\s+/g, ' ').trim()

    let query = context.supabase
      .from('market_items')
      .select(MARKET_FIELDS, { count: 'exact' })
      .eq('status', 'visible')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(MARKET_PAGE_SIZE + 1)
    query = scope === 'mine'
      ? query.eq('user_id', context.auth.user.id)
      : query.gt('created_at', marketOfferCutoff())
    if (city) query = query.eq('city', city)
    if (category) query = query.eq('category', category)
    if (search) query = query.or(`title.ilike.%${search}%,item_name.ilike.%${search}%`)

    const { data, error, count } = await applyCreatedAtCursor(query, cursor)
    if (error) throw error

    const page = pageFromRows(data || [], MARKET_PAGE_SIZE)
    if (focusOfferId && !cursor && !page.page.some((offer) => offer.id === focusOfferId)) {
      const { data: focusedOffer, error: focusError } = await context.supabase
        .from('market_items')
        .select(MARKET_FIELDS)
        .eq('id', focusOfferId)
        .eq('status', 'visible')
        .maybeSingle()
      if (focusError) throw focusError
      if (focusedOffer) page.page.unshift(focusedOffer)
    }
    return NextResponse.json({
      offers: page.page,
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
      total: Math.max(count || 0, page.page.length),
      scope,
    }, { headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error('Błąd pobierania ofert rynku:', error)
    return jsonError('Nie udało się pobrać ofert rynku.', 500)
  }
}

function readOfferPayload(body) {
  const title = cleanText(body?.title, { min: 3, max: 160 })
  const itemName = cleanText(body?.item_name || '', { max: 120 })
  const price = cleanInteger(body?.price, { min: 1, max: Number.MAX_SAFE_INTEGER })
  const city = cleanEnum(body?.city, MARKET_CITIES)
  const category = cleanEnum(body?.category, MARKET_CATEGORIES)
  const server = cleanEnum(body?.server, MARKET_SERVERS)

  if (!title || itemName === null || price === null || !city || !category || !server) return null
  return {
    title,
    item_name: itemName.toUpperCase(),
    price,
    city,
    category,
    server,
    contact: 'Kontakt przez portal',
    contact_info: null,
  }
}

export async function POST(request) {
  try {
    const context = await authorize(request)
    if (context.response) return context.response
    const rateLimit = await enforceMutationLimit(context.auth.user.id)
    if (!rateLimit.allowed) {
      return jsonError('Wykonujesz zbyt wiele operacji. Spróbuj ponownie później.', 429, {
        'Retry-After': String(rateLimit.retryAfter),
      })
    }

    const payload = readOfferPayload(await request.json().catch(() => null))
    if (!payload) return jsonError('Sprawdź tytuł, cenę, kategorię, miasto i serwer oferty.', 400)

    const { data, error } = await context.supabase
      .from('market_items')
      .insert({ ...payload, user_id: context.auth.user.id })
      .select('id')
      .single()
    if (error) throw error

    return NextResponse.json({ offerId: data.id }, { status: 201, headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error('Błąd publikowania oferty rynku:', error)
    return jsonError('Nie udało się opublikować oferty.', 500)
  }
}

export async function PATCH(request) {
  try {
    const context = await authorize(request)
    if (context.response) return context.response
    const rateLimit = await enforceMutationLimit(context.auth.user.id)
    if (!rateLimit.allowed) {
      return jsonError('Wykonujesz zbyt wiele operacji. Spróbuj ponownie później.', 429, {
        'Retry-After': String(rateLimit.retryAfter),
      })
    }

    const body = await request.json().catch(() => null)
    if (body?.action !== 'renew' || !isModerationId(body?.id)) return jsonError('Nieprawidłowa operacja odnowienia.', 400)

    const { data: offer, error: readError } = await context.supabase
      .from('market_items')
      .select('id, user_id, status')
      .eq('id', body.id)
      .maybeSingle()
    if (readError) throw readError
    if (!offer || offer.user_id !== context.auth.user.id || offer.status !== 'visible') {
      return jsonError('Nie możesz odnowić tej oferty.', 403)
    }

    // UPDATE jest celowo odebrany klientom Data API. Po sprawdzeniu właściciela
    // wykonujemy najmniejszą możliwą zmianę uprzywilejowanym klientem serwera.
    const { error } = await createSupabaseAdminClient()
      .from('market_items')
      .update({ created_at: new Date().toISOString() })
      .eq('id', offer.id)
      .eq('user_id', context.auth.user.id)
      .eq('status', 'visible')
    if (error) throw error

    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error('Błąd odnawiania oferty rynku:', error)
    return jsonError('Nie udało się odnowić oferty.', 500)
  }
}

export async function DELETE(request) {
  try {
    const context = await authorize(request)
    if (context.response) return context.response
    const rateLimit = await enforceMutationLimit(context.auth.user.id)
    if (!rateLimit.allowed) {
      return jsonError('Wykonujesz zbyt wiele operacji. Spróbuj ponownie później.', 429, {
        'Retry-After': String(rateLimit.retryAfter),
      })
    }

    const body = await request.json().catch(() => null)
    if (!isModerationId(body?.id)) return jsonError('Nieprawidłowy identyfikator oferty.', 400)

    const { data, error } = await context.supabase
      .from('market_items')
      .delete()
      .eq('id', body.id)
      .eq('user_id', context.auth.user.id)
      .select('id')
    if (error) throw error
    if (!data?.length) return jsonError('Oferta nie istnieje albo nie należy do Ciebie.', 404)

    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error('Błąd usuwania oferty rynku:', error)
    return jsonError('Nie udało się usunąć oferty.', 500)
  }
}
