import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getKillboardCommunityUrl,
} from '../../src/lib/killboardCommunity.js'

test('koduje nick w adresie profilu społecznościowego', () => {
  assert.equal(
    getKillboardCommunityUrl('Name With Space', 'asia'),
    'https://killboard-1.com/as/player/Name%20With%20Space',
  )
})

test('odrzuca nieobsługiwany region', () => {
  assert.equal(getKillboardCommunityUrl('XNetoX', 'unknown'), null)
})
