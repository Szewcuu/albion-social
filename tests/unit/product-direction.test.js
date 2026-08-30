import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildProductDirectionSummary,
  isProductDirection,
  PRODUCT_TEST_MINIMUM_RESPONSES,
} from '../../src/lib/productDirection.js'

test('akceptuje wyłącznie trzy kierunki testu produktu', () => {
  assert.equal(isProductDirection('community'), true)
  assert.equal(isProductDirection('market'), true)
  assert.equal(isProductDirection('guild_tools'), true)
  assert.equal(isProductDirection('admin'), false)
  assert.equal(isProductDirection(null), false)
})

test('agreguje głosy bez fałszywego lidera przy remisie', () => {
  const summary = buildProductDirectionSummary({ community: 3, market: 3, guild_tools: 1 })
  assert.equal(summary.totalVotes, 7)
  assert.equal(summary.leader, null)
  assert.equal(summary.readyForReview, false)
  assert.equal(summary.results.find((result) => result.key === 'community').share, 3 / 7)
})

test('otwiera przegląd dopiero po minimalnej próbie', () => {
  const summary = buildProductDirectionSummary({
    community: PRODUCT_TEST_MINIMUM_RESPONSES - 2,
    market: 1,
    guild_tools: 1,
  })
  assert.equal(summary.totalVotes, PRODUCT_TEST_MINIMUM_RESPONSES)
  assert.equal(summary.readyForReview, true)
  assert.equal(summary.leader, 'community')
})
