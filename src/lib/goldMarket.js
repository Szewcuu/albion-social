export const GOLD_RANGES = {
  '24h': { hours: 24 },
  '7d': { hours: 24 * 7 },
  '30d': { hours: 24 * 30 },
}

export const GOLD_STALE_AFTER_HOURS = 12

function parseTimestamp(value) {
  if (typeof value !== 'string' || !value.trim()) return null
  const normalized = /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`
  const timestamp = new Date(normalized)
  return Number.isNaN(timestamp.getTime()) ? null : timestamp
}

export function normalizeGoldHistory(rawData, {
  range = '24h',
  now = new Date(),
  staleAfterHours = GOLD_STALE_AFTER_HOURS,
} = {}) {
  const rangeConfig = GOLD_RANGES[range]
  if (!rangeConfig) throw new Error('INVALID_RANGE')

  const nowDate = now instanceof Date ? now : new Date(now)
  if (Number.isNaN(nowDate.getTime())) throw new Error('INVALID_NOW')

  const fromTime = nowDate.getTime() - rangeConfig.hours * 3_600_000
  const futureTolerance = nowDate.getTime() + 5 * 60_000
  const byTimestamp = new Map()

  for (const entry of Array.isArray(rawData) ? rawData : []) {
    const price = Number(entry?.price)
    const timestamp = parseTimestamp(entry?.timestamp)
    if (!Number.isFinite(price) || price <= 0 || !timestamp) continue
    if (timestamp.getTime() < fromTime || timestamp.getTime() > futureTolerance) continue
    byTimestamp.set(timestamp.toISOString(), { price, timestamp: timestamp.toISOString() })
  }

  const data = [...byTimestamp.values()]
    .sort((left, right) => new Date(left.timestamp) - new Date(right.timestamp))
  const latestAt = data.at(-1)?.timestamp || null
  const ageHours = latestAt
    ? Math.max(0, (nowDate.getTime() - new Date(latestAt).getTime()) / 3_600_000)
    : null

  return {
    data,
    latestAt,
    ageHours: ageHours == null ? null : Math.round(ageHours * 10) / 10,
    freshness: ageHours == null ? 'missing' : ageHours > staleAfterHours ? 'stale' : 'fresh',
  }
}
