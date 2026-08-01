import { NextResponse } from 'next/server'
import { getCurrentMarketPrices, isSafeItemId, MARKET_CITIES, MARKET_REGIONS } from '@/lib/server/albionMarketApi'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { cleanEnum } from '@/lib/server/validation'

function getClientKey(request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'anonymous'
}

function errorResponse(message, code, status, retryAfter = null) {
  return NextResponse.json(
    { error: { message, code } },
    { status, headers: retryAfter ? { 'Retry-After': String(retryAfter) } : undefined },
  )
}

export async function GET(request) {
  const rateLimit = checkRateLimit(`albion-prices:${getClientKey(request)}`, { limit: 40, windowMs: 60_000 })
  if (!rateLimit.allowed) {
    return errorResponse('Zbyt wiele zapytań o ceny. Spróbuj ponownie za chwilę.', 'RATE_LIMITED', 429, rateLimit.retryAfter)
  }

  const { searchParams } = new URL(request.url)
  const itemId = searchParams.get('item')?.trim().toUpperCase()
  const city = cleanEnum(searchParams.get('city'), MARKET_CITIES)
  const region = cleanEnum(searchParams.get('region') || 'europe', Object.keys(MARKET_REGIONS))

  if (!isSafeItemId(itemId)) return errorResponse('Nieprawidłowy identyfikator przedmiotu.', 'INVALID_ITEM', 400)
  if (!city) return errorResponse('Nieobsługiwane miasto.', 'INVALID_CITY', 400)
  if (!region) return errorResponse('Nieobsługiwany region rynku.', 'INVALID_REGION', 400)

  try {
    const prices = await getCurrentMarketPrices({ itemId, city, region })
    return NextResponse.json({
      data: prices,
      meta: {
        source: 'Albion Online Data Project',
        fetchedAt: new Date().toISOString(),
        cacheSeconds: 60,
        region,
        city,
        itemId,
      },
    })
  } catch (error) {
    console.error('Błąd adaptera Albion Online Data Project:', error)
    const timedOut = error?.message === 'UPSTREAM_TIMEOUT'
    return errorResponse(
      timedOut ? 'Źródło cen przekroczyło limit czasu odpowiedzi.' : 'Źródło cen jest chwilowo niedostępne.',
      timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_ERROR',
      503,
    )
  }
}
