import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildSlotsToMarketEquipment,
  chunkBuildItemIds,
  compareBuildCosts,
  getUniqueBuildItemIds,
  valuateBuildInCity,
} from '../../src/lib/buildComparison.js'

const BUILD_A = {
  slots: {
    main_hand: { main: 'T6_MAIN_SWORD', amount: 1 },
    armor: { main: 'T6_ARMOR_PLATE_SET1', amount: 1 },
    potion: { main: 'T6_POTION_HEAL', amount: 5 },
  },
}

test('zamienia build na pozycje rynkowe i zachowuje liczbę sztuk', () => {
  const equipment = buildSlotsToMarketEquipment(BUILD_A.slots, 3)
  assert.deepEqual(equipment.MainHand, { type: 'T6_MAIN_SWORD', quality: 3, count: 1 })
  assert.deepEqual(equipment.Potion, { type: 'T6_POTION_HEAL', quality: 1, count: 5 })
})

test('usuwa duplikaty identyfikatorów i dzieli zapytania zgodnie z limitem API', () => {
  const ids = getUniqueBuildItemIds([BUILD_A, BUILD_A])
  assert.equal(ids.length, 3)
  assert.deepEqual(chunkBuildItemIds([...ids, ...Array.from({ length: 9 }, (_, i) => `T4_ITEM_${i}`)]).map((part) => part.length), [10, 2])
})

test('wycenia wyłącznie dane z wybranego miasta', () => {
  const rows = [
    { item_id: 'T6_MAIN_SWORD', quality: 1, city: 'Martlock', sell_price_min: 70_000, sell_price_min_date: '2026-08-15T18:00:00' },
    { item_id: 'T6_MAIN_SWORD', quality: 1, city: 'Lymhurst', sell_price_min: 20_000, sell_price_min_date: '2026-08-15T18:00:00' },
    { item_id: 'T6_POTION_HEAL', quality: 1, city: 'Martlock', sell_price_min: 1_000, sell_price_min_date: '2026-08-15T18:00:00' },
  ]
  const result = valuateBuildInCity(BUILD_A, rows, { city: 'Martlock', now: Date.parse('2026-08-15T20:00:00Z') })
  assert.equal(result.estimatedValue, 75_000)
  assert.equal(result.coveragePercent, 67)
})

test('porównuje wyłącznie zestawy posiadające pełną wycenę', () => {
  assert.equal(compareBuildCosts({ pricedItems: 1, totalItems: 1, estimatedValue: 80 }, { pricedItems: 1, totalItems: 1, estimatedValue: 100 }).cheaper, 'first')
  assert.equal(compareBuildCosts({ pricedItems: 1, totalItems: 2, estimatedValue: 80 }, { pricedItems: 1, totalItems: 1, estimatedValue: 100 }), null)
})
