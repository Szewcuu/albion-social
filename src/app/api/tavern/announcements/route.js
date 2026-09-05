import { NextResponse } from 'next/server'

import { isModerationId } from '@/lib/server/moderation'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { createSupabaseRequestClient, isPortalStaff, requireApiUser } from '@/lib/server/supabaseAdmin'
import { cleanText } from '@/lib/server/validation'

const ANNOUNCEMENT_FIELDS = 'id, author_id, title, body, kind, expires_at, created_at, profiles!tavern_announcements_author_id_fkey(username, avatar_url)'
const ANNOUNCEMENT_KINDS = new Set(['info', 'event', 'maintenance'])
const EXPIRY_DAYS = new Set([1, 3, 7, 14, 30])
const MAX_ACTIVE_ANNOUNCEMENTS = 3
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' }

const jsonError = (message, status, headers) => NextResponse.json(
  { error: message },
  { status, headers: { ...NO_STORE_HEADERS, ...headers } },
)

async function authorize(request, staffOnly = false) {
  const auth = await requireApiUser(request)
  if (auth.error) return { response: jsonError(auth.error, auth.status) }
  const supabase = createSupabaseRequestClient(request)
  if (staffOnly && !(await isPortalStaff(supabase, auth.user.id))) {
    return { response: jsonError('Tylko personel może zarządzać ogłoszeniami Tawerny.', 403) }
  }
  return { auth, supabase }
}

function activeAnnouncementsQuery(supabase, { countOnly = false } = {}) {
  const now = new Date().toISOString()
  return supabase
    .from('tavern_announcements')
    .select(countOnly ? 'id' : ANNOUNCEMENT_FIELDS, countOnly ? { count: 'exact', head: true } : undefined)
    .eq('status', 'visible')
    .or(`expires_at.is.null,expires_at.gt.${now}`)
}

export async function GET(request) {
  try {
    const access = await authorize(request)
    if (access.response) return access.response

    const { data, error } = await activeAnnouncementsQuery(access.supabase)
      .order('created_at', { ascending: false })
      .limit(MAX_ACTIVE_ANNOUNCEMENTS)
    if (error) throw error

    return NextResponse.json({ announcements: data || [] }, { headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error('Błąd pobierania ogłoszeń Tawerny:', error)
    return jsonError('Nie udało się pobrać ogłoszeń Tawerny.', 500)
  }
}

export async function POST(request) {
  try {
    const access = await authorize(request, true)
    if (access.response) return access.response

    const rateLimit = await checkRateLimit(`tavern-announcement:${access.auth.user.id}`, {
      limit: 10,
      windowMs: 60 * 60 * 1000,
    })
    if (!rateLimit.allowed) {
      return jsonError('Osiągnięto limit ogłoszeń. Spróbuj ponownie później.', 429, {
        'Retry-After': String(rateLimit.retryAfter),
      })
    }

    const body = await request.json().catch(() => null)
    const title = cleanText(body?.title, { min: 3, max: 80 })
    const announcementBody = cleanText(body?.body, { min: 3, max: 280 })
    const kind = ANNOUNCEMENT_KINDS.has(body?.kind) ? body.kind : null
    const expiresInDays = Number(body?.expiresInDays)
    if (!title || !announcementBody || !kind || !EXPIRY_DAYS.has(expiresInDays)) {
      return jsonError('Uzupełnij tytuł, treść, typ i prawidłowy czas publikacji.', 400)
    }

    const { count, error: countError } = await activeAnnouncementsQuery(access.supabase, { countOnly: true })
    if (countError) throw countError
    if ((count || 0) >= MAX_ACTIVE_ANNOUNCEMENTS) {
      return jsonError('W Tawernie mogą być jednocześnie maksymalnie trzy aktywne ogłoszenia.', 409)
    }

    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
    const { data, error } = await access.supabase
      .from('tavern_announcements')
      .insert({
        author_id: access.auth.user.id,
        title,
        body: announcementBody,
        kind,
        expires_at: expiresAt,
      })
      .select(ANNOUNCEMENT_FIELDS)
      .single()
    if (error) throw error

    return NextResponse.json({ announcement: data }, { status: 201, headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error('Błąd publikacji ogłoszenia Tawerny:', error)
    return jsonError('Nie udało się opublikować ogłoszenia.', 500)
  }
}

export async function DELETE(request) {
  try {
    const access = await authorize(request, true)
    if (access.response) return access.response

    const body = await request.json().catch(() => null)
    if (!isModerationId(body?.id)) return jsonError('Nieprawidłowy identyfikator ogłoszenia.', 400)

    const { data, error } = await access.supabase
      .from('tavern_announcements')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', body.id)
      .eq('status', 'visible')
      .select('id')
      .maybeSingle()
    if (error) throw error
    if (!data) return jsonError('Ogłoszenie nie istnieje lub zostało już zdjęte.', 404)

    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error('Błąd archiwizacji ogłoszenia Tawerny:', error)
    return jsonError('Nie udało się zdjąć ogłoszenia.', 500)
  }
}
