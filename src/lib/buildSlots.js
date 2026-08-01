export const EQUIPMENT_SLOTS = [
  { key: 'main_hand', label: 'Broń główna', category: 'weapons', gridArea: 'main' },
  { key: 'off_hand', label: 'Broń pomocnicza', category: 'offhands', gridArea: 'off', twoHandBlocked: true },
  { key: 'head', label: 'Hełm', category: 'heads', gridArea: 'head' },
  { key: 'armor', label: 'Zbroja', category: 'armors', gridArea: 'armor' },
  { key: 'shoes', label: 'Buty', category: 'shoes', gridArea: 'shoes' },
  { key: 'bag', label: 'Torba', category: 'bags', gridArea: 'bag' },
  { key: 'cape', label: 'Peleryna', category: 'capes', gridArea: 'cape' },
  { key: 'mount', label: 'Wierzchowiec', category: 'mounts', gridArea: 'mount' },
  { key: 'potion', label: 'Mikstura', category: 'potions', gridArea: 'potion', hasAmount: true },
  { key: 'food', label: 'Jedzenie', category: 'foods', gridArea: 'food', hasAmount: true },
]

export const EMPTY_SLOT = { main: '', alternatives: [], amount: 1 }

export function createEmptyBuild() {
  const slots = {}
  EQUIPMENT_SLOTS.forEach(({ key, hasAmount }) => {
    slots[key] = { ...EMPTY_SLOT, amount: hasAmount ? 10 : 1 }
  })
  return {
    title: '',
    authorName: '',
    description: '',
    budget: '',
    tags: { locations: [], zones: [], sizes: [], roles: [], activities: [] },
    strengths: [],
    weaknesses: [],
    slots,
    inventory: [],
    skillCombos: [],
    youtubeVideos: [],
  }
}

export function isTwoHandedWeapon(itemId) {
  if (!itemId) return false
  return itemId.includes('2H_') || itemId.includes('_2H_')
}

export function itemImageUrl(itemId, quality = 1) {
  if (!itemId) return null
  return `https://render.albiononline.com/v1/item/${itemId}.png?count=1&quality=${quality}`
}

export function encodeBuildToUrl(build) {
  const data = btoa(unescape(encodeURIComponent(JSON.stringify(build))))
  return `${typeof window !== 'undefined' ? window.location.origin : ''}/buildy/create?build=${data}`
}

export function decodeBuildFromUrl(encoded) {
  try {
    return JSON.parse(decodeURIComponent(escape(atob(encoded))))
  } catch {
    return null
  }
}

export function buildToDbPayload(build, userId) {
  const s = build.slots
  const primaryActivity = build.tags.activities[0] || 'PvP'

  return {
    user_id: userId,
    title: build.title.trim(),
    activity_type: primaryActivity.toUpperCase().replace(/\s+/g, '_').slice(0, 20),
    description: build.description.trim(),
    weapon: s.main_hand?.main || '',
    offhand: s.off_hand?.main || '',
    armor: s.armor?.main || '',
    head: s.head?.main || '',
    shoes: s.shoes?.main || '',
    cape: s.cape?.main || '',
    bag: s.bag?.main || '',
    potion: s.potion?.main || '',
    food: s.food?.main || '',
    build_data: {
      authorName: build.authorName,
      budget: build.budget,
      tags: build.tags,
      strengths: build.strengths,
      weaknesses: build.weaknesses,
      slots: build.slots,
      inventory: build.inventory,
      skillCombos: build.skillCombos,
      youtubeVideos: build.youtubeVideos,
    },
  }
}

export function buildFromDbRow(row) {
  const data = row.build_data || {}
  const base = createEmptyBuild()
  return {
    ...base,
    title: row.title || '',
    description: row.description || '',
    authorName: data.authorName || row.profiles?.username || '',
    budget: data.budget || '',
    tags: data.tags || base.tags,
    strengths: data.strengths || [],
    weaknesses: data.weaknesses || [],
    slots: data.slots || {
      ...base.slots,
      main_hand: { main: row.weapon || row.main_weapon || '', alternatives: [], amount: 1 },
      off_hand: { main: row.offhand || '', alternatives: [], amount: 1 },
      head: { main: row.head || row.helmet || '', alternatives: [], amount: 1 },
      armor: { main: row.armor || '', alternatives: [], amount: 1 },
      shoes: { main: row.shoes || row.boots || '', alternatives: [], amount: 1 },
      cape: { main: row.cape || '', alternatives: [], amount: 1 },
      bag: { main: row.bag || '', alternatives: [], amount: 1 },
      potion: { main: row.potion || '', alternatives: [], amount: 10 },
      food: { main: row.food || '', alternatives: [], amount: 10 },
    },
    inventory: data.inventory || [],
    skillCombos: data.skillCombos || [],
    youtubeVideos: data.youtubeVideos || [],
  }
}
