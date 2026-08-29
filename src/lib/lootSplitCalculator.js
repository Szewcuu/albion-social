export const MAX_LOOT_SPLIT_PLAYERS = 100

export function toSilver(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0
}

export function parseLootSplitPlayers(value, limit = MAX_LOOT_SPLIT_PLAYERS) {
  const seen = new Set()
  return String(value || '')
    .split(/[\n,;]+/)
    .map((entry) => entry.trim())
    .filter((entry) => {
      if (!entry) return false
      const key = entry.toLocaleLowerCase('pl')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, limit)
}

export function calculateLootSplit({ totalValue, guildTaxPercent, playerNicks, regearList = [] }) {
  const totalLoot = toSilver(totalValue)
  const taxPercent = Math.min(100, Math.max(0, Number(guildTaxPercent) || 0))
  const guildTaxAmount = Math.round(totalLoot * taxPercent / 100)
  const afterTax = Math.max(0, totalLoot - guildTaxAmount)
  const players = parseLootSplitPlayers(playerNicks)
  const totalRegearCost = regearList.reduce((sum, item) => sum + toSilver(item?.amount), 0)
  const distributable = Math.max(0, afterTax - totalRegearCost)
  const deficit = Math.max(0, totalRegearCost - afterTax)
  const basePayout = players.length ? Math.floor(distributable / players.length) : 0
  const roundingRemainder = players.length ? distributable - (basePayout * players.length) : distributable

  const payoutRows = players.map((nick) => {
    const reimbursement = regearList
      .filter((item) => String(item?.nick || '').toLocaleLowerCase('pl') === nick.toLocaleLowerCase('pl'))
      .reduce((sum, item) => sum + toSilver(item?.amount), 0)
    return { nick, basePayout, reimbursement, total: basePayout + reimbursement }
  })

  const playerKeys = new Set(players.map((nick) => nick.toLocaleLowerCase('pl')))
  const unassignedRegears = regearList.filter((item) => !playerKeys.has(String(item?.nick || '').toLocaleLowerCase('pl')))

  return {
    totalLoot,
    taxPercent,
    guildTaxAmount,
    afterTax,
    players,
    totalRegearCost,
    distributable,
    deficit,
    basePayout,
    roundingRemainder,
    payoutRows,
    unassignedRegears,
  }
}

export function canFinalizeLootSplit(calculation) {
  return Boolean(
    calculation?.totalLoot
    && calculation?.players?.length
    && calculation.deficit === 0
    && calculation.unassignedRegears?.length === 0,
  )
}
