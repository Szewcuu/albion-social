import { EQUIPMENT_SLOTS } from './buildSlots.js'
import { valuateEquipment } from './marketValuation.js'

const SLOT_TO_MARKET_KEY = {
  main_hand: 'MainHand',
  off_hand: 'OffHand',
  head: 'Head',
  armor: 'Armor',
  shoes: 'Shoes',
  bag: 'Bag',
  cape: 'Cape',
  mount: 'Mount',
  potion: 'Potion',
  food: 'Food',
}

export const MARKET_SLOT_LABELS = Object.fromEntries(
  EQUIPMENT_SLOTS.map((slot) => [SLOT_TO_MARKET_KEY[slot.key], slot.label]),
)

export function buildSlotsToMarketEquipment(slots = {}, quality = 1) {
  return EQUIPMENT_SLOTS.reduce((equipment, slot) => {
    const itemId = slots?.[slot.key]?.main
    if (!itemId) return equipment

    equipment[SLOT_TO_MARKET_KEY[slot.key]] = {
      type: itemId,
      quality: ['mount', 'potion', 'food'].includes(slot.key) ? 1 : Number(quality) || 1,
      count: slot.hasAmount ? Math.max(1, Number(slots[slot.key]?.amount) || 1) : 1,
    }
    return equipment
  }, {})
}

export function getUniqueBuildItemIds(builds = []) {
  return [...new Set(builds.flatMap((build) => (
    Object.values(buildSlotsToMarketEquipment(build?.slots, 1)).map((item) => item.type)
  )))]
}

export function chunkBuildItemIds(itemIds = [], size = 10) {
  const safeSize = Math.max(1, Math.min(10, Number(size) || 10))
  const chunks = []
  for (let index = 0; index < itemIds.length; index += safeSize) {
    chunks.push(itemIds.slice(index, index + safeSize))
  }
  return chunks
}

export function valuateBuildInCity(build, rows = [], { city, quality = 1, now = Date.now() } = {}) {
  const cityRows = city ? rows.filter((row) => row?.city === city) : rows
  return valuateEquipment(buildSlotsToMarketEquipment(build?.slots, quality), cityRows, now)
}

export function compareBuildCosts(first, second) {
  const firstComplete = first?.pricedItems > 0 && first.pricedItems === first.totalItems
  const secondComplete = second?.pricedItems > 0 && second.pricedItems === second.totalItems
  if (!firstComplete || !secondComplete) return null
  const difference = Math.abs(first.estimatedValue - second.estimatedValue)
  return {
    difference,
    cheaper: first.estimatedValue === second.estimatedValue
      ? 'equal'
      : first.estimatedValue < second.estimatedValue ? 'first' : 'second',
  }
}
