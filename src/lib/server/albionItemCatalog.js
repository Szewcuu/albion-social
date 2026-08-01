import 'server-only'
import { ALBION_ITEMS } from '@/lib/albionItems'

const CATALOG_URL = 'https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.txt'

const FALLBACK_ITEMS = ALBION_ITEMS.map((item) => ({
  ...item,
  category: getItemCategory(item.id),
}))

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
  if (/_OFF_/.test(id) || /^T\d+_OFF_/.test(id)) return 'offhands'
  if (/_MAIN_|_2H_/.test(id)) return 'weapons'
  if (/_HEAD_/.test(id)) return 'heads'
  if (/_ARMOR_/.test(id)) return 'armors'
  if (/_SHOES_/.test(id)) return 'shoes'
  if (/_BAG(?:_|$)/.test(id)) return 'bags'
  if (/_CAPE(?:_|$)/.test(id)) return 'capes'
  if (/_MOUNT_/.test(id)) return 'mounts'
  if (/_POTION_/.test(id)) return 'potions'
  if (/_MEAL_/.test(id)) return 'foods'
  if (/_(ORE|WOOD|HIDE|FIBER|ROCK|PLANKS|METALBAR|LEATHER|CLOTH|STONEBLOCK)(?:_|$)/.test(id)) return 'resources'
  return 'other'
}

function parseCatalog(text) {
  const items = []

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*\d+:\s+(\S+)\s+:\s+(.+?)\s*$/)
    if (!match) continue

    const [, id, name] = match
    if (!/^T[1-8]_/.test(id) || id.includes('@') || name === 'null') continue

    items.push({ id, name, category: getItemCategory(id) })
  }

  return items
}

export async function getAlbionItemCatalog() {
  try {
    const response = await fetch(CATALOG_URL, {
      headers: { Accept: 'text/plain' },
      next: { revalidate: 86_400 },
      signal: AbortSignal.timeout(12_000),
    })

    if (!response.ok) throw new Error(`CATALOG_${response.status}`)
    const parsed = parseCatalog(await response.text())
    return parsed.length > 100 ? parsed : FALLBACK_ITEMS
  } catch (error) {
    console.error('Nie udało się odświeżyć katalogu przedmiotów Albionu:', error)
    return FALLBACK_ITEMS
  }
}
