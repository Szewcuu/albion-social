import { NextResponse } from 'next/server'

import { collapseSystemEvents } from '@/lib/adminHealth'
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
  const [checksResult, eventsResult] = await Promise.all([
    supabase
      .from('integration_checks')
      .select('service, status, latency_ms, message, metadata, checked_at')
      .order('checked_at', { ascending: false })
      .limit(100),
    supabase
      .from('system_events')
      .select('id, level, source, event_type, message, fingerprint, created_at')
      .order('created_at', { ascending: false })
      .limit(50),
  ])
  if (checksResult.error || eventsResult.error) {
    throw checksResult.error || eventsResult.error
  }

  const latestByService = new Map()
  for (const check of checksResult.data || []) {
    if (!latestByService.has(check.service)) latestByService.set(check.service, check)
  }

  return {
    checks: [...latestByService.values()],
    events: collapseSystemEvents(eventsResult.data || []),
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
