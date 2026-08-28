function getFameTotal(category, fallbackValue = 0) {
  if (typeof fallbackValue === 'number' && Number.isFinite(fallbackValue) && fallbackValue > 0) {
    return fallbackValue
  }
  if (typeof category === 'number' && Number.isFinite(category)) return category
  if (!category || typeof category !== 'object') return 0
  if (Number.isFinite(category.Total)) return category.Total
  if (Number.isFinite(category.total)) return category.total
  return Object.values(category).reduce((sum, value) => sum + (typeof value === 'number' ? value : 0), 0)
}

function totalGatheringFame(gathering) {
  if (Number.isFinite(gathering?.All?.Total)) return gathering.All.Total
  return ['Fiber', 'Hide', 'Ore', 'Rock', 'Wood']
    .reduce((sum, key) => sum + (gathering?.[key]?.Total || 0), 0)
}

export function getAlbionFameBreakdown(player = {}) {
  const lifetime = player.LifetimeStatistics || player.lifetimeStatistics || {}

  return {
    pve: getFameTotal(lifetime.PvE || lifetime.pve, player.PvEFame || player.PveFame || player.pveFame),
    gathering: totalGatheringFame(lifetime.Gathering || lifetime.gathering),
    crafting: getFameTotal(lifetime.Crafting || lifetime.crafting, player.CraftingFame),
    fishing: getFameTotal(
      lifetime.Fishing || lifetime.fishing,
      lifetime.FishingFame ?? lifetime.fishingFame ?? player.FishingFame,
    ),
    farming: getFameTotal(
      lifetime.Farming || lifetime.farming,
      lifetime.FarmingFame ?? lifetime.farmingFame ?? player.FarmingFame,
    ),
  }
}
