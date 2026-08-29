import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculateLootSplit,
  canFinalizeLootSplit,
  parseLootSplitPlayers,
  toSilver,
} from '../../src/lib/lootSplitCalculator.js'

test('normalizuje srebro do nieujemnych pełnych jednostek', () => {
  assert.equal(toSilver('1234.99'), 1234)
  assert.equal(toSilver('-1'), 0)
  assert.equal(toSilver('brak'), 0)
})

test('usuwa duplikaty graczy bez rozróżniania wielkości liter', () => {
  assert.deepEqual(parseLootSplitPlayers('Tank, healer\nTANK;DPS'), ['Tank', 'healer', 'DPS'])
})

test('liczy podatek, regeary, udział i jawną pozostałość', () => {
  const result = calculateLootSplit({
    totalValue: '1000001',
    guildTaxPercent: '10',
    playerNicks: 'Tank\nHeal\nDPS',
    regearList: [{ id: '1', nick: 'Tank', amount: 100000 }],
  })

  assert.equal(result.guildTaxAmount, 100000)
  assert.equal(result.totalRegearCost, 100000)
  assert.equal(result.distributable, 800001)
  assert.equal(result.basePayout, 266667)
  assert.equal(result.roundingRemainder, 0)
  assert.deepEqual(result.payoutRows.map((row) => row.total), [366667, 266667, 266667])
  assert.equal(canFinalizeLootSplit(result), true)
})

test('blokuje raport przy deficycie lub regearze spoza składu', () => {
  const deficit = calculateLootSplit({
    totalValue: '100', guildTaxPercent: '0', playerNicks: 'Tank', regearList: [{ nick: 'Tank', amount: 101 }],
  })
  const unassigned = calculateLootSplit({
    totalValue: '1000', guildTaxPercent: '0', playerNicks: 'Tank', regearList: [{ nick: 'Heal', amount: 100 }],
  })

  assert.equal(deficit.deficit, 1)
  assert.equal(canFinalizeLootSplit(deficit), false)
  assert.equal(unassigned.unassignedRegears.length, 1)
  assert.equal(canFinalizeLootSplit(unassigned), false)
})

test('zachowuje resztę po dzieleniu jako jawne saldo banku', () => {
  const result = calculateLootSplit({ totalValue: '10', guildTaxPercent: '0', playerNicks: 'A,B,C' })
  assert.equal(result.basePayout, 3)
  assert.equal(result.roundingRemainder, 1)
})
