import { NextResponse } from 'next/server'

import { isCommunityId } from '@/lib/server/buildCommunity'
import { isBuildId } from '@/lib/server/builds'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { createSupabaseRequestClient, requireApiUser } from '@/lib/server/supabaseAdmin'

const jsonError = (message, status, headers) => NextResponse.json({ error: message }, { status, headers })

export async function DELETE(request, { params }) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const { id, commentId } = await params
    if (!isBuildId(id) || !isCommunityId(commentId)) {
      return jsonError('Nieprawidłowy identyfikator komentarza.', 400)
    }

    const rateLimit = checkRateLimit(`build-comment-delete:${auth.user.id}`, {
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
