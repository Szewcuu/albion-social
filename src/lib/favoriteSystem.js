const FAVORITES_KEY = 'aopp-favorites-v1'

export function getFavoriteItems() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function isItemFavorite(id, type = 'build') {
  const favorites = getFavoriteItems()
  return favorites.some(item => item.id === id && item.type === type)
}

export function toggleFavoriteItem(item) {
  if (typeof window === 'undefined') return false
  const favorites = getFavoriteItems()
  const exists = favorites.some(i => i.id === item.id && i.type === item.type)

  let updated = []
  if (exists) {
    updated = favorites.filter(i => !(i.id === item.id && i.type === item.type))
  } else {
    updated = [...favorites, { ...item, savedAt: new Date().toISOString() }]
  }

  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated))
  } catch (err) {
    console.error('Błąd zapisu ulubionych:', err)
  }

  return !exists
}
