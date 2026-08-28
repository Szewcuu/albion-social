import { NextResponse } from 'next/server'
import { ALBION_REGIONS, AlbionApiError, getAlbionPlayerOverview, searchAlbionPlayers, searchAlbionPlayersAllRegionsDetailed } from '@/lib/server/albionApi'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { cleanAlbionId, cleanEnum, cleanInteger, cleanText } from '@/lib/server/validation'
import { getKillboardCommunityUrl } from '@/lib/killboardCommunity'

const CACHE_SECONDS = {
  search: 45,
  overview: 90,
}

function getClientKey(request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('x-real-ip') || 'anonymous'
}

function apiResponse(data, { region, mode, status = 200, warnings = [], metaDetails = {} } = {}) {
  return NextResponse.json({
    data,
    meta: {
      source: 'Albion Online Gameinfo',
      region,
      mode,
      fetchedAt: new Date().toISOString(),
      cacheSeconds: CACHE_SECONDS[mode] || 0,
      warnings,
      ...metaDetails,
    },
  }, { status })
}

function apiError(message, { code, status = 500, retryAfter = null, details = null } = {}) {
  const headers = retryAfter ? { 'Retry-After': String(retryAfter) } : undefined
  return NextResponse.json({
    error: {
      message,
      code: code || 'INTERNAL_ERROR',
      ...(details ? { details } : {}),
    },
  }, { status, headers })
}

export async function GET(request) {
  const clientKey = getClientKey(request)
  const rateLimit = await checkRateLimit(`albion-player:${clientKey}`, { limit: 30, windowMs: 60_000 })

  if (!rateLimit.allowed) {
    return apiError('Zbyt wiele zapytań. Spróbuj ponownie za chwilę.', {
      code: 'RATE_LIMITED',
      status: 429,
      retryAfter: rateLimit.retryAfter,
    })
  }

  const { searchParams } = new URL(request.url)
  const mode = cleanEnum(searchParams.get('mode') || 'search', ['search', 'overview'])
  const region = cleanEnum(searchParams.get('region') || 'europe', Object.keys(ALBION_REGIONS))

  if (!mode) return apiError('Nieobsługiwany tryb zapytania.', { code: 'INVALID_MODE', status: 400 })
  if (!region) return apiError('Nieobsługiwany region Albionu.', { code: 'INVALID_REGION', status: 400 })

  try {
    if (mode === 'search') {
      const query = cleanText(searchParams.get('query') || searchParams.get('nick'), { min: 2, max: 30 })
      if (!query) {
        return apiError('Nick musi mieć od 2 do 30 znaków.', { code: 'INVALID_QUERY', status: 400 })
      }

      let players = []
      let checkedRegions = []
      const unavailableRegions = []

      try {
        players = await searchAlbionPlayers(query, region)
        checkedRegions.push(region)
      } catch (error) {
        unavailableRegions.push({
          region,
          code: error?.code || 'UPSTREAM_UNAVAILABLE',
          status: error?.status || 503,
        })
      }

      if (players.length === 0) {
        const fallbackSearch = await searchAlbionPlayersAllRegionsDetailed(query, region, [region])
        players = fallbackSearch.players.slice(0, 18)
        checkedRegions = [...checkedRegions, ...fallbackSearch.checkedRegions]
        unavailableRegions.push(...fallbackSearch.unavailableRegions)
      }

      if (players.length === 0) {
        if (unavailableRegions.length > 0) {
          const selectedRegionUnavailable = unavailableRegions.some((item) => item.region === region)
          const labels = unavailableRegions
            .map((item) => ALBION_REGIONS[item.region]?.label)
            .filter(Boolean)

          return apiError(
            `Nie można potwierdzić, czy gracz „${query}” istnieje. Gameinfo chwilowo nie odpowiada dla: ${labels.join(', ')}. Spróbuj ponownie później.`,
            {
              code: 'REGION_UNAVAILABLE',
              status: 503,
              retryAfter: 60,
              details: {
                unavailableRegions: unavailableRegions.map((item) => item.region),
                ...(selectedRegionUnavailable ? { archiveUrl: getKillboardCommunityUrl(query, region) } : {}),
              },
            },
          )
        }

        return apiError(`Nie znaleziono gracza „${query}” na żadnym serwerze (Europa, Ameryka, Azja).`, { code: 'PLAYER_NOT_FOUND', status: 404 })
      }

      const activeRegion = players[0]?.region || region
      const unavailableLabels = unavailableRegions
        .map((item) => ALBION_REGIONS[item.region]?.label)
        .filter(Boolean)

      return apiResponse({ players }, {
        region: activeRegion,
        mode,
        warnings: unavailableLabels.length > 0
          ? [`Nie wszystkie serwery odpowiedziały: ${unavailableLabels.join(', ')}.`]
          : [],
        metaDetails: {
          requestedRegion: region,
          checkedRegions,
          unavailableRegions: unavailableRegions.map((item) => item.region),
          searchedAllRegions: checkedRegions.length + unavailableRegions.length > 1,
        },
      })
    }

    const playerId = cleanAlbionId(searchParams.get('id'))
    const limit = cleanInteger(searchParams.get('limit') || '6', { min: 1, max: 10 })

    if (!playerId) return apiError('Nieprawidłowy identyfikator gracza.', { code: 'INVALID_PLAYER_ID', status: 400 })
    if (!limit) return apiError('Limit historii musi mieścić się w zakresie 1–10.', { code: 'INVALID_LIMIT', status: 400 })

    const overview = await getAlbionPlayerOverview(playerId, region, limit)
    const activeRegion = overview.marketPricing?.region || region
    return apiResponse(overview, { region: activeRegion, mode, warnings: overview.warnings })
  } catch (error) {
    if (error instanceof AlbionApiError) {
      return apiError(error.message, { code: error.code, status: error.status })
    }

    console.error('Nieoczekiwany błąd adaptera Albion API:', error)
    return apiError('Nieoczekiwany błąd serwera.', { code: 'INTERNAL_ERROR', status: 500 })
  }
}
