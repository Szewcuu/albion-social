import assert from 'node:assert/strict'
import test from 'node:test'

import { getAlbionFameBreakdown } from '../../src/lib/albionPlayer.js'

test('czyta Fishing i Farming Fame z LifetimeStatistics Gameinfo', () => {
  const fame = getAlbionFameBreakdown({
    LifetimeStatistics: {
      PvE: { Total: 1_200_000 },
      Gathering: { All: { Total: 340_000 } },
      Crafting: { Total: 560_000 },
      FishingFame: 78_000,
      FarmingFame: 91_000,
    },
  })

  assert.deepEqual(fame, {
    pve: 1_200_000,
    gathering: 340_000,
    crafting: 560_000,
    fishing: 78_000,
    farming: 91_000,
  })
})

test('zachowuje zgodność ze starszymi polami fame na profilu', () => {
  const fame = getAlbionFameBreakdown({
    PvEFame: 10,
    CraftingFame: 20,
    FishingFame: 30,
    FarmingFame: 40,
  })

  assert.equal(fame.pve, 10)
  assert.equal(fame.crafting, 20)
  assert.equal(fame.fishing, 30)
  assert.equal(fame.farming, 40)
})
