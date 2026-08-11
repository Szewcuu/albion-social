const FOLLOWS_KEY = 'aopp-followed-items-v1'

export function getFollowedItems() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(FOLLOWS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function isFollowingItem(id, type = 'guild') {
  const items = getFollowedItems()
  return items.some(item => item.id === id && item.type === type)
}

export function toggleFollowItem(item) {
  if (typeof window === 'undefined') return false
  const items = getFollowedItems()
  const exists = items.some(i => i.id === item.id && i.type === item.type)

  let updated = []
  if (exists) {
    updated = items.filter(i => !(i.id === item.id && i.type === item.type))
  } else {
    updated = [...items, { ...item, followedAt: new Date().toISOString() }]
  }

  try {
    localStorage.setItem(FOLLOWS_KEY, JSON.stringify(updated))
  } catch (err) {
    console.error('Błąd zapisu obserwowanych:', err)
  }

  return !exists
}
