import assert from 'node:assert/strict'
import test from 'node:test'

import {
  decodeCreatedAtCursor,
  encodeCreatedAtCursor,
  pageFromRows,
} from '../../src/lib/server/pagination.js'

const validId = (value) => /^[0-9a-f-]{36}$/i.test(value)
const rows = [
  { id: '11111111-1111-4111-8111-111111111111', created_at: '2026-08-16T12:00:00.000Z' },
  { id: '22222222-2222-4222-8222-222222222222', created_at: '2026-08-16T11:00:00.000Z' },
  { id: '33333333-3333-4333-8333-333333333333', created_at: '2026-08-16T10:00:00.000Z' },
]

test('cursor round-trips created_at and id', () => {
  const cursor = encodeCreatedAtCursor(rows[0])
  assert.deepEqual(decodeCreatedAtCursor(cursor, validId), {
    createdAt: rows[0].created_at,
    id: rows[0].id,
  })
})

test('invalid cursors are rejected', () => {
  assert.equal(decodeCreatedAtCursor('not-base64', validId), undefined)
  const invalidId = Buffer.from(JSON.stringify({ createdAt: rows[0].created_at, id: 'bad' })).toString('base64url')
  assert.equal(decodeCreatedAtCursor(invalidId, validId), undefined)
})

test('pageFromRows trims lookahead and exposes the last visible row', () => {
  const result = pageFromRows(rows, 2)
  assert.equal(result.page.length, 2)
  assert.equal(result.hasMore, true)
  assert.deepEqual(decodeCreatedAtCursor(result.nextCursor, validId), {
    createdAt: rows[1].created_at,
    id: rows[1].id,
  })
})
