import { NextResponse } from 'next/server'

import { runIntegrationChecks } from '@/lib/server/monitoring'

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Brak autoryzacji.' }, { status: 401 })
  }

  try {
    const checks = await runIntegrationChecks()
    return NextResponse.json({
      success: checks.every((check) => check.status !== 'down'),
      checkedAt: new Date().toISOString(),
      checks,
    })
  } catch (error) {
    console.error('Błąd cyklicznego monitoringu integracji:', error)
    return NextResponse.json({ error: 'Nie udało się wykonać kontroli integracji.' }, { status: 500 })
  }
}
