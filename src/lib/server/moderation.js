import 'server-only'

export const MODERATION_TARGETS = {
  chat_message: {
    table: 'chat_messages',
    select: 'id, user_id, username, text, status, created_at',
    title: (row) => row.username || 'Wiadomość czatu',
    summary: (row) => row.text || '',
  },
  build: {
    table: 'builds',
    select: 'id, user_id, title, description, status, created_at',
    title: (row) => row.title || 'Build bez nazwy',
    summary: (row) => row.description || '',
  },
  market_item: {
    table: 'market_items',
    select: 'id, user_id, title, item_name, price, city, status, created_at',
    title: (row) => row.title || row.item_name || 'Oferta rynku',
    summary: (row) => [row.item_name, row.city, row.price != null ? `${row.price} silver` : ''].filter(Boolean).join(' • '),
  },
  guild: {
    table: 'guilds',
    select: 'id, user_id, name, description, server, status, created_at',
    title: (row) => row.name || 'Gildia bez nazwy',
    summary: (row) => [row.server, row.description].filter(Boolean).join(' • '),
  },
  expedition: {
    table: 'expeditions',
    select: 'id, user_id, title, activity_type, start_time, server, status, created_at',
    title: (row) => row.title || 'Wyprawa bez nazwy',
    summary: (row) => [row.activity_type, row.server, row.start_time].filter(Boolean).join(' • '),
  },
  build_comment: {
    table: 'build_comments',
    select: 'id, user_id, build_id, content, status, created_at',
    title: () => 'Komentarz pod buildem',
    summary: (row) => row.content || '',
  },
}

export const MODERATION_ACTIONS = ['hide', 'restore', 'remove']
export const MODERATION_STATUSES = ['visible', 'hidden', 'removed']

export function isModerationId(value) {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function toModerationDto(type, row) {
  const config = MODERATION_TARGETS[type]
  return {
    id: row.id,
    type,
    ownerId: row.user_id || null,
    status: row.status || 'visible',
    title: config.title(row),
    summary: config.summary(row).slice(0, 500),
    createdAt: row.created_at,
    buildId: row.build_id || null,
  }
}
