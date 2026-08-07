/**
 * Moduł przeliczania Item Power (IP) oraz szacowania statystyk bojowych w Albion Online
 */

export const QUALITY_OPTIONS = [
  { value: 1, label: 'Zwyczajna (Normal)', bonusIp: 0 },
  { value: 2, label: 'Dobra (Good)', bonusIp: 20 },
  { value: 3, label: 'Wybitna (Outstanding)', bonusIp: 40 },
  { value: 4, label: 'Znakomita (Excellent)', bonusIp: 60 },
  { value: 5, label: 'Arcydzieło (Masterpiece)', bonusIp: 100 },
]

/**
 * Wyciąga Tier, Enchantment i przelicza bazowe Item Power z identyfikatora przedmiotu
 */
export function parseItemTierAndEnchant(itemId) {
  if (!itemId || typeof itemId !== 'string') {
    return { tier: 4, enchant: 0, isEquipment: false }
  }

  const cleanId = itemId.toUpperCase().trim()
  const tierMatch = cleanId.match(/^T([4-8])_/)
  const enchantMatch = cleanId.match(/@([1-4])$/)

  const tier = tierMatch ? parseInt(tierMatch[1], 10) : 4
  const enchant = enchantMatch ? parseInt(enchantMatch[1], 10) : 0

  return { tier, enchant, isEquipment: true }
}

/**
 * Wylicza Item Power pojedynczego przedmiotu
 */
export function getItemPower(itemId, quality = 1, specBonus = 0) {
  if (!itemId) return 0

  const { tier, enchant } = parseItemTierAndEnchant(itemId)
  
  // Bazowy IP: T4 = 700, T5 = 800, T6 = 900, T7 = 1000, T8 = 1100
  const baseIp = 300 + (tier * 100)
  
  // Oczarowanie (Enchantment @1..@4): +100 IP na stopień
  const enchantIp = enchant * 100

  // Jakość (Quality 1..5)
  const qualityObj = QUALITY_OPTIONS.find(q => q.value === Number(quality)) || QUALITY_OPTIONS[0]
  const qualityIp = qualityObj.bonusIp

  // Specjalizacja (Spec Bonus 0..240 IP)
  const specIp = Math.max(0, Math.min(240, Number(specBonus) || 0))

  return baseIp + enchantIp + qualityIp + specIp
}

/**
 * Przypisuje rangę i kolor na podstawie końcowego Item Power (IP)
 */
export function getIpRank(avgIp) {
  if (avgIp >= 1500) return { label: 'T8.4 Legendarny', color: 'text-amber-300 border-amber-500/50 bg-amber-950/40' }
  if (avgIp >= 1350) return { label: 'Mistrzowski (ZvZ / HCE)', color: 'text-purple-300 border-purple-500/50 bg-purple-950/40' }
  if (avgIp >= 1150) return { label: 'Zaawansowany (PvP / Roaming)', color: 'text-sky-300 border-sky-500/50 bg-sky-950/40' }
  if (avgIp >= 900)  return { label: 'Średni (Dungeony / Solo)', color: 'text-emerald-300 border-emerald-500/50 bg-emerald-950/40' }
  return { label: 'Podstawowy (Budget / T4)', color: 'text-gray-400 border-gray-700 bg-gray-900/40' }
}

/**
 * Główny kalkulator statystyk całego zestawu
 */
export function calculateBuildStats(slots = {}, quality = 1, specBonus = 0) {
  const gearSlots = ['main_hand', 'off_hand', 'head', 'armor', 'shoes', 'cape']
  const slotIps = {}
  let totalIpSum = 0
  let activeSlotsCount = 0

  gearSlots.forEach((key) => {
    const itemId = slots[key]?.main
    if (itemId) {
      const ip = getItemPower(itemId, quality, specBonus)
      slotIps[key] = ip
      totalIpSum += ip
      activeSlotsCount++
    } else {
      slotIps[key] = 0
    }
  })

  // Średnie IP zestawu
  const avgIp = activeSlotsCount > 0 ? Math.round(totalIpSum / activeSlotsCount) : 0

  // Wykrywanie typu zbroi (Cloth / Leather / Plate)
  const armorItemId = (slots.armor?.main || '').toUpperCase()
  let armorType = 'Leather' // domyślnie zrównoważony
  if (armorItemId.includes('CLOTH')) armorType = 'Cloth'
  if (armorItemId.includes('PLATE')) armorType = 'Plate'

  // Estymacje statystyk bojowych
  const maxHp = avgIp > 0 ? Math.round(2100 + (avgIp * 1.48)) : 0
  const maxEnergy = avgIp > 0 ? Math.round(900 + (avgIp * 0.16)) : 0
  const damageBonusPercent = avgIp > 0 ? Math.max(0, Math.round(((avgIp - 700) * 0.085) * 10) / 10) : 0

  let armorResist = 0
  let magicResist = 0

  if (avgIp > 0) {
    if (armorType === 'Plate') {
      armorResist = Math.round(180 + (avgIp * 0.16))
      magicResist = Math.round(130 + (avgIp * 0.12))
    } else if (armorType === 'Cloth') {
      armorResist = Math.round(100 + (avgIp * 0.10))
      magicResist = Math.round(180 + (avgIp * 0.17))
    } else {
      armorResist = Math.round(140 + (avgIp * 0.14))
      magicResist = Math.round(140 + (avgIp * 0.14))
    }
  }

  const rank = getIpRank(avgIp)

  return {
    avgIp,
    slotIps,
    activeSlotsCount,
    armorType,
    maxHp,
    maxEnergy,
    damageBonusPercent,
    armorResist,
    magicResist,
    rank,
  }
}
