import { NextResponse } from 'next/server'

import { checkRateLimit } from '@/lib/server/rateLimit'
import { recordSystemEvent } from '@/lib/server/monitoring'
import {
  createSupabaseAdminClient,
  createSupabaseRequestClient,
  isPortalAdmin,
  requireApiUser,
} from '@/lib/server/supabaseAdmin'
import { cleanText, isSafeDiscordWebhook } from '@/lib/server/validation'
import {
  deleteExpeditionDiscordMessages,
  deleteExpeditionRecords,
} from '@/lib/server/expeditionCleanup'

const jsonError = (message, status, headers) => (
  NextResponse.json({ error: message }, { status, headers })
)

const discordText = (value, max) => String(value || '').trim().slice(0, max)

function getWebhookUrl({ wait = false } = {}) {
  const configuredUrl = process.env.DISCORD_EXPEDITIONS_WEBHOOK_URL
  if (!configuredUrl || !isSafeDiscordWebhook(configuredUrl)) return null

  const url = new URL(configuredUrl)
  if (wait) url.searchParams.set('wait', 'true')
  return url
}

async function loadExpedition(supabase, expeditionId) {
  const { data, error } = await supabase
    .from('expeditions')
    .select(`
      id,
      user_id,
      title,
      activity_type,
      min_ip,
      start_time,
      server,
      description,
      max_tanks,
      max_healers,
      max_dps,
      max_supports,
      discord_message_id,
      full_party_message_id
    `)
    .eq('id', expeditionId)
    .maybeSingle()

  if (error) throw new Error('Nie udało się odczytać wyprawy.')
  return data
}

async function canManageExpedition(supabase, userId, expedition) {
  if (expedition.user_id === userId) return true
  return isPortalAdmin(supabase, userId)
}

async function getCreatorName(supabase, userId) {
  const { data } = await supabase
    .from('profiles')
    .select('ingame_nick, username')
    .eq('id', userId)
    .maybeSingle()

  return discordText(data?.ingame_nick || data?.username || 'Gracz', 100)
}

async function sendDiscordMessage(payload) {
  const webhookUrl = getWebhookUrl({ wait: true })
  if (!webhookUrl) return null

  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    redirect: 'error',
    signal: AbortSignal.timeout(8_000),
    body: JSON.stringify({
      allowed_mentions: { parse: [] },
      ...payload,
    }),
  })

  if (!response.ok) {
    throw new Error(`Discord zwrócił status ${response.status}.`)
  }

  return response.json()
}

