import assert from 'node:assert/strict'
import test from 'node:test'

import { buildOperationalSummary } from '../../src/lib/operationalHealth.js'

const NOW = new Date('2026-08-30T12:00:00.000Z')

test('agreguje stabilność Gameinfo osobno dla każdego regionu', () => {
  const summary = buildOperationalSummary([
    {
      checked_at: '2026-08-30T04:00:00.000Z',
      metadata: { regions: [
        { region: 'Europa', status: 'operational', latencyMs: 200 },
        { region: 'Ameryka', status: 'down', latencyMs: 8000 },
        { region: 'Azja', status: 'operational', latencyMs: 400 },
      ] },
    },
    {
      checked_at: '2026-08-29T04:00:00.000Z',
      metadata: { regions: [
        { region: 'Europa', status: 'operational', latencyMs: 300 },
        { region: 'Ameryka', status: 'operational', latencyMs: 600 },
      ] },
    },
  ], [], NOW)

  assert.equal(summary.regions.find((region) => region.key === 'europe').availability, 1)
  assert.equal(summary.regions.find((region) => region.key === 'europe').averageLatencyMs, 250)
  assert.equal(summary.regions.find((region) => region.key === 'america').availability, 0.5)
})

test('nie rekomenduje archiwum bez pełnej próby i realnego ruchu', () => {
  const summary = buildOperationalSummary([], [
    { usage_day: '2026-08-30', feature: 'killboard_search', region: 'america', request_count: 12, success_count: 2 },
  ], NOW)

  assert.equal(summary.archiveReadiness.ready, false)
  assert.equal(summary.archiveReadiness.observationDays, 1)
  assert.match(summary.archiveReadiness.reason, /Zbieranie próby/)
})

test('rekomenduje analizę kosztu dopiero przy dużym ruchu do niestabilnego regionu', () => {
  const checks = []
  const usage = []
  for (let day = 1; day <= 30; day += 1) {
    const date = new Date(Date.UTC(2026, 7, day, 12))
    checks.push({
      checked_at: date.toISOString(),
      metadata: { regions: [{ region: 'Ameryka', status: day <= 27 ? 'operational' : 'down', latencyMs: 500 }] },
    })
    usage.push({
      usage_day: date.toISOString().slice(0, 10),
      feature: 'killboard_search',
      region: 'america',
      request_count: 40,
      success_count: day <= 27 ? 40 : 0,
    })
  }

  const summary = buildOperationalSummary(checks, usage, NOW)
  assert.equal(summary.archiveReadiness.ready, true)
  assert.equal(summary.archiveReadiness.strainedRegion, 'Ameryka')
})
