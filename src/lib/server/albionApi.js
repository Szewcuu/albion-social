import 'server-only'

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
  return {
    id: String(event.EventId),
    timestamp: event.TimeStamp,
    fame: event.TotalVictimKillFame || event.Victim?.DeathFame || 0,
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

function normalizePlayer(player) {
  const lifetime = player.LifetimeStatistics || {}
  return {
    id: player.Id,
    name: player.Name,
    guildName: player.GuildName || '',
    guildId: player.GuildId || '',
    allianceName: player.AllianceName || '',
    allianceId: player.AllianceId || '',
    allianceTag: player.AllianceTag || '',
    avatar: player.Avatar || '',
    avatarRing: player.AvatarRing || '',
    killFame: player.KillFame || 0,
    deathFame: player.DeathFame || 0,
    fameRatio: Number(player.FameRatio || 0),
    averageItemPower: Math.round(player.AverageItemPower || 0),
    fame: {
      pve: lifetime.PvE?.Total || 0,
      gathering: totalGatheringFame(lifetime.Gathering),
      crafting: lifetime.Crafting?.Total || 0,
      fishing: lifetime.FishingFame || 0,
      farming: lifetime.FarmingFame || 0,
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
  return {
    id: guild.Id || '',
    name: guild.Name || '',
    allianceId: guild.AllianceId || '',
    allianceTag: guild.AllianceTag || '',
    killFame: guild.KillFame || 0,
    deathFame: guild.DeathFame || 0,
    fameRatio: Number(guild.FameRatio || 0),
    memberCount: members.length,
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

export async function searchAlbionPlayersAllRegions(query, preferredRegion = 'europe') {
  const regions = ['europe', 'america', 'asia']
  const results = await Promise.allSettled(
    regions.map((r) => searchAlbionPlayers(query, r))
  )

  const allPlayers = []
  results.forEach((res) => {
    if (res.status === 'fulfilled' && Array.isArray(res.value)) {
      allPlayers.push(...res.value)
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

  return allPlayers
}

export async function getAlbionPlayerOverview(playerId, region, limit = 6) {
  const safeId = encodeURIComponent(playerId)
  const [profileResult, killsResult, deathsResult] = await Promise.allSettled([
    fetchAlbionJson(`/players/${safeId}`, { region, revalidate: 120, timeoutMs: 8000 }),
    fetchAlbionJson(`/players/${safeId}/kills?limit=${limit}&offset=0`, { region, revalidate: 90, timeoutMs: 10000 }),
    fetchAlbionJson(`/players/${safeId}/deaths?limit=${limit}&offset=0`, { region, revalidate: 90, timeoutMs: 10000 }),
  ])

  if (profileResult.status === 'rejected') throw profileResult.reason

  const profile = normalizePlayer(profileResult.value)
  const warnings = []
  const kills = killsResult.status === 'fulfilled'
    ? (Array.isArray(killsResult.value) ? killsResult.value : []).slice(0, limit).map(event => normalizeEvent(event, 'kill'))
    : []
  const deaths = deathsResult.status === 'fulfilled'
    ? (Array.isArray(deathsResult.value) ? deathsResult.value : []).slice(0, limit).map(event => normalizeEvent(event, 'death'))
    : []

  if (killsResult.status === 'rejected') warnings.push('Historia zabójstw jest chwilowo niedostępna.')
  if (deathsResult.status === 'rejected') warnings.push('Historia zgonów jest chwilowo niedostępna.')

  let guild = null
  if (profile.guildId) {
    const guildId = encodeURIComponent(profile.guildId)
    const [guildResult, membersResult] = await Promise.allSettled([
      fetchAlbionJson(`/guilds/${guildId}`, { region, revalidate: 600, timeoutMs: 8000 }),
      fetchAlbionJson(`/guilds/${guildId}/members`, { region, revalidate: 600, timeoutMs: 12000 }),
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

  return { player: profile, kills, deaths, guild, warnings }
}
