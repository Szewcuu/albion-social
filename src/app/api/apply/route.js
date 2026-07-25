import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const body = await request.json()
    const { guildName, webhookUrl, ingameNick, totalFame, mainRole, message, userDiscord } = body

    if (!ingameNick || !totalFame || !mainRole) {
      return NextResponse.json({ error: 'Uzupełnij wymagane pola' }, { status: 400 })
    }

    // Konstrukcja eleganckiej wiadomości Discord (Embed)
    const discordEmbed = {
      embeds: [
        {
          title: `⚔️ Nowa aplikacja do rekrutacji: ${guildName}`,
          color: 0xc59b27, // Złoty kolor Albion
          fields: [
            { name: '👤 Nick w grze', value: ingameNick, inline: true },
            { name: '📊 Sława / Fame', value: totalFame, inline: true },
            { name: '🛡️ Główna Rola', value: mainRole, inline: true },
            { name: '💬 Konto Discord', value: `@${userDiscord}`, inline: false },
            { name: '📜 Wiadomość / Doświadczenie', value: message || 'Brak wiadomości.', inline: false },
          ],
          footer: {
            text: 'Albion Online Polska Portal • Rekrutacja',
          },
          timestamp: new Date().toISOString(),
        },
      ],
    }

    // Jeśli gildia podała swój Webhook, wysyłamy powiadomienie na ich Discorda
    if (webhookUrl) {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discordEmbed),
      })
    }

    return NextResponse.json({ success: true, message: 'Aplikacja wysłana pomyślnie!' })
  } catch (error) {
    console.error('Błąd wysyłania aplikacji:', error)
    return NextResponse.json({ error: 'Wystąpił błąd serwera.' }, { status: 500 })
  }
}