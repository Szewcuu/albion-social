import 'server-only'

import { fetchExternalJson } from '@/lib/externalApiClient'
import { GOLD_RANGES } from '@/lib/goldMarket'

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

export const MARKET_QUALITIES = {
  1: 'Normalna',
  2: 'Dobra',
  3: 'Znakomita',
  4: 'Doskonała',
  5: 'Arcydzieło',
}

export const MARKET_RANGES = {
  '24h': { days: 1, timeScale: 1 },
  '7d': { days: 7, timeScale: 6 },
  '30d': { days: 30, timeScale: 24 },
}

export function isSafeItemId(value) {
  return typeof value === 'string'
    && value.length >= 3
    && value.length <= 80
    && /^[A-Z0-9_@]+$/.test(value)
}

function toDateParameter(date) {
  return date.toISOString().slice(0, 10)
}

async function fetchMarketJson(url, { revalidate = 60 } = {}) {
  try {
    return await fetchExternalJson(url, {
      retries: 1,
      retryDelayMs: 500,
      timeoutMs: 12_000,
      requestInit: {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Albion-Social/1.0',
        },
        next: { revalidate },
      },
    })
  } catch (error) {
    if (error?.code === 'UPSTREAM_TIMEOUT') throw new Error('UPSTREAM_TIMEOUT')
    if (error?.upstreamStatus) throw new Error(`UPSTREAM_${error.upstreamStatus}`)
    throw error
  }
}

export async function getCurrentMarketPrices({ itemIds, cities, qualities, region }) {
  const host = MARKET_REGIONS[region]
  if (!host) throw new Error('INVALID_REGION')

  const itemPath = itemIds.map(encodeURIComponent).join(',')
  const params = new URLSearchParams({
    locations: cities.join(','),
    qualities: qualities.join(','),
  })

  return fetchMarketJson(`${host}/api/v2/stats/prices/${itemPath}.json?${params}`, { revalidate: 60 })
}

export async function getEquipmentMarketPrices({ equipmentSets, region }) {
  const items = (equipmentSets || [])
    .flatMap((equipment) => Object.values(equipment || {}))
    .filter((item) => item?.type && isSafeItemId(item.type))
  const itemIds = [...new Set(items.map((item) => item.type))]
  const qualities = [...new Set(items.map((item) => Number(item.quality) || 1))]

  if (!itemIds.length) return []

  const chunks = []
  for (let index = 0; index < itemIds.length; index += 30) {
    chunks.push(itemIds.slice(index, index + 30))
  }

  const responses = await Promise.all(chunks.map((chunk) => getCurrentMarketPrices({
    itemIds: chunk,
    cities: MARKET_CITIES,
    qualities,
    region,
  })))

  return responses.flat()
}

export async function getMarketHistory({ itemId, city, quality = 1, region = 'europe', range = '7d' }) {
  const host = MARKET_REGIONS[region]
  const rangeConfig = MARKET_RANGES[range]
  if (!host) throw new Error('INVALID_REGION')
  if (!rangeConfig) throw new Error('INVALID_RANGE')

  const end = new Date()
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - rangeConfig.days)

  const defaultLocations = 'Caerleon,Bridgewatch,FortSterling,Lymhurst,Martlock,Thetford,Brecilien'
  const locationsParam = city ? city.replace(/\s+/g, '') : defaultLocations

  const params = new URLSearchParams({
    locations: locationsParam,
    qualities: String(quality),
    'time-scale': String(rangeConfig.timeScale),
    date: toDateParameter(start),
    'end-date': toDateParameter(end),
  })

  return fetchMarketJson(
    `${host}/api/v2/stats/history/${encodeURIComponent(itemId)}.json?${params}`,
    { revalidate: 300 },
  )
}

export async function getGoldHistory({ region, range }) {
  const host = MARKET_REGIONS[region]
  const rangeConfig = MARKET_RANGES[range]
  if (!host) throw new Error('INVALID_REGION')
  if (!rangeConfig) throw new Error('INVALID_RANGE')

  // The documented date-range variant currently returns HTTP 500 for gold.
  // Gold observations are hourly, so request enough recent points and enforce
  // the exact time window in normalizeGoldHistory before exposing the data.
  const params = new URLSearchParams({ count: String(GOLD_RANGES[range].hours + 1) })
  return fetchMarketJson(`${host}/api/v2/stats/gold.json?${params}`, { revalidate: 300 })
}
