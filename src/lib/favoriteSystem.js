import { getLocalPreference, savePortalPreference } from '@/lib/preferenceSync'

export function getFavoriteItems() {
  return getLocalPreference('favorites')
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

  void savePortalPreference('favorites', updated)

  return !exists
}
