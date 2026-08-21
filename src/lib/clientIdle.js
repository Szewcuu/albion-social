export function scheduleIdleTask(callback, {
  timeout = 1_200,
  fallbackDelay = 80,
  target = globalThis,
} = {}) {
  let active = true

  const run = () => {
    if (!active) return
    active = false
    callback()
  }

  if (typeof target.requestIdleCallback === 'function') {
    const idleId = target.requestIdleCallback(run, { timeout })
    return () => {
      active = false
      target.cancelIdleCallback?.(idleId)
    }
  }

  const timerId = target.setTimeout(run, fallbackDelay)
  return () => {
    active = false
    target.clearTimeout(timerId)
  }
}
