export function scheduleIdleTask(callback, {
  timeout = 1_200,
  fallbackDelay = 80,
  minimumDelay = 0,
  target = globalThis,
} = {}) {
  let active = true
  let delayId = null
  let taskId = null
  let usesIdleCallback = false

  const run = () => {
    if (!active) return
    active = false
    callback()
  }

  const schedule = () => {
    delayId = null
    if (!active) return

    if (typeof target.requestIdleCallback === 'function') {
      usesIdleCallback = true
      taskId = target.requestIdleCallback(run, { timeout })
      return
    }

    taskId = target.setTimeout(run, fallbackDelay)
  }

  if (minimumDelay > 0) {
    delayId = target.setTimeout(schedule, minimumDelay)
  } else {
    schedule()
  }

  return () => {
    active = false
    if (delayId !== null) target.clearTimeout(delayId)
    if (taskId === null) return
    if (usesIdleCallback) target.cancelIdleCallback?.(taskId)
    else target.clearTimeout(taskId)
  }
}
