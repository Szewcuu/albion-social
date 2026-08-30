import { BUDGET_TAGS } from './buildTags.js'
import { buildFromDbRow } from './buildSlots.js'

const DISPLAY_LABELS = {
  EXPLORATION: 'Eksploracja',
  Exploration: 'Eksploracja',
  TRACKING: 'Tropienie',
  Tracking: 'Tropienie',
  GATHERING: 'Zbieractwo',
  Gathering: 'Zbieractwo',
  CRAFTING: 'Rzemiosło',
  Crafting: 'Rzemiosło',
  FACTION_WARFARE: 'Wojna frakcji',
  'Faction Warfare': 'Wojna frakcji',
  CRYSTAL_LEAGUE: 'Liga Kryształowa',
  'Crystal League': 'Liga Kryształowa',
  OPEN_WORLD: 'Otwarty świat',
  'Open World': 'Otwarty świat',
  STATIC_DUNGEON: 'Statyk',
  'Static Dungeon': 'Statyk',
  AVALONIAN_DUNGEON: 'Loch Avaloński',
  'Avalonian Dungeon': 'Loch Avaloński',
  SOLO_DUNGEON: 'Loch solo',
  'Solo Dungeon': 'Loch solo',
  ROADS_OF_AVALON: 'Drogi Avalonu',
  'Roads of Avalon': 'Drogi Avalonu',
  CORRUPTED_DUNGEON: 'Skażony Loch',
  'Corrupted Dungeon': 'Skażony Loch',
  KNIGHTFALL_ABBEY: 'Opactwo Knightfall',
  'Knightfall Abbey': 'Opactwo Knightfall',
  GANKING: 'Ganking',
  PVP: 'PvP',
  PVE: 'PvE',
  PVE_FARM: 'PvE Farm',
  ZVZ: 'ZvZ',
}

export function getBuildLabel(value, fallback = 'Build') {
  const normalized = String(value || '').trim()
  if (!normalized) return fallback
  if (DISPLAY_LABELS[normalized]) return DISPLAY_LABELS[normalized]
  return normalized
    .replaceAll('_', ' ')
    .replace(/\bPvp\b/gi, 'PvP')
    .replace(/\bPve\b/gi, 'PvE')
    .replace(/\bZvz\b/gi, 'ZvZ')
}

export function getBudgetLabel(value) {
  return BUDGET_TAGS.find((budget) => budget.id === value)?.label || getBuildLabel(value, '')
}

export function normalizeSquadBuild(row) {
  const build = buildFromDbRow(row)
  return {
    ...build,
    id: row.id,
    title: row.title || build.title || 'Build bez nazwy',
    role: build.tags?.roles?.[0] || '',
    profiles: row.profiles || null,
  }
}

export function restoreSquadFromSearch(search, builds, slotCount = 5) {
  const params = new URLSearchParams(search || '')
  const requestedSize = Number.parseInt(params.get('size') || String(slotCount), 10)
  const safeSlotCount = [5, 10, 20].includes(requestedSize) ? requestedSize : slotCount
  const ids = (params.get('squad') || '').split(',').slice(0, safeSlotCount)
  const byId = new Map(builds.map((build) => [String(build.id), build]))
  const squad = Array.from({ length: safeSlotCount }, (_, index) => byId.get(ids[index]) || null)
  const name = (params.get('name') || '').trim().slice(0, 80)
  return { squad, name, slotCount: safeSlotCount }
}

export function buildSquadShareUrl(origin, squad, squadName, slotCount = squad.length || 5) {
  const params = new URLSearchParams({
    squad: squad.map((build) => build?.id || '').join(','),
    name: String(squadName || '').trim().slice(0, 80),
  })
  if (slotCount !== 5) params.set('size', String(slotCount))
  return `${origin}/buildy?${params.toString()}`
}
