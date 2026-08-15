import { NextResponse } from 'next/server'
import { ALBION_REGIONS, AlbionApiError, getAlbionPlayerOverview, searchAlbionPlayers, searchAlbionPlayersAllRegionsDetailed } from '@/lib/server/albionApi'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { cleanAlbionId, cleanEnum, cleanInteger, cleanText } from '@/lib/server/validation'
import { searchKillboardCommunityPlayer } from '@/lib/killboardCommunity'

const CACHE_SECONDS = {
  search: 45,
  overview: 90,
}

function getClientKey(request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('x-real-ip') || 'anonymous'
}

function apiResponse(data, { region, mode, status = 200, warnings = [], source = 'Albion Online Gameinfo' } = {}) {
  return NextResponse.json({
    data,
    meta: {
      source,
      region,
      mode,
      fetchedAt: new Date().toISOString(),
      cacheSeconds: CACHE_SECONDS[mode] || 0,
      warnings,
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
      const unavailableRegions = []
      try {
        players = await searchAlbionPlayers(query, region)
      } catch (error) {
        players = []
        unavailableRegions.push({
          region,
          code: error?.code || 'UPSTREAM_UNAVAILABLE',
          status: error?.status || 503,
        })
      }

      if (players.length === 0) {
        const regionalSearch = await searchAlbionPlayersAllRegionsDetailed(query, region, [region])
        players = regionalSearch.players
        unavailableRegions.push(...regionalSearch.unavailableRegions)
      }

      if (players.length === 0) {
        if (unavailableRegions.length > 0) {
          const selectedRegionUnavailable = unavailableRegions.some((item) => item.region === region)
          const communityPlayer = selectedRegionUnavailable
            ? await searchKillboardCommunityPlayer(query, region)
            : null

          if (communityPlayer) {
            return apiResponse(
              { players: [communityPlayer] },
              {
                region,
                mode,
                source: 'KillBoard#1 community index',
                warnings: ['Gameinfo jest chwilowo niedostępne. Wynik potwierdzono w społecznościowym archiwum walk; pełne statystyki mogą być nieaktualne lub niedostępne.'],
              },
            )
          }

          const labels = unavailableRegions
            .map((item) => ALBION_REGIONS[item.region]?.label)
            .filter(Boolean)

          return apiError(
            `Nie można potwierdzić, czy gracz „${query}” istnieje. Gameinfo chwilowo nie odpowiada dla: ${labels.join(', ')}. Spróbuj ponownie później.`,
            {
              code: 'REGION_UNAVAILABLE',
              status: 503,
              retryAfter: 60,
              details: { unavailableRegions: unavailableRegions.map((item) => item.region) },
            },
          )
        }

        return apiError(`Nie znaleziono gracza „${query}” na żadnym serwerze (Europa, Ameryka, Azja).`, { code: 'PLAYER_NOT_FOUND', status: 404 })
      }

      const activeRegion = players[0]?.region || region
      return apiResponse({ players }, { region: activeRegion, mode })
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
