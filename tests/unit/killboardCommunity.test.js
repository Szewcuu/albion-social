import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getKillboardCommunityUrl,
  parseKillboardCommunitySearch,
} from '../../src/lib/killboardCommunity.js'

test('rozpoznaje dokładny wynik gracza z właściwego regionu', () => {
  const html = '<div><a href="/us/player/XNetoX">XNetoX<span>player</span></a></div>'
  const player = parseKillboardCommunitySearch(html, 'xnetox', 'america')

  assert.equal(player?.name, 'XNetoX')
  assert.equal(player?.region, 'america')
  assert.equal(player?.partial, true)
  assert.equal(player?.externalUrl, 'https://killboard-1.com/us/player/XNetoX')
})

test('nie akceptuje podobnego nicku ani wyniku z innego regionu', () => {
  const html = [
    '<a href="/us/player/XNetoX2">XNetoX2</a>',
    '<a href="/eu/player/XNetoX">XNetoX</a>',
  ].join('')

  assert.equal(parseKillboardCommunitySearch(html, 'XNetoX', 'america'), null)
})

test('koduje nick w adresie profilu społecznościowego', () => {
  assert.equal(
    getKillboardCommunityUrl('Name With Space', 'asia'),
    'https://killboard-1.com/as/player/Name%20With%20Space',
  )
})
