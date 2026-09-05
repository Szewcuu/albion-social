import { NextResponse } from 'next/server'

import { getUtcWeekWindow, rankWeeklyBuilds } from '@/lib/buildOfWeek'
import { buildFromDbRow, getBuildItemIds } from '@/lib/buildSlots'
import { getAlbionItemNameMap } from '@/lib/server/albionItemCatalog'
import { isModerationId } from '@/lib/server/moderation'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { createSupabaseRequestClient, requireApiUser } from '@/lib/server/supabaseAdmin'

const CANDIDATE_LIMIT = 3
const MAX_ELIGIBLE_BUILDS = 500
const BUILD_FIELDS = 'id, created_at, user_id, title, activity_type, description, status, weapon, offhand, armor, head, shoes, cape, bag, potion, food, build_data, profiles!builds_user_id_fkey(username, avatar_url), build_votes(id, vote_type)'
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' }

const jsonError = (message, status, headers) => NextResponse.json(
  { error: message },
  { status, headers: { ...NO_STORE_HEADERS, ...headers } },
)

async function authorize(request) {
  const auth = await requireApiUser(request)
  if (auth.error) return { response: jsonError(auth.error, auth.status) }
  return { auth, supabase: createSupabaseRequestClient(request) }
}

async function loadWeeklySnapshot(context) {
  const week = getUtcWeekWindow()
  const [{ data: builds, error: buildsError }, { data: votes, error: votesError }] = await Promise.all([
    context.supabase
      .from('builds')
      .select(BUILD_FIELDS)
      .eq('status', 'visible')
      .order('created_at', { ascending: false })
      .limit(MAX_ELIGIBLE_BUILDS),
    context.supabase
      .from('build_weekly_votes')
      .select('build_id, user_id')
      .eq('week_start', week.weekStart),
  ])

  if (buildsError) throw buildsError
  if (votesError) throw votesError

  const safeVotes = votes || []
  const candidates = rankWeeklyBuilds(builds || [], safeVotes, CANDIDATE_LIMIT).map((build) => ({
    ...build,
    item_names: getAlbionItemNameMap(getBuildItemIds(buildFromDbRow(build))),
  }))
  const totalVotes = safeVotes.length

  return {
    week,
    candidates,
    leaderId: totalVotes > 0 ? candidates[0]?.id || null : null,
    totalVotes,
    userVoteBuildId: safeVotes.find((vote) => vote.user_id === context.auth.user.id)?.build_id || null,
  }
}

async function mutateVote(request, operation) {
  const context = await authorize(request)
  if (context.response) return context.response

  const rateLimit = await checkRateLimit(`build-weekly-vote:${context.auth.user.id}`, {
    limit: 30,
    windowMs: 10 * 60 * 1000,
  })
  if (!rateLimit.allowed) {
    return jsonError('Zmieniasz głos zbyt często. Spróbuj ponownie później.', 429, {
      'Retry-After': String(rateLimit.retryAfter),
    })
  }

  const week = getUtcWeekWindow()
  if (operation === 'delete') {
    const { error } = await context.supabase
      .from('build_weekly_votes')
      .delete()
      .eq('week_start', week.weekStart)
      .eq('user_id', context.auth.user.id)
    if (error) throw error
  } else {
    const body = await request.json().catch(() => null)
    if (!isModerationId(body?.buildId)) return jsonError('Nieprawidłowy identyfikator buildu.', 400)

    const { data: build, error: buildError } = await context.supabase
      .from('builds')
      .select('id')
      .eq('id', body.buildId)
      .eq('status', 'visible')
      .maybeSingle()
    if (buildError) throw buildError
    if (!build) return jsonError('Ten build nie jest dostępny w publicznej Zbrojowni.', 404)

    const { error } = await context.supabase
      .from('build_weekly_votes')
      .upsert({
        week_start: week.weekStart,
        build_id: body.buildId,
        user_id: context.auth.user.id,
      }, { onConflict: 'week_start,user_id' })
    if (error) throw error
  }

  return NextResponse.json(await loadWeeklySnapshot(context), { headers: NO_STORE_HEADERS })
}

export async function GET(request) {
  try {
    const context = await authorize(request)
    if (context.response) return context.response
    return NextResponse.json(await loadWeeklySnapshot(context), { headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error('Błąd pobierania głosowania na build tygodnia:', error)
    return jsonError('Nie udało się pobrać głosowania na build tygodnia.', 500)
  }
}

export async function PUT(request) {
  try {
    return await mutateVote(request, 'upsert')
  } catch (error) {
    console.error('Błąd oddawania głosu na build tygodnia:', error)
    return jsonError('Nie udało się zapisać głosu.', 500)
  }
}

export async function DELETE(request) {
  try {
    return await mutateVote(request, 'delete')
  } catch (error) {
    console.error('Błąd wycofywania głosu na build tygodnia:', error)
    return jsonError('Nie udało się wycofać głosu.', 500)
  }
}
