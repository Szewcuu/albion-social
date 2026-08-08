import 'server-only'

import { createHash } from 'node:crypto'

import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin'
import { isSafeDiscordWebhook } from '@/lib/server/validation'

const CHECK_TIMEOUT_MS = 8_000

const ALBION_GAMEINFO_CHECKS = [
  ['Europa', 'https://gameinfo-ams.albiononline.com/api/gameinfo/search?q=Albion'],
  ['Ameryka', 'https://gameinfo.albiononline.com/api/gameinfo/search?q=Albion'],
  ['Azja', 'https://gameinfo-sgp.albiononline.com/api/gameinfo/search?q=Albion'],
]

const ALBION_MARKET_CHECKS = [
  ['Europa', 'https://europe.albion-online-data.com/api/v2/stats/prices/T4_BAG.json?locations=Caerleon&qualities=1'],
  ['Ameryka', 'https://west.albion-online-data.com/api/v2/stats/prices/T4_BAG.json?locations=Caerleon&qualities=1'],
  ['Azja', 'https://east.albion-online-data.com/api/v2/stats/prices/T4_BAG.json?locations=Caerleon&qualities=1'],
]

function safeMessage(value, fallback = 'Nieznany błąd') {
  return String(value || fallback).replace(/https:\/\/discord\.com\/api\/webhooks\/[^\s]+/gi, '[DISCORD_WEBHOOK]').slice(0, 1000)
}

function fingerprintFor(source, eventType, message) {
  return createHash('sha256').update(`${source}:${eventType}:${message}`).digest('hex').slice(0, 32)
}

export async function recordSystemEvent({ source, level = 'error', eventType, message, context = {} }) {
  try {
    const supabase = createSupabaseAdminClient()
    const cleanMessage = safeMessage(message)
    const { error } = await supabase.from('system_events').insert({
      source,
      level,
      event_type: String(eventType || 'unknown').slice(0, 120),
      message: cleanMessage,
      fingerprint: fingerprintFor(source, eventType, cleanMessage),
      context,
    })
    if (error) throw error
    return true
  } catch (error) {
    console.warn('Nie udało się zapisać zdarzenia monitoringu:', error?.message)
    return false
  }
}

async function timedCheck(service, operation) {
  const startedAt = performance.now()
  try {
    const result = await operation()
    return {
      service,
      status: result?.status || 'operational',
      latency_ms: Math.round(performance.now() - startedAt),
      message: safeMessage(result?.message || 'Usługa odpowiada prawidłowo.'),
      metadata: result?.metadata || {},
    }
  } catch (error) {
    return {
      service,
      status: 'down',
      latency_ms: Math.round(performance.now() - startedAt),
      message: safeMessage(error?.message),
      metadata: {},
    }
  }
}

async function fetchOk(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    cache: 'no-store',
    redirect: 'error',
    signal: AbortSignal.timeout(CHECK_TIMEOUT_MS),
  })
  if (!response.ok) throw new Error(`Źródło zwróciło HTTP ${response.status}.`)
  return response
}

async function checkRegions(endpoints) {
  const results = await Promise.allSettled(endpoints.map(async ([region, url]) => {
    await fetchOk(url)
    return region
  }))
  const available = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
  const unavailable = endpoints
    .map(([region]) => region)
    .filter((region) => !available.includes(region))

  if (!available.length) throw new Error('Żaden region nie odpowiada.')
  return {
    status: unavailable.length ? 'degraded' : 'operational',
    available,
    unavailable,
  }
}

async function notifyStaffOfOutage(supabase, check, previousStatus) {
  if (!['down', 'degraded'].includes(check.status) || previousStatus === check.status) return

  const { data: staff, error } = await supabase
    .from('profiles')
    .select('id')
    .or('is_admin.eq.true,role.in.(moderator,admin)')
  if (error || !staff?.length) return

  await supabase.from('notifications').insert(staff.map(({ id }) => ({
    user_id: id,
    title: `Awaria integracji: ${check.service}`,
    message: check.message,
    type: 'system_alert',
    link: '/admin',
  })))
}

export async function runIntegrationChecks() {
  const supabase = createSupabaseAdminClient()
  const webhookUrl = process.env.DISCORD_EXPEDITIONS_WEBHOOK_URL

  const checks = await Promise.all([
    timedCheck('supabase', async () => {
      const { error } = await supabase.from('profiles').select('id', { head: true, count: 'exact' })
      if (error) throw error
      return { message: 'Baza danych i API Supabase odpowiadają.' }
    }),
    timedCheck('discord', async () => {
      if (!webhookUrl || !isSafeDiscordWebhook(webhookUrl)) {
        return { status: 'not_configured', message: 'Webhook wypraw nie jest skonfigurowany.' }
      }
      await fetchOk(webhookUrl, { headers: { Accept: 'application/json' } })
      return { message: 'Webhook Discord jest dostępny; nie wysłano wiadomości testowej.' }
    }),
    timedCheck('albion_api', async () => {
      const regions = await checkRegions(ALBION_GAMEINFO_CHECKS)
      return {
        status: regions.status,
        message: regions.unavailable.length
          ? `Gameinfo API nie odpowiada dla: ${regions.unavailable.join(', ')}.`
          : 'Gameinfo API odpowiada dla wszystkich regionów.',
        metadata: regions,
      }
    }),
    timedCheck('market_api', async () => {
      const regions = await checkRegions(ALBION_MARKET_CHECKS)
      return {
        status: regions.status,
        message: regions.unavailable.length
          ? `Albion Data Project nie odpowiada dla: ${regions.unavailable.join(', ')}.`
          : 'Albion Data Project odpowiada dla wszystkich regionów.',
        metadata: regions,
      }
    }),
  ])

  for (const check of checks) {
    const { data: previous } = await supabase
      .from('integration_checks')
      .select('status')
      .eq('service', check.service)
      .order('checked_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const { error } = await supabase.from('integration_checks').insert(check)
    if (error) throw error
    await notifyStaffOfOutage(supabase, check, previous?.status)

    if (check.status === 'down') {
      await recordSystemEvent({
        source: check.service,
        eventType: 'integration_check_failed',
        message: check.message,
        context: { latencyMs: check.latency_ms },
      })
    }
  }

  return checks
}
