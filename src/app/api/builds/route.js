import { NextResponse } from 'next/server'

import { sanitizeBuildForPublishing } from '@/lib/buildPublishing'
import { buildFromDbRow, buildToDbPayload, getBuildItemIds } from '@/lib/buildSlots'
import { getBuildLabel } from '@/lib/buildPresentation'
import { getAlbionItemNameMap } from '@/lib/server/albionItemCatalog'
import { isModerationId } from '@/lib/server/moderation'
import { applyCreatedAtCursor, decodeCreatedAtCursor, pageFromRows } from '@/lib/server/pagination'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { createSupabaseRequestClient, requireApiUser } from '@/lib/server/supabaseAdmin'

const MAX_BUILD_BODY_BYTES = 64 * 1024
const BUILD_PAGE_SIZES = new Set([6, 12])
const BUILD_FIELDS = 'id, created_at, user_id, title, activity_type, description, status, weapon, offhand, armor, head, shoes, cape, bag, potion, food, build_data, profiles!builds_user_id_fkey(username, avatar_url), build_votes(id, vote_type)'
const BUILD_CATEGORIES = new Set(['all', 'pvp', 'pve', 'ganking'])
const BUILD_SORTS = new Set(['latest', 'popular', 'likes'])
const MAX_SEARCHABLE_BUILDS = 500
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' }

const jsonError = (message, status, headers) => (
  NextResponse.json({ error: message }, { status, headers: { ...NO_STORE_HEADERS, ...headers } })
)

const normalizeSearch = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const voteCount = (build) => (build.build_votes || []).filter((vote) => vote.vote_type === 'up').length

function searchableBuild(build) {
  const parsed = buildFromDbRow(build)
  const itemIds = getBuildItemIds(parsed)
  const catalogNames = getAlbionItemNameMap(itemIds)
  const itemNames = { ...catalogNames, ...(parsed.itemNames || {}), ...(build.item_names || {}) }
  return normalizeSearch([
    build.title,
    build.description,
    build.activity_type,
    build.profiles?.username,
    parsed.authorName,
    ...itemIds,
    ...Object.values(itemNames),
    ...(parsed.tags?.activities || []).flatMap((tag) => [tag, getBuildLabel(tag)]),
    ...(parsed.tags?.locations || []),
    ...(parsed.tags?.zones || []),
    ...(parsed.tags?.roles || []),
  ].join(' '))
}

async function authorize(request) {
  const auth = await requireApiUser(request)
  if (auth.error) return { response: jsonError(auth.error, auth.status) }
  return { auth, supabase: createSupabaseRequestClient(request) }
}

