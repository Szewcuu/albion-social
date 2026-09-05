import { NextResponse } from 'next/server'

import { isModerationId } from '@/lib/server/moderation'
import { checkRateLimit } from '@/lib/server/rateLimit'
import {
  createSupabaseAdminClient,
  createSupabaseRequestClient,
  isPortalStaff,
  requireApiUser,
} from '@/lib/server/supabaseAdmin'
import { cleanText } from '@/lib/server/validation'

const BASE_FIELDS = 'id, user_id, channel, username, text, created_at, is_pinned, pinned_at, pinned_by'
const REPLY_FIELDS = `${BASE_FIELDS}, reply_to`
const CHAT_PAGE_SIZE = 40
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' }

const jsonError = (message, status, headers) => NextResponse.json(
  { error: message },
  { status, headers: { ...NO_STORE_HEADERS, ...headers } },
)

async function authorize(request) {
  const auth = await requireApiUser(request)
  if (auth.error) return { error: jsonError(auth.error, auth.status) }
  return { auth, supabase: createSupabaseRequestClient(request) }
}

function validTimestamp(value) {
  return typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value))
}

function olderThan(query, createdAt, id) {
  if (!createdAt || !id) return query
  return query.or(`created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${id})`)
}

async function readMessagePage(supabase, createdAt, id) {
  const makeQuery = (fields) => olderThan(
    supabase
      .from('chat_messages')
      .select(fields)
      .eq('channel', 'GLOBALNY')
      .eq('status', 'visible')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(CHAT_PAGE_SIZE + 1),
    createdAt,
    id,
  )

  let result = await makeQuery(REPLY_FIELDS)
  let supportsReplies = true
  if (result.error) {
    const fallback = await makeQuery(BASE_FIELDS)
    if (!fallback.error) {
      result = fallback
      supportsReplies = false
    }
  }
  return { ...result, supportsReplies }
}

async function readPinnedMessages(supabase) {
  return supabase
    .from('chat_messages')
    .select(REPLY_FIELDS)
    .eq('channel', 'GLOBALNY')
    .eq('status', 'visible')
    .eq('is_pinned', true)
    .is('reply_to', null)
    .order('pinned_at', { ascending: false })
    .limit(3)
}

