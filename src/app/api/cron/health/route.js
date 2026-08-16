import { NextResponse } from 'next/server'

import { runIntegrationChecks } from '@/lib/server/monitoring'
import { runMarketPriceAlertSync } from '@/lib/server/marketPriceAlerts'
import { runPlayerWatchSync } from '@/lib/server/playerWatchSync'

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Brak autoryzacji.' }, { status: 401 })
  }

  try {
    const [checksResult, playerWatchesResult, marketAlertsResult] = await Promise.allSettled([
      runIntegrationChecks(),
      runPlayerWatchSync({ limit: 100 }),
      runMarketPriceAlertSync({ limit: 100 }),
    ])

    if (checksResult.status === 'rejected') throw checksResult.reason

    const checks = checksResult.value
    const playerWatches = playerWatchesResult.status === 'fulfilled'
      ? playerWatchesResult.value
      : { watched: 0, players: 0, checked: 0, notifications: 0, newEvents: 0, failed: 1 }
    const marketAlerts = marketAlertsResult.status === 'fulfilled'
      ? marketAlertsResult.value
      : { watched: 0, checked: 0, snapshots: 0, notifications: 0, failed: 1 }

    if (playerWatchesResult.status === 'rejected') {
      console.error('Błąd cyklicznej synchronizacji obserwowanych postaci:', playerWatchesResult.reason)
    }
    if (marketAlertsResult.status === 'rejected') {
      console.error('Błąd cyklicznej synchronizacji alertów cenowych:', marketAlertsResult.reason)
    }

    return NextResponse.json({
      success: checks.every((check) => check.status !== 'down') && playerWatches.failed === 0 && marketAlerts.failed === 0,
      checkedAt: new Date().toISOString(),
      checks,
      playerWatches,
      marketAlerts,
    })
  } catch (error) {
    console.error('Błąd cyklicznego monitoringu integracji:', error)
    return NextResponse.json({ error: 'Nie udało się wykonać kontroli integracji.' }, { status: 500 })
  }
}
