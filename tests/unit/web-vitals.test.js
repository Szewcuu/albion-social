import assert from 'node:assert/strict'
import test from 'node:test'

import { formatWebVitalMessage, normalizePoorWebVital } from '../../src/lib/webVitals.js'

test('normalizuje słaby Core Web Vital przed zapisaniem', () => {
  const metric = normalizePoorWebVital({
    type: 'web_vital',
    name: 'lcp',
    value: 4212.345,
    rating: 'poor',
    id: 'v1-123',
    navigationType: 'reload',
    path: '/buildy',
  })

  assert.deepEqual(metric, {
    name: 'LCP',
    value: 4212.3,
    rating: 'poor',
    id: 'v1-123',
    navigationType: 'reload',
    path: '/buildy',
  })
  assert.equal(formatWebVitalMessage(metric), 'LCP: 4212.3 ms (słaby wynik)')
})

test('odrzuca dobre, nieznane i nieliczbowe metryki', () => {
  assert.equal(normalizePoorWebVital({ type: 'web_vital', name: 'LCP', value: 1200, rating: 'good' }), null)
  assert.equal(normalizePoorWebVital({ type: 'web_vital', name: 'FCP', value: 3500, rating: 'poor' }), null)
  assert.equal(normalizePoorWebVital({ type: 'web_vital', name: 'CLS', value: 'brak', rating: 'poor' }), null)
})
