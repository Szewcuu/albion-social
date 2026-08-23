import assert from 'node:assert/strict'
import test from 'node:test'

import { sanitizeBuildForPublishing } from '../../src/lib/buildPublishing.js'
import { createEmptyBuild } from '../../src/lib/buildSlots.js'

function validBuild() {
  const build = createEmptyBuild()
  build.title = 'Bezpieczny build'
  build.budget = 'medium'
  build.tags = {
    locations: ['Mists'],
    zones: ['Strefa Czarna'],
    sizes: ['Solo'],
    roles: ['DPS'],
    activities: ['PvP'],
  }
  build.slots.main_hand.main = 'T8_MAIN_SWORD@2'
  return build
}

test('sanityzuje publikowany build i zachowuje enchant', () => {
  const build = validBuild()
  build.user_id = 'podszyty-uzytkownik'
  build.youtubeVideos = ['https://youtu.be/example', 'https://evil.example/video']
  build.slots.main_hand.alternatives = ['T7_MAIN_SWORD@1', '<script>']

  const sanitized = sanitizeBuildForPublishing(build)
  assert.equal(sanitized.slots.main_hand.main, 'T8_MAIN_SWORD@2')
  assert.deepEqual(sanitized.slots.main_hand.alternatives, ['T7_MAIN_SWORD@1'])
  assert.deepEqual(sanitized.youtubeVideos, ['https://youtu.be/example'])
  assert.equal('user_id' in sanitized, false)
})

test('odrzuca build bez wymaganych tagów, budżetu lub przedmiotu', () => {
  const build = validBuild()
  build.tags.roles = []
  assert.equal(sanitizeBuildForPublishing(build), null)

  const empty = validBuild()
  empty.slots.main_hand.main = ''
  assert.equal(sanitizeBuildForPublishing(empty), null)
})