export async function GET(request) {
  try {
    const access = await authorize(request)
    if (access.error) return access.error

    const url = new URL(request.url)
    const createdAt = url.searchParams.get('beforeCreatedAt')
    const id = url.searchParams.get('beforeId')
    if ((createdAt || id) && !(validTimestamp(createdAt) && isModerationId(id))) {
      return jsonError('Nieprawidłowy kursor wiadomości.', 400)
    }

    const [result, pinnedResult] = await Promise.all([
      readMessagePage(access.supabase, createdAt, id),
      readPinnedMessages(access.supabase),
    ])
    if (result.error) throw result.error
    if (pinnedResult.error) throw pinnedResult.error

    const rows = result.data || []
    const descendingPage = rows.slice(0, CHAT_PAGE_SIZE)
    const oldest = descendingPage.at(-1)
    return NextResponse.json({
      messages: descendingPage.reverse(),
      pinnedMessages: pinnedResult.data || [],
      hasOlder: rows.length > CHAT_PAGE_SIZE,
      cursor: oldest ? { created_at: oldest.created_at, id: oldest.id } : null,
      supportsReplies: result.supportsReplies,
    }, { headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error('Błąd pobierania wiadomości Tawerny:', error)
    return jsonError('Nie udało się pobrać wiadomości Tawerny.', 500)
  }
}

export async function PATCH(request) {
  try {
    const access = await authorize(request)
    if (access.error) return access.error
    if (!(await isPortalStaff(access.supabase, access.auth.user.id))) {
      return jsonError('Tylko personel może przypinać wątki.', 403)
    }

    const rateLimit = await checkRateLimit(`chat-pin:${access.auth.user.id}`, { limit: 30, windowMs: 10 * 60_000 })
    if (!rateLimit.allowed) {
      return jsonError('Zmieniasz przypięcia zbyt często. Spróbuj ponownie później.', 429, { 'Retry-After': String(rateLimit.retryAfter) })
    }

    const body = await request.json().catch(() => null)
    if (!isModerationId(body?.id) || typeof body?.pinned !== 'boolean') {
      return jsonError('Nieprawidłowe dane przypięcia.', 400)
    }

    const { data: current, error: readError } = await access.supabase
      .from('chat_messages')
      .select('id, reply_to, status, channel')
      .eq('id', body.id)
      .maybeSingle()
    if (readError) throw readError
    if (!current || current.status !== 'visible' || current.channel !== 'GLOBALNY') return jsonError('Wiadomość nie istnieje.', 404)
    if (body.pinned && current.reply_to) return jsonError('Można przypiąć wyłącznie początek wątku.', 400)

    if (body.pinned) {
      const { count, error: countError } = await access.supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('channel', 'GLOBALNY')
        .eq('status', 'visible')
        .eq('is_pinned', true)
      if (countError) throw countError
      if ((count || 0) >= 3) return jsonError('Można przypiąć maksymalnie trzy wątki.', 409)
    }

    const pinnedState = body.pinned
      ? { is_pinned: true, pinned_at: new Date().toISOString(), pinned_by: access.auth.user.id }
      : { is_pinned: false, pinned_at: null, pinned_by: null }
    const { data, error } = await access.supabase
      .from('chat_messages')
      .update(pinnedState)
      .eq('id', body.id)
      .select(REPLY_FIELDS)
      .single()
    if (error) throw error

    return NextResponse.json({ message: data }, { headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error('Błąd przypinania wątku Tawerny:', error)
    return jsonError('Nie udało się zmienić przypięcia wątku.', 500)
  }
}

export async function POST(request) {
  try {
    const access = await authorize(request)
    if (access.error) return access.error

    const rateLimit = await checkRateLimit(`chat-message:${access.auth.user.id}`, { limit: 12, windowMs: 60_000 })
    if (!rateLimit.allowed) {
      return jsonError('Piszesz zbyt szybko. Spróbuj ponownie za chwilę.', 429, { 'Retry-After': String(rateLimit.retryAfter) })
    }

    const body = await request.json().catch(() => null)
    const text = cleanText(body?.text, { min: 1, max: 500 })
    const replyTo = body?.replyTo == null ? null : body.replyTo
    if (!text) return jsonError('Wiadomość musi mieć od 1 do 500 znaków.', 400)
    if (replyTo !== null && !isModerationId(replyTo)) return jsonError('Nieprawidłowa wiadomość źródłowa.', 400)

    const { data: profile } = await access.supabase
      .from('profiles')
      .select('ingame_nick, username')
      .eq('id', access.auth.user.id)
      .maybeSingle()
    const metadataName = access.auth.user.user_metadata?.full_name || access.auth.user.user_metadata?.name || 'Gracz'
    const username = cleanText(profile?.ingame_nick || profile?.username || metadataName, { min: 1, max: 80 })?.replace(/#0$/, '') || 'Gracz'
    const payload = {
      user_id: access.auth.user.id,
      channel: 'GLOBALNY',
      username,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }

    let result = await access.supabase.from('chat_messages').insert(payload).select(REPLY_FIELDS).single()
    let supportsReplies = true
    if (result.error && replyTo === null) {
      const fallback = await access.supabase.from('chat_messages').insert(payload).select(BASE_FIELDS).single()
      if (!fallback.error) {
        result = fallback
        supportsReplies = false
      }
    }
    if (result.error) throw result.error

    return NextResponse.json({ message: result.data, supportsReplies }, { status: 201, headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error('Błąd zapisu wiadomości Tawerny:', error)
    return jsonError('Nie udało się zapisać wiadomości.', 500)
  }
}

export async function DELETE(request) {
  try {
    const access = await authorize(request)
    if (access.error) return access.error

    const body = await request.json().catch(() => null)
    const id = body?.id
    if (!isModerationId(id)) return jsonError('Nieprawidłowy identyfikator wiadomości.', 400)

    const { data: message, error: readError } = await access.supabase
      .from('chat_messages')
      .select('id, user_id, status')
      .eq('id', id)
      .maybeSingle()
    if (readError) throw readError
    if (!message || message.status !== 'visible') return jsonError('Wiadomość nie istnieje.', 404)

    if (message.user_id === access.auth.user.id) {
      const { error } = await access.supabase
        .from('chat_messages')
        .delete()
        .eq('id', id)
        .eq('user_id', access.auth.user.id)
      if (error) throw error
    } else {
      if (!(await isPortalStaff(access.supabase, access.auth.user.id))) return jsonError('Nie możesz usunąć tej wiadomości.', 403)
      const { error } = await createSupabaseAdminClient().rpc('service_moderate_content_batch', {
        p_actor_id: access.auth.user.id,
        p_entity_type: 'chat_message',
        p_entity_ids: [id],
        p_action: 'remove',
        p_reason: 'Usunięto bezpośrednio z Tawerny.',
      })
      if (error) throw error
    }

    return NextResponse.json({ success: true }, { headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error('Błąd usuwania wiadomości Tawerny:', error)
    return jsonError('Nie udało się usunąć wiadomości.', 500)
  }
}
