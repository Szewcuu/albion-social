import { NextResponse } from 'next/server'

import {
  ensureBuildExists,
  isCommunityId,
  REPORT_DETAILS_MAX_LENGTH,
  REPORT_REASONS,
} from '@/lib/server/buildCommunity'
import { isBuildId } from '@/lib/server/builds'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { createSupabaseRequestClient, requireApiUser } from '@/lib/server/supabaseAdmin'
import { cleanEnum, cleanText } from '@/lib/server/validation'

const jsonError = (message, status, headers) => NextResponse.json({ error: message }, { status, headers })

export async function POST(request, { params }) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const { id } = await params
    if (!isBuildId(id)) return jsonError('Nieprawidłowy identyfikator buildu.', 400)

    const rateLimit = checkRateLimit(`build-report:${auth.user.id}`, {
      limit: 5,
      windowMs: 10 * 60 * 1000,
    })
    if (!rateLimit.allowed) {
      return jsonError('Limit zgłoszeń został osiągnięty. Spróbuj ponownie później.', 429, {
        'Retry-After': String(rateLimit.retryAfter),
      })
    }

    const body = await request.json().catch(() => null)
    const reason = cleanEnum(body?.reason, REPORT_REASONS)
    const commentId = body?.commentId == null ? null : body.commentId
    const details = body?.details
      ? cleanText(body.details, { min: 2, max: REPORT_DETAILS_MAX_LENGTH })
      : null

    if (!reason) return jsonError('Wybierz prawidłowy powód zgłoszenia.', 400)
    if (commentId && !isCommunityId(commentId)) return jsonError('Nieprawidłowy komentarz.', 400)
    if (body?.details && !details) return jsonError(`Opis może mieć maksymalnie ${REPORT_DETAILS_MAX_LENGTH} znaków.`, 400)

    const supabase = createSupabaseRequestClient(request)
    if (!(await ensureBuildExists(supabase, id))) return jsonError('Nie znaleziono buildu.', 404)

    if (commentId) {
      const { data: comment, error: commentError } = await supabase
        .from('build_comments')
        .select('id')
        .eq('id', commentId)
        .eq('build_id', id)
        .eq('status', 'visible')
        .maybeSingle()

      if (commentError) throw new Error('Nie udało się sprawdzić komentarza.')
      if (!comment) return jsonError('Nie znaleziono komentarza.', 404)
    }

    const { error } = await supabase.from('build_reports').insert({
      build_id: id,
      comment_id: commentId,
      reporter_id: auth.user.id,
      reason,
      details,
    })

    if (error?.code === '23505') return jsonError('To zgłoszenie zostało już przez Ciebie wysłane.', 409)
    if (error) throw new Error('Nie udało się zapisać zgłoszenia.')

    return NextResponse.json({ reported: true }, { status: 201 })
  } catch (error) {
    console.error('Błąd zgłaszania treści buildu:', error)
    return jsonError('Nie udało się wysłać zgłoszenia.', 500)
  }
}
