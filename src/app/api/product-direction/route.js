import { NextResponse } from 'next/server'

import { isProductDirection } from '@/lib/productDirection'
import { readProductDirection } from '@/lib/server/productDirection'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { createSupabaseAdminClient, requireApiUser } from '@/lib/server/supabaseAdmin'

const jsonError = (message, status, headers) => NextResponse.json({ error: message }, { status, headers })

export async function POST(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const rateLimit = await checkRateLimit(`product-direction:${auth.user.id}`, {
      limit: 6,
      windowMs: 60 * 60 * 1000,
    })
    if (!rateLimit.allowed) {
      return jsonError('Zmieniasz wybór zbyt często. Spróbuj ponownie później.', 429, {
        'Retry-After': String(rateLimit.retryAfter),
      })
    }

    const contentLength = Number(request.headers.get('content-length')) || 0
    if (contentLength > 2_048) return jsonError('Żądanie jest zbyt duże.', 413)

    const body = await request.json().catch(() => null)
    if (!isProductDirection(body?.direction)) return jsonError('Wybierz jeden z dostępnych kierunków.', 400)

    const supabase = createSupabaseAdminClient()
    const { error } = await supabase.from('product_direction_votes').upsert({
      user_id: auth.user.id,
      direction: body.direction,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    if (error) throw error

    return NextResponse.json(await readProductDirection(supabase, auth.user.id))
  } catch (error) {
    console.error('Nie udało się zapisać kierunku produktu:', error)
    return jsonError('Nie udało się zapisać wyboru.', 500)
  }
}
