'use client'

import { useReportWebVitals } from 'next/web-vitals'

const CORE_WEB_VITALS = new Set(['CLS', 'INP', 'LCP'])
const reported = new Set()
let initialPath = ''

function reportPoorWebVital(metric) {
  if (process.env.NODE_ENV !== 'production') return
  initialPath ||= window.location.pathname
  if (!CORE_WEB_VITALS.has(metric.name) || metric.rating !== 'poor') return

  const path = initialPath
  const key = `${path}:${metric.name}:${metric.id}`
  if (reported.has(key)) return
  reported.add(key)
  if (reported.size > 50) reported.delete(reported.values().next().value)

  const body = JSON.stringify({
    type: 'web_vital',
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
    navigationType: metric.navigationType,
    path,
  })

  if (navigator.sendBeacon?.('/api/monitoring/client', new Blob([body], { type: 'application/json' }))) {
    return
  }

  fetch('/api/monitoring/client', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch(() => {})
}

export default function WebVitalsReporter() {
  useReportWebVitals(reportPoorWebVital)
  return null
}
