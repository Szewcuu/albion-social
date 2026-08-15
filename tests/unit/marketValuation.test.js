import assert from 'node:assert/strict'
import test from 'node:test'

import {
  classifyPriceFreshness,
  selectMarketQuote,
  valuateEquipment,
} from '../../src/lib/marketValuation.js'

const NOW = Date.parse('2026-08-15T20:00:00Z')

test('klasyfikuje wiek skanu cenowego', () => {
  assert.equal(classifyPriceFreshness('2026-08-15T12:00:00', NOW).status, 'fresh')
  assert.equal(classifyPriceFreshness('2026-08-14T12:00:00', NOW).status, 'aging')
  assert.equal(classifyPriceFreshness('2026-08-12T12:00:00', NOW).status, 'stale')
  assert.equal(classifyPriceFreshness('0001-01-01T00:00:00', NOW).status, 'missing')
})

test('preferuje świeżą ofertę sprzedaży przed tańszym starym skanem', () => {
  const rows = [
    { item_id: 'T6_MAIN_SWORD', quality: 1, city: 'Caerleon', sell_price_min: 50_000, sell_price_min_date: '2026-08-12T10:00:00' },
    { item_id: 'T6_MAIN_SWORD', quality: 1, city: 'Martlock', sell_price_min: 72_000, sell_price_min_date: '2026-08-15T18:00:00' },
  ]

  const quote = selectMarketQuote(rows, { type: 'T6_MAIN_SWORD', quality: 1 }, NOW)
  assert.equal(quote.city, 'Martlock')
  assert.equal(quote.unitPrice, 72_000)
  assert.equal(quote.status, 'fresh')
})

test('używa ceny kupna wyłącznie gdy brak ofert sprzedaży', () => {
  const rows = [
    { item_id: 'T5_BAG', quality: 2, city: 'Lymhurst', sell_price_min: 0, buy_price_max: 8_500, buy_price_max_date: '2026-08-15T16:00:00' },
  ]

  const quote = selectMarketQuote(rows, { type: 'T5_BAG', quality: 2 }, NOW)
  assert.equal(quote.source, 'buy')
  assert.equal(quote.unitPrice, 8_500)
})

test('sumuje stosy, raportuje pokrycie i brakujące sloty', () => {
  const equipment = {
    MainHand: { type: 'T6_MAIN_SWORD', quality: 1, count: 1 },
    Potion: { type: 'T6_POTION_HEAL', quality: 1, count: 5 },
    Food: { type: 'T6_MEAL_STEW', quality: 1, count: 2 },
  }
  const rows = [
    { item_id: 'T6_MAIN_SWORD', quality: 1, city: 'Martlock', sell_price_min: 70_000, sell_price_min_date: '2026-08-15T18:00:00' },
    { item_id: 'T6_POTION_HEAL', quality: 1, city: 'Martlock', sell_price_min: 1_000, sell_price_min_date: '2026-08-15T18:00:00' },
  ]

  const valuation = valuateEquipment(equipment, rows, NOW)
  assert.equal(valuation.estimatedValue, 75_000)
  assert.equal(valuation.pricedItems, 2)
  assert.equal(valuation.totalItems, 3)
  assert.equal(valuation.coveragePercent, 67)
  assert.deepEqual(valuation.missingSlots, ['Food'])
})
