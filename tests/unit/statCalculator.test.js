import assert from 'node:assert/strict'
import test from 'node:test'

import { calculateBuildStats, detectArchetype, getItemPower, parseItemTierAndEnchant } from '../../src/lib/statCalculator.js'

test('parseItemTierAndEnchant poprawnie wyodrębnia tier i enchant', () => {
  assert.deepEqual(parseItemTierAndEnchant('T6_MAIN_SWORD@2'), { tier: 6, enchant: 2, isEquipment: true })
  assert.deepEqual(parseItemTierAndEnchant('T8_ARMOR_PLATE_SET1@4'), { tier: 8, enchant: 4, isEquipment: true })
  assert.deepEqual(parseItemTierAndEnchant(''), { tier: 4, enchant: 0, isEquipment: false })
})

test('getItemPower poprawnie uwzględnia jakość i specjalizację', () => {
  // T4.0 Normal: 700 IP
  assert.equal(getItemPower('T4_MAIN_SWORD', 1, 0), 700)
  // T4.0 Masterpiece (+100) + 120 Spec: 700 + 100 + 120 = 920
  assert.equal(getItemPower('T4_MAIN_SWORD', 5, 120), 920)
  // T8.3 Normal: 1100 + 300 = 1400 IP
  assert.equal(getItemPower('T8_MAIN_SWORD@3', 1, 0), 1400)
})

test('calculateBuildStats wylicza redukcję obrażeń, odporności i CC', () => {
  const plateSlots = {
    main_hand: { main: 'T8_MAIN_MACE' },
    off_hand: { main: 'T8_OFF_SHIELD' },
    armor: { main: 'T8_ARMOR_PLATE_SET1' },
    head: { main: 'T8_HEAD_PLATE_SET1' },
    shoes: { main: 'T8_SHOES_PLATE_SET1' },
    cape: { main: 'T8_CAPE' },
  }

  const stats = calculateBuildStats(plateSlots, 1, 0)
  assert.equal(stats.avgIp, 1100)
  assert.equal(stats.armorType, 'Plate')
  assert.ok(stats.maxHp > 3500)
  assert.ok(stats.armorResist > 300)
  assert.ok(stats.physicalMitigation > 70) // >70% redukcji
  assert.ok(stats.magicMitigation > 65) // >65% redukcji
  assert.equal(stats.threatBonusPercent, 300)
  assert.ok(stats.ccResistance > 200)
  assert.ok(stats.ccDurationReduction > 65)
  assert.equal(stats.archetype.label, 'Inicjator / Tank')
})

test('detectArchetype poprawnie rozpoznaje kluczowe archetypy broni', () => {
  assert.equal(detectArchetype({ main_hand: { main: 'T8_MAIN_HOLYSTAFF' }, armor: { main: 'T8_ARMOR_CLOTH_SET1' } }).label, 'Uzdrowiciel (Healer)')
  assert.equal(detectArchetype({ main_hand: { main: 'T8_MAIN_CURSEDSTAFF' }, armor: { main: 'T8_ARMOR_CLOTH_SET1' } }).label, 'Mag Bojowy (Caster / Nuker)')
  assert.equal(detectArchetype({ main_hand: { main: 'T8_MAIN_DAGGER' }, armor: { main: 'T8_ARMOR_LEATHER_SET1' } }).label, 'Skrytobójca (Assassin)')
  assert.equal(detectArchetype({ main_hand: { main: 'T8_2H_BOW' }, armor: { main: 'T8_ARMOR_LEATHER_SET1' } }).label, 'Strzelec (Ranger / Marksman)')
})
