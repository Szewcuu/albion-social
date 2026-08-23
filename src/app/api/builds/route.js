import { NextResponse } from 'next/server'

import { sanitizeBuildForPublishing } from '@/lib/buildPublishing'
import { buildToDbPayload } from '@/lib/buildSlots'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { createSupabaseRequestClient, requireApiUser } from '@/lib/server/supabaseAdmin'

const MAX_BUILD_BODY_BYTES = 64 * 1024

const jsonError = (message, status, headers) => (
  NextResponse.json({ error: message }, { status, headers })
)

export async function POST(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const contentLength = Number(request.headers.get('content-length') || 0)
    if (contentLength > MAX_BUILD_BODY_BYTES) {
      return jsonError('Build jest zbyt duży.', 413)
    }

    const rateLimit = await checkRateLimit(`build-publish:${auth.user.id}`, {
      limit: 10,
      windowMs: 60 * 60 * 1000,
    })
    if (!rateLimit.allowed) {
      return jsonError('Osiągnięto limit publikacji buildów. Spróbuj ponownie później.', 429, {
        'Retry-After': String(rateLimit.retryAfter),
      })
    }

    const rawBody = await request.text()
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BUILD_BODY_BYTES) {
      return jsonError('Build jest zbyt duży.', 413)
    }
    const body = (() => {
      try {
        return JSON.parse(rawBody)
      } catch {
        return null
      }
    })()
    const build = sanitizeBuildForPublishing(body?.build)
    if (!build) return jsonError('Uzupełnij wymagane dane i co najmniej jeden przedmiot.', 400)

    const supabase = createSupabaseRequestClient(request)
    const payload = buildToDbPayload(build, auth.user.id)
    let { data, error } = await supabase.from('builds').insert(payload).select('id').single()

    if (error?.message?.includes('build_data')) {
      const { build_data, ...corePayload } = payload
      const fallback = await supabase.from('builds').insert(corePayload).select('id').single()
      data = fallback.data
      error = fallback.error
    }

    if (error) throw error
    return NextResponse.json({ buildId: data.id }, { status: 201 })
  } catch (error) {
    console.error('Błąd publikacji buildu:', error)
    return jsonError('Nie udało się opublikować buildu.', 500)
  }
}
