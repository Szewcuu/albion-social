import 'server-only'

import { buildPlayerWatchMessage, getWatchEventIds, summarizeNewPlayerEvents } from '@/lib/playerWatch'
import { getAlbionPlayerWatchSnapshot } from '@/lib/server/albionApi'
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin'

function watchKey(watch) {
  return `${watch.region}:${watch.entity_id}`
}

function notificationLink(watch) {
  const params = new URLSearchParams({ nick: watch.label, region: watch.region })
  return `/killboard?${params}`
}

async function runWithConcurrency(items, concurrency, task) {
  let cursor = 0
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (cursor < items.length) {
      const item = items[cursor]
      cursor += 1
      await task(item)
    }
  })
  await Promise.all(workers)
}

export async function runPlayerWatchSync({ userId = null, limit = 20 } = {}) {
  const admin = createSupabaseAdminClient()
  let query = admin
    .from('entity_follows')
    .select('id, user_id, entity_id, label, region, seen_event_ids, last_checked_at')
    .eq('entity_type', 'albion_player')
    .order('last_checked_at', { ascending: true, nullsFirst: true })
    .limit(Math.max(1, Math.min(100, Number(limit) || 20)))

  if (userId) query = query.eq('user_id', userId)
  const { data: watches, error } = await query
  if (error) throw new Error(`Nie udało się pobrać obserwowanych postaci: ${error.message}`)

  const groups = new Map()
  for (const watch of watches || []) {
    const key = watchKey(watch)
    groups.set(key, [...(groups.get(key) || []), watch])
  }

  const result = {
    watched: watches?.length || 0,
    players: groups.size,
    checked: 0,
    notifications: 0,
    newEvents: 0,
    failed: 0,
  }

  await runWithConcurrency([...groups.values()], 3, async (playerWatches) => {
    const sample = playerWatches[0]
    const checkedAt = new Date().toISOString()
    try {
      const snapshot = await getAlbionPlayerWatchSnapshot(sample.entity_id, sample.region, 20)

      for (const watch of playerWatches) {
        const summary = summarizeNewPlayerEvents(snapshot, watch.seen_event_ids)
        const seenEventIds = getWatchEventIds(snapshot, watch.seen_event_ids)
        const nextSummary = summary.total > 0 ? {
          kills: summary.kills,
          deaths: summary.deaths,
          killFame: summary.killFame,
          deathFame: summary.deathFame,
          from: summary.oldestEventAt,
          to: summary.latestEventAt,
          createdAt: checkedAt,
        } : null

        if (summary.total > 0) {
          const sourceKey = `player-watch:${watch.region}:${watch.entity_id}:${summary.latestEventId}`.slice(0, 180)
          const { error: notificationError } = await admin
            .from('notifications')
            .upsert({
              user_id: watch.user_id,
              title: `Nowe walki: ${watch.label}`.slice(0, 140),
              message: buildPlayerWatchMessage(watch.label, summary).slice(0, 600),
              type: 'follow_player_combat',
              link: notificationLink(watch),
              is_read: false,
              source_key: sourceKey,
            }, { onConflict: 'user_id,source_key', ignoreDuplicates: true })
          if (notificationError) throw notificationError
          result.notifications += 1
          result.newEvents += summary.total
        }

        const update = {
          label: snapshot.player?.name || watch.label,
          seen_event_ids: seenEventIds,
          last_event_at: snapshot.kills.concat(snapshot.deaths)
            .map((event) => event.timestamp)
            .filter(Boolean)
            .sort()
            .at(-1) || null,
          last_checked_at: checkedAt,
          last_error: snapshot.warnings.join(' ').slice(0, 300) || null,
          ...(nextSummary ? { last_summary: nextSummary } : {}),
        }
        const { error: updateError } = await admin.from('entity_follows').update(update).eq('id', watch.id)
        if (updateError) throw updateError
        result.checked += 1
      }
    } catch (syncError) {
      result.failed += playerWatches.length
      const message = String(syncError?.message || 'Nie udało się sprawdzić postaci.').slice(0, 300)
      await admin
        .from('entity_follows')
        .update({ last_checked_at: checkedAt, last_error: message })
        .in('id', playerWatches.map((watch) => watch.id))
      console.error(`Błąd synchronizacji obserwowanej postaci ${watchKey(sample)}:`, syncError)
    }
  })

  return result
}
