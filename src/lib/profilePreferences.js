export const PROFILE_ROLES = ['Tank', 'Healer', 'DPS', 'Support']
export const PROFILE_SERVERS = ['', 'Europa', 'Ameryka', 'Azja']
export const MAX_FEATURED_BUILDS = 3

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function cleanText(value, maxLength) {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, maxLength)
}

function unique(values) {
  return [...new Set(values)]
}

export function parseProfileCard(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { error: 'Nieprawidłowe dane profilu.' }
  }

  const ingameNick = cleanText(input.ingameNick, 80)
  const guildName = cleanText(input.guildName, 100)
  const bio = cleanText(input.bio, 500)
  const mainServer = typeof input.mainServer === 'string' ? input.mainServer : ''
  const mainRole = typeof input.mainRole === 'string' ? input.mainRole : ''
  const avgIp = Number(input.avgIp)
  const favoriteRoles = unique(Array.isArray(input.favoriteRoles) ? input.favoriteRoles : [])
  const featuredBuildIds = unique(Array.isArray(input.featuredBuildIds) ? input.featuredBuildIds : [])

  if (!PROFILE_SERVERS.includes(mainServer) || !PROFILE_ROLES.includes(mainRole)) {
    return { error: 'Wybierz prawidłowy serwer i główną rolę.' }
  }
  if (!Number.isInteger(avgIp) || avgIp < 0 || avgIp > 3000) {
    return { error: 'Item Power musi być liczbą od 0 do 3000.' }
  }
  if (favoriteRoles.length > PROFILE_ROLES.length || favoriteRoles.some((role) => !PROFILE_ROLES.includes(role))) {
    return { error: 'Lista ulubionych ról jest nieprawidłowa.' }
  }
  if (featuredBuildIds.length > MAX_FEATURED_BUILDS || featuredBuildIds.some((id) => !UUID_PATTERN.test(id))) {
    return { error: `Możesz wyróżnić maksymalnie ${MAX_FEATURED_BUILDS} własne buildy.` }
  }

  return {
    value: {
      ingameNick,
      mainServer,
      guildName,
      mainRole,
      avgIp,
      bio,
      favoriteBuildsPublic: input.favoriteBuildsPublic === true,
      favoriteRoles,
      featuredBuildIds,
    },
  }
}
