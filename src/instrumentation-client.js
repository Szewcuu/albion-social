const reported = new Set()

function report(type, value) {
  if (process.env.NODE_ENV !== 'production') return
  try {
    const error = value instanceof Error ? value : new Error(String(value || 'Nieznany błąd frontendu'))
    const key = `${type}:${error.message}:${window.location.pathname}`
    if (reported.has(key)) return
    reported.add(key)
    if (reported.size > 50) reported.delete(reported.values().next().value)

    fetch('/api/monitoring/client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        type,
        message: error.message,
        stack: error.stack,
        path: window.location.pathname,
      }),
    }).catch(() => {})
  } catch {
    // Monitoring nie może zakłócić działania aplikacji.
  }
}

window.addEventListener('error', (event) => report('error', event.error || event.message))
window.addEventListener('unhandledrejection', (event) => report('unhandled_rejection', event.reason))
