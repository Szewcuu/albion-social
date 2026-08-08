import { NextResponse } from 'next/server'

import {
  createSupabaseRequestClient,
  isPortalAdmin,
  requireApiUser,
} from '@/lib/server/supabaseAdmin'

const jsonError = (message, status) => NextResponse.json({ error: message }, { status })

export async function GET(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const supabase = createSupabaseRequestClient(request)
    if (!(await isPortalAdmin(supabase, auth.user.id))) {
      return jsonError('Nie masz uprawnień administratora.', 403)
    }

    const [reportsResult, pendingResult, allReportsResult, commentsResult, buildsResult] = await Promise.all([
      supabase
        .from('build_reports')
        .select('id, build_id, comment_id, reason, details, status, created_at')
        .order('created_at', { ascending: false })
        .limit(60),
      supabase.from('build_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('build_reports').select('*', { count: 'exact', head: true }),
      supabase.from('build_comments').select('*', { count: 'exact', head: true }).eq('status', 'visible'),
      supabase.from('builds').select('*', { count: 'exact', head: true }),
    ])

    const firstError = [reportsResult, pendingResult, allReportsResult, commentsResult, buildsResult]
      .find((result) => result.error)?.error
    if (firstError) throw firstError

    const reports = reportsResult.data || []
    const buildIds = [...new Set(reports.map((report) => report.build_id).filter(Boolean))]
    const commentIds = [...new Set(reports.map((report) => report.comment_id).filter(Boolean))]

    const [buildsLookup, commentsLookup] = await Promise.all([
      buildIds.length
        ? supabase.from('builds').select('id, title').in('id', buildIds)
        : Promise.resolve({ data: [], error: null }),
      commentIds.length
        ? supabase.from('build_comments').select('id, content, status').in('id', commentIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (buildsLookup.error || commentsLookup.error) throw buildsLookup.error || commentsLookup.error

    const buildsById = new Map((buildsLookup.data || []).map((build) => [build.id, build]))
    const commentsById = new Map((commentsLookup.data || []).map((comment) => [comment.id, comment]))

    return NextResponse.json({
      stats: {
        pendingReports: pendingResult.count || 0,
        allReports: allReportsResult.count || 0,
        visibleComments: commentsResult.count || 0,
        builds: buildsResult.count || 0,
      },
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
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Błąd panelu administratora:', error)
    return jsonError('Nie udało się pobrać danych panelu administratora.', 500)
  }
}
