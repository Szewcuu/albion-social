import assert from 'node:assert/strict'
import test from 'node:test'

import { scheduleIdleTask } from '../../src/lib/clientIdle.js'

test('wykonuje zadanie przez requestIdleCallback z limitem czasu', () => {
  let scheduled = null
  let receivedTimeout = null
  let calls = 0
  const target = {
    requestIdleCallback(callback, options) {
      scheduled = callback
      receivedTimeout = options.timeout
      return 7
    },
    cancelIdleCallback() {},
  }

  scheduleIdleTask(() => { calls += 1 }, { timeout: 900, target })
  assert.equal(receivedTimeout, 900)
  assert.equal(calls, 0)
  scheduled()
  scheduled()
  assert.equal(calls, 1)
})

test('anulowanie zadania zapobiega jego wykonaniu', () => {
  let scheduled = null
  let cancelledId = null
  let calls = 0
  const target = {
    requestIdleCallback(callback) {
      scheduled = callback
      return 11
    },
    cancelIdleCallback(id) {
      cancelledId = id
    },
  }

  const cancel = scheduleIdleTask(() => { calls += 1 }, { target })
  cancel()
  scheduled()
  assert.equal(cancelledId, 11)
  assert.equal(calls, 0)
})

test('używa krótkiego timera, gdy Idle Callback nie jest dostępny', () => {
  let delay = null
  let scheduled = null
  let clearedId = null
  const target = {
    setTimeout(callback, milliseconds) {
      scheduled = callback
      delay = milliseconds
      return 13
    },
    clearTimeout(id) {
      clearedId = id
    },
  }

  const cancel = scheduleIdleTask(() => {}, { fallbackDelay: 120, target })
  assert.equal(delay, 120)
  scheduled()
  cancel()
  assert.equal(clearedId, 13)
})
