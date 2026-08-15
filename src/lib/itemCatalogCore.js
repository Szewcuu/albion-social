export const ITEM_CATEGORIES = [
  'weapons',
  'offhands',
  'heads',
  'armors',
  'shoes',
  'bags',
  'capes',
  'mounts',
  'potions',
  'foods',
  'resources',
  'other',
]

export function getItemCategory(id) {
  if (/_TOOL_/.test(id)) return 'other'
  if (/_OFF_/.test(id) || /^T\d+_OFF_/.test(id)) return 'offhands'
  if (/_MAIN_|_2H_/.test(id)) return 'weapons'
  if (/_HEAD_/.test(id)) return 'heads'
  if (/_ARMOR_/.test(id)) return 'armors'
  if (/_SHOES_/.test(id)) return 'shoes'
  if (/_BAG(?:_|$)/.test(id)) return 'bags'
  if (/_CAPE(?:ITEM)?(?:_|$)/.test(id)) return 'capes'
  if (/_MOUNT_/.test(id)) return 'mounts'
  if (/_POTION_/.test(id)) return 'potions'
  if (/_MEAL_/.test(id)) return 'foods'
  if (/_(ORE|WOOD|HIDE|FIBER|ROCK|PLANKS|METALBAR|LEATHER|CLOTH|STONEBLOCK)(?:_|$)/.test(id)) return 'resources'
  return 'other'
}

export function normalizeCatalogEntry(entry) {
  const id = typeof entry?.UniqueName === 'string' ? entry.UniqueName.trim() : ''
  if (!/^T[1-8]_/.test(id) || id.includes('@')) return null

  const localizedNames = entry?.LocalizedNames && typeof entry.LocalizedNames === 'object'
    ? entry.LocalizedNames
    : {}
  const namePl = typeof localizedNames['PL-PL'] === 'string' ? localizedNames['PL-PL'].trim() : ''
  const nameEn = typeof localizedNames['EN-US'] === 'string' ? localizedNames['EN-US'].trim() : ''
  const name = namePl || nameEn
  if (!name) return null

  return {
    id,
    name,
    nameEn: nameEn || name,
    category: getItemCategory(id),
  }
}

export function normalizeCatalogEntries(entries) {
  if (!Array.isArray(entries)) throw new TypeError('Katalog źródłowy nie jest tablicą.')

  const byId = new Map()
  for (const entry of entries) {
    const item = normalizeCatalogEntry(entry)
    if (item && !byId.has(item.id)) byId.set(item.id, item)
  }

  return [...byId.values()].sort((first, second) => first.id.localeCompare(second.id, 'en'))
}

export function validateCatalogSnapshot(snapshot, { minimumItems = 1_000 } = {}) {
  const errors = []
  if (snapshot?.schemaVersion !== 1) errors.push('Nieobsługiwana wersja schematu snapshotu.')
  if (!snapshot?.catalogSha256 || !/^[0-9a-f]{64}$/i.test(snapshot.catalogSha256)) errors.push('Brak prawidłowego hasha katalogu.')
  if (!snapshot?.source?.commit || !/^[0-9a-f]{40}$/i.test(snapshot.source.commit)) errors.push('Brak prawidłowego commita źródłowego.')
  if (!snapshot?.source?.contentSha256 || !/^[0-9a-f]{64}$/i.test(snapshot.source.contentSha256)) errors.push('Brak prawidłowego hasha źródła.')
  if (!Array.isArray(snapshot?.items) || snapshot.items.length < minimumItems) errors.push(`Katalog zawiera mniej niż ${minimumItems} przedmiotów.`)
  if (snapshot?.itemCount !== snapshot?.items?.length) errors.push('itemCount nie zgadza się z liczbą rekordów.')

  const ids = new Set()
  for (const item of snapshot?.items || []) {
    if (!item?.id || !item?.name || !item?.nameEn || !ITEM_CATEGORIES.includes(item?.category)) {
      errors.push(`Nieprawidłowy rekord katalogu: ${item?.id || 'bez ID'}.`)
      break
    }
    if (ids.has(item.id)) {
      errors.push(`Zduplikowany identyfikator: ${item.id}.`)
      break
    }
    ids.add(item.id)
  }

  return errors
}
