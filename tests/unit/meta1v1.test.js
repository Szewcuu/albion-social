import assert from 'node:assert/strict'
import test from 'node:test'

import { buildObservedSoloMeta, canonicalWeaponId } from '../../src/lib/meta1v1.js'

const CATALOG = [
  { id: 'T8_MAIN_AXE', name: 'Topór bojowy' },
  { id: 'T8_MAIN_SWORD', name: 'Szeroki miecz' },
  { id: 'T8_HEAD_LEATHER_SET2', name: 'Kaptur łowcy' },
  { id: 'T8_ARMOR_LEATHER_SET3', name: 'Kurtka najemnika' },
  { id: 'T8_SHOES_PLATE_SET1', name: 'Buty żołnierza' },
  { id: 'T8_CAPE', name: 'Peleryna' },
]

function combatant(weapon, ip = 1_400) {
  return {
    AverageItemPower: ip,
    Equipment: {
      MainHand: { Type: weapon },
      Head: { Type: 'T8_HEAD_LEATHER_SET2' },
      Armor: { Type: 'T8_ARMOR_LEATHER_SET3' },
      Shoes: { Type: 'T8_SHOES_PLATE_SET1' },
      Cape: { Type: 'T8_CAPE' },
      OffHand: null,
    },
  }
}

function duel(id, winner = 'T6_MAIN_AXE@2', loser = 'T7_MAIN_SWORD') {
  return {
    EventId: id,
    numberOfParticipants: 1,
    groupMemberCount: 1,
    Killer: combatant(winner, 1_500),
    Victim: combatant(loser, 1_300),
  }
}

test('normalizuje tier i enchant broni do wspólnej rodziny T8', () => {
  assert.equal(canonicalWeaponId('T5_MAIN_AXE@3'), 'T8_MAIN_AXE')
  assert.equal(canonicalWeaponId('T8_2H_BOW'), 'T8_2H_BOW')
  assert.equal(canonicalWeaponId('T8_HEAD_LEATHER_SET2'), null)
})

test('buduje ranking wyłącznie z poprawnych, unikalnych pojedynków solo', () => {
  const groupKill = { ...duel(3), groupMemberCount: 2 }
  const result = buildObservedSoloMeta([
    { region: 'europe', events: [duel(1), duel(2), groupKill, duel(1)] },
  ], CATALOG, { minimumMatches: 1, priorMatches: 10 })

  assert.equal(result.stats.fetchedEvents, 3)
  assert.equal(result.stats.soloEvents, 2)
  assert.equal(result.stats.validDuels, 2)
  assert.equal(result.data.length, 2)

  const axe = result.data.find((weapon) => weapon.weaponId === 'T8_MAIN_AXE')
  assert.equal(axe.name, 'Topór bojowy')
  assert.equal(axe.matches, 2)
  assert.equal(axe.wins, 2)
  assert.equal(axe.losses, 0)
  assert.equal(axe.winrate, 100)
  assert.equal(axe.score, 58.3)
  assert.equal(axe.avgIp, 1_500)
  assert.equal(axe.bestBuild.headName, 'Kaptur łowcy')
  assert.deepEqual(axe.strongAgainst, ['Szeroki miecz'])
})

test('próba bazowa ogranicza zawyżanie tieru przez pojedyncze zwycięstwo', () => {
  const result = buildObservedSoloMeta([
    { region: 'america', events: [duel(10)] },
  ], CATALOG, { minimumMatches: 1, priorMatches: 10 })
  const axe = result.data.find((weapon) => weapon.weaponId === 'T8_MAIN_AXE')

  assert.equal(axe.winrate, 100)
  assert.equal(axe.score, 54.5)
  assert.equal(axe.tier, 'A')
  assert.equal(axe.confidence, 'niska')
})

test('odrzuca bronie poniżej jawnego minimum próby', () => {
  const result = buildObservedSoloMeta([
    { region: 'asia', events: [duel(20), duel(21)] },
  ], CATALOG, { minimumMatches: 3 })

  assert.deepEqual(result.data, [])
  assert.equal(result.stats.validDuels, 2)
})
