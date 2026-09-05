import assert from 'node:assert/strict'
import test from 'node:test'

import {
  activityTypesForCategory,
  categoryForNotification,
  parseActivityCategory,
} from '../../src/lib/activityCenter.js'

test('normalizuje nieznaną kategorię do pełnego dziennika', () => {
  assert.equal(parseActivityCategory('likes'), 'likes')
  assert.equal(parseActivityCategory('unknown'), 'all')
  assert.equal(parseActivityCategory(null), 'all')
  assert.equal(activityTypesForCategory('all'), null)
})

test('przypisuje podstawowe rodzaje aktywności do właściwych sekcji', () => {
  assert.equal(categoryForNotification({ type: 'build_comment_reply' }), 'replies')
  assert.equal(categoryForNotification({ type: 'build_like' }), 'likes')
  assert.equal(categoryForNotification({ type: 'expedition_invite' }), 'expeditions')
  assert.equal(categoryForNotification({ type: 'market_message' }), 'market')
  assert.equal(categoryForNotification({ type: 'system_alert' }), 'other')
})

test('rozpoznaje starsze powiadomienia po treści', () => {
  assert.equal(categoryForNotification({ type: 'info', title: 'Skład skompletowany!' }), 'expeditions')
  assert.equal(categoryForNotification({ type: 'info', message: 'Nowa oferta na rynku' }), 'market')
  assert.equal(categoryForNotification({ type: 'info', title: 'Nowy komentarz' }), 'replies')
})
