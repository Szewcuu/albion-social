import 'server-only'

import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin'

const fallbackBuckets = new Map()

function checkMemoryFallback(key, { limit, windowMs }) {
  const now = Date.now()
  const current = fallbackBuckets.get(key)

  if (!current || current.resetAt <= now) {
    fallbackBuckets.set(key, { count: 1, resetAt: now + windowMs })
    return { allowed: true, retryAfter: 0 }
  }

  if (current.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
    }
  }

  current.count += 1
  return { allowed: true, retryAfter: 0 }
}

export async function checkRateLimit(key, { limit, windowMs }) {
  try {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase.rpc('consume_rate_limit', {
      p_key: key,
      p_limit: limit,
      p_window_seconds: Math.max(1, Math.ceil(windowMs / 1000)),
    })

    if (error || !Array.isArray(data) || !data[0]) throw error || new Error('Brak odpowiedzi limitera.')
    return {
      allowed: data[0].allowed === true,
      retryAfter: Number(data[0].retry_after) || 0,
    }
  } catch (error) {
    console.warn('Trwały rate limiter jest niedostępny, używam bezpiecznego fallbacku instancji:', error?.message)
    return checkMemoryFallback(key, { limit, windowMs })
  }
}
