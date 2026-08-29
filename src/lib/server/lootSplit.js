import 'server-only'

import { randomUUID } from 'node:crypto'

function cleanString(value, maxLength) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function cleanNumberString(value, fallback = '', maximum = 999_999_999_999) {
  const normalized = String(value ?? fallback)
  if (!/^\d{0,12}(?:\.\d{0,2})?$/.test(normalized)) return fallback
  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= maximum ? normalized : fallback
}

export function normalizeLootSplitPayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Nieprawidłowy format rozliczenia.')

  const regearList = Array.isArray(value.regearList) ? value.regearList.slice(0, 50).map((item) => ({
    id: cleanString(item?.id, 80) || randomUUID(),
    nick: cleanString(item?.nick, 80),
    amount: Math.floor(Math.min(10_000_000_000, Math.max(0, Number(item?.amount) || 0))),
  })).filter((item) => item.nick && item.amount > 0) : []

  return {
    eventName: cleanString(value.eventName, 100),
    totalValue: cleanNumberString(value.totalValue),
    guildTaxPercent: cleanNumberString(value.guildTaxPercent, '10', 100),
    playerNicks: typeof value.playerNicks === 'string' ? value.playerNicks.slice(0, 5000) : '',
    regearList,
    savedAt: typeof value.savedAt === 'string' ? value.savedAt : new Date().toISOString(),
  }
}
