import assert from 'node:assert/strict'
import test from 'node:test'

import { getExpeditionExpiry } from '../../src/lib/expeditionSchedule.js'

test('expedition expiry is twelve hours after the scheduled start', () => {
  const startsAt = new Date('2026-08-24T17:00:00.000Z')
  assert.equal(getExpeditionExpiry(startsAt).toISOString(), '2026-08-25T05:00:00.000Z')
})
