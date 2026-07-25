import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const body = await req.json()
    const { title, activity_type, min_ip, start_time, server, description, creator } = body

    // URL Webhooka pobierany z pliku .env.local
    const webhookUrl = process.env.DISCORD_EXPEDITIONS_WEBHOOK_URL

    if (!webhookUrl) {
      console.warn('Brak skonfigurowanego DISCORD_EXPEDITIONS_WEBHOOK_URL w .env.local')
      return NextResponse.json({ message: 'Pominięto wysyłanie webhooka (brak URL)' }, { status: 200 })
    }

    // Wygląd powiadomienia na Discordzie
    const discordEmbed = {
      title: `⚔️ NOWA WYPRAWA: ${title}`,
      description: description ? `> ${description}` : 'Brak dodatkowego opisu. Dołącz do drużyny na portalu!',
      color: 0xc59b27, // Złoty akcent Caerleon
      fields: [
        { name: '🎯 Aktywność', value: activity_type, inline: true },
        { name: '🌐 Serwer', value: server, inline: true },
        { name: '⏰ Czas Zbiórki', value: start_time, inline: true },
        { name: '🛡️ Wymagane IP', value: `${min_ip}+`, inline: true },
        { name: '👑 Lider Drużyny', value: creator, inline: true },
      ],
      footer: {
        text: 'Albion Online Polska Portal • Tablica Wypraw'
      },
      timestamp: new Date().toISOString()
    }

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '📢 **Zwołano nową drużynę! Dołącz do składu na portalu!**',
        embeds: [discordEmbed]
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Błąd wysyłania Webhooka Discord:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}