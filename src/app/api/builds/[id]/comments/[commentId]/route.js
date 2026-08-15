import { NextResponse } from 'next/server'

import {
  COMMENT_MAX_LENGTH,
  COMMENT_MIN_LENGTH,
  isCommunityId,
  toCommentDto,
} from '@/lib/server/buildCommunity'
import { isBuildId } from '@/lib/server/builds'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { createSupabaseRequestClient, requireApiUser } from '@/lib/server/supabaseAdmin'
import { cleanText } from '@/lib/server/validation'

const jsonError = (message, status, headers) => NextResponse.json({ error: message }, { status, headers })

export async function DELETE(request, { params }) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const { id, commentId } = await params
    if (!isBuildId(id) || !isCommunityId(commentId)) {
      return jsonError('Nieprawidłowy identyfikator komentarza.', 400)
    }

    const rateLimit = await checkRateLimit(`build-comment-delete:${auth.user.id}`, {
      limit: 12,
      windowMs: 60 * 1000,
    })
    if (!rateLimit.allowed) {
      return jsonError('Zbyt wiele operacji. Spróbuj ponownie za chwilę.', 429, {
        'Retry-After': String(rateLimit.retryAfter),
      })
    }

    const supabase = createSupabaseRequestClient(request)
    const { data, error } = await supabase
      .from('build_comments')
      .delete()
      .eq('id', commentId)
      .eq('build_id', id)
      .eq('user_id', auth.user.id)
      .select('id')
      .maybeSingle()

    if (error) throw new Error('Nie udało się usunąć komentarza.')
    if (!data) return jsonError('Komentarz nie istnieje albo nie należy do Ciebie.', 404)

    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('Błąd usuwania komentarza buildu:', error)
    return jsonError('Nie udało się usunąć komentarza.', 500)
  }
}

export async function PATCH(request, { params }) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const { id, commentId } = await params
    if (!isBuildId(id) || !isCommunityId(commentId)) {
      return jsonError('Nieprawidłowy identyfikator komentarza.', 400)
    }

    const rateLimit = await checkRateLimit(`build-comment-patch:${auth.user.id}`, {
      limit: 10,
      windowMs: 60 * 1000,
    })
    if (!rateLimit.allowed) {
      return jsonError('Zbyt wiele modyfikacji. Spróbuj ponownie za chwilę.', 429, {
        'Retry-After': String(rateLimit.retryAfter),
      })
    }

    const body = await request.json().catch(() => null)
    const content = cleanText(body?.content, { min: COMMENT_MIN_LENGTH, max: COMMENT_MAX_LENGTH })
    if (!content) return jsonError(`Komentarz musi mieć od ${COMMENT_MIN_LENGTH} do ${COMMENT_MAX_LENGTH} znaków.`, 400)

    const supabase = createSupabaseRequestClient(request)
    const { data, error } = await supabase
      .from('build_comments')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', commentId)
      .eq('build_id', id)
      .eq('user_id', auth.user.id)
      .select('id, parent_id, content, created_at, updated_at, user_id, profiles!build_comments_user_id_fkey(username)')
      .maybeSingle()

    if (error) throw new Error('Nie udało się zaktualizować komentarza.')
    if (!data) return jsonError('Komentarz nie istnieje albo nie należy do Ciebie.', 404)

    return NextResponse.json({ comment: toCommentDto(data, auth.user.id) })
  } catch (error) {
    console.error('Błąd edycji komentarza buildu:', error)
    return jsonError('Nie udało się edytować komentarza.', 500)
  }
}
