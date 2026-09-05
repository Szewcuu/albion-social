export const ACTIVITY_CATEGORIES = Object.freeze({
  all: {
    label: 'Wszystko',
    description: 'Cała aktywność portalu w jednym miejscu.',
    types: null,
  },
  replies: {
    label: 'Odpowiedzi',
    description: 'Komentarze i odpowiedzi pod Twoimi buildami.',
    types: ['build_comment', 'build_comment_reply'],
  },
  likes: {
    label: 'Polubienia',
    description: 'Gracze, którzy polubili Twoje doktryny.',
    types: ['build_like'],
  },
  expeditions: {
    label: 'Wyprawy',
    description: 'Zaproszenia, nowe zgłoszenia i gotowe składy.',
    types: ['expedition_invite', 'expedition_joined', 'expedition_full'],
  },
  market: {
    label: 'Handel',
    description: 'Oferty i nowe wiadomości handlowe.',
    types: ['market_message'],
  },
})

export const ACTIVITY_CATEGORY_IDS = Object.freeze(Object.keys(ACTIVITY_CATEGORIES))

export function parseActivityCategory(value) {
  return typeof value === 'string' && ACTIVITY_CATEGORIES[value] ? value : 'all'
}

export function categoryForNotification(notification = {}) {
  const type = String(notification.type || '').toLowerCase()
  const searchable = `${type} ${notification.title || ''} ${notification.message || ''}`.toLowerCase()

  if (ACTIVITY_CATEGORIES.replies.types.includes(type) || searchable.includes('komentarz')) return 'replies'
  if (ACTIVITY_CATEGORIES.likes.types.includes(type) || searchable.includes('polubi')) return 'likes'
  if (ACTIVITY_CATEGORIES.expeditions.types.includes(type) || searchable.includes('wypraw') || searchable.includes('skład')) return 'expeditions'
  if (ACTIVITY_CATEGORIES.market.types.includes(type) || searchable.includes('rynek') || searchable.includes('ofert')) return 'market'
  return 'other'
}

export function activityTypesForCategory(category) {
  return ACTIVITY_CATEGORIES[parseActivityCategory(category)].types
}
