import { NextResponse } from 'next/server'

import { checkRateLimit } from '@/lib/server/rateLimit'
import { recordSystemEvent } from '@/lib/server/monitoring'

export async function POST(request) {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const rateLimit = await checkRateLimit(`client-monitor:${forwardedFor}`, { limit: 20, windowMs: 60 * 60 * 1000 })
  if (!rateLimit.allowed) return NextResponse.json({ accepted: false }, { status: 429 })

  const body = await request.json().catch(() => null)
  if (!body || !['error', 'unhandled_rejection'].includes(body.type)) {
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
