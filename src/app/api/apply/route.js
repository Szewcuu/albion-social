import { NextResponse } from 'next/server'

import { checkRateLimit } from '@/lib/server/rateLimit'
import {
  createSupabaseAdminClient,
  requireApiUser,
} from '@/lib/server/supabaseAdmin'
import {
  cleanText,
  isSafeDiscordWebhook,
} from '@/lib/server/validation'

const jsonError = (message, status, headers) => (
  NextResponse.json({ error: message }, { status, headers })
)

export async function POST(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const rateLimit = checkRateLimit(`guild-apply:${auth.user.id}`, {
      limit: 3,
      windowMs: 15 * 60 * 1000,
    })

    if (!rateLimit.allowed) {
      return jsonError(
        'Wysłano zbyt wiele podań. Spróbuj ponownie później.',
        429,
        { 'Retry-After': String(rateLimit.retryAfter) },
      )
    }

    const body = await request.json()
    const guildId = cleanText(body.guildId, { min: 1, max: 100 })
    const ingameNick = cleanText(body.ingameNick, { min: 2, max: 30 })
    const totalFame = cleanText(body.totalFame, { min: 1, max: 50 })
    const mainRole = cleanText(body.mainRole, { min: 2, max: 40 })
    const message = cleanText(body.message || '', { max: 1000 })

    if (!guildId || !ingameNick || !totalFame || !mainRole || message === null) {
      return jsonError('Nieprawidłowe dane formularza.', 400)
    }

    const supabase = createSupabaseAdminClient()
    const { data: guild, error: guildError } = await supabase
      .from('guilds')
      .select('id, name, user_id, webhook_url')
      .eq('id', guildId)
      .maybeSingle()

    if (guildError) {
      throw new Error('Nie udało się odczytać gildii.')
    }

    if (!guild) {
      return jsonError('Nie znaleziono wskazanej gildii.', 404)
    }

    const metadata = auth.user.user_metadata || {}
    const userDiscord = cleanText(
      metadata.custom_claims?.global_name
        || metadata.full_name
        || metadata.name
        || auth.user.email
        || 'Nieznany użytkownik',
      { min: 1, max: 100 },
    ) || 'Nieznany użytkownik'

    let discordDelivered = false
    if (isSafeDiscordWebhook(guild.webhook_url)) {
      const discordResponse = await fetch(guild.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        redirect: 'error',
        signal: AbortSignal.timeout(8_000),
        body: JSON.stringify({
          allowed_mentions: { parse: [] },
          embeds: [
            {
              title: `⚔️ Nowa aplikacja do rekrutacji: ${guild.name}`,
              color: 0xc59b27,
              fields: [
                { name: '👤 Nick w grze', value: ingameNick, inline: true },
                { name: '📊 Sława / Fame', value: totalFame, inline: true },
                { name: '🛡️ Główna rola', value: mainRole, inline: true },
                { name: '💬 Konto Discord', value: userDiscord, inline: false },
                {
                  name: '📜 Wiadomość / doświadczenie',
                  value: message || 'Brak wiadomości.',
                  inline: false,
                },
              ],
              footer: { text: 'Albion Online Polska Portal • Rekrutacja' },
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      })

      discordDelivered = discordResponse.ok
    }

    const { error: notificationError } = await supabase
      .from('notifications')
      .insert([
        {
          user_id: guild.user_id,
          title: '⚔️ Nowy kandydat do gildii!',
          message: `${ingameNick} złożył podanie do Twojej gildii "${guild.name}" (Rola: ${mainRole}, Fame: ${totalFame}).`,
          type: 'info',
          link: '/gildie',
        },
      ])

    if (notificationError) {
      throw new Error('Nie udało się zapisać powiadomienia dla gildii.')
    }

    return NextResponse.json({
      success: true,
      discordDelivered,
      message: 'Aplikacja została wysłana pomyślnie!',
    })
  } catch (error) {
    console.error('Błąd wysyłania aplikacji:', error)
    return jsonError('Wystąpił błąd serwera.', 500)
  }
}
