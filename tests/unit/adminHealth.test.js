import assert from 'node:assert/strict'
import test from 'node:test'

import { collapseSystemEvents, isIgnorableRequestError } from '../../src/lib/adminHealth.js'

test('pomija wyłącznie techniczne przerwanie strumienia renderu', () => {
  assert.equal(isIgnorableRequestError(new Error('The destination stream closed early'), { routeType: 'render' }), true)
  assert.equal(isIgnorableRequestError(new Error('The destination stream closed early'), { routeType: 'route' }), false)
  assert.equal(isIgnorableRequestError(new Error('Database unavailable'), { routeType: 'render' }), false)
})

test('grupuje powtarzające się zdarzenia według fingerprintu', () => {
  const events = collapseSystemEvents([
    { id: 'newest', fingerprint: 'same', source: 'backend', event_type: 'render_error', message: 'Błąd' },
    { id: 'older', fingerprint: 'same', source: 'backend', event_type: 'render_error', message: 'Błąd' },
    { id: 'other', fingerprint: 'other', source: 'discord', event_type: 'webhook', message: 'Inny błąd' },
  ])

  assert.equal(events.length, 2)
  assert.equal(events[0].id, 'newest')
  assert.equal(events[0].occurrence_count, 2)
  assert.equal(events[1].occurrence_count, 1)
})
