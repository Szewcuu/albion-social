import { supabase } from '@/lib/supabase'

export const PREFERENCES_SYNCED_EVENT = 'aopp-preferences-synced'

const CONFIG = {
  favorites: { key: 'aopp-favorites-v1', column: 'favorites', timestamp: 'favorites_updated_at', empty: [] },
  follows: { key: 'aopp-followed-items-v1', column: 'follows', timestamp: 'follows_updated_at', empty: [] },
  timers: { key: 'aopp-custom-timers-v2', column: 'timers', timestamp: 'timers_updated_at', empty: [] },
  reminders: { key: 'aopp-event-reminders-v1', column: 'reminders', timestamp: 'reminders_updated_at', empty: {} },
}

function sanitizeArray(value, maxItems) {
  return Array.isArray(value)
    ? value.filter((item) => item && typeof item === 'object').slice(0, maxItems)
    : []
}

function sanitize(category, value) {
  if (category === 'favorites' || category === 'follows') return sanitizeArray(value, 200)
  if (category === 'timers') return sanitizeArray(value, 20)
  if (category === 'reminders' && value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([id, enabled]) => typeof id === 'string' && id.length <= 100 && enabled === true)
        .slice(0, 200),
    )
  }
  return CONFIG[category]?.empty ?? null
}

function readEnvelope(category) {
  const config = CONFIG[category]
  if (!config || typeof window === 'undefined') return { value: config?.empty ?? null, updatedAt: null }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(config.key) || 'null')
    if (parsed?.version === 1 && Object.hasOwn(parsed, 'value')) {
      return { value: sanitize(category, parsed.value), updatedAt: parsed.updatedAt || null }
    }
    return { value: sanitize(category, parsed ?? config.empty), updatedAt: null }
  } catch {
    window.localStorage.removeItem(config.key)
    return { value: config.empty, updatedAt: null }
  }
}

function writeEnvelope(category, value, updatedAt) {
  const config = CONFIG[category]
  if (!config || typeof window === 'undefined') return
  window.localStorage.setItem(config.key, JSON.stringify({
    version: 1,
    value: sanitize(category, value),
    updatedAt,
  }))
}

export function getLocalPreference(category) {
  return readEnvelope(category).value
}

export async function savePortalPreference(category, value) {
  const config = CONFIG[category]
  if (!config) return false

  const cleanValue = sanitize(category, value)
  const updatedAt = new Date().toISOString()
  writeEnvelope(category, cleanValue, updatedAt)

  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) return false

  const { error } = await supabase.from('user_preferences').upsert({
    user_id: session.user.id,
    [config.column]: cleanValue,
    [config.timestamp]: updatedAt,
    updated_at: updatedAt,
  }, { onConflict: 'user_id' })

  if (error) {
    console.warn(`Nie udało się zsynchronizować preferencji „${category}”:`, error.message)
    return false
  }
  return true
}

export async function syncPortalPreferences(userId) {
  if (!userId || typeof window === 'undefined') return null

  const columns = Object.values(CONFIG)
    .flatMap((config) => [config.column, config.timestamp])
    .join(', ')
  const { data, error } = await supabase
    .from('user_preferences')
    .select(columns)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    console.warn('Nie udało się pobrać preferencji konta:', error.message)
    return null
  }

  const updates = { user_id: userId }
  const synced = {}
  let shouldUpload = !data
  const syncStartedAt = new Date().toISOString()

  for (const [category, config] of Object.entries(CONFIG)) {
    const local = readEnvelope(category)
    const remoteValue = sanitize(category, data?.[config.column] ?? config.empty)
    const remoteUpdatedAt = data?.[config.timestamp] || null
    const localIsNewer = Boolean(local.updatedAt && (!remoteUpdatedAt || local.updatedAt > remoteUpdatedAt))

    if (!data || localIsNewer) {
      updates[config.column] = local.value
      updates[config.timestamp] = local.updatedAt || syncStartedAt
      synced[category] = local.value
      shouldUpload = true
    } else {
      writeEnvelope(category, remoteValue, remoteUpdatedAt)
      synced[category] = remoteValue
    }
  }

  if (shouldUpload) {
    updates.updated_at = syncStartedAt
    const { error: uploadError } = await supabase
      .from('user_preferences')
      .upsert(updates, { onConflict: 'user_id' })
    if (uploadError) console.warn('Nie udało się zapisać scalonych preferencji:', uploadError.message)
  }

  window.dispatchEvent(new CustomEvent(PREFERENCES_SYNCED_EVENT, { detail: synced }))
  return synced
}
