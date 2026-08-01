import 'server-only'

export const MARKET_REGIONS = {
  europe: 'https://europe.albion-online-data.com',
  america: 'https://west.albion-online-data.com',
  asia: 'https://east.albion-online-data.com',
}

export const MARKET_CITIES = [
  'Caerleon',
  'Bridgewatch',
  'Fort Sterling',
  'Lymhurst',
  'Martlock',
  'Thetford',
  'Brecilien',
]

export function isSafeItemId(value) {
  return typeof value === 'string'
    && value.length >= 3
    && value.length <= 80
    && /^[A-Z0-9_@]+$/.test(value)
}

export async function getCurrentMarketPrices({ itemId, city, region }) {
  const host = MARKET_REGIONS[region]
  if (!host) throw new Error('INVALID_REGION')

  const locations = city === 'Caerleon' ? city : `${city},Caerleon`
  const url = `${host}/api/v2/stats/prices/${encodeURIComponent(itemId)}.json?locations=${encodeURIComponent(locations)}`

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Albion-Social/1.0 (+https://albion-social.vercel.app)',
      },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) throw new Error(`UPSTREAM_${response.status}`)
    return await response.json()
  } catch (error) {
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') throw new Error('UPSTREAM_TIMEOUT')
    throw error
  }
}
