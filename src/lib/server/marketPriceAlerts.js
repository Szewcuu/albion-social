import 'server-only'

import {
  alertConditionMet,
  buildPriceAlertMessage,
  hourlySampleTime,
  marketPriceKey,
  priceFromRow,
  shouldNotifyPriceAlert,
} from '@/lib/marketPriceAlerts'
import {
  getCurrentMarketPrices,
  isSafeItemId,
  MARKET_CITIES,
  MARKET_QUALITIES,
  MARKET_REGIONS,
} from '@/lib/server/albionMarketApi'
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin'

const MAX_ALERTS_PER_SYNC = 100
const SNAPSHOT_RETENTION_DAYS = 90

function sourceDate(value) {
  if (!value || String(value).startsWith('0001-')) return null
  const normalized = /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function snapshotRow(row, region, sampledAt) {
  const itemId = String(row?.item_id || '').toUpperCase()
  const quality = Number(row?.quality)
  const sellPrice = Number(row?.sell_price_min) || 0
  const buyPrice = Number(row?.buy_price_max) || 0
  if (!isSafeItemId(itemId) || !MARKET_CITIES.includes(row?.city) || !(quality in MARKET_QUALITIES)) return null
  if (sellPrice <= 0 && buyPrice <= 0) return null

  return {
    item_id: itemId,
    region,
    city: row.city,
    quality,
    sell_price_min: Math.max(0, Math.trunc(sellPrice)),
    buy_price_max: Math.max(0, Math.trunc(buyPrice)),
    source_sell_updated_at: sourceDate(row.sell_price_min_date),
    source_buy_updated_at: sourceDate(row.buy_price_max_date),
    sampled_at: sampledAt,
  }
}

export async function recordMarketPriceSnapshots(admin, rows, { region, sampledAt = hourlySampleTime() }) {
  const unique = new Map()
  for (const row of rows || []) {
    const snapshot = snapshotRow(row, region, sampledAt)
    if (snapshot) unique.set(marketPriceKey({ ...snapshot, price_type: 'snapshot' }), snapshot)
  }
  const snapshots = [...unique.values()]
  if (!snapshots.length) return []

  const { data, error } = await admin
    .from('market_price_snapshots')
    .upsert(snapshots, { onConflict: 'item_id,region,city,quality,sampled_at' })
    .select('item_id, region, city, quality, sell_price_min, buy_price_max, sampled_at')
  if (error) throw new Error(`Nie udało się zapisać historii cen: ${error.message}`)
  return data || snapshots
}

async function evaluateAlerts(admin, alerts, rows, sampledAt) {
  const priceRows = new Map((rows || []).map((row) => [
    marketPriceKey({ item_id: row.item_id, region: row.region, city: row.city, quality: row.quality, price_type: 'row' }),
    row,
  ]))
  const updates = []
  let notifications = 0

  for (const alert of alerts || []) {
    const row = priceRows.get(marketPriceKey({ ...alert, price_type: 'row' }))
    const observedPrice = priceFromRow(row, alert.price_type)
    if (!observedPrice) {
      updates.push({
        id: alert.id,
        last_checked_at: sampledAt,
        last_error: 'Brak aktualnego skanu dla wybranej strony rynku.',
        updated_at: new Date().toISOString(),
      })
      continue
    }

    const conditionMet = alertConditionMet(alert, observedPrice)
    let lastTriggeredAt = alert.last_triggered_at
    if (shouldNotifyPriceAlert(alert, observedPrice)) {
      const sourceKey = `price-alert:${alert.id}:${sampledAt}`.slice(0, 180)
      const params = new URLSearchParams({
        item: alert.item_id,
        region: alert.region,
        city: alert.city,
        quality: String(alert.quality),
      })
      const { error } = await admin.from('notifications').upsert({
        user_id: alert.user_id,
        title: `Próg ceny: ${alert.item_name}`.slice(0, 140),
        message: buildPriceAlertMessage(alert, observedPrice).slice(0, 600),
        type: 'market_price_alert',
        link: `/rynek?${params}`,
        is_read: false,
        source_key: sourceKey,
      }, { onConflict: 'user_id,source_key', ignoreDuplicates: true })
      if (error) throw error
      lastTriggeredAt = sampledAt
      notifications += 1
    }

    updates.push({
      id: alert.id,
      condition_met: conditionMet,
      last_observed_price: observedPrice,
      last_checked_at: sampledAt,
      last_triggered_at: lastTriggeredAt,
      last_error: null,
      updated_at: new Date().toISOString(),
    })
  }

  if (updates.length) {
    const results = await Promise.all(updates.map(({ id, ...update }) => (
      admin.from('price_alerts').update(update).eq('id', id)
    )))
    const failed = results.find((result) => result.error)
    if (failed?.error) throw new Error(`Nie udało się zaktualizować alertów cenowych: ${failed.error.message}`)
  }
  return { checked: updates.length, notifications }
}

export async function sampleMarketSelection({ userId, itemId, region, cities, quality }) {
  const admin = createSupabaseAdminClient()
  const sampledAt = hourlySampleTime()
  const rows = await getCurrentMarketPrices({ itemIds: [itemId], cities, qualities: [quality], region })
  const snapshots = await recordMarketPriceSnapshots(admin, rows, { region, sampledAt })
  const { data: alerts, error } = await admin
    .from('price_alerts')
    .select('id, user_id, item_id, item_name, region, city, quality, price_type, direction, target_price, condition_met, last_triggered_at')
    .eq('user_id', userId)
    .eq('active', true)
    .eq('item_id', itemId)
    .eq('region', region)
    .eq('quality', quality)
    .in('city', cities)
  if (error) throw error
  const alertResult = await evaluateAlerts(admin, alerts || [], snapshots, sampledAt)
  return { sampledAt, snapshots: snapshots.length, ...alertResult }
}

function chunk(values, size) {
  const result = []
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size))
  return result
}

