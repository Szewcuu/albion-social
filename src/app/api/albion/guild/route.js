import { NextResponse } from 'next/server'
import { ALBION_REGIONS, AlbionApiError, getAlbionGuildOverview, searchAlbionGuilds } from '@/lib/server/albionApi'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { cleanAlbionId, cleanEnum, cleanInteger, cleanText } from '@/lib/server/validation'

const CACHE_SECONDS = {
  search: 60,
  overview: 300,
}

function getClientKey(request) {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('x-real-ip') || 'anonymous'
}

function apiResponse(data, { region, mode, status = 200 } = {}) {
  return NextResponse.json({
    data,
    meta: {
      source: 'Albion Online Gameinfo Guilds API',
      region,
      mode,
      fetchedAt: new Date().toISOString(),
      cacheSeconds: CACHE_SECONDS[mode] || 0,
    },
  }, { status })
}

function apiError(message, { code, status = 500 } = {}) {
  return NextResponse.json({ error: { message, code: code || 'INTERNAL_ERROR' } }, { status })
}

export async function GET(request) {
  const clientKey = getClientKey(request)
  const rateLimit = checkRateLimit(`albion-guild:${clientKey}`, { limit: 30, windowMs: 60_000 })

  if (!rateLimit.allowed) {
    return apiError('Zbyt wiele zapytań. Spróbuj ponownie za chwilę.', { code: 'RATE_LIMITED', status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const mode = cleanEnum(searchParams.get('mode') || 'search', ['search', 'overview'])
  const region = cleanEnum(searchParams.get('region') || 'europe', Object.keys(ALBION_REGIONS))

  if (!mode) return apiError('Nieobsługiwany tryb zapytania.', { code: 'INVALID_MODE', status: 400 })
  if (!region) return apiError('Nieobsługiwany region Albionu.', { code: 'INVALID_REGION', status: 400 })

  try {
    if (mode === 'search') {
      const query = cleanText(searchParams.get('query') || searchParams.get('name'), { min: 2, max: 30 })
      if (!query) return apiError('Nazwa gildii musi mieć od 2 do 30 znaków.', { code: 'INVALID_QUERY', status: 400 })

      const guilds = await searchAlbionGuilds(query, region)
      return apiResponse({ guilds }, { region, mode })
    }

    const guildId = cleanAlbionId(searchParams.get('id'))
    if (!guildId) return apiError('Wymagany jest identyfikator gildii.', { code: 'INVALID_GUILD_ID', status: 400 })

    const limit = cleanInteger(searchParams.get('limit') || '10', { min: 1, max: 25 })
    const data = await getAlbionGuildOverview(guildId, region, limit)

    return apiResponse(data, { region, mode })
  } catch (error) {
    if (error instanceof AlbionApiError) {
      return apiError(error.message, { code: error.code, status: error.status })
    }
    return apiError('Wystąpił błąd podczas komunikacji z serwerem Albionu.', { status: 500 })
  }
}
