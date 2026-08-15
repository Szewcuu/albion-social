import 'server-only'
import { supabase } from '@/lib/supabase'
import { valuateEquipment } from '@/lib/marketValuation'
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

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504])
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

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchAlbionJson(path, { region, revalidate = 60, timeoutMs = 8000, retry = true } = {}) {
  const regionConfig = getAlbionRegion(region)
  if (!regionConfig) {
    throw new AlbionApiError('Nieobsługiwany region Albionu.', { code: 'INVALID_REGION', status: 400 })
  }

  const url = `${regionConfig.baseUrl}${path}`
  const attempts = retry ? 2 : 1

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Albion-Social/1.0 (+https://albion-social.vercel.app)',
        },
        next: { revalidate },
        signal: AbortSignal.timeout(timeoutMs),
      })

      if (response.ok) return await response.json()

      if (attempt + 1 < attempts && RETRYABLE_STATUS.has(response.status)) {
        await wait(180)
        continue
      }

      if (response.status === 404) {
        throw new AlbionApiError('Nie znaleziono danych w wybranym regionie.', {
          code: 'NOT_FOUND',
          status: 404,
          upstreamStatus: response.status,
        })
      }

      throw new AlbionApiError('Serwery Albionu chwilowo nie odpowiadają poprawnie.', {
        code: 'UPSTREAM_ERROR',
        status: response.status === 429 ? 503 : 502,
        upstreamStatus: response.status,
      })
    } catch (error) {
      if (error instanceof AlbionApiError) throw error

      if (attempt + 1 < attempts) {
        await wait(180)
        continue
      }

      const timedOut = error?.name === 'TimeoutError' || error?.name === 'AbortError'
      throw new AlbionApiError(
        timedOut ? 'Serwer Albionu przekroczył limit czasu odpowiedzi.' : 'Nie udało się połączyć z serwerem Albionu.',
        { code: timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNAVAILABLE', status: 503 },
      )
    }
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

function totalGatheringFame(gathering) {
  if (Number.isFinite(gathering?.All?.Total)) return gathering.All.Total
  return ['Fiber', 'Hide', 'Ore', 'Rock', 'Wood']
    .reduce((sum, key) => sum + (gathering?.[key]?.Total || 0), 0)
}

function getFameTotal(category, fallbackValue = 0) {
  if (typeof fallbackValue === 'number' && Number.isFinite(fallbackValue) && fallbackValue > 0) {
    return fallbackValue
  }
  if (typeof category === 'number' && Number.isFinite(category)) return category
  if (!category || typeof category !== 'object') return 0
  if (Number.isFinite(category.Total)) return category.Total
  if (Number.isFinite(category.total)) return category.total
  const sum = Object.values(category).reduce((acc, val) => acc + (typeof val === 'number' ? val : 0), 0)
  return sum
}

function normalizePlayer(player) {
  const lifetime = player.LifetimeStatistics || player.lifetimeStatistics || {}
  const pveFame = getFameTotal(lifetime.PvE || lifetime.pve, player.PvEFame || player.PveFame || player.pveFame)
  const craftingFame = getFameTotal(lifetime.Crafting || lifetime.crafting, player.CraftingFame)
  const gatheringFame = totalGatheringFame(lifetime.Gathering || lifetime.gathering)
  const fishingFame = getFameTotal(lifetime.Fishing || lifetime.fishing, player.FishingFame)
  const farmingFame = getFameTotal(lifetime.Farming || lifetime.farming, player.FarmingFame)

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
    fame: {
      pve: pveFame,
      gathering: gatheringFame,
      crafting: craftingFame,
      fishing: fishingFame,
      farming: farmingFame,
    },
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
    timeoutMs: 7000,
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
    killFame: g.KillFame || 0,
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
