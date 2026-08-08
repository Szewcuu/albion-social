import { NextResponse } from 'next/server'

import { checkRateLimit } from '@/lib/server/rateLimit'
import {
  isModerationId,
  MODERATION_ACTIONS,
  MODERATION_STATUSES,
  MODERATION_TARGETS,
  toModerationDto,
} from '@/lib/server/moderation'
import {
  createSupabaseRequestClient,
  isPortalStaff,
  requireApiUser,
} from '@/lib/server/supabaseAdmin'
import { cleanText } from '@/lib/server/validation'

const jsonError = (message, status, headers) => NextResponse.json({ error: message }, { status, headers })

async function authorizeStaff(request) {
  const auth = await requireApiUser(request)
  if (auth.error) return { error: jsonError(auth.error, auth.status) }
  const supabase = createSupabaseRequestClient(request)
  if (!(await isPortalStaff(supabase, auth.user.id))) {
    return { error: jsonError('Nie masz uprawnień personelu moderacyjnego.', 403) }
  }
  return { auth, supabase }
}

export async function GET(request) {
  try {
    const access = await authorizeStaff(request)
    if (access.error) return access.error

    const url = new URL(request.url)
    const type = url.searchParams.get('type') || 'chat_message'
    const status = url.searchParams.get('status') || 'visible'
    const config = MODERATION_TARGETS[type]
    if (!config || !MODERATION_STATUSES.includes(status)) return jsonError('Nieprawidłowy filtr moderacji.', 400)

    const { data, error } = await access.supabase
      .from(config.table)
      .select(config.select)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(60)

    if (error) throw error
    return NextResponse.json({ items: (data || []).map((row) => toModerationDto(type, row)) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Błąd kolejki treści moderowanych:', error)
    return jsonError('Nie udało się pobrać treści do moderacji.', 500)
  }
}

export async function PATCH(request) {
  try {
    const access = await authorizeStaff(request)
    if (access.error) return access.error

    const rateLimit = await checkRateLimit(`moderation:${access.auth.user.id}`, { limit: 120, windowMs: 60 * 60 * 1000 })
    if (!rateLimit.allowed) return jsonError('Limit akcji moderacyjnych został osiągnięty.', 429, { 'Retry-After': String(rateLimit.retryAfter) })

    const body = await request.json().catch(() => null)
    const type = typeof body?.type === 'string' ? body.type : ''
    const action = typeof body?.action === 'string' ? body.action : ''
    const ids = Array.isArray(body?.ids) ? [...new Set(body.ids)] : []
    const reason = cleanText(body?.reason, { min: 3, max: 500 })

    if (!MODERATION_TARGETS[type] || !MODERATION_ACTIONS.includes(action)) return jsonError('Nieprawidłowa akcja moderacyjna.', 400)
    if (!ids.length || ids.length > 50 || ids.some((id) => !isModerationId(id))) return jsonError('Wybierz od 1 do 50 prawidłowych rekordów.', 400)
    if (!reason) return jsonError('Podaj powód o długości od 3 do 500 znaków.', 400)

    const { data, error } = await access.supabase.rpc('moderate_content_batch', {
      p_entity_type: type,
      p_entity_ids: ids,
      p_action: action,
      p_reason: reason,
    })
    if (error) throw error

    return NextResponse.json({ affected: Number(data) || 0, status: action === 'restore' ? 'visible' : action === 'hide' ? 'hidden' : 'removed' })
  } catch (error) {
    console.error('Błąd zbiorczej moderacji:', error)
    return jsonError('Nie udało się wykonać akcji moderacyjnej.', 500)
  }
}
