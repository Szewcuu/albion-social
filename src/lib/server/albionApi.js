import 'server-only'
import { supabase } from '@/lib/supabase'
import { getAlbionFameBreakdown } from '@/lib/albionPlayer'
import { valuateEquipment } from '@/lib/marketValuation'
import { ExternalApiError, fetchExternalJson } from '@/lib/externalApiClient'
import { getEquipmentMarketPrices } from '@/lib/server/albionMarketApi'

export const ALBION_REGIONS = {
  europe: {
    id: 'europe',
    label: 'Europa',
    shortLabel: 'EU',
    baseUrl: 'https://gameinfo-ams.albiononline.com/api/gameinfo',
  },
  america: {
    id: 'america',
    label: 'Ameryka',
    shortLabel: 'NA',
    baseUrl: 'https://gameinfo.albiononline.com/api/gameinfo',
  },
  asia: {
    id: 'asia',
    label: 'Azja',
    shortLabel: 'ASIA',
    baseUrl: 'https://gameinfo-sgp.albiononline.com/api/gameinfo',
  },
}

const EQUIPMENT_KEYS = ['MainHand', 'OffHand', 'Head', 'Armor', 'Shoes', 'Bag', 'Cape', 'Mount', 'Potion', 'Food']

export class AlbionApiError extends Error {
  constructor(message, { code = 'ALBION_API_ERROR', status = 502, upstreamStatus = null } = {}) {
    super(message)
    this.name = 'AlbionApiError'
    this.code = code
    this.status = status
    this.upstreamStatus = upstreamStatus
  }
}

export function getAlbionRegion(region) {
  return ALBION_REGIONS[region] || null
}

async function fetchAlbionJson(path, { region, revalidate = 60, timeoutMs = 8000, retry = true } = {}) {
  const regionConfig = getAlbionRegion(region)
  if (!regionConfig) {
    throw new AlbionApiError('Nieobsługiwany region Albionu.', { code: 'INVALID_REGION', status: 400 })
  }

  const url = `${regionConfig.baseUrl}${path}`
  try {
    return await fetchExternalJson(url, {
      retries: retry ? 1 : 0,
      retryDelayMs: 180,
      timeoutMs,
      requestInit: {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Albion-Social/1.0 (+https://albion-social.vercel.app)',
        },
        next: { revalidate },
      },
    })
  } catch (error) {
    if (!(error instanceof ExternalApiError)) throw error

    if (error.upstreamStatus === 404) {
      throw new AlbionApiError('Nie znaleziono danych w wybranym regionie.', {
        code: 'NOT_FOUND',
        status: 404,
        upstreamStatus: 404,
      })
    }

    const unavailable = ['UPSTREAM_TIMEOUT', 'UPSTREAM_UNAVAILABLE'].includes(error.code)
    throw new AlbionApiError(
      error.code === 'UPSTREAM_TIMEOUT'
        ? 'Serwer Albionu przekroczył limit czasu odpowiedzi.'
        : unavailable
          ? 'Nie udało się połączyć z serwerem Albionu.'
          : 'Serwery Albionu chwilowo nie odpowiadają poprawnie.',
      {
        code: unavailable ? error.code : 'UPSTREAM_ERROR',
        status: error.upstreamStatus === 429 || unavailable ? 503 : 502,
        upstreamStatus: error.upstreamStatus,
      },
    )
  }
}

function normalizeEquipment(equipment) {
  return EQUIPMENT_KEYS.reduce((result, key) => {
    const item = equipment?.[key]
    result[key] = item?.Type
      ? { type: item.Type, count: item.Count || 1, quality: item.Quality || 1 }
      : null
    return result
  }, {})
}

function normalizeCombatant(combatant) {
  if (!combatant) return null
  return {
    id: combatant.Id || '',
    name: combatant.Name || 'Nieznany gracz',
    guildName: combatant.GuildName || '',
    guildId: combatant.GuildId || '',
    allianceName: combatant.AllianceName || '',
    allianceTag: combatant.AllianceTag || '',
    averageItemPower: Math.round(combatant.AverageItemPower || 0),
    equipment: normalizeEquipment(combatant.Equipment),
  }
}

function normalizeEvent(event, perspective) {
  const reportedFame = Number(event.TotalVictimKillFame || event.Victim?.DeathFame || 0)

  return {
    id: String(event.EventId),
    timestamp: event.TimeStamp,
    fame: reportedFame > 0 ? reportedFame : null,
    location: event.Location || '',
    killArea: event.KillArea || '',
    participantCount: event.numberOfParticipants || event.Participants?.length || 1,
    perspective,
    killer: normalizeCombatant(event.Killer),
    victim: normalizeCombatant(event.Victim),
  }
}

