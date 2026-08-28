import assert from 'node:assert/strict'
import test from 'node:test'

import {
  isMarketOfferExpired,
  marketOfferCutoff,
  marketOfferDaysRemaining,
  marketOfferExpiresAt,
} from '../../src/lib/marketOffers.js'

const NOW = '2026-08-28T12:00:00.000Z'

test('market offer expires exactly seven days after publication', () => {
  assert.equal(marketOfferExpiresAt('2026-08-21T12:00:00.000Z').toISOString(), NOW)
  assert.equal(isMarketOfferExpired('2026-08-21T12:00:00.000Z', NOW), true)
  assert.equal(isMarketOfferExpired('2026-08-21T12:00:00.001Z', NOW), false)
})

test('remaining days use a player-friendly ceiling and never become negative', () => {
  assert.equal(marketOfferDaysRemaining('2026-08-28T11:59:00.000Z', NOW), 7)
  assert.equal(marketOfferDaysRemaining('2026-08-21T11:59:59.000Z', NOW), 0)
  assert.equal(marketOfferDaysRemaining('invalid', NOW), 0)
})

test('active query cutoff is stable for a supplied clock', () => {
  assert.equal(marketOfferCutoff(NOW), '2026-08-21T12:00:00.000Z')
})
