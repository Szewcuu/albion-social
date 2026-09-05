import assert from 'node:assert/strict'
import test from 'node:test'

import { parseProfileCard } from '../../src/lib/profilePreferences.js'

const validCard = {
  ingameNick: ' Szewcu ',
  mainServer: 'Europa',
  guildName: ' Gildia ',
  mainRole: 'DPS',
  avgIp: 1450,
  bio: ' Walczę toporem. ',
  favoriteBuildsPublic: true,
  favoriteRoles: ['DPS', 'Support'],
  featuredBuildIds: ['53dd35a0-1234-4123-8123-123456789abc'],
}

test('normalizuje bezpieczny zapis publicznej karty', () => {
  const parsed = parseProfileCard(validCard)
  assert.equal(parsed.error, undefined)
  assert.deepEqual(parsed.value.favoriteRoles, ['DPS', 'Support'])
  assert.equal(parsed.value.ingameNick, 'Szewcu')
  assert.equal(parsed.value.guildName, 'Gildia')
})

test('odrzuca role spoza słownika', () => {
  assert.match(parseProfileCard({ ...validCard, favoriteRoles: ['Crafter'] }).error, /ról/)
})

test('odrzuca więcej niż trzy wyróżnione buildy', () => {
  const ids = [1, 2, 3, 4].map((value) => `53dd35a${value}-1234-4123-8123-123456789abc`)
  assert.match(parseProfileCard({ ...validCard, featuredBuildIds: ids }).error, /maksymalnie 3/)
})

test('usuwa duplikaty wyborów', () => {
  const parsed = parseProfileCard({
    ...validCard,
    favoriteRoles: ['DPS', 'DPS'],
    featuredBuildIds: [validCard.featuredBuildIds[0], validCard.featuredBuildIds[0]],
  })
  assert.deepEqual(parsed.value.favoriteRoles, ['DPS'])
  assert.deepEqual(parsed.value.featuredBuildIds, validCard.featuredBuildIds)
})