function normalizePlayer(player) {
  const fame = getAlbionFameBreakdown(player)

  return {
    id: player.Id || player.id || '',
    name: player.Name || player.name || '',
    guildName: player.GuildName || player.guildName || '',
    guildId: player.GuildId || player.guildId || '',
    allianceName: player.AllianceName || player.allianceName || '',
    allianceId: player.AllianceId || player.allianceId || '',
    allianceTag: player.AllianceTag || player.allianceTag || '',
    avatar: player.Avatar || '',
    avatarRing: player.AvatarRing || '',
    killFame: player.KillFame ?? player.killFame ?? 0,
    deathFame: player.DeathFame ?? player.deathFame ?? 0,
    fameRatio: Number(player.FameRatio ?? player.fameRatio ?? 0),
    averageItemPower: Math.round(player.AverageItemPower || 0),
    fame,
  }
}

function normalizeSearchPlayer(player) {
  return {
    id: player.Id,
    name: player.Name,
    guildName: player.GuildName || '',
    guildId: player.GuildId || '',
    allianceName: player.AllianceName || '',
    allianceId: player.AllianceId || '',
    killFame: player.KillFame || 0,
  }
}

function normalizeGuild(guild, members = []) {
  if (!guild) return null
  const killFame = Number(guild.killFame ?? guild.KillFame ?? 0)
  const deathFame = Number(guild.deathFame ?? guild.DeathFame ?? 0)
  const fameRatio = deathFame > 0 ? (killFame / deathFame) : Number(guild.fameRatio ?? guild.FameRatio ?? 0)

  return {
    id: guild.Id || guild.id || '',
    name: guild.Name || guild.name || '',
    allianceId: guild.AllianceId || guild.allianceId || '',
    allianceTag: guild.AllianceTag || guild.allianceTag || '',
    killFame,
    deathFame,
    fameRatio,
    memberCount: guild.MemberCount || members.length,
    topMembers: members
      .map(normalizeSearchPlayer)
      .sort((a, b) => b.killFame - a.killFame)
      .slice(0, 12),
  }
}

export async function searchAlbionPlayers(query, region) {
  const result = await fetchAlbionJson(`/search?q=${encodeURIComponent(query)}`, {
    region,
    revalidate: 45,
    timeoutMs: 4500,
    retry: false,
  })

  return (result?.players || []).slice(0, 10).map((player) => ({
    ...normalizeSearchPlayer(player),
    region,
  }))
}

export async function searchAlbionPlayersAllRegionsDetailed(query, preferredRegion = 'europe', excludedRegions = []) {
  const excluded = new Set(excludedRegions)
  const regions = ['europe', 'america', 'asia'].filter((region) => !excluded.has(region))
  const results = await Promise.allSettled(
    regions.map((r) => searchAlbionPlayers(query, r))
  )

  const allPlayers = []
  const unavailableRegions = []
  results.forEach((res, index) => {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      allPlayers.push(...res.value)
    } else if (res.status === 'rejected') {
      const error = res.reason
      unavailableRegions.push({
        region: regions[index],
        code: error?.code || 'UPSTREAM_UNAVAILABLE',
        status: error?.status || 503,
      })
    }
  })

  const queryLower = query.toLowerCase()
  allPlayers.sort((a, b) => {
    const exactA = (a.name || '').toLowerCase() === queryLower ? 1 : 0
    const exactB = (b.name || '').toLowerCase() === queryLower ? 1 : 0
    if (exactA !== exactB) return exactB - exactA

    const prefA = a.region === preferredRegion ? 1 : 0
    const prefB = b.region === preferredRegion ? 1 : 0
    if (prefA !== prefB) return prefB - prefA

    return (b.killFame || 0) - (a.killFame || 0)
  })

  return {
    players: allPlayers,
    checkedRegions: regions.filter((region) => !unavailableRegions.some((item) => item.region === region)),
    unavailableRegions,
  }
}

export async function searchAlbionPlayersAllRegions(query, preferredRegion = 'europe') {
  const result = await searchAlbionPlayersAllRegionsDetailed(query, preferredRegion)
  return result.players
}