export async function POST(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const rateLimit = await checkRateLimit(`expedition-webhook:${auth.user.id}`, {
      limit: 10,
      windowMs: 60 * 1000,
    })

    if (!rateLimit.allowed) {
      return jsonError('Zbyt wiele operacji. Spróbuj ponownie za chwilę.', 429, {
        'Retry-After': String(rateLimit.retryAfter),
      })
    }

    const body = await request.json()
    const expeditionId = cleanText(body.expeditionId, { min: 1, max: 100 })
    const type = body.type === 'PARTY_FULL' ? 'PARTY_FULL' : 'CREATED'

    if (!expeditionId) return jsonError('Nieprawidłowy identyfikator wyprawy.', 400)

    let supabase
    try {
      supabase = createSupabaseAdminClient()
    } catch {
      // Local development and owner-triggered webhook actions can safely use
      // the authenticated request client when the optional service key is absent.
      supabase = createSupabaseRequestClient(request)
    }
    const warnings = []
    const expedition = await loadExpedition(supabase, expeditionId)
    if (!expedition) return jsonError('Nie znaleziono wyprawy.', 404)

    const creator = await getCreatorName(supabase, expedition.user_id)

    if (type === 'PARTY_FULL') {
      const { data: signups, error: signupsError } = await supabase
        .from('expedition_signups')
        .select('user_id')
        .eq('expedition_id', expedition.id)

      if (signupsError) throw new Error('Nie udało się sprawdzić składu wyprawy.')

      const isParticipant = signups?.some((signup) => signup.user_id === auth.user.id)
      const canManage = await canManageExpedition(supabase, auth.user.id, expedition)
      if (!isParticipant && !canManage) return jsonError('Brak uprawnień.', 403)

      const totalMax = Number(expedition.max_tanks || 0)
        + Number(expedition.max_healers || 0)
        + Number(expedition.max_dps || 0)
        + Number(expedition.max_supports || 0)

      if (totalMax <= 0 || (signups?.length || 0) < totalMax) {
        return jsonError('Skład tej wyprawy nie jest jeszcze pełny.', 409)
      }

      if (expedition.full_party_message_id) {
        return NextResponse.json({
          success: true,
          messageId: expedition.full_party_message_id,
          alreadySent: true,
        })
      }

      const discordData = await sendDiscordMessage({
        content: `🎉 **DRUŻYNA SKOMPLETOWANA!** Wyprawa **${discordText(expedition.title, 100)}** ma już pełny skład!`,
        embeds: [
          {
            title: `✅ PEŁNY SKŁAD: ${discordText(expedition.title, 200)}`,
            url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://albion-social.vercel.app'}/wyprawy`,
            description: `Szykujcie ekwipunek! Zbiórka zaplanowana na **${discordText(expedition.start_time, 50)}**.`,
            color: 0x10b981,
            fields: [
              { name: '🎯 Aktywność', value: discordText(expedition.activity_type, 100) || 'Wyprawa', inline: true },
              { name: '👑 Lider drużyny', value: creator, inline: true },
            ],
            footer: { text: 'Albion Online Polska Portal • Dołącz do innych wypraw' },
            timestamp: new Date().toISOString(),
          },
        ],
      })

      if (discordData?.id) {
        const { error } = await supabase
          .from('expeditions')
          .update({ full_party_message_id: discordData.id })
          .eq('id', expedition.id)

        if (error) {
          console.warn('Nie udało się zapisać identyfikatora pełnego składu:', error.message)
          warnings.push('Wiadomość wysłano, ale nie zapisano jej identyfikatora w bazie.')
        }
      }

      return NextResponse.json({
        success: true,
        messageId: discordData?.id || null,
        skipped: !discordData,
        warnings,
      })
    }

    if (!(await canManageExpedition(supabase, auth.user.id, expedition))) {
      return jsonError('Brak uprawnień.', 403)
    }

    if (expedition.discord_message_id) {
      return NextResponse.json({
        success: true,
        messageId: expedition.discord_message_id,
        alreadySent: true,
      })
    }

    let embedColor = 0xc59b27
    if (expedition.activity_type?.includes('Statyk')) embedColor = 0x3b82f6
    else if (expedition.activity_type?.includes('Karawana')) embedColor = 0xf59e0b
    else if (expedition.activity_type?.includes('Ava') || expedition.activity_type?.includes('Hellgate')) embedColor = 0xa855f7
    else if (expedition.activity_type?.includes('Ganking') || expedition.activity_type?.includes('Roaming')) embedColor = 0xef4444

    const rolesList = [
      Number(expedition.max_tanks) > 0 ? `🛡️ Tank: **${expedition.max_tanks}**` : null,
      Number(expedition.max_healers) > 0 ? `💚 Heal: **${expedition.max_healers}**` : null,
      Number(expedition.max_dps) > 0 ? `⚔️ DPS: **${expedition.max_dps}**` : null,
      Number(expedition.max_supports) > 0 ? `🔮 Supp: **${expedition.max_supports}**` : null,
    ].filter(Boolean).join(' • ') || 'Dowolny skład'

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://albion-social.vercel.app'
    const discordData = await sendDiscordMessage({
      content: `📢 **Zwołano nową drużynę!** [👉 Kliknij tutaj, aby zarezerwować miejsce!](${appUrl}/wyprawy)`,
      embeds: [
        {
          title: `⚔️ NOWA WYPRAWA: ${discordText(expedition.title, 200)}`,
          url: `${appUrl}/wyprawy`,
          description: expedition.description
            ? `> ${discordText(expedition.description, 1000)}`
            : 'Brak dodatkowego opisu. Kliknij poniżej, aby dołączyć!',
          color: embedColor,
          fields: [
            { name: '🎯 Aktywność', value: discordText(expedition.activity_type, 100) || 'Statyk', inline: true },
            { name: '🌐 Serwer', value: discordText(expedition.server, 50) || 'Europa', inline: true },
            { name: '⏰ Czas zbiórki', value: discordText(expedition.start_time, 50) || '19:00 UTC', inline: true },
            { name: '🛡️ Wymagane IP', value: `${Number(expedition.min_ip) || 1200}+`, inline: true },
            { name: '👑 Lider drużyny', value: creator, inline: true },
            { name: '👥 Poszukiwane miejsca', value: rolesList, inline: false },
          ],
          footer: { text: 'Albion Online Polska Portal • Kliknij nagłówek, aby otworzyć wyprawy' },
          timestamp: new Date().toISOString(),
        },
      ],
    })

    if (discordData?.id) {
      const { error } = await supabase
        .from('expeditions')
        .update({ discord_message_id: discordData.id })
        .eq('id', expedition.id)

      if (error) {
        console.warn('Nie udało się zapisać identyfikatora ogłoszenia Discord:', error.message)
        warnings.push('Wiadomość wysłano, ale nie zapisano jej identyfikatora w bazie.')
      }
    }

    return NextResponse.json({
      success: true,
      messageId: discordData?.id || null,
      skipped: !discordData,
      warnings,
    })
  } catch (error) {
    console.error('Błąd wywoływania webhooka wypraw:', error)
    await recordSystemEvent({
      source: 'discord',
      eventType: 'expedition_webhook_failed',
      message: error?.message || 'Nieznany błąd webhooka wypraw.',
    })
    return jsonError('Wystąpił błąd integracji z Discordem.', 500)
  }
}

export async function DELETE(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const body = await request.json()
    const expeditionId = cleanText(body.expeditionId, { min: 1, max: 100 })
    if (!expeditionId) return jsonError('Nieprawidłowy identyfikator wyprawy.', 400)

    let supabase
    try {
      supabase = createSupabaseAdminClient()
    } catch {
      // Manual deletion must still work for the owner when the optional server
      // admin key is not configured. Supabase RLS remains the authorization layer.
      supabase = createSupabaseRequestClient(request)
    }
    const expedition = await loadExpedition(supabase, expeditionId)
    if (!expedition) return jsonError('Nie znaleziono wyprawy.', 404)

    if (!(await canManageExpedition(supabase, auth.user.id, expedition))) {
      return jsonError('Brak uprawnień.', 403)
    }

    const discord = await deleteExpeditionDiscordMessages(expedition)
    await deleteExpeditionRecords(supabase, expedition.id)

    return NextResponse.json({
      success: true,
      warning: discord.failed > 0
        ? 'Wyprawa została usunięta, ale nie udało się usunąć wszystkich wiadomości z Discorda.'
        : null,
      discord,
    })
  } catch (error) {
    console.error('Błąd usuwania wyprawy:', error)
    await recordSystemEvent({
      source: 'backend',
      eventType: 'expedition_delete_failed',
      message: error?.message || 'Nieznany błąd usuwania wyprawy.',
    })
    return jsonError('Wystąpił błąd podczas usuwania wyprawy.', 500)
  }
}
