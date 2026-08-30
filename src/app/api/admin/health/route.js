import { NextResponse } from 'next/server'

import { collapseSystemEvents } from '@/lib/adminHealth'
import { buildOperationalSummary } from '@/lib/operationalHealth'
import {
  createSupabaseAdminClient,
  createSupabaseRequestClient,
  isPortalStaff,
  requireApiUser,
} from '@/lib/server/supabaseAdmin'
import { runIntegrationChecks } from '@/lib/server/monitoring'

const jsonError = (message, status) => NextResponse.json({ error: message }, { status })

async function authorizeStaff(request) {
  const auth = await requireApiUser(request)
  if (auth.error) return { error: jsonError(auth.error, auth.status) }

  const supabase = createSupabaseRequestClient(request)
  if (!(await isPortalStaff(supabase, auth.user.id))) {
    return { error: jsonError('Nie masz uprawnień personelu moderacyjnego.', 403) }
  }

  return { supabase }
}

async function readHealthData(supabase) {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const [checksResult, historyResult, usageResult, eventsResult] = await Promise.all([
    supabase
      .from('integration_checks')
      .select('service, status, latency_ms, message, metadata, checked_at')
      .order('checked_at', { ascending: false })
      .limit(100),
    supabase
      .from('integration_checks')
      .select('metadata, checked_at')
      .eq('service', 'albion_api')
      .gte('checked_at', since)
      .order('checked_at', { ascending: false })
      .limit(100),
    supabase
      .from('feature_usage_daily')
      .select('usage_day, feature, region, request_count, success_count')
      .eq('feature', 'killboard_search')
      .gte('usage_day', since.slice(0, 10))
      .order('usage_day', { ascending: false }),
    supabase
      .from('system_events')
      .select('id, level, source, event_type, message, fingerprint, occurrence_count, created_at, last_seen_at')
      .order('last_seen_at', { ascending: false })
      .limit(50),
  ])
  if (checksResult.error || historyResult.error || usageResult.error || eventsResult.error) {
    throw checksResult.error || historyResult.error || usageResult.error || eventsResult.error
  }

  const latestByService = new Map()
  for (const check of checksResult.data || []) {
    if (!latestByService.has(check.service)) latestByService.set(check.service, check)
  }

  return {
    checks: [...latestByService.values()],
    events: collapseSystemEvents((eventsResult.data || []).map((event) => ({
      ...event,
      created_at: event.last_seen_at || event.created_at,
    }))),
    operations: buildOperationalSummary(historyResult.data || [], usageResult.data || []),
    generatedAt: new Date().toISOString(),
  }
}

export async function GET(request) {
  try {
    const access = await authorizeStaff(request)
    if (access.error) return access.error

    // Po sprawdzeniu roli czytamy wewnętrzne tabele klientem serwisowym.
    // Dzięki temu monitoring nie zależy od bezpośredniego dostępu Data API
    // dla przeglądarki, który celowo odbieramy w migracji Review 11.
    return NextResponse.json(
      await readHealthData(createSupabaseAdminClient()),
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('Błąd odczytu monitoringu integracji:', error)
    return jsonError('Nie udało się pobrać monitoringu integracji.', 500)
  }
}

export async function POST(request) {
  try {
    const access = await authorizeStaff(request)
    if (access.error) return access.error

    const checks = await runIntegrationChecks()
    return NextResponse.json({
      ok: checks.every((check) => check.status !== 'down'),
      checks,
      checkedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Błąd ręcznej kontroli integracji:', error)
    return jsonError('Nie udało się wykonać kontroli integracji.', 500)
  }
}
