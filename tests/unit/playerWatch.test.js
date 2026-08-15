import assert from 'node:assert/strict'
import test from 'node:test'

import { buildPlayerWatchMessage, getWatchEventIds, summarizeNewPlayerEvents } from '../../src/lib/playerWatch.js'

const SNAPSHOT = {
  kills: [
    { id: 'kill-new', timestamp: '2026-08-15T18:00:00Z', fame: 8_748 },
    { id: 'kill-seen', timestamp: '2026-08-14T18:00:00Z', fame: 2_000 },
  ],
  deaths: [{ id: 'death-new', timestamp: '2026-08-15T17:00:00Z', fame: 5_000 }],
}

test('wykrywa wyłącznie walki, których obserwator jeszcze nie widział', () => {
  const summary = summarizeNewPlayerEvents(SNAPSHOT, ['kill-seen'])
  assert.deepEqual(summary, {
    kills: 1,
    deaths: 1,
    killFame: 8_748,
    deathFame: 5_000,
    total: 2,
    latestEventId: 'kill-new',
    latestEventAt: '2026-08-15T18:00:00Z',
    oldestEventAt: '2026-08-15T17:00:00Z',
  })
})

test('scala aktualne i poprzednie identyfikatory bez duplikatów', () => {
  assert.deepEqual(getWatchEventIds(SNAPSHOT, ['old-event', 'kill-new']), ['kill-new', 'death-new', 'kill-seen', 'old-event'])
})

test('buduje jedno zbiorcze powiadomienie zamiast alertu dla każdej walki', () => {
  const message = buildPlayerWatchMessage('XNetoX', summarizeNewPlayerEvents(SNAPSHOT, ['kill-seen']))
  assert.match(message, /1 nowych zabójstw/)
  assert.match(message, /8[\s.]?748 Fame/)
  assert.match(message, /1 zgonów/)
})
