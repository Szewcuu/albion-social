import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeGoldHistory } from '../../src/lib/goldMarket.js'

const NOW = new Date('2026-08-16T12:00:00Z')

test('normalizuje, sortuje i deduplikuje prawdziwe notowania złota', () => {
  const result = normalizeGoldHistory([
    { price: 8_000, timestamp: '2026-08-16T11:00:00' },
    { price: '8100', timestamp: '2026-08-16T11:30:00Z' },
    { price: 8_050, timestamp: '2026-08-16T11:00:00Z' },
    { price: 0, timestamp: '2026-08-16T11:45:00Z' },
    { price: 9_999, timestamp: 'invalid' },
  ], { range: '24h', now: NOW })

  assert.deepEqual(result.data, [
    { price: 8_050, timestamp: '2026-08-16T11:00:00.000Z' },
    { price: 8_100, timestamp: '2026-08-16T11:30:00.000Z' },
  ])
  assert.equal(result.latestAt, '2026-08-16T11:30:00.000Z')
  assert.equal(result.ageHours, 0.5)
  assert.equal(result.freshness, 'fresh')
})

test('odrzuca notowania spoza wybranego zakresu', () => {
  const result = normalizeGoldHistory([
    { price: 7_900, timestamp: '2026-08-15T11:59:59Z' },
    { price: 8_000, timestamp: '2026-08-15T12:00:00Z' },
    { price: 8_100, timestamp: '2026-08-16T12:06:00Z' },
  ], { range: '24h', now: NOW })

  assert.deepEqual(result.data, [{ price: 8_000, timestamp: '2026-08-15T12:00:00.000Z' }])
})

test('jawnie oznacza stare lub brakujące dane', () => {
  const stale = normalizeGoldHistory([
    { price: 8_000, timestamp: '2026-08-15T22:00:00Z' },
  ], { range: '24h', now: NOW })
  const missing = normalizeGoldHistory([], { range: '7d', now: NOW })

  assert.equal(stale.freshness, 'stale')
  assert.equal(stale.ageHours, 14)
  assert.equal(missing.freshness, 'missing')
  assert.equal(missing.latestAt, null)
})

test('odrzuca nieobsługiwany zakres', () => {
  assert.throws(() => normalizeGoldHistory([], { range: 'year', now: NOW }), /INVALID_RANGE/)
})
