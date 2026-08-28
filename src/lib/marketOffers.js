export const MARKET_OFFER_LIFETIME_DAYS = 7
export const MARKET_OFFER_LIFETIME_MS = MARKET_OFFER_LIFETIME_DAYS * 24 * 60 * 60 * 1000

export function marketOfferExpiresAt(createdAt) {
  const created = new Date(createdAt).getTime()
  if (!Number.isFinite(created)) return null
  return new Date(created + MARKET_OFFER_LIFETIME_MS)
}

export function isMarketOfferExpired(createdAt, now = Date.now()) {
  const expiresAt = marketOfferExpiresAt(createdAt)
  return !expiresAt || expiresAt.getTime() <= new Date(now).getTime()
}

export function marketOfferDaysRemaining(createdAt, now = Date.now()) {
  const expiresAt = marketOfferExpiresAt(createdAt)
  if (!expiresAt) return 0
  return Math.max(0, Math.ceil((expiresAt.getTime() - new Date(now).getTime()) / (24 * 60 * 60 * 1000)))
}

export function marketOfferCutoff(now = Date.now()) {
  return new Date(new Date(now).getTime() - MARKET_OFFER_LIFETIME_MS).toISOString()
}
