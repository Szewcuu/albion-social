import { NextResponse } from 'next/server'

import { isCommunityId } from '@/lib/server/buildCommunity'
import {
  createSupabaseRequestClient,
  isPortalStaff,
  requireApiUser,
} from '@/lib/server/supabaseAdmin'

const ACTIONS = ['review', 'dismiss', 'hide_comment']
const jsonError = (message, status) => NextResponse.json({ error: message }, { status })

export async function PATCH(request, { params }) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const supabase = createSupabaseRequestClient(request)
    if (!(await isPortalStaff(supabase, auth.user.id))) {
      return jsonError('Nie masz uprawnień personelu moderacyjnego.', 403)
    }

    const { id } = await params
    if (!isCommunityId(id)) return jsonError('Nieprawidłowy identyfikator zgłoszenia.', 400)

    const body = await request.json().catch(() => null)
    const action = typeof body?.action === 'string' && ACTIONS.includes(body.action) ? body.action : null
    const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 500) : ''
    if (!action) return jsonError('Nieprawidłowa akcja moderacyjna.', 400)
    if (reason.length < 3) return jsonError('Podaj powód decyzji moderacyjnej.', 400)

    const { data: report, error: reviewError } = await supabase.rpc('review_build_report', {
      p_report_id: id,
      p_action: action,
      p_reason: reason,
    })
    if (reviewError) throw reviewError

    return NextResponse.json({
      report: {
        id: report.id,
        status: report.status,
        commentStatus: report.commentStatus || undefined,
      },
    })
  } catch (error) {
    console.error('Błąd moderacji zgłoszenia:', error)
    return jsonError('Nie udało się wykonać akcji moderacyjnej.', 500)
  }
}
