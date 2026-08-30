import 'server-only'

import { createHash } from 'node:crypto'

import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin'
import { probeExternalEndpoints } from '@/lib/externalApiClient'
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
    const { error } = await supabase.rpc('service_record_system_event', {
      p_source: source,
      p_level: level,
      p_event_type: String(eventType || 'unknown').slice(0, 120),
      p_message: cleanMessage,
      p_fingerprint: fingerprintFor(source, eventType, cleanMessage),
      p_context: context,
    })
    if (error) throw error
    return true
  } catch (error) {
    console.warn('Nie udało się zapisać zdarzenia monitoringu:', error?.message)
    return false
  }
}

export async function recordFeatureUsage({ feature, region, success = true }) {
  try {
    const supabase = createSupabaseAdminClient()
    const { error } = await supabase.rpc('service_record_feature_usage', {
      p_feature: feature,
      p_region: region,
      p_success: success,
    })
    if (error) throw error
    return true
  } catch (error) {
    console.warn('Nie udało się zapisać zagregowanej metryki użycia:', error?.message)
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
  const regions = await probeExternalEndpoints(
    endpoints.map(([region, url]) => ({ region, url })),
    { timeoutMs: CHECK_TIMEOUT_MS },
  )
  const available = regions.filter((region) => region.status !== 'down').map((region) => region.region)
  const unavailable = regions.filter((region) => region.status === 'down').map((region) => region.region)
  const slow = regions.filter((region) => region.status === 'degraded').map((region) => region.region)

  return {
    status: !available.length ? 'down' : unavailable.length || slow.length ? 'degraded' : 'operational',
    available,
    unavailable,
    slow,
    regions,
  }
}

function integrationMessage(source, regions) {
  const issues = []
  if (regions.unavailable.length) issues.push(`nie odpowiada dla: ${regions.unavailable.join(', ')}`)
  if (regions.slow.length) issues.push(`odpowiada wolno dla: ${regions.slow.join(', ')}`)
  return issues.length ? `${source} ${issues.join('; ')}.` : `${source} odpowiada dla wszystkich regionów.`
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
        message: integrationMessage('Gameinfo API', regions),
        metadata: regions,
      }
    }),
    timedCheck('market_api', async () => {
      const regions = await checkRegions(ALBION_MARKET_CHECKS)
      return {
        status: regions.status,
        message: integrationMessage('Albion Data Project', regions),
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

    if (previous?.status !== check.status) {
      await recordSystemEvent({
        source: check.service,
        level: check.status === 'down' ? 'error' : check.status === 'degraded' ? 'warning' : 'info',
        eventType: 'integration_status_changed',
        message: check.message,
        context: {
          latencyMs: check.latency_ms,
          previousStatus: previous?.status || null,
          status: check.status,
          regions: check.metadata?.regions || null,
        },
      })
    }
  }

  return checks
}
