import { NextResponse } from 'next/server'
import {
  getCurrentMarketPrices,
  getGoldHistory,
  getMarketHistory,
  isSafeItemId,
  MARKET_CITIES,
  MARKET_QUALITIES,
  MARKET_RANGES,
  MARKET_REGIONS,
} from '@/lib/server/albionMarketApi'
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

function uniqueList(value, { max, transform = (entry) => entry }) {
  if (!value) return []
  return [...new Set(value.split(',').map((entry) => transform(entry.trim())).filter(Boolean))].slice(0, max + 1)
}

function commonMeta({ mode, region, cacheSeconds }) {
  return {
    source: 'Albion Online Data Project',
    sourceType: 'community-scans',
    fetchedAt: new Date().toISOString(),
    cacheSeconds,
    staleAfterHours: 12,
    mode,
    region,
  }
}

export async function GET(request) {
  const rateLimit = checkRateLimit(`albion-prices:${getClientKey(request)}`, { limit: 50, windowMs: 60_000 })
  if (!rateLimit.allowed) {
    return errorResponse('Zbyt wiele zapytań o ceny. Spróbuj ponownie za chwilę.', 'RATE_LIMITED', 429, rateLimit.retryAfter)
  }

  const { searchParams } = new URL(request.url)
  const mode = cleanEnum(searchParams.get('mode') || 'current', ['current', 'history', 'gold'])
  const region = cleanEnum(searchParams.get('region') || 'europe', Object.keys(MARKET_REGIONS))

  if (!mode) return errorResponse('Nieobsługiwany tryb danych.', 'INVALID_MODE', 400)
  if (!region) return errorResponse('Nieobsługiwany region rynku.', 'INVALID_REGION', 400)

  try {
    if (mode === 'gold') {
      const range = cleanEnum(searchParams.get('range') || '24h', Object.keys(MARKET_RANGES))
      if (!range) return errorResponse('Nieobsługiwany zakres czasu.', 'INVALID_RANGE', 400)

      const data = await getGoldHistory({ region, range })
      return NextResponse.json({ data, meta: { ...commonMeta({ mode, region, cacheSeconds: 300 }), range } })
    }

    if (mode === 'history') {
      const itemId = searchParams.get('item')?.trim().toUpperCase()
      const city = cleanEnum(searchParams.get('city'), MARKET_CITIES)
      const quality = Number(searchParams.get('quality') || 1)
      const range = cleanEnum(searchParams.get('range') || '7d', Object.keys(MARKET_RANGES))

      if (!isSafeItemId(itemId)) return errorResponse('Nieprawidłowy identyfikator przedmiotu.', 'INVALID_ITEM', 400)
      if (!city) return errorResponse('Nieobsługiwane miasto.', 'INVALID_CITY', 400)
      if (!(quality in MARKET_QUALITIES)) return errorResponse('Nieobsługiwana jakość.', 'INVALID_QUALITY', 400)
      if (!range) return errorResponse('Nieobsługiwany zakres czasu.', 'INVALID_RANGE', 400)

      const data = await getMarketHistory({ itemId, city, quality, region, range })
      return NextResponse.json({
        data,
        meta: { ...commonMeta({ mode, region, cacheSeconds: 300 }), itemId, city, quality, range },
      })
    }

    const itemIds = uniqueList(searchParams.get('items') || searchParams.get('item'), {
      max: 10,
      transform: (entry) => entry.toUpperCase(),
    })
    const cities = uniqueList(searchParams.get('cities') || searchParams.get('city') || 'Caerleon', { max: MARKET_CITIES.length })
    const qualities = uniqueList(searchParams.get('qualities') || searchParams.get('quality') || '1', {
      max: 5,
      transform: Number,
    })

    if (!itemIds.length || itemIds.length > 10 || itemIds.some((id) => !isSafeItemId(id))) {
      return errorResponse('Podaj od 1 do 10 prawidłowych identyfikatorów przedmiotów.', 'INVALID_ITEMS', 400)
    }
    if (!cities.length || cities.length > MARKET_CITIES.length || cities.some((city) => !MARKET_CITIES.includes(city))) {
      return errorResponse('Podaj obsługiwane miasta rynku.', 'INVALID_CITIES', 400)
    }
    if (!qualities.length || qualities.length > 5 || qualities.some((quality) => !(quality in MARKET_QUALITIES))) {
      return errorResponse('Podaj jakość od 1 do 5.', 'INVALID_QUALITIES', 400)
    }

    const data = await getCurrentMarketPrices({ itemIds, cities, qualities, region })
    return NextResponse.json({
      data,
      meta: { ...commonMeta({ mode, region, cacheSeconds: 60 }), itemIds, cities, qualities },
    })
  } catch (error) {
    console.error('Błąd adaptera Albion Online Data Project:', error)
    const timedOut = error?.message === 'UPSTREAM_TIMEOUT'
    return errorResponse(
      timedOut ? 'Źródło danych przekroczyło limit czasu odpowiedzi.' : 'Źródło danych jest chwilowo niedostępne.',
      timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_ERROR',
      503,
    )
  }
}
