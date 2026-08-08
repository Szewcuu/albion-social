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
      .select('id, content, created_at, user_id, profiles(username)', { count: 'exact' })
      .eq('build_id', buildId)
      .eq('status', 'visible')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw new Error('Nie udało się pobrać komentarzy.')

    return NextResponse.json({
      comments: (data || []).reverse().map((row) => toCommentDto(row, viewer?.id)),
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

    const supabase = createSupabaseRequestClient(request)
    if (!(await ensureBuildExists(supabase, buildId))) return jsonError('Nie znaleziono buildu.', 404)

    const { data, error } = await supabase
      .from('build_comments')
      .insert({ build_id: buildId, user_id: auth.user.id, content })
      .select('id, content, created_at, user_id, profiles(username)')
      .single()

    if (error) throw new Error('Nie udało się zapisać komentarza.')
    return NextResponse.json({ comment: toCommentDto(data, auth.user.id) }, { status: 201 })
  } catch (error) {
    console.error('Błąd dodawania komentarza buildu:', error)
    return jsonError('Nie udało się dodać komentarza.', 500)
  }
}
