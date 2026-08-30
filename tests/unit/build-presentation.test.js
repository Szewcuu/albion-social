import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildSquadShareUrl,
  getBudgetLabel,
  getBuildLabel,
  normalizeSquadBuild,
  restoreSquadFromSearch,
} from '../../src/lib/buildPresentation.js'

const ROWS = [
  {
    id: 'build-1',
    title: 'Młot frontowy',
    description: 'Tank',
    profiles: { username: 'Kowal' },
    build_data: {
      budget: 'medium',
      tags: { locations: [], zones: [], sizes: [], roles: ['Tank'], activities: ['PvP'] },
    },
  },
  {
    id: 'build-2',
    title: 'Święty kostur',
    description: 'Healer',
    profiles: { username: 'Uzdrowiciel' },
    build_data: {
      tags: { locations: [], zones: [], sizes: [], roles: ['Healer'], activities: ['PvE Farm'] },
    },
  },
]

test('normalizuje rekord planera bez utraty identyfikatora, nazwy, roli i autora', () => {
  const build = normalizeSquadBuild(ROWS[0])
  assert.equal(build.id, 'build-1')
  assert.equal(build.title, 'Młot frontowy')
  assert.equal(build.role, 'Tank')
  assert.equal(build.profiles.username, 'Kowal')
})

test('odtwarza udostępniony skład we właściwych slotach', () => {
  const builds = ROWS.map(normalizeSquadBuild)
  const restored = restoreSquadFromSearch('?squad=build-1,,build-2&name=Sk%C5%82ad%20testowy', builds)
  assert.equal(restored.name, 'Skład testowy')
  assert.equal(restored.squad[0].id, 'build-1')
  assert.equal(restored.squad[1], null)
  assert.equal(restored.squad[2].id, 'build-2')
  assert.equal(restored.squad.length, 5)
})

test('buduje bezpieczny link planera i lokalizuje etykiety buildu', () => {
  const builds = ROWS.map(normalizeSquadBuild)
  const url = new URL(buildSquadShareUrl('https://albion.example', [builds[0], null], 'Bomb Squad'))
  assert.equal(url.searchParams.get('squad'), 'build-1,')
  assert.equal(url.searchParams.get('name'), 'Bomb Squad')
  assert.equal(getBuildLabel('EXPLORATION'), 'Eksploracja')
  assert.equal(getBuildLabel('STATIC_DUNGEON'), 'Statyk')
  assert.equal(getBudgetLabel('medium'), 'Średni budżet (<2M)')
})

test('odtwarza duży skład i zachowuje rozmiar w linku', () => {
  const builds = ROWS.map(normalizeSquadBuild)
  const restored = restoreSquadFromSearch('?size=20&squad=build-1,build-2', builds)
  assert.equal(restored.slotCount, 20)
  assert.equal(restored.squad.length, 20)
  assert.equal(restored.squad[1].id, 'build-2')

  const url = new URL(buildSquadShareUrl('https://albion.example', restored.squad, 'ZvZ', 20))
  assert.equal(url.searchParams.get('size'), '20')
})
