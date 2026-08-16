export function marketPriceKey({ itemId, item_id, region, city, quality, priceType, price_type }) {
  return [itemId || item_id, region, city, Number(quality), priceType || price_type].join(':')
}

export function hourlySampleTime(value = new Date()) {
  const date = value instanceof Date ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) throw new TypeError('Nieprawidłowa data próbki.')
  date.setUTCMinutes(0, 0, 0)
  return date.toISOString()
}

export function priceFromRow(row, priceType) {
  const value = Number(priceType === 'buy' ? row?.buy_price_max : row?.sell_price_min)
  return Number.isSafeInteger(value) && value > 0 ? value : null
}

export function alertConditionMet({ direction, targetPrice, target_price }, observedPrice) {
  const target = Number(targetPrice ?? target_price)
  const observed = Number(observedPrice)
  if (!Number.isSafeInteger(target) || target <= 0 || !Number.isSafeInteger(observed) || observed <= 0) return false
  return direction === 'above' ? observed >= target : direction === 'below' ? observed <= target : false
}

export function shouldNotifyPriceAlert(alert, observedPrice) {
  return alertConditionMet(alert, observedPrice) && alert.condition_met !== true
}

export function buildPriceAlertMessage(alert, observedPrice) {
  const comparison = alert.direction === 'above' ? 'osiągnęła lub przekroczyła' : 'spadła do lub poniżej'
  const type = alert.price_type === 'buy' ? 'Najwyższa oferta kupna' : 'Najniższa oferta sprzedaży'
  return `${type} dla „${alert.item_name}” w ${alert.city} ${comparison} próg ${Number(alert.target_price).toLocaleString('pl-PL')} Silver. Aktualny skan: ${Number(observedPrice).toLocaleString('pl-PL')} Silver.`
}
