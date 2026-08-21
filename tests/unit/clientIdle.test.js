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

test('respektuje minimalne opóźnienie przed oczekiwaniem na bezczynność', () => {
  const timers = []
  let idleCallback = null
  let calls = 0
  const target = {
    setTimeout(callback, milliseconds) {
      timers.push({ callback, milliseconds })
      return timers.length
    },
    clearTimeout() {},
    requestIdleCallback(callback) {
      idleCallback = callback
      return 21
    },
    cancelIdleCallback() {},
  }

  scheduleIdleTask(() => { calls += 1 }, { minimumDelay: 750, target })
  assert.equal(timers[0].milliseconds, 750)
  assert.equal(idleCallback, null)

  timers[0].callback()
  assert.equal(typeof idleCallback, 'function')
  assert.equal(calls, 0)
  idleCallback()
  assert.equal(calls, 1)
})

test('anulowanie w czasie minimalnego opóźnienia nie planuje zadania', () => {
  let delayed = null
  let clearedId = null
  let idleCalls = 0
  const target = {
    setTimeout(callback) {
      delayed = callback
      return 31
    },
    clearTimeout(id) {
      clearedId = id
    },
    requestIdleCallback() {
      idleCalls += 1
    },
  }

  const cancel = scheduleIdleTask(() => {}, { minimumDelay: 500, target })
  cancel()
  delayed()

  assert.equal(clearedId, 31)
  assert.equal(idleCalls, 0)
})
