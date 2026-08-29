import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createCustomTimer,
  MAX_CUSTOM_TIMERS,
  sanitizeCustomTimers,
} from '../../src/lib/customTimers.js'

test('odrzuca timer bez nazwy, identyfikatora lub poprawnej daty', () => {
  assert.deepEqual(sanitizeCustomTimers([
    { id: '', name: 'CTA', date: '2026-09-01T12:00:00Z' },
    { id: '1', name: '', date: '2026-09-01T12:00:00Z' },
    { id: '2', name: 'CTA', date: 'nie-data' },
  ]), [])
})

test('normalizuje datę, usuwa duplikaty id i ogranicza liczbę timerów', () => {
  const entries = Array.from({ length: MAX_CUSTOM_TIMERS + 3 }, (_, index) => ({
    id: String(index),
    name: `Timer ${index}`,
    date: '2026-09-01T12:00:00+02:00',
  }))
  entries.splice(1, 0, { ...entries[0], name: 'Duplikat' })

  const result = sanitizeCustomTimers(entries)
  assert.equal(result.length, MAX_CUSTOM_TIMERS)
  assert.equal(result.filter((timer) => timer.id === '0').length, 1)
  assert.equal(result[0].date, '2026-09-01T10:00:00.000Z')
})

test('tworzy wyłącznie timer w przyszłości', () => {
  const now = new Date('2026-08-29T12:00:00Z')
  assert.equal(createCustomTimer({ id: '1', name: 'Stare CTA', date: '2026-08-29T11:00:00Z', now }), null)
  assert.deepEqual(
    createCustomTimer({ id: '2', name: ' Nowe CTA ', date: '2026-08-29T13:00:00Z', now }),
    { id: '2', name: 'Nowe CTA', date: '2026-08-29T13:00:00.000Z' },
  )
})
