import { NextResponse } from 'next/server'

import { checkRateLimit } from '@/lib/server/rateLimit'
import { isBuildId } from '@/lib/server/builds'
import {
  createSupabasePublicServerClient,
  createSupabaseRequestClient,
  requireApiUser,
} from '@/lib/server/supabaseAdmin'

const jsonError = (message, status, headers) => (
  NextResponse.json({ error: message }, { status, headers })
)

async function readBuildId(params) {
  const { id } = await params
  return isBuildId(id) ? id : null
}

async function ensureBuildExists(supabase, buildId) {
  const { data, error } = await supabase
    .from('builds')
    .select('id')
    .eq('id', buildId)
    .maybeSingle()

  if (error) throw new Error('Nie udało się sprawdzić buildu.')
  return Boolean(data)
}

async function countVotes(buildId) {
  const supabase = createSupabasePublicServerClient()
  const { count, error } = await supabase
    .from('build_votes')
    .select('id', { count: 'exact', head: true })
    .eq('build_id', buildId)
    .eq('vote_type', 'up')

  if (error) throw new Error('Nie udało się policzyć głosów.')
  return count || 0
}

export async function GET(request, { params }) {
  try {
    const buildId = await readBuildId(params)
    if (!buildId) return jsonError('Nieprawidłowy identyfikator buildu.', 400)

    const publicClient = createSupabasePublicServerClient()
    if (!(await ensureBuildExists(publicClient, buildId))) {
      return jsonError('Nie znaleziono buildu.', 404)
    }

    const authorization = request.headers.get('authorization') || ''
    let userVote = false
    let favorite = false

    if (authorization.startsWith('Bearer ')) {
      const auth = await requireApiUser(request)
      if (auth.error) return jsonError(auth.error, auth.status)

      const userClient = createSupabaseRequestClient(request)
      const [voteResult, favoriteResult] = await Promise.all([
        userClient
          .from('build_votes')
          .select('id')
          .eq('build_id', buildId)
          .eq('user_id', auth.user.id)
          .maybeSingle(),
        userClient
          .from('build_favorites')
          .select('id')
          .eq('build_id', buildId)
          .eq('user_id', auth.user.id)
          .maybeSingle(),
      ])

      if (voteResult.error || favoriteResult.error) {
        throw new Error('Nie udało się odczytać interakcji użytkownika.')
      }

      userVote = Boolean(voteResult.data)
      favorite = Boolean(favoriteResult.data)
    }

    return NextResponse.json({
      votes: await countVotes(buildId),
      userVote,
      favorite,
    })
  } catch (error) {
    console.error('Błąd odczytu interakcji buildu:', error)
    return jsonError('Nie udało się pobrać interakcji buildu.', 500)
  }
}

export async function PUT(request, { params }) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const buildId = await readBuildId(params)
    if (!buildId) return jsonError('Nieprawidłowy identyfikator buildu.', 400)

    const rateLimit = await checkRateLimit(`build-vote:${auth.user.id}`, {
      limit: 30,
      windowMs: 60 * 1000,
    })
    if (!rateLimit.allowed) {
      return jsonError('Zbyt wiele zmian głosu. Spróbuj ponownie za chwilę.', 429, {
        'Retry-After': String(rateLimit.retryAfter),
      })
    }

    const supabase = createSupabaseRequestClient(request)
    if (!(await ensureBuildExists(supabase, buildId))) {
      return jsonError('Nie znaleziono buildu.', 404)
    }

    const { data: existing, error: readError } = await supabase
      .from('build_votes')
      .select('id')
      .eq('build_id', buildId)
      .eq('user_id', auth.user.id)
      .maybeSingle()

    if (readError) throw new Error('Nie udało się odczytać głosu.')

    if (existing) {
      const { error } = await supabase
        .from('build_votes')
        .delete()
        .eq('id', existing.id)
      if (error) throw new Error('Nie udało się usunąć głosu.')
    } else {
      const { error } = await supabase
        .from('build_votes')
        .insert({ build_id: buildId, user_id: auth.user.id, vote_type: 'up' })

      if (error && error.code !== '23505') {
        throw new Error('Nie udało się zapisać głosu.')
      }
    }

    return NextResponse.json({
      votes: await countVotes(buildId),
      userVote: !existing,
    })
  } catch (error) {
    console.error('Błąd głosowania na build:', error)
    return jsonError('Nie udało się zmienić głosu.', 500)
  }
}

export async function POST(request, { params }) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const buildId = await readBuildId(params)
    if (!buildId) return jsonError('Nieprawidłowy identyfikator buildu.', 400)

    const rateLimit = await checkRateLimit(`build-favorite:${auth.user.id}`, {
      limit: 30,
      windowMs: 60 * 1000,
    })
    if (!rateLimit.allowed) {
      return jsonError('Zbyt wiele zmian ulubionych. Spróbuj ponownie za chwilę.', 429, {
        'Retry-After': String(rateLimit.retryAfter),
      })
    }

    const supabase = createSupabaseRequestClient(request)
    if (!(await ensureBuildExists(supabase, buildId))) {
      return jsonError('Nie znaleziono buildu.', 404)
    }

    const { data: existing, error: readError } = await supabase
      .from('build_favorites')
      .select('id')
      .eq('build_id', buildId)
      .eq('user_id', auth.user.id)
      .maybeSingle()

    if (readError) throw new Error('Nie udało się odczytać ulubionych.')

    if (existing) {
      const { error } = await supabase
        .from('build_favorites')
        .delete()
        .eq('id', existing.id)
      if (error) throw new Error('Nie udało się usunąć buildu z ulubionych.')
    } else {
      const { error } = await supabase
        .from('build_favorites')
        .insert({ build_id: buildId, user_id: auth.user.id })

      if (error && error.code !== '23505') {
        throw new Error('Nie udało się dodać buildu do ulubionych.')
      }
    }

    return NextResponse.json({ favorite: !existing })
  } catch (error) {
    console.error('Błąd ulubionych buildu:', error)
    return jsonError('Nie udało się zmienić ulubionych.', 500)
  }
}
