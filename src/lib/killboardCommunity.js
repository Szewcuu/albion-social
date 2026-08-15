const KILLBOARD_REGION_PATHS = {
  europe: 'eu',
  america: 'us',
  asia: 'as',
}

export function getKillboardCommunityUrl(nick, region) {
  const regionPath = KILLBOARD_REGION_PATHS[region]
  if (!regionPath || !nick) return null
  return `https://killboard-1.com/${regionPath}/player/${encodeURIComponent(nick)}`
}
