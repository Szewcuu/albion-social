import assert from 'node:assert/strict'
import test from 'node:test'

import { formatBuildDiscordText } from '../../src/lib/buildCardGenerator.js'

test('formatBuildDiscordText poprawnie formatuje pełny build na Discorda', () => {
  const build = {
    title: 'Rycerz Avalonu',
    activity_type: 'PVP',
    budget: 'medium',
    authorName: 'Szewcuu',
    slots: {
      main_hand: { main: 'T6_2H_CLAYMORE@1', amount: 1 },
      armor: { main: 'T6_ARMOR_PLATE_SET1@1', amount: 1 },
      head: { main: 'T6_HEAD_PLATE_SET1@1', amount: 1 },
      shoes: { main: 'T6_SHOES_PLATE_SET1@1', amount: 1 },
      potion: { main: 'T7_POTION_HEAL', amount: 10 },
      food: { main: 'T7_MEAL_STEW@1', amount: 5 },
    },
    itemNames: {
      'T6_2H_CLAYMORE@1': 'Wielki Miecz',
      'T6_ARMOR_PLATE_SET1@1': 'Zbroja Żołnierza',
      'T6_HEAD_PLATE_SET1@1': 'Hełm Żołnierza',
      'T6_SHOES_PLATE_SET1@1': 'Buty Żołnierza',
      'T7_POTION_HEAL': 'Mikstura Zdrowia',
      'T7_MEAL_STEW@1': 'Gulasz Wołowy',
    },
    skillCombos: [
      { name: 'Otwarcie', description: 'W -> E -> Q' },
    ],
  }

  const result = formatBuildDiscordText(build, {
    url: 'https://albion-social.vercel.app/buildy/123',
    author: 'Szewcuu',
  })

  assert.ok(result.includes('⚔️ **Rycerz Avalonu** — PvP'))
  assert.ok(result.includes('👤 Autor: **Szewcuu**'))
  assert.ok(result.includes('🗡️ **Broń główna:** Wielki Miecz [T6.1]'))
  assert.ok(result.includes('🥋 **Zbroja:** Zbroja Żołnierza [T6.1]'))
  assert.ok(result.includes('🧪 **Mikstura:** Mikstura Zdrowia [T7.0] ×10'))
  assert.ok(result.includes('🥩 **Jedzenie:** Gulasz Wołowy [T7.1] ×5'))
  assert.ok(result.includes('⚡ **KOMBO / TAKTYKA:**'))
  assert.ok(result.includes('• **Otwarcie**: W -> E -> Q'))
  assert.ok(result.includes('https://albion-social.vercel.app/buildy/123'))
})

test('formatBuildDiscordText obsługuje pusty build i brakujące dane', () => {
  const emptyBuild = {
    title: '',
  }

  const result = formatBuildDiscordText(emptyBuild)

  assert.ok(result.includes('⚔️ **Doktryna bojowa**'))
  assert.ok(result.includes('*(Brak przypisanego ekwipunku)*'))
  assert.ok(!result.includes('KOMBO'))
})
