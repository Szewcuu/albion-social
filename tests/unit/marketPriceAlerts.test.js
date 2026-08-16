import assert from 'node:assert/strict'
import test from 'node:test'

import {
  alertConditionMet,
  buildPriceAlertMessage,
  hourlySampleTime,
  marketPriceKey,
  priceFromRow,
  shouldNotifyPriceAlert,
} from '../../src/lib/marketPriceAlerts.js'

test('buduje stabilny klucz kombinacji rynku', () => {
  assert.equal(marketPriceKey({ itemId: 'T4_BAG', region: 'europe', city: 'Caerleon', quality: 1, priceType: 'sell' }), 'T4_BAG:europe:Caerleon:1:sell')
})

test('zaokrągla czas próbki do pełnej godziny UTC', () => {
  assert.equal(hourlySampleTime('2026-08-16T12:47:33.123Z'), '2026-08-16T12:00:00.000Z')
})

test('wybiera właściwą stronę księgi zleceń', () => {
  const row = { sell_price_min: 1250, buy_price_max: 980 }
  assert.equal(priceFromRow(row, 'sell'), 1250)
  assert.equal(priceFromRow(row, 'buy'), 980)
  assert.equal(priceFromRow({ sell_price_min: 0 }, 'sell'), null)
})

test('ocenia progi poniżej i powyżej', () => {
  assert.equal(alertConditionMet({ direction: 'below', targetPrice: 1000 }, 900), true)
  assert.equal(alertConditionMet({ direction: 'below', targetPrice: 1000 }, 1100), false)
  assert.equal(alertConditionMet({ direction: 'above', targetPrice: 1000 }, 1100), true)
})

test('powiadamia tylko przy wejściu w warunek', () => {
  const alert = { direction: 'below', target_price: 1000, condition_met: false }
  assert.equal(shouldNotifyPriceAlert(alert, 900), true)
  assert.equal(shouldNotifyPriceAlert({ ...alert, condition_met: true }, 900), false)
})

test('buduje czytelne powiadomienie z kontekstem miasta', () => {
  const message = buildPriceAlertMessage({ direction: 'below', price_type: 'sell', item_name: 'Torba Adepta', city: 'Caerleon', target_price: 1000 }, 900)
  assert.match(message, /Torba Adepta/)
  assert.match(message, /Caerleon/)
  assert.match(message, /900/)
})
