const IGNORED_RENDER_ERRORS = new Set([
  'the destination stream closed early',
])

export function isIgnorableRequestError(error, context = {}) {
  const message = error instanceof Error ? error.message : String(error || '')
  return context.routeType === 'render' && IGNORED_RENDER_ERRORS.has(message.trim().toLowerCase())
}

export function collapseSystemEvents(events = []) {
  const grouped = new Map()

  for (const event of events) {
    const key = event.fingerprint || `${event.source}:${event.event_type}:${event.message}`
    const existing = grouped.get(key)
    if (existing) {
      existing.occurrence_count += 1
      continue
    }

    grouped.set(key, { ...event, occurrence_count: 1 })
  }

  return [...grouped.values()]
}
