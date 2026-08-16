const MAX_CURSOR_LENGTH = 512

export function encodeCreatedAtCursor(row) {
  if (!row?.created_at || !row?.id) return null
  return Buffer.from(JSON.stringify({ createdAt: row.created_at, id: row.id }), 'utf8').toString('base64url')
}

export function decodeCreatedAtCursor(value, isValidId = () => true) {
  if (!value) return null
  if (typeof value !== 'string' || value.length > MAX_CURSOR_LENGTH) return undefined

  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
    if (
      typeof parsed?.createdAt !== 'string'
      || Number.isNaN(Date.parse(parsed.createdAt))
      || typeof parsed?.id !== 'string'
      || !isValidId(parsed.id)
    ) return undefined

    return { createdAt: new Date(parsed.createdAt).toISOString(), id: parsed.id }
  } catch {
    return undefined
  }
}

export function applyCreatedAtCursor(query, cursor) {
  if (!cursor) return query
  return query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`)
}

export function pageFromRows(rows, pageSize) {
  const hasMore = rows.length > pageSize
  const page = hasMore ? rows.slice(0, pageSize) : rows
  return {
    page,
    hasMore,
    nextCursor: hasMore ? encodeCreatedAtCursor(page.at(-1)) : null,
  }
}
