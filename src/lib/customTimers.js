export const MAX_CUSTOM_TIMERS = 20
export const MAX_CUSTOM_TIMER_NAME = 80

export function sanitizeCustomTimer(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const id = typeof value.id === 'string' ? value.id.trim().slice(0, 80) : ''
  const name = typeof value.name === 'string' ? value.name.trim().slice(0, MAX_CUSTOM_TIMER_NAME) : ''
  const target = new Date(value.date)
  if (!id || !name || Number.isNaN(target.getTime())) return null
  return { id, name, date: target.toISOString() }
}

export function sanitizeCustomTimers(value) {
  if (!Array.isArray(value)) return []
  const seen = new Set()
  return value
    .map(sanitizeCustomTimer)
    .filter((timer) => {
      if (!timer || seen.has(timer.id)) return false
      seen.add(timer.id)
      return true
    })
    .slice(0, MAX_CUSTOM_TIMERS)
}

export function createCustomTimer({ id, name, date, now = new Date() }) {
  const timer = sanitizeCustomTimer({ id, name, date })
  if (!timer || new Date(timer.date) <= now) return null
  return timer
}
