import test from 'node:test'
import assert from 'node:assert/strict'

import {
  calculateRefiningProfit,
  getNutritionPerCraft,
  getPresetReturnRate,
  getRefiningRecipe,
  marketItemId,
  quoteAgeHours,
} from '../../src/lib/refiningCalculator.js'

test('buduje prawidłowe identyfikatory enchantowanych surowców Albion Data Project', () => {
  assert.equal(marketItemId(5, 'PLANKS', 0), 'T5_PLANKS')
  assert.equal(marketItemId(5, 'PLANKS', 2), 'T5_PLANKS_LEVEL2@2')
})

test('receptura T6.2 zawiera cztery surowce i materiał T5.2', () => {
  const recipe = getRefiningRecipe({ resourceType: 'PLANKS', tier: 6, enchant: 2 })
  assert.equal(recipe.output.itemId, 'T6_PLANKS_LEVEL2@2')
  assert.deepEqual(recipe.ingredients.map(({ itemId, quantity }) => ({ itemId, quantity })), [
    { itemId: 'T6_WOOD_LEVEL2@2', quantity: 4 },
    { itemId: 'T5_PLANKS_LEVEL2@2', quantity: 1 },
  ])
})

test('T4 enchanted korzysta ze zwykłego materiału T3, a kamień nie ma enchantów', () => {
  assert.equal(getRefiningRecipe({ resourceType: 'CLOTH', tier: 4, enchant: 3 }).ingredients[1].itemId, 'T3_CLOTH')
  assert.equal(getRefiningRecipe({ resourceType: 'STONEBLOCK', tier: 6, enchant: 4 }).output.itemId, 'T6_STONEBLOCK')
})

test('preset RRR rozpoznaje prawidłowe miasto specjalizacji', () => {
  assert.equal(getPresetReturnRate({ craftCity: 'Fort Sterling', bonusCity: 'Fort Sterling', useFocus: false }), 36.7)
  assert.equal(getPresetReturnRate({ craftCity: 'Lymhurst', bonusCity: 'Fort Sterling', useFocus: true }), 43.5)
})

test('oblicza koszt wyłącznie z jawnych składników, zwrotu, stanowiska i opłaty rynku', () => {
  const recipe = getRefiningRecipe({ resourceType: 'PLANKS', tier: 5, enchant: 0 })
  const result = calculateRefiningProfit({
    recipe,
    quantity: 100,
    ingredientPrices: { T5_WOOD: 100, T4_PLANKS: 200 },
    outputPrice: 500,
    returnRate: 36.7,
    stationFeePerHundredNutrition: 500,
    marketFeeRate: 6.5,
  })

  assert.equal(getNutritionPerCraft(recipe), 3.6)
  assert.equal(Math.round(result.materialCost), 31_650)
  assert.equal(Math.round(result.stationCost), 1_800)
  assert.equal(Math.round(result.marketFees), 3_250)
  assert.equal(Math.round(result.profit), 13_300)
  assert.equal(Math.round(result.materials[0].returned * 10) / 10, 110.1)
})

test('wykrywa wiek poprawnego skanu i odrzuca pustą datę', () => {
  const now = Date.parse('2026-08-28T12:00:00Z')
  assert.equal(quoteAgeHours('2026-08-28T06:00:00Z', now), 6)
  assert.equal(quoteAgeHours('0001-01-01T00:00:00', now), null)
})