export async function getAlbionPlayerOverview(playerIdOrNick, region, limit = 6) {
  let safeId = encodeURIComponent(playerIdOrNick)
  let activeRegion = region

  let profileResult, killsResult, deathsResult

  try {
    [profileResult, killsResult, deathsResult] = await Promise.allSettled([
      fetchAlbionJson(`/players/${safeId}`, { region: activeRegion, revalidate: 120, timeoutMs: 8000 }),
      fetchAlbionJson(`/players/${safeId}/kills?limit=${limit}&offset=0`, { region: activeRegion, revalidate: 90, timeoutMs: 10000 }),
      fetchAlbionJson(`/players/${safeId}/deaths?limit=${limit}&offset=0`, { region: activeRegion, revalidate: 90, timeoutMs: 10000 }),
    ])

    if (profileResult.status === 'rejected') throw profileResult.reason
  } catch (err) {
    if (err?.upstreamStatus === 404 || err?.status === 404) {
      const searchResults = await searchAlbionPlayersAllRegions(playerIdOrNick, region)
      if (searchResults && searchResults.length > 0) {
        const found = searchResults.find(p => (p.name || '').toLowerCase() === playerIdOrNick.toLowerCase()) || searchResults[0]
        safeId = encodeURIComponent(found.id)
        if (found.region) activeRegion = found.region

        ;[profileResult, killsResult, deathsResult] = await Promise.allSettled([
          fetchAlbionJson(`/players/${safeId}`, { region: activeRegion, revalidate: 120, timeoutMs: 8000 }),
          fetchAlbionJson(`/players/${safeId}/kills?limit=${limit}&offset=0`, { region: activeRegion, revalidate: 90, timeoutMs: 10000 }),
          fetchAlbionJson(`/players/${safeId}/deaths?limit=${limit}&offset=0`, { region: activeRegion, revalidate: 90, timeoutMs: 10000 }),
        ])

        if (profileResult.status === 'rejected') throw profileResult.reason
      } else {
        throw err
      }
    } else {
      throw err
    }
  }

  const profile = normalizePlayer(profileResult.value)
  const warnings = []
  let kills = killsResult.status === 'fulfilled'
    ? (Array.isArray(killsResult.value) ? killsResult.value : []).slice(0, limit).map(event => normalizeEvent(event, 'kill'))
    : []
  let deaths = deathsResult.status === 'fulfilled'
    ? (Array.isArray(deathsResult.value) ? deathsResult.value : []).slice(0, limit).map(event => normalizeEvent(event, 'death'))
    : []

  if (killsResult.status === 'rejected') warnings.push('Historia zabójstw jest chwilowo niedostępna.')
  if (deathsResult.status === 'rejected') warnings.push('Historia zgonów jest chwilowo niedostępna.')

  const marketPricesPromise = getEquipmentMarketPrices({
    equipmentSets: [...kills, ...deaths].map((event) => event.victim?.equipment),
    region: activeRegion,
  }).then(
    (rows) => ({ rows, error: null }),
    (error) => ({ rows: [], error }),
  )

  if (profile.averageItemPower === 0) {
    const ipValues = []
    const allEvents = [...kills, ...deaths]
    for (const ev of allEvents) {
      if (ev.killer?.id === profile.id && ev.killer.averageItemPower > 0) {
        ipValues.push(ev.killer.averageItemPower)
      }
      if (ev.victim?.id === profile.id && ev.victim.averageItemPower > 0) {
        ipValues.push(ev.victim.averageItemPower)
      }
    }
    if (ipValues.length > 0) {
      const avg = ipValues.reduce((a, b) => a + b, 0) / ipValues.length
      profile.averageItemPower = Math.round(avg)
    }
  }

  if (profile.averageItemPower === 0 && profile.name) {
    try {
      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('avg_ip')
        .or(`verified_player_id.eq.${profile.id},ingame_nick.ilike.${profile.name}`)
        .maybeSingle()

      if (dbProfile?.avg_ip && Number(dbProfile.avg_ip) > 0) {
        profile.averageItemPower = Number(dbProfile.avg_ip)
      }
    } catch {
      // ignore
    }
  }

  let guild = null
  if (profile.guildId) {
    const guildId = encodeURIComponent(profile.guildId)
    const [guildResult, membersResult] = await Promise.allSettled([
      fetchAlbionJson(`/guilds/${guildId}`, { region: activeRegion, revalidate: 600, timeoutMs: 8000 }),
      fetchAlbionJson(`/guilds/${guildId}/members`, { region: activeRegion, revalidate: 600, timeoutMs: 12000 }),
    ])

    if (guildResult.status === 'fulfilled') {
      guild = normalizeGuild(
        guildResult.value,
        membersResult.status === 'fulfilled' && Array.isArray(membersResult.value) ? membersResult.value : [],
      )
    } else {
      warnings.push('Szczegóły gildii są chwilowo niedostępne.')
    }
  }

  let pricingAvailable = true
  const marketPricesResult = await marketPricesPromise
  if (!marketPricesResult.error) {
    const pricedAt = Date.now()
    kills = kills.map((event) => ({
      ...event,
      lossValuation: valuateEquipment(event.victim?.equipment, marketPricesResult.rows, pricedAt),
    }))
    deaths = deaths.map((event) => ({
      ...event,
      lossValuation: valuateEquipment(event.victim?.equipment, marketPricesResult.rows, pricedAt),
    }))
  } else {
    pricingAvailable = false
    console.error('Błąd wyceny ekwipunku Killboardu:', marketPricesResult.error)
    warnings.push('Regionalna wycena utraconego ekwipunku jest chwilowo niedostępna.')
  }

  return {
    player: profile,
    kills,
    deaths,
    guild,
    warnings,
    marketPricing: {
      available: pricingAvailable,
      source: 'Albion Online Data Project',
      region: activeRegion,
      freshWithinHours: 12,
      agingWithinHours: 48,
    },
  }
}

