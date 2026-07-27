import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Inicjalizacja klienta Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request) {
  try {
    const body = await request.json()
    const { guildId, guildName, guildOwnerId, webhookUrl, ingameNick, totalFame, mainRole, message, userDiscord } = body

    if (!ingameNick || !totalFame || !mainRole) {
      return NextResponse.json({ error: 'Uzupełnij wymagane pola' }, { status: 400 })
    }

    // 1. Wysyłka Powiadomienia na Discord (Embed) jeśli gildia ma Webhook
    if (webhookUrl && webhookUrl.trim() !== '') {
      const discordEmbed = {
        embeds: [
          {
            title: `⚔️ Nowa aplikacja do rekrutacji: ${guildName}`,
            color: 0xc59b27, // Złoty kolor Albion
            fields: [
              { name: '👤 Nick w grze', value: ingameNick, inline: true },
              { name: '📊 Sława / Fame', value: totalFame, inline: true },
              { name: '🛡️ Główna Rola', value: mainRole, inline: true },
              { name: '💬 Konto Discord', value: userDiscord ? `@${userDiscord}` : 'Nieznane', inline: false },
              { name: '📜 Wiadomość / Doświadczenie', value: message || 'Brak wiadomości.', inline: false },
            ],
            footer: {
              text: 'Albion Online Polska Portal • Rekrutacja',
            },
            timestamp: new Date().toISOString(),
          },
        ],
      }

      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(discordEmbed),
        })
      } catch (err) {
        console.error('Błąd wysyłki na Webhook Discorda:', err)
      }
    }

    // 2. Powiadomienie w czasie rzeczywistym dla Lidera Gildii na portalu
    if (guildOwnerId) {
      await supabase.from('notifications').insert([
        {
          user_id: guildOwnerId,
          title: '⚔️ Nowy kandydat do gildii!',
          message: `${ingameNick} złożył podanie do Twojej gildii "${guildName}" (Rola: ${mainRole}, Fame: ${totalFame}).`,
          type: 'info',
          link: '/gildie'
        }
      ])
    }

    return NextResponse.json({ success: true, message: 'Aplikacja została wysłana pomyślnie!' })
  } catch (error) {
    console.error('Błąd wysyłania aplikacji:', error)
    return NextResponse.json({ error: 'Wystąpił błąd serwera.' }, { status: 500 })
  }
}