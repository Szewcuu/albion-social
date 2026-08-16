import { NextResponse } from 'next/server'

import { checkRateLimit } from '@/lib/server/rateLimit'
import { isModerationId } from '@/lib/server/moderation'
import {
  createSupabaseAdminClient,
  createSupabaseRequestClient,
  isPortalStaff,
  requireApiUser,
} from '@/lib/server/supabaseAdmin'
import { cleanText } from '@/lib/server/validation'
import {
  applyCreatedAtCursor,
  decodeCreatedAtCursor,
  pageFromRows,
} from '@/lib/server/pagination'

const ACTIONS = ['review', 'dismiss']
const REPORT_STATUSES = ['pending', 'actioned', 'reviewed', 'dismissed', 'all']
const REPORTS_PAGE_SIZE = 20
const jsonError = (message, status, headers) => NextResponse.json({ error: message }, { status, headers })

export async function GET(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const supabase = createSupabaseRequestClient(request)
    if (!(await isPortalStaff(supabase, auth.user.id))) {
      return jsonError('Nie masz uprawnień personelu moderacyjnego.', 403)
    }

    const searchParams = new URL(request.url).searchParams
    const status = REPORT_STATUSES.includes(searchParams.get('status')) ? searchParams.get('status') : 'pending'
    const cursor = decodeCreatedAtCursor(searchParams.get('cursor'), isModerationId)
    if (cursor === undefined) return jsonError('Nieprawidłowy kursor zgłoszeń.', 400)

    let query = supabase
      .from('build_reports')
      .select('id, build_id, comment_id, reason, details, status, created_at')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(REPORTS_PAGE_SIZE + 1)
    if (status !== 'all') query = query.eq('status', status)
    query = applyCreatedAtCursor(query, cursor)

    const { data, error } = await query
    if (error) throw error
    const pagination = pageFromRows(data || [], REPORTS_PAGE_SIZE)
    const reports = pagination.page
    const buildIds = [...new Set(reports.map((report) => report.build_id).filter(Boolean))]
    const commentIds = [...new Set(reports.map((report) => report.comment_id).filter(Boolean))]
    const [buildsLookup, commentsLookup] = await Promise.all([
      buildIds.length ? supabase.from('builds').select('id, title').in('id', buildIds) : Promise.resolve({ data: [], error: null }),
      commentIds.length ? supabase.from('build_comments').select('id, content, status').in('id', commentIds) : Promise.resolve({ data: [], error: null }),
    ])
    if (buildsLookup.error || commentsLookup.error) throw buildsLookup.error || commentsLookup.error

    const buildsById = new Map((buildsLookup.data || []).map((build) => [build.id, build]))
    const commentsById = new Map((commentsLookup.data || []).map((comment) => [comment.id, comment]))
    return NextResponse.json({
      reports: reports.map((report) => ({
        id: report.id,
        buildId: report.build_id,
        buildTitle: buildsById.get(report.build_id)?.title || 'Usunięty lub niedostępny build',
        commentId: report.comment_id,
        comment: report.comment_id ? commentsById.get(report.comment_id) || null : null,
        reason: report.reason,
        details: report.details,
        status: report.status,
        createdAt: report.created_at,
      })),
      pagination: { hasMore: pagination.hasMore, nextCursor: pagination.nextCursor },
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Błąd pobierania zgłoszeń administratora:', error)
    return jsonError('Nie udało się pobrać zgłoszeń.', 500)
  }
}

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

    const { data, error } = await createSupabaseAdminClient().rpc('service_review_build_reports_batch', {
      p_actor_id: auth.user.id,
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
