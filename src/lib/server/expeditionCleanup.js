import 'server-only'

import { isSafeDiscordWebhook } from '@/lib/server/validation'

export const EXPEDITION_TTL_HOURS = 72

export function getExpeditionCutoff(now = new Date()) {
  return new Date(now.getTime() - EXPEDITION_TTL_HOURS * 60 * 60 * 1000)
}

function getWebhookBaseUrl() {
  const configuredUrl = process.env.DISCORD_EXPEDITIONS_WEBHOOK_URL
  if (!configuredUrl || !isSafeDiscordWebhook(configuredUrl)) return null

  const url = new URL(configuredUrl)
  url.search = ''
  return url.toString().replace(/\/$/, '')
}

export async function deleteExpeditionDiscordMessages(expedition) {
  const webhookBaseUrl = getWebhookBaseUrl()
  const messageIds = [
    expedition.discord_message_id,
    expedition.full_party_message_id,
  ].filter((id) => /^\d{15,25}$/.test(String(id || '')))

  if (!webhookBaseUrl || messageIds.length === 0) {
    return { attempted: messageIds.length, failed: 0, skipped: !webhookBaseUrl }
  }

  const results = await Promise.allSettled(messageIds.map(async (messageId) => {
    const response = await fetch(`${webhookBaseUrl}/messages/${messageId}`, {
      method: 'DELETE',
      redirect: 'error',
      signal: AbortSignal.timeout(8_000),
    })

    // Discord returns 404 when the message has already been removed. That is a
    // successful final state from the portal's perspective.
    if (!response.ok && response.status !== 404) {
      throw new Error(`Discord zwrócił status ${response.status}.`)
    }
  }))

  return {
    attempted: messageIds.length,
    failed: results.filter((result) => result.status === 'rejected').length,
    skipped: false,
  }
}

export async function deleteExpeditionRecords(supabase, expeditionId) {
  const { error: signupsError } = await supabase
    .from('expedition_signups')
    .delete()
    .eq('expedition_id', expeditionId)

  if (signupsError) throw new Error('Nie udało się usunąć zapisów uczestników wyprawy.')

  const { data, error } = await supabase
    .from('expeditions')
    .delete()
    .eq('id', expeditionId)
    .select('id')
    .maybeSingle()

  if (error) throw new Error('Nie udało się usunąć wyprawy.')
  if (!data) throw new Error('Wyprawa nie została usunięta lub brak do niej uprawnień.')

  return data
}