export async function getAlbionPlayerWatchSnapshot(playerId, region, limit = 20) {
  const safeId = encodeURIComponent(playerId)
  const safeLimit = Math.max(1, Math.min(20, Number(limit) || 20))
  const [profileResult, killsResult, deathsResult] = await Promise.allSettled([
    fetchAlbionJson(`/players/${safeId}`, { region, revalidate: 60, timeoutMs: 8000 }),
    fetchAlbionJson(`/players/${safeId}/kills?limit=${safeLimit}&offset=0`, { region, revalidate: 30, timeoutMs: 10000 }),
    fetchAlbionJson(`/players/${safeId}/deaths?limit=${safeLimit}&offset=0`, { region, revalidate: 30, timeoutMs: 10000 }),
  ])

  if (profileResult.status === 'rejected') throw profileResult.reason

  return {
    player: normalizePlayer(profileResult.value),
    kills: killsResult.status === 'fulfilled' && Array.isArray(killsResult.value)
      ? killsResult.value.slice(0, safeLimit).map((event) => normalizeEvent(event, 'kill'))
      : [],
    deaths: deathsResult.status === 'fulfilled' && Array.isArray(deathsResult.value)
      ? deathsResult.value.slice(0, safeLimit).map((event) => normalizeEvent(event, 'death'))
      : [],
    warnings: [
      ...(killsResult.status === 'rejected' ? ['Historia zabójstw jest chwilowo niedostępna.'] : []),
      ...(deathsResult.status === 'rejected' ? ['Historia zgonów jest chwilowo niedostępna.'] : []),
    ],
  }
}

export async function searchAlbionGuilds(query, region) {
  const result = await fetchAlbionJson(`/search?q=${encodeURIComponent(query)}`, {
    region,
    revalidate: 60,
    timeoutMs: 7000,
  })

  return (result?.guilds || []).slice(0, 10).map((g) => ({
    id: g.Id,
    name: g.Name,
    allianceId: g.AllianceId || '',
    allianceTag: g.AllianceTag || '',
    killFame: Number.isFinite(Number(g.KillFame)) ? Number(g.KillFame) : null,
    region,
  }))
}

export async function getAlbionGuildOverview(guildId, region, limit = 10) {
  const safeId = encodeURIComponent(guildId)
  const [guildResult, membersResult, battlesResult] = await Promise.allSettled([
    fetchAlbionJson(`/guilds/${safeId}`, { region, revalidate: 300, timeoutMs: 8000 }),
    fetchAlbionJson(`/guilds/${safeId}/members`, { region, revalidate: 300, timeoutMs: 12000 }),
    fetchAlbionJson(`/events?guildId=${safeId}&limit=${limit}&offset=0`, { region, revalidate: 120, timeoutMs: 10000 }),
  ])

  if (guildResult.status === 'rejected') throw guildResult.reason

  const members = membersResult.status === 'fulfilled' && Array.isArray(membersResult.value) ? membersResult.value : []
  const guild = normalizeGuild(guildResult.value, members)
  const battles = battlesResult.status === 'fulfilled' && Array.isArray(battlesResult.value)
    ? battlesResult.value.map((event) => normalizeEvent(event, 'kill'))
    : []

  return { guild, membersCount: members.length, battles }
}

export async function getAlbionRecentEvents(region, { limit = 51, offset = 0 } = {}) {
  const safeLimit = Math.max(1, Math.min(51, Number(limit) || 51))
  const safeOffset = Math.max(0, Math.min(500, Number(offset) || 0))
  const result = await fetchAlbionJson(`/events?limit=${safeLimit}&offset=${safeOffset}`, {
    region,
    revalidate: 300,
    timeoutMs: 12_000,
    retry: false,
  })
  return Array.isArray(result) ? result : []
}
