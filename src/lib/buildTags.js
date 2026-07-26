export const LOCATION_TAGS = [
  'Open World', 'Static Dungeon', 'Avalonian Dungeon', 'Solo Dungeon',
  'Roads of Avalon', 'Depths', 'Hellgate', 'Corrupted Dungeon', 'Mists',
  'Knightfall Abbey', 'Arena', 'Inne',
]

export const ZONE_TAGS = [
  'Strefa Niebieska', 'Strefa Żółta', 'Strefa Pomarańczowa',
  'Strefa Czerwona', 'Strefa Czarna',
]

export const SIZE_TAGS = [
  'Solo', 'Duo', 'Trio', 'Mała Grupa (4-7)', 'Duża Grupa (8-20)', 'Zerg',
]

export const ROLE_TAGS = [
  'Tank', 'Healer', 'DPS', 'Support', 'Crowd Control', 'Utility', 'Inne',
]

export const ACTIVITY_TAGS = [
  'PvE Farm', 'Tracking', 'Ganking', 'PvP', 'Faction Warfare', 'Territory',
  'Crystal League', 'Crafting', 'Gathering', 'Transport', 'Exploration', 'Ratting', 'Inne',
]

export const BUDGET_TAGS = [
  { id: 'newbie', label: 'Nowicjusz (<100k)' },
  { id: 'low', label: 'Niski budżet (<300k)' },
  { id: 'medium', label: 'Średni budżet (<2M)' },
  { id: 'high', label: 'Wysoki budżet (<5M)' },
  { id: 'gucci', label: 'Gucci (>5M)' },
]

export const TAG_GROUPS = [
  { key: 'locations', label: 'Lokalizacja', tags: LOCATION_TAGS, max: 7 },
  { key: 'zones', label: 'Strefa', tags: ZONE_TAGS, max: 7 },
  { key: 'sizes', label: 'Wielkość grupy', tags: SIZE_TAGS, max: 7 },
  { key: 'roles', label: 'Rola', tags: ROLE_TAGS, max: 7 },
  { key: 'activities', label: 'Aktywność', tags: ACTIVITY_TAGS, max: 7 },
]