export async function runMarketPriceAlertSync({ userId = null, limit = MAX_ALERTS_PER_SYNC } = {}) {
  const admin = createSupabaseAdminClient()
  const sampledAt = hourlySampleTime()
  let query = admin
    .from('price_alerts')
    .select('id, user_id, item_id, item_name, region, city, quality, price_type, direction, target_price, condition_met, last_triggered_at')
    .eq('active', true)
    .order('last_checked_at', { ascending: true, nullsFirst: true })
    .limit(Math.max(1, Math.min(MAX_ALERTS_PER_SYNC, Number(limit) || MAX_ALERTS_PER_SYNC)))
  if (userId) query = query.eq('user_id', userId)
  const { data: alerts, error } = await query
  if (error) throw new Error(`Nie udało się pobrać alertów cenowych: ${error.message}`)

  const byRegion = new Map()
  for (const alert of alerts || []) byRegion.set(alert.region, [...(byRegion.get(alert.region) || []), alert])
  const result = { watched: alerts?.length || 0, checked: 0, snapshots: 0, notifications: 0, failed: 0 }

  for (const [region, regionalAlerts] of byRegion) {
    for (const itemIds of chunk([...new Set(regionalAlerts.map((alert) => alert.item_id))], 10)) {
      const batchAlerts = regionalAlerts.filter((alert) => itemIds.includes(alert.item_id))
      try {
        const cities = [...new Set(batchAlerts.map((alert) => alert.city))]
        const qualities = [...new Set(batchAlerts.map((alert) => Number(alert.quality)))]
        const rows = await getCurrentMarketPrices({ itemIds, cities, qualities, region })
        const snapshots = await recordMarketPriceSnapshots(admin, rows, { region, sampledAt })
        const evaluated = await evaluateAlerts(admin, batchAlerts, snapshots, sampledAt)
        result.checked += evaluated.checked
        result.snapshots += snapshots.length
        result.notifications += evaluated.notifications
      } catch (syncError) {
        result.failed += batchAlerts.length
        const message = String(syncError?.message || 'Nie udało się sprawdzić rynku.').slice(0, 300)
        await admin.from('price_alerts').update({ last_checked_at: sampledAt, last_error: message }).in('id', batchAlerts.map((alert) => alert.id))
        console.error(`Błąd synchronizacji alertów cenowych ${region}:`, syncError)
      }
    }
  }

  const retentionCutoff = new Date(Date.now() - SNAPSHOT_RETENTION_DAYS * 86_400_000).toISOString()
  const { error: retentionError } = await admin.from('market_price_snapshots').delete().lt('sampled_at', retentionCutoff)
  if (retentionError) console.error('Nie udało się wykonać retencji historii cen:', retentionError)
  return result
}

export function isSupportedMarketSelection({ itemId, region, cities, quality }) {
  return isSafeItemId(itemId)
    && region in MARKET_REGIONS
    && Array.isArray(cities)
    && cities.length > 0
    && cities.length <= MARKET_CITIES.length
    && cities.every((city) => MARKET_CITIES.includes(city))
    && quality in MARKET_QUALITIES
}
