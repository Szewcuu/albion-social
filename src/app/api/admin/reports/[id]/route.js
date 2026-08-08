import { NextResponse } from 'next/server'

import { isCommunityId } from '@/lib/server/buildCommunity'
import {
  createSupabaseRequestClient,
  isPortalAdmin,
  requireApiUser,
} from '@/lib/server/supabaseAdmin'

const ACTIONS = ['review', 'dismiss', 'hide_comment']
const jsonError = (message, status) => NextResponse.json({ error: message }, { status })

export async function PATCH(request, { params }) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const supabase = createSupabaseRequestClient(request)
    if (!(await isPortalAdmin(supabase, auth.user.id))) {
      return jsonError('Nie masz uprawnień administratora.', 403)
    }

    const { id } = await params
    if (!isCommunityId(id)) return jsonError('Nieprawidłowy identyfikator zgłoszenia.', 400)

    const body = await request.json().catch(() => null)
    const action = typeof body?.action === 'string' && ACTIONS.includes(body.action) ? body.action : null
    if (!action) return jsonError('Nieprawidłowa akcja moderacyjna.', 400)

    const { data: report, error: reportError } = await supabase
      .from('build_reports')
      .select('id, comment_id, status')
      .eq('id', id)
      .maybeSingle()

    if (reportError) throw reportError
    if (!report) return jsonError('Nie znaleziono zgłoszenia.', 404)
    if (report.status !== 'pending') return jsonError('To zgłoszenie zostało już rozpatrzone.', 409)
    if (action === 'hide_comment' && !report.comment_id) {
      return jsonError('To zgłoszenie nie dotyczy komentarza.', 400)
    }

    if (action === 'hide_comment') {
      const { error: commentError } = await supabase
        .from('build_comments')
        .update({ status: 'hidden', updated_at: new Date().toISOString() })
        .eq('id', report.comment_id)
      if (commentError) throw commentError
    }

    const status = action === 'dismiss' ? 'dismissed' : action === 'hide_comment' ? 'actioned' : 'reviewed'
    const reviewedAt = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('build_reports')
      .update({ status, reviewed_at: reviewedAt, reviewed_by: auth.user.id })
      .eq('id', report.id)

    if (updateError) {
      if (action === 'hide_comment') {
        await supabase
          .from('build_comments')
          .update({ status: 'visible', updated_at: new Date().toISOString() })
          .eq('id', report.comment_id)
      }
      throw updateError
    }

    return NextResponse.json({
      report: {
        id: report.id,
        status,
        commentStatus: action === 'hide_comment' ? 'hidden' : undefined,
        reviewedAt,
      },
    })
  } catch (error) {
    console.error('Błąd moderacji zgłoszenia:', error)
    return jsonError('Nie udało się wykonać akcji moderacyjnej.', 500)
  }
}
