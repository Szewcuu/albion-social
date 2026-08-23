import { BUDGET_TAGS, TAG_GROUPS } from './buildTags.js'
import { createEmptyBuild, EQUIPMENT_SLOTS } from './buildSlots.js'

const ITEM_ID_PATTERN = /^[A-Za-z0-9_-]{2,64}(?:@[1-4])?$/

function cleanText(value, max) {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

function cleanItemId(value) {
  const itemId = cleanText(value, 70)
  return !itemId || ITEM_ID_PATTERN.test(itemId) ? itemId : ''
}

function cleanStringList(value, { maxItems, maxLength }) {
  if (!Array.isArray(value)) return []
  return value.slice(0, maxItems).map((entry) => cleanText(entry, maxLength)).filter(Boolean)
}

function cleanTags(value) {
  const source = value && typeof value === 'object' ? value : {}
  return Object.fromEntries(TAG_GROUPS.map((group) => {
    const selected = Array.isArray(source[group.key]) ? source[group.key] : []
    return [group.key, selected.filter((tag) => group.tags.includes(tag)).slice(0, group.max)]
  }))
}

export function sanitizeBuildForPublishing(value) {
  if (!value || typeof value !== 'object') return null

  const base = createEmptyBuild()
  const tags = cleanTags(value.tags)
  const budget = BUDGET_TAGS.some(({ id }) => id === value.budget) ? value.budget : ''
  const slots = Object.fromEntries(EQUIPMENT_SLOTS.map((slot) => {
    const source = value.slots?.[slot.key] || {}
    return [slot.key, {
      main: cleanItemId(source.main),
      alternatives: Array.isArray(source.alternatives)
        ? source.alternatives.slice(0, 2).map(cleanItemId).filter(Boolean)
        : [],
      amount: slot.hasAmount
        ? Math.max(1, Math.min(999, Number.parseInt(source.amount, 10) || 1))
        : 1,
    }]
  }))

  const title = cleanText(value.title, 100)
  const requiredTagsPresent = TAG_GROUPS.every((group) => tags[group.key].length > 0)
  if (!title || !budget || !requiredTagsPresent || !Object.values(slots).some(({ main }) => main)) {
    return null
  }

  const youtubeVideos = cleanStringList(value.youtubeVideos, { maxItems: 3, maxLength: 500 })
    .filter((url) => {
      try {
        const parsed = new URL(url)
        return parsed.protocol === 'https:' && ['youtube.com', 'www.youtube.com', 'youtu.be'].includes(parsed.hostname)
      } catch {
        return false
      }
    })

  return {
    ...base,
    title,
    authorName: cleanText(value.authorName, 50),
    description: cleanText(value.description, 5_000),
    budget,
    tags,
    strengths: cleanStringList(value.strengths, { maxItems: 5, maxLength: 300 }),
    weaknesses: cleanStringList(value.weaknesses, { maxItems: 5, maxLength: 300 }),
    slots,
    inventory: Array.isArray(value.inventory) ? value.inventory.slice(0, 10).flatMap((entry) => {
      const id = cleanItemId(entry?.id)
      return id ? [{ id, amount: Math.max(1, Math.min(999, Number.parseInt(entry?.amount, 10) || 1)) }] : []
    }) : [],
    skillCombos: Array.isArray(value.skillCombos) ? value.skillCombos.slice(0, 5).flatMap((entry) => {
      const name = cleanText(entry?.name, 100)
      const description = cleanText(entry?.description, 500)
      return name || description ? [{ name, description }] : []
    }) : [],
    youtubeVideos,
  }
}
