const CORE_WEB_VITAL_NAMES = new Set(['CLS', 'INP', 'LCP'])

export function normalizePoorWebVital(payload) {
  if (!payload || payload.type !== 'web_vital') return null

  const name = String(payload.name || '').toUpperCase()
  const value = Number(payload.value)
  if (!CORE_WEB_VITAL_NAMES.has(name) || payload.rating !== 'poor') return null
  if (!Number.isFinite(value) || value < 0 || value > 600_000) return null

  return {
    name,
    value: name === 'CLS' ? Math.round(value * 10_000) / 10_000 : Math.round(value * 10) / 10,
    rating: 'poor',
    id: String(payload.id || '').slice(0, 160),
    navigationType: String(payload.navigationType || '').slice(0, 80),
    path: String(payload.path || '/').slice(0, 300),
  }
}

export function formatWebVitalMessage(metric) {
  const unit = metric.name === 'CLS' ? '' : ' ms'
  return `${metric.name}: ${metric.value}${unit} (słaby wynik)`
}
