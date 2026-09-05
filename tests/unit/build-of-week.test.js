import assert from 'node:assert/strict'
import test from 'node:test'

import { getUtcWeekWindow, rankWeeklyBuilds } from '../../src/lib/buildOfWeek.js'

test('wyznacza tydzień od poniedziałku do poniedziałku w UTC', () => {
  const week = getUtcWeekWindow('2026-09-05T23:59:59.000Z')
  assert.deepEqual(week, {
    weekStart: '2026-08-31',
    startsAt: '2026-08-31T00:00:00.000Z',
    endsAt: '2026-09-07T00:00:00.000Z',
  })
})

test('nowy tydzień rozpoczyna się dokładnie o północy UTC', () => {
  assert.equal(getUtcWeekWindow('2026-09-07T00:00:00.000Z').weekStart, '2026-09-07')
})

test('ranking najpierw uwzględnia głosy tygodniowe, potem polubienia i świeżość', () => {
  const builds = [
    { id: 'a', created_at: '2026-09-01T10:00:00.000Z', build_votes: [{ vote_type: 'up' }, { vote_type: 'up' }] },
    { id: 'b', created_at: '2026-09-02T10:00:00.000Z', build_votes: [] },
    { id: 'c', created_at: '2026-09-03T10:00:00.000Z', build_votes: [{ vote_type: 'up' }] },
    { id: 'd', created_at: '2026-09-04T10:00:00.000Z', build_votes: [] },
  ]
  const votes = [
    { build_id: 'b' },
    { build_id: 'b' },
    { build_id: 'c' },
  ]

  const ranked = rankWeeklyBuilds(builds, votes, 3)
  assert.deepEqual(ranked.map((build) => build.id), ['b', 'c', 'a'])
  assert.deepEqual(ranked.map((build) => build.weekly_votes_count), [2, 1, 0])
  assert.deepEqual(ranked.map((build) => build.likes_count), [0, 1, 2])
})
