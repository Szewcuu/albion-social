import { NextResponse } from 'next/server'

import {
  COMMENT_MAX_LENGTH,
  COMMENT_MIN_LENGTH,
  ensureBuildExists,
  toCommentDto,
} from '@/lib/server/buildCommunity'
import { isBuildId } from '@/lib/server/builds'
import { checkRateLimit } from '@/lib/server/rateLimit'
import {
  createSupabasePublicServerClient,
  createSupabaseRequestClient,
  requireApiUser,
} from '@/lib/server/supabaseAdmin'
import { cleanText } from '@/lib/server/validation'
import { createNotification } from '@/lib/server/notifications'

const jsonError = (message, status, headers) => NextResponse.json({ error: message }, { status, headers })

async function readBuildId(params) {
  const { id } = await params
  return isBuildId(id) ? id : null
}

async function readOptionalViewer(request) {
  if (!(request.headers.get('authorization') || '').startsWith('Bearer ')) return null
  const auth = await requireApiUser(request)
  return auth.error ? null : auth.user
}

export async function GET(request, { params }) {
  try {
    const buildId = await readBuildId(params)
    if (!buildId) return jsonError('Nieprawidłowy identyfikator buildu.', 400)

    const viewer = await readOptionalViewer(request)
    const supabase = viewer
      ? createSupabaseRequestClient(request)
      : createSupabasePublicServerClient()

    if (!(await ensureBuildExists(supabase, buildId))) return jsonError('Nie znaleziono buildu.', 404)

    const { data, error, count } = await supabase
      .from('build_comments')
      .select('id, parent_id, content, created_at, updated_at, user_id, profiles!build_comments_user_id_fkey(username)', { count: 'exact' })
      .eq('build_id', buildId)
      .eq('status', 'visible')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw new Error('Nie udało się pobrać komentarzy.')

    // Najnowsza setka może zawierać odpowiedź do starszego wpisu. Dociągamy
    // maksymalnie trzy poziomy przodków, aby podgląd odpowiedzi nigdy nie osierociał.
    let comments = data || []
    for (let depth = 0; depth < 3; depth += 1) {
      const knownIds = new Set(comments.map((comment) => comment.id))
      const missingParentIds = [...new Set(comments
        .map((comment) => comment.parent_id)
        .filter((parentId) => parentId && !knownIds.has(parentId)))]
      if (missingParentIds.length === 0) break

      const { data: parents, error: parentsError } = await supabase
        .from('build_comments')
        .select('id, parent_id, content, created_at, updated_at, user_id, profiles!build_comments_user_id_fkey(username)')
        .eq('build_id', buildId)
        .eq('status', 'visible')
        .in('id', missingParentIds)
      if (parentsError) throw new Error('Nie udało się odtworzyć wątków komentarzy.')
      comments = [...comments, ...(parents || [])]
    }

    return NextResponse.json({
      comments: comments.map((row) => toCommentDto(row, viewer?.id)),
      count: count || 0,
    })
  } catch (error) {
    console.error('Błąd odczytu komentarzy buildu:', error)
    return jsonError('Nie udało się pobrać komentarzy.', 500)
  }
}

export async function POST(request, { params }) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const buildId = await readBuildId(params)
    if (!buildId) return jsonError('Nieprawidłowy identyfikator buildu.', 400)

    const rateLimit = await checkRateLimit(`build-comment:${auth.user.id}`, {
      limit: 6,
      windowMs: 60 * 1000,
    })
    if (!rateLimit.allowed) {
      return jsonError('Dodajesz komentarze zbyt szybko. Spróbuj ponownie za chwilę.', 429, {
        'Retry-After': String(rateLimit.retryAfter),
      })
    }

    const body = await request.json().catch(() => null)
    const content = cleanText(body?.content, { min: COMMENT_MIN_LENGTH, max: COMMENT_MAX_LENGTH })
    if (!content) return jsonError(`Komentarz musi mieć od ${COMMENT_MIN_LENGTH} do ${COMMENT_MAX_LENGTH} znaków.`, 400)
    const parentId = body?.parentId == null ? null : body.parentId
    if (parentId && !isBuildId(parentId)) return jsonError('Nieprawidłowy komentarz nadrzędny.', 400)

    const supabase = createSupabaseRequestClient(request)
    if (!(await ensureBuildExists(supabase, buildId))) return jsonError('Nie znaleziono buildu.', 404)

    let parentComment = null
    if (parentId) {
      const { data: parent, error: parentError } = await supabase
        .from('build_comments')
        .select('id, user_id, parent_id, profiles!build_comments_user_id_fkey(username)')
        .eq('id', parentId)
        .eq('build_id', buildId)
        .eq('status', 'visible')
        .maybeSingle()

      if (parentError) throw new Error('Nie udało się sprawdzić komentarza nadrzędnego.')
      if (!parent) return jsonError('Komentarz, na który odpowiadasz, nie istnieje.', 404)
      parentComment = parent
    }

    const { data, error } = await supabase
      .from('build_comments')
      .insert({ build_id: buildId, user_id: auth.user.id, content, parent_id: parentId })
      .select('id, parent_id, content, created_at, updated_at, user_id, profiles!build_comments_user_id_fkey(username)')
      .single()
    if (error?.message?.includes('build_comment_thread_too_deep')) {
      return jsonError('Ten wątek osiągnął maksymalny poziom zagnieżdżenia.', 400)
    }
    if (error) throw new Error('Nie udało się zapisać komentarza.')

    // Notification to build author
    const { data: buildData } = await supabase
      .from('builds')
      .select('user_id, title')
      .eq('id', buildId)
      .maybeSingle()

    const commenterName = data.profiles?.username || 'Gracz'
    if (parentComment?.user_id && parentComment.user_id !== auth.user.id) {
      await createNotification({
        userId: parentComment.user_id,
        title: 'Nowa odpowiedź w dyskusji',
        message: `${commenterName} odpowiedział na Twój komentarz.`,
        link: `/buildy/${buildId}#comment-${data.id}`,
        type: 'build_comment_reply',
      })
    }

    if (
      buildData?.user_id
      && buildData.user_id !== auth.user.id
      && buildData.user_id !== parentComment?.user_id
    ) {
      await createNotification({
        userId: buildData.user_id,
        title: 'Nowy komentarz pod Twoim buildem',
        message: `${commenterName} skomentował Twój zestaw "${buildData.title}".`,
        link: `/buildy/${buildId}#comment-${data.id}`,
        type: 'build_comment',
      })
    }

    return NextResponse.json({ comment: toCommentDto(data, auth.user.id) }, { status: 201 })
  } catch (error) {
    console.error('Błąd dodawania komentarza buildu:', error)
    return jsonError('Nie udało się dodać komentarza.', 500)
  }
}
