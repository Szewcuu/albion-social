export const VALUATION_EQUIPMENT_ORDER = [
  'MainHand',
  'OffHand',
  'Head',
  'Armor',
  'Shoes',
  'Bag',
  'Cape',
  'Mount',
  'Potion',
  'Food',
]

export const VALUATION_SLOT_LABELS = {
  MainHand: 'Broń główna',
  OffHand: 'Broń pomocnicza',
  Head: 'Hełm',
  Armor: 'Zbroja',
  Shoes: 'Buty',
  Bag: 'Torba',
  Cape: 'Peleryna',
  Mount: 'Wierzchowiec',
  Potion: 'Mikstura',
  Food: 'Jedzenie',
}

const FRESHNESS_RANK = {
  fresh: 0,
  aging: 1,
  stale: 2,
  missing: 3,
}

export function parseAlbionPriceDate(value) {
  if (!value || String(value).startsWith('0001-')) return null
  const raw = String(value)
  const normalized = /(?:Z|[+-]\d\d:\d\d)$/.test(raw) ? raw : `${raw}Z`
  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function classifyPriceFreshness(value, now = Date.now()) {
  const date = value instanceof Date ? value : parseAlbionPriceDate(value)
  if (!date) return { status: 'missing', ageHours: null, observedAt: null }

  const ageHours = Math.max(0, (Number(now) - date.getTime()) / 3_600_000)
  const status = ageHours <= 12 ? 'fresh' : ageHours <= 48 ? 'aging' : 'stale'
  return {
    status,
    ageHours: Math.round(ageHours * 10) / 10,
    observedAt: date.toISOString(),
  }
}

function quoteCandidates(rows, item, source, now) {
  const isSell = source === 'sell'
  const priceKey = isSell ? 'sell_price_min' : 'buy_price_max'
  const dateKey = isSell ? 'sell_price_min_date' : 'buy_price_max_date'

  return rows
    .filter((row) => row?.item_id === item.type && Number(row.quality) === Number(item.quality || 1))
    .map((row) => {
      const unitPrice = Number(row[priceKey])
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) return null
      const freshness = classifyPriceFreshness(row[dateKey], now)
      return {
        unitPrice,
        city: row.city || 'Nieznane miasto',
        source,
        ...freshness,
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      const freshnessDelta = FRESHNESS_RANK[a.status] - FRESHNESS_RANK[b.status]
      if (freshnessDelta !== 0) return freshnessDelta
      const priceDelta = isSell ? a.unitPrice - b.unitPrice : b.unitPrice - a.unitPrice
      if (priceDelta !== 0) return priceDelta
      return (a.ageHours ?? Infinity) - (b.ageHours ?? Infinity)
    })
}

export function selectMarketQuote(rows, item, now = Date.now()) {
  if (!item?.type) return null
  const sells = quoteCandidates(rows, item, 'sell', now)
  if (sells.length) return sells[0]
  return quoteCandidates(rows, item, 'buy', now)[0] || null
}

export function valuateEquipment(equipment, rows, now = Date.now()) {
  const items = VALUATION_EQUIPMENT_ORDER
    .map((slot) => ({ slot, item: equipment?.[slot] }))
    .filter(({ item }) => item?.type)
    .map(({ slot, item }) => {
      const count = Math.max(1, Number(item.count) || 1)
      const quote = selectMarketQuote(rows, item, now)
      return {
        slot,
        type: item.type,
        quality: Number(item.quality) || 1,
        count,
        quote,
        total: quote ? Math.round(quote.unitPrice * count) : null,
      }
    })

  const pricedItems = items.filter((item) => item.quote)
  const estimatedValue = pricedItems.reduce((sum, item) => sum + item.total, 0)
  const worstFreshness = pricedItems.reduce((worst, item) => {
    return FRESHNESS_RANK[item.quote.status] > FRESHNESS_RANK[worst] ? item.quote.status : worst
  }, 'fresh')
  const maxAgeHours = pricedItems.reduce((oldest, item) => {
    return item.quote.ageHours == null ? oldest : Math.max(oldest, item.quote.ageHours)
  }, 0)
  const oldestObservedAt = pricedItems
    .map((item) => item.quote.observedAt)
    .filter(Boolean)
    .sort()[0] || null

  return {
    estimatedValue,
    pricedItems: pricedItems.length,
    totalItems: items.length,
    coveragePercent: items.length ? Math.round((pricedItems.length / items.length) * 100) : 0,
    freshness: pricedItems.length ? worstFreshness : 'missing',
    maxAgeHours: pricedItems.length ? Math.round(maxAgeHours * 10) / 10 : null,
    oldestObservedAt,
    fallbackItems: pricedItems.filter((item) => item.quote.source === 'buy').length,
    missingSlots: items.filter((item) => !item.quote).map((item) => item.slot),
    isComplete: items.length > 0 && pricedItems.length === items.length,
    valueKind: pricedItems.length === 0 ? 'missing' : pricedItems.length === items.length ? 'estimate' : 'minimum',
    items,
  }
}

export function summarizeLossValuations(events = []) {
  const valuations = events.map((event) => event?.lossValuation).filter(Boolean)
  const pricedItems = valuations.reduce((sum, valuation) => sum + (Number(valuation.pricedItems) || 0), 0)
  const totalItems = valuations.reduce((sum, valuation) => sum + (Number(valuation.totalItems) || 0), 0)
  const pricedValuations = valuations.filter((valuation) => Number(valuation.pricedItems) > 0)
  const freshness = pricedValuations.reduce((worst, valuation) => {
    const status = FRESHNESS_RANK[valuation.freshness] == null ? 'missing' : valuation.freshness
    return FRESHNESS_RANK[status] > FRESHNESS_RANK[worst] ? status : worst
  }, 'fresh')

  return {
    estimatedValue: valuations.reduce((sum, valuation) => sum + (Number(valuation.estimatedValue) || 0), 0),
    pricedItems,
    totalItems,
    coveragePercent: totalItems ? Math.round((pricedItems / totalItems) * 100) : 0,
    valuedEvents: pricedValuations.length,
    fullyValuedEvents: valuations.filter((valuation) => valuation.isComplete || (valuation.totalItems > 0 && valuation.pricedItems === valuation.totalItems)).length,
    fallbackItems: valuations.reduce((sum, valuation) => sum + (Number(valuation.fallbackItems) || 0), 0),
    freshness: pricedValuations.length ? freshness : 'missing',
    hasPartialCoverage: pricedItems > 0 && pricedItems < totalItems,
  }
}
