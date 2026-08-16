import { NextResponse } from 'next/server'

import {
  createSupabaseRequestClient,
  getPortalRole,
  isPortalStaff,
  requireApiUser,
} from '@/lib/server/supabaseAdmin'

const jsonError = (message, status) => NextResponse.json({ error: message }, { status })

export async function GET(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const supabase = createSupabaseRequestClient(request)
    if (!(await isPortalStaff(supabase, auth.user.id))) {
      return jsonError('Nie masz uprawnień personelu moderacyjnego.', 403)
    }

    const [pendingResult, allReportsResult, commentsResult, buildsResult] = await Promise.all([
      supabase.from('build_reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('build_reports').select('*', { count: 'exact', head: true }),
      supabase.from('build_comments').select('*', { count: 'exact', head: true }).eq('status', 'visible'),
      supabase.from('builds').select('*', { count: 'exact', head: true }),
    ])

    const firstError = [pendingResult, allReportsResult, commentsResult, buildsResult]
      .find((result) => result.error)?.error
    if (firstError) throw firstError

    return NextResponse.json({
      role: await getPortalRole(supabase, auth.user.id),
      stats: {
        pendingReports: pendingResult.count || 0,
        allReports: allReportsResult.count || 0,
        visibleComments: commentsResult.count || 0,
        builds: buildsResult.count || 0,
      },
      reports: [],
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Błąd panelu administratora:', error)
    return jsonError('Nie udało się pobrać danych panelu administratora.', 500)
  }
}
