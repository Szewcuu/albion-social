export const REFINING_RESOURCES = [
  { id: 'CLOTH', label: 'Tkanina', rawId: 'FIBER', rawLabel: 'Włókno', bonusCity: 'Lymhurst' },
  { id: 'LEATHER', label: 'Skóra', rawId: 'HIDE', rawLabel: 'Skóra surowa', bonusCity: 'Martlock' },
  { id: 'METALBAR', label: 'Sztaby metalu', rawId: 'ORE', rawLabel: 'Ruda', bonusCity: 'Thetford' },
  { id: 'PLANKS', label: 'Deski', rawId: 'WOOD', rawLabel: 'Kłody', bonusCity: 'Fort Sterling' },
  { id: 'STONEBLOCK', label: 'Bloki kamienne', rawId: 'ROCK', rawLabel: 'Kamień', bonusCity: 'Bridgewatch', enchantable: false },
]

export const REFINING_CITIES = [
  'Fort Sterling',
  'Lymhurst',
  'Martlock',
  'Thetford',
  'Bridgewatch',
  'Caerleon',
  'Brecilien',
]

export const RAW_COUNTS_BY_TIER = {
  4: 2,
  5: 3,
  6: 4,
  7: 5,
  8: 5,
}

export function marketItemId(tier, itemType, enchant = 0) {
  const suffix = Number(enchant) > 0 ? `_LEVEL${Number(enchant)}@${Number(enchant)}` : ''
  return `T${Number(tier)}_${itemType}${suffix}`
}

export function getRefiningRecipe({ resourceType, tier, enchant = 0 }) {
  const resource = REFINING_RESOURCES.find((entry) => entry.id === resourceType)
  const numericTier = Number(tier)
  const safeEnchant = resource?.enchantable === false ? 0 : Number(enchant)

  if (!resource || !RAW_COUNTS_BY_TIER[numericTier] || safeEnchant < 0 || safeEnchant > 4) {
    throw new Error('INVALID_REFINING_RECIPE')
  }

  const previousEnchant = numericTier === 4 ? 0 : safeEnchant
  return {
    output: {
      itemId: marketItemId(numericTier, resource.id, safeEnchant),
      label: `${resource.label} T${numericTier}.${safeEnchant}`,
      quantity: 1,
    },
    ingredients: [
      {
        itemId: marketItemId(numericTier, resource.rawId, safeEnchant),
        label: `${resource.rawLabel} T${numericTier}.${safeEnchant}`,
        quantity: RAW_COUNTS_BY_TIER[numericTier],
      },
      {
        itemId: marketItemId(numericTier - 1, resource.id, previousEnchant),
        label: `${resource.label} T${numericTier - 1}.${previousEnchant}`,
        quantity: 1,
      },
    ],
    bonusCity: resource.bonusCity,
    resource,
    tier: numericTier,
    enchant: safeEnchant,
  }
}

export function getPresetReturnRate({ craftCity, bonusCity, useFocus }) {
  const hasSpecialization = craftCity === bonusCity
  if (hasSpecialization) return useFocus ? 53.9 : 36.7
  return useFocus ? 43.5 : 15.3
}

export function getNutritionPerCraft({ tier, enchant = 0 }) {
  return 1.8 * (2 ** (Number(tier) + Number(enchant) - 4))
}

function safeNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : 0
}

export function calculateRefiningProfit({
  recipe,
  quantity,
  ingredientPrices = {},
  outputPrice,
  returnRate,
  stationFeePerHundredNutrition,
  marketFeeRate,
}) {
  const crafts = Math.max(1, Math.floor(safeNumber(quantity)))
  const rrr = Math.min(99, safeNumber(returnRate)) / 100
  const feeRate = Math.min(100, safeNumber(marketFeeRate)) / 100
  const consumptionRate = 1 - rrr

  const materials = recipe.ingredients.map((ingredient) => {
    const required = ingredient.quantity * crafts
    const returned = required * rrr
    const consumed = required * consumptionRate
    const unitPrice = safeNumber(ingredientPrices[ingredient.itemId])
    return {
      ...ingredient,
      required,
      returned,
      consumed,
      unitPrice,
      cost: consumed * unitPrice,
    }
  })

  const materialCost = materials.reduce((total, material) => total + material.cost, 0)
  const nutritionPerCraft = getNutritionPerCraft(recipe)
  const stationCost = crafts * nutritionPerCraft * safeNumber(stationFeePerHundredNutrition) / 100
  const grossRevenue = crafts * safeNumber(outputPrice)
  const marketFees = grossRevenue * feeRate
  const netRevenue = grossRevenue - marketFees
  const totalCost = materialCost + stationCost
  const profit = netRevenue - totalCost

  return {
    crafts,
    materials,
    materialCost,
    nutritionPerCraft,
    stationCost,
    grossRevenue,
    marketFees,
    netRevenue,
    totalCost,
    profit,
    profitPerCraft: profit / crafts,
    roi: totalCost > 0 ? (profit / totalCost) * 100 : 0,
  }
}

export function quoteAgeHours(timestamp, now = Date.now()) {
  const parsed = Date.parse(timestamp)
  if (!Number.isFinite(parsed) || parsed < Date.UTC(2000, 0, 1)) return null
  return Math.max(0, (now - parsed) / 3_600_000)
}