export async function GET(request) {
  try {
    const context = await authorize(request)
    if (context.response) return context.response

    const searchParams = new URL(request.url).searchParams
    const category = searchParams.get('category') || 'all'
    if (!BUILD_CATEGORIES.has(category)) return jsonError('Nieprawidłowa kategoria buildów.', 400)

    const requestedPageSize = Number(searchParams.get('limit') || 6)
    if (!BUILD_PAGE_SIZES.has(requestedPageSize)) return jsonError('Nieprawidłowy rozmiar strony.', 400)

    const search = normalizeSearch(searchParams.get('search')).slice(0, 80)
    const sort = searchParams.get('sort') || 'latest'
    if (!BUILD_SORTS.has(sort)) return jsonError('Nieprawidłowe sortowanie buildów.', 400)
    const advanced = Boolean(search) || sort !== 'latest'
    const offset = Number(searchParams.get('offset') || 0)
    if (!Number.isInteger(offset) || offset < 0 || offset > MAX_SEARCHABLE_BUILDS || offset % requestedPageSize !== 0) {
      return jsonError('Nieprawidłowa strona wyników.', 400)
    }
    const cursor = advanced ? null : decodeCreatedAtCursor(searchParams.get('cursor'), isModerationId)
    if (cursor === undefined) return jsonError('Nieprawidłowy kursor buildów.', 400)

    let query = context.supabase
      .from('builds')
      .select(BUILD_FIELDS, { count: cursor || advanced ? undefined : 'exact' })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(advanced ? MAX_SEARCHABLE_BUILDS + 1 : requestedPageSize + 1)

    if (category !== 'all') query = query.ilike('activity_type', `%${category}%`)
    const { data, error, count } = advanced ? await query : await applyCreatedAtCursor(query, cursor)
    if (error) throw error

    let candidateRows = data || []
    const searchTruncated = advanced && candidateRows.length > MAX_SEARCHABLE_BUILDS
    if (advanced) candidateRows = candidateRows.slice(0, MAX_SEARCHABLE_BUILDS)
    if (search) candidateRows = candidateRows.filter((build) => searchableBuild(build).includes(search))
    if (sort === 'likes') candidateRows.sort((a, b) => voteCount(b) - voteCount(a) || Date.parse(b.created_at) - Date.parse(a.created_at))
    if (sort === 'popular') candidateRows.sort((a, b) => {
      const ageA = Math.max(0, (Date.now() - Date.parse(a.created_at)) / 86_400_000)
      const ageB = Math.max(0, (Date.now() - Date.parse(b.created_at)) / 86_400_000)
      return (voteCount(b) * 10 + 30 / (ageB + 2)) - (voteCount(a) * 10 + 30 / (ageA + 2))
    })
    const page = advanced
      ? { page: candidateRows.slice(offset, offset + requestedPageSize), hasMore: offset + requestedPageSize < candidateRows.length, nextCursor: null }
      : pageFromRows(candidateRows, requestedPageSize)
    const buildIds = page.page.map((build) => build.id)
    let favoriteIds = new Set()
    if (buildIds.length > 0) {
      const { data: favorites, error: favoritesError } = await context.supabase
        .from('build_favorites')
        .select('build_id')
        .eq('user_id', context.auth.user.id)
        .in('build_id', buildIds)
      if (favoritesError) throw favoritesError
      favoriteIds = new Set((favorites || []).map((favorite) => favorite.build_id))
    }

    return NextResponse.json({
      builds: page.page.map((build) => ({
        ...build,
        item_names: getAlbionItemNameMap(getBuildItemIds(buildFromDbRow(build))),
        is_favorite: favoriteIds.has(build.id),
      })),
      hasMore: page.hasMore,
      nextCursor: page.nextCursor,
      nextOffset: advanced && page.hasMore ? offset + requestedPageSize : null,
      total: advanced ? candidateRows.length : (cursor ? undefined : (count || 0)),
      searchTruncated,
    }, { headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error('Błąd pobierania buildów:', error)
    return jsonError('Nie udało się pobrać Zbrojowni.', 500)
  }
}

export async function DELETE(request) {
  try {
    const context = await authorize(request)
    if (context.response) return context.response

    const rateLimit = await checkRateLimit(`build-delete:${context.auth.user.id}`, {
      limit: 20,
      windowMs: 10 * 60 * 1000,
    })
    if (!rateLimit.allowed) {
      return jsonError('Wykonujesz zbyt wiele operacji. Spróbuj ponownie później.', 429, {
        'Retry-After': String(rateLimit.retryAfter),
      })
    }

    const body = await request.json().catch(() => null)
    if (!isModerationId(body?.id)) return jsonError('Nieprawidłowy identyfikator buildu.', 400)

    const { data, error } = await context.supabase
      .from('builds')
      .delete()
      .eq('id', body.id)
      .eq('user_id', context.auth.user.id)
      .select('id')
      .maybeSingle()
    if (error) throw error
    if (!data) return jsonError('Nie możesz usunąć tego buildu.', 403)

    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error('Błąd usuwania buildu:', error)
    return jsonError('Nie udało się usunąć buildu.', 500)
  }
}

export async function POST(request) {
  try {
    const context = await authorize(request)
    if (context.response) return context.response

    const contentLength = Number(request.headers.get('content-length') || 0)
    if (contentLength > MAX_BUILD_BODY_BYTES) {
      return jsonError('Build jest zbyt duży.', 413)
    }

    const rateLimit = await checkRateLimit(`build-publish:${context.auth.user.id}`, {
      limit: 10,
      windowMs: 60 * 60 * 1000,
    })
    if (!rateLimit.allowed) {
      return jsonError('Osiągnięto limit publikacji buildów. Spróbuj ponownie później.', 429, {
        'Retry-After': String(rateLimit.retryAfter),
      })
    }

    const rawBody = await request.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BUILD_BODY_BYTES) {
      return jsonError('Build jest zbyt duży.', 413)
    }
    const body = (() => {
      try {
        return JSON.parse(rawBody)
      } catch {
        return null
      }
    })()
    const build = sanitizeBuildForPublishing(body?.build)
    if (!build) return jsonError('Uzupełnij wymagane dane i co najmniej jeden przedmiot.', 400)

    const payload = buildToDbPayload(build, context.auth.user.id)
    payload.build_data.itemNames = getAlbionItemNameMap(getBuildItemIds(build))
    let { data, error } = await context.supabase.from('builds').insert(payload).select('id').single()

    if (error?.message?.includes('build_data')) {
      const { build_data, ...corePayload } = payload
      const fallback = await context.supabase.from('builds').insert(corePayload).select('id').single()
      data = fallback.data
      error = fallback.error
    }

    if (error) throw error
    return NextResponse.json({ buildId: data.id }, { status: 201, headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error('Błąd publikacji buildu:', error)
    return jsonError('Nie udało się opublikować buildu.', 500)
  }
}
