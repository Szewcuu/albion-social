const KILLBOARD_REGION_PATHS = {
  europe: 'eu',
  america: 'us',
  asia: 'as',
}

const PLAYER_LINK_PATTERN = /href=["']\/(eu|us|as)\/player\/([^"'#?]+)["']/gi

export function getKillboardCommunityUrl(nick, region) {
  const regionPath = KILLBOARD_REGION_PATHS[region]
  if (!regionPath || !nick) return null
  return `https://killboard-1.com/${regionPath}/player/${encodeURIComponent(nick)}`
}

export function parseKillboardCommunitySearch(html, query, region) {
  const regionPath = KILLBOARD_REGION_PATHS[region]
  const normalizedQuery = query.trim().toLocaleLowerCase('en-US')
  if (!regionPath || !normalizedQuery || typeof html !== 'string') return null

  for (const match of html.matchAll(PLAYER_LINK_PATTERN)) {
    if (match[1] !== regionPath) continue

    let name
    try {
      name = decodeURIComponent(match[2])
    } catch {
      continue
    }

    if (name.toLocaleLowerCase('en-US') !== normalizedQuery) continue

    return {
      id: `community:${region}:${name}`,
      name,
      guildName: '',
      allianceName: '',
      killFame: null,
      region,
      partial: true,
      source: 'killboard-1',
      externalUrl: getKillboardCommunityUrl(name, region),
    }
  }

  return null
}

export async function searchKillboardCommunityPlayer(query, region) {
  const regionPath = KILLBOARD_REGION_PATHS[region]
  if (!regionPath) return null

  try {
    const response = await fetch(`https://killboard-1.com/${regionPath}/search`, {
      method: 'POST',
      headers: {
        Accept: 'text/html',
        'Content-Type': 'application/json',
        'User-Agent': 'Albion-Social/1.0 (+https://albion-social.vercel.app)',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ search: query }),
      cache: 'no-store',
      signal: AbortSignal.timeout(4500),
    })

    if (!response.ok) return null
    return parseKillboardCommunitySearch(await response.text(), query, region)
  } catch {
    return null
  }
}
