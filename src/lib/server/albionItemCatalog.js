import 'server-only'
import snapshot from '@/data/albion-items.snapshot.json'
import { ITEM_CATEGORIES } from '@/lib/itemCatalogCore'

export { ITEM_CATEGORIES }

const CATALOG = Object.freeze(snapshot.items)
const CATALOG_BY_ID = new Map(CATALOG.map((item) => [item.id, item]))
const CATALOG_META = Object.freeze({
  schemaVersion: snapshot.schemaVersion,
  version: snapshot.catalogSha256,
  sourceCommit: snapshot.source.commit,
  sourceUpdatedAt: snapshot.source.updatedAt,
  catalogSize: snapshot.itemCount,
  source: 'ao-data/ao-bin-dumps versioned snapshot',
  locale: 'PL-PL',
})

export function getAlbionItemCatalog() {
  return CATALOG
}

export function getAlbionItemCatalogMeta() {
  return CATALOG_META
}

export function getAlbionItemName(itemId) {
  const normalizedId = String(itemId || '').replace(/@[1-4]$/, '')
  return CATALOG_BY_ID.get(normalizedId)?.name || ''
}

export function getAlbionItemNameMap(itemIds) {
  return Object.fromEntries((itemIds || []).flatMap((itemId) => {
    const name = getAlbionItemName(itemId)
    return name ? [[itemId, name]] : []
  }))
}
