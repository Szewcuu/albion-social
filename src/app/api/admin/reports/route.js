import { NextResponse } from 'next/server'

import { checkRateLimit } from '@/lib/server/rateLimit'
import { isModerationId } from '@/lib/server/moderation'
import {
  createSupabaseRequestClient,
  isPortalStaff,
  requireApiUser,
} from '@/lib/server/supabaseAdmin'
import { cleanText } from '@/lib/server/validation'

const ACTIONS = ['review', 'dismiss']
const jsonError = (message, status, headers) => NextResponse.json({ error: message }, { status, headers })

export async function PATCH(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const supabase = createSupabaseRequestClient(request)
    if (!(await isPortalStaff(supabase, auth.user.id))) {
      return jsonError('Nie masz uprawnień personelu moderacyjnego.', 403)
    }

    const rateLimit = await checkRateLimit(`moderation-reports:${auth.user.id}`, {
      limit: 120,
      windowMs: 60 * 60 * 1000,
    })
    if (!rateLimit.allowed) {
      return jsonError('Limit akcji moderacyjnych został osiągnięty.', 429, {
        'Retry-After': String(rateLimit.retryAfter),
      })
    }

    const body = await request.json().catch(() => null)
    const action = typeof body?.action === 'string' && ACTIONS.includes(body.action)
      ? body.action
      : null
    const ids = Array.isArray(body?.ids) ? [...new Set(body.ids)] : []
    const reason = cleanText(body?.reason, { min: 3, max: 500 })

    if (!action) return jsonError('Nieprawidłowa akcja zbiorcza.', 400)
    if (!ids.length || ids.length > 50 || ids.some((id) => !isModerationId(id))) {
      return jsonError('Wybierz od 1 do 50 prawidłowych zgłoszeń.', 400)
    }
    if (!reason) return jsonError('Podaj powód decyzji moderacyjnej.', 400)

    const { data, error } = await supabase.rpc('review_build_reports_batch', {
      p_report_ids: ids,
      p_action: action,
      p_reason: reason,
    })
    if (error) throw error

    return NextResponse.json({ affected: Number(data) || 0 })
  } catch (error) {
    console.error('Błąd zbiorczej moderacji zgłoszeń:', error)
    return jsonError('Nie udało się wykonać zbiorczej akcji na zgłoszeniach.', 500)
  }
}
