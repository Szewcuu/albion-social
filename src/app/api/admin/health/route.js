import { NextResponse } from 'next/server'

import { runIntegrationChecks } from '@/lib/server/monitoring'
import { createSupabaseRequestClient, isPortalStaff, requireApiUser } from '@/lib/server/supabaseAdmin'

const jsonError = (message, status) => NextResponse.json({ error: message }, { status })

async function authorize(request) {
  const auth = await requireApiUser(request)
  if (auth.error) return { error: jsonError(auth.error, auth.status) }
  const supabase = createSupabaseRequestClient(request)
  if (!(await isPortalStaff(supabase, auth.user.id))) return { error: jsonError('Brak uprawnień personelu.', 403) }
  return { supabase }
}

export async function GET(request) {
  try {
    const access = await authorize(request)
    if (access.error) return access.error

    const [checksResult, eventsResult] = await Promise.all([
      access.supabase.from('integration_checks').select('*').order('checked_at', { ascending: false }).limit(80),
      access.supabase.from('system_events').select('*').order('created_at', { ascending: false }).limit(60),
    ])
    if (checksResult.error || eventsResult.error) throw checksResult.error || eventsResult.error

    const latest = new Map()
    for (const check of checksResult.data || []) {
      if (!latest.has(check.service)) latest.set(check.service, check)
    }
    return NextResponse.json({ checks: [...latest.values()], events: eventsResult.data || [] }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Błąd odczytu monitoringu:', error)
    return jsonError('Nie udało się pobrać monitoringu.', 500)
  }
}

export async function POST(request) {
  try {
    const access = await authorize(request)
    if (access.error) return access.error
    return NextResponse.json({ checks: await runIntegrationChecks() })
  } catch (error) {
    console.error('Błąd ręcznej kontroli integracji:', error)
    return jsonError('Nie udało się wykonać kontroli integracji.', 500)
  }
}
