import { NextResponse } from 'next/server'

import { checkRateLimit } from '@/lib/server/rateLimit'
import { recordSystemEvent } from '@/lib/server/monitoring'
import { formatWebVitalMessage, normalizePoorWebVital } from '@/lib/webVitals'

export async function POST(request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rateLimit = await checkRateLimit(`client-monitor:${forwardedFor}`, { limit: 20, windowMs: 60 * 60 * 1000 })
  if (!rateLimit.allowed) return NextResponse.json({ accepted: false }, { status: 429 })

  const body = await request.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ accepted: false }, { status: 400 })
  }

  if (body.type === 'web_vital') {
    const metric = normalizePoorWebVital(body)
    if (!metric) return NextResponse.json({ accepted: false }, { status: 400 })

    const hasAuthCookie = request.cookies.getAll().some((cookie) => cookie.name.includes('-auth-token'))
    const isAuthenticated = hasAuthCookie || Boolean(request.headers.get('authorization')?.startsWith('Bearer '))

    await recordSystemEvent({
      source: 'frontend_performance',
      level: 'warning',
      eventType: `web_vital_${metric.name.toLowerCase()}`,
      message: formatWebVitalMessage(metric),
      context: {
        path: metric.path,
        metricId: metric.id,
        navigationType: metric.navigationType,
        authenticated: isAuthenticated,
        userAgent: String(request.headers.get('user-agent') || '').slice(0, 500),
      },
    })

    return NextResponse.json({ accepted: true }, { status: 202 })
  }

  if (!['error', 'unhandled_rejection'].includes(body.type)) {
    return NextResponse.json({ accepted: false }, { status: 400 })
  }

  await recordSystemEvent({
    source: 'frontend',
    eventType: body.type,
    message: String(body.message || 'Nieznany błąd frontendu').slice(0, 1000),
    context: {
      path: String(body.path || '').slice(0, 300),
      stack: String(body.stack || '').slice(0, 4000),
      userAgent: String(request.headers.get('user-agent') || '').slice(0, 500),
    },
  })

  return NextResponse.json({ accepted: true }, { status: 202 })
}
