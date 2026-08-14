import { getLocalPreference, savePortalPreference } from '@/lib/preferenceSync'

export function getFollowedItems() {
  return getLocalPreference('follows')
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

  void savePortalPreference('follows', updated)

  return !exists
}
