import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getItemCategory,
  normalizeCatalogEntries,
  normalizeCatalogEntry,
  validateCatalogSnapshot,
} from '../../src/lib/itemCatalogCore.js'

const localized = (id, namePl, nameEn) => ({
  UniqueName: id,
  LocalizedNames: { 'PL-PL': namePl, 'EN-US': nameEn },
})

test('preferuje polską nazwę i zachowuje angielską nazwę do wyszukiwania', () => {
  assert.deepEqual(normalizeCatalogEntry(localized('T5_HEAD_LEATHER_SET2', 'Kaptur Łowcy', 'Hunter Hood')), {
    id: 'T5_HEAD_LEATHER_SET2',
    name: 'Kaptur Łowcy',
    nameEn: 'Hunter Hood',
    category: 'heads',
  })
})

test('używa angielskiej nazwy, gdy tłumaczenie nie istnieje', () => {
  assert.equal(normalizeCatalogEntry(localized('T4_BAG', '', 'Adept’s Bag')).name, 'Adept’s Bag')
})

test('odrzuca wpisy bez tieru oraz osobne rekordy enchantów', () => {
  assert.equal(normalizeCatalogEntry(localized('UNIQUE_HIDEOUT', 'Kryjówka', 'Hideout')), null)
  assert.equal(normalizeCatalogEntry(localized('T5_HEAD_LEATHER_SET2@2', 'Kaptur Łowcy', 'Hunter Hood')), null)
})

test('nie miesza narzędzi zbierackich z broniami', () => {
  assert.equal(getItemCategory('T8_2H_TOOL_AXE_AVALON'), 'other')
  assert.equal(getItemCategory('T8_2H_BOW'), 'weapons')
  assert.equal(getItemCategory('T8_CAPEITEM_FW_BRIDGEWATCH'), 'capes')
})

test('usuwa duplikaty i sortuje rekordy stabilnie po identyfikatorze', () => {
  const items = normalizeCatalogEntries([
    localized('T5_BAG', 'Torba Znawcy', "Expert's Bag"),
    localized('T4_BAG', 'Torba Adepta', "Adept's Bag"),
    localized('T5_BAG', 'Duplikat', 'Duplicate'),
  ])
  assert.deepEqual(items.map((item) => item.id), ['T4_BAG', 'T5_BAG'])
  assert.equal(items[1].name, 'Torba Znawcy')
})

test('walidator wykrywa niespójny snapshot', () => {
  const errors = validateCatalogSnapshot({
    schemaVersion: 1,
    catalogSha256: 'c'.repeat(64),
    source: { commit: 'a'.repeat(40), contentSha256: 'b'.repeat(64) },
    itemCount: 2,
    items: [{ id: 'T4_BAG', name: 'Torba', nameEn: 'Bag', category: 'bags' }],
  }, { minimumItems: 1 })
  assert.deepEqual(errors, ['itemCount nie zgadza się z liczbą rekordów.'])
})
