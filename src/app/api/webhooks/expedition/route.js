import { NextResponse } from 'next/server'

// WYSYŁANIE NOWEJ WIADOMOŚCI LUB POWIADOMIENIA
export async function POST(req) {
  try {
    const body = await req.json()
    const { 
      title, activity_type, min_ip, start_time, server, description, creator,
      max_tanks, max_healers, max_dps, max_supports, type 
    } = body

    const webhookUrl = process.env.DISCORD_EXPEDITIONS_WEBHOOK_URL

    if (!webhookUrl) {
      return NextResponse.json({ message: 'Pominięto wysyłanie webhooka (brak URL)' }, { status: 200 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://albion-social.vercel.app'
    const urlWithWait = webhookUrl.includes('?') ? `${webhookUrl}&wait=true` : `${webhookUrl}?wait=true`

    // 1. POWIADOMIENIE: PARTY FULL
    if (type === 'PARTY_FULL') {
      const partyFullRes = await fetch(urlWithWait, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🎉 **DRUŻYNA SKOMPLETOWANA!** Wyprawa **${title}** ma już pełny skład!`,
          embeds: [{
            title: `✅ PEŁNY SKŁAD: ${title}`,
            url: `${appUrl}/wyprawy`,
            description: `Szykujcie ekwipunek! Zbiórka zaplanowana na **${start_time}**.`,
            color: 0x10b981,
            fields: [
              { name: '🎯 Aktywność', value: activity_type || 'Wyprawa', inline: true },
              { name: '👑 Lider Drużyny', value: creator || 'Lider', inline: true },
            ],
            footer: { text: 'Albion Online Polska Portal • Dołącz do innych wypraw' },
            timestamp: new Date().toISOString()
          }]
        })
      })

      if (partyFullRes.ok) {
        const discordData = await partyFullRes.json()
        return NextResponse.json({ success: true, messageId: discordData.id })
      }

      return NextResponse.json({ success: true })
    }

    // 2. NOWA WYPRAWA
    let embedColor = 0xc59b27
    if (activity_type?.includes('Statyk')) embedColor = 0x3b82f6
    else if (activity_type?.includes('Karawana')) embedColor = 0xf59e0b
    else if (activity_type?.includes('Ava') || activity_type?.includes('Hellgate')) embedColor = 0xa855f7
    else if (activity_type?.includes('Ganking') || activity_type?.includes('Roaming')) embedColor = 0xef4444

    const rolesList = [
      max_tanks > 0 ? `🛡️ Tank: **${max_tanks}**` : null,
      max_healers > 0 ? `💚 Heal: **${max_healers}**` : null,
      max_dps > 0 ? `⚔️ DPS: **${max_dps}**` : null,
      max_supports > 0 ? `🔮 Supp: **${max_supports}**` : null,
    ].filter(Boolean).join(' • ') || 'Dowolny skład'

    const discordEmbed = {
      title: `⚔️ NOWA WYPRAWA: ${title}`,
      url: `${appUrl}/wyprawy`,
      description: description ? `> ${description}` : 'Brak dodatkowego opisu. Kliknij poniżej, aby dołączyć!',
      color: embedColor,
      fields: [
        { name: '🎯 Aktywność', value: activity_type || 'Statyk', inline: true },
        { name: '🌐 Serwer', value: server || 'Europa', inline: true },
        { name: '⏰ Czas Zbiórki', value: start_time || '19:00 UTC', inline: true },
        { name: '🛡️ Wymagane IP', value: `${min_ip || 1200}+`, inline: true },
        { name: '👑 Lider Drużyny', value: creator || 'Gracz', inline: true },
        { name: '👥 Poszukiwane Miejsca', value: rolesList, inline: false },
      ],
      footer: { text: 'Albion Online Polska Portal • Kliknij nagłówek, aby otworzyć wyprawy' },
      timestamp: new Date().toISOString()
    }

    const discordRes = await fetch(urlWithWait, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `📢 **Zwołano nową drużynę!** [👉 Kliknij tutaj, aby zarezerwować miejsce!](${appUrl}/wyprawy)`,
        embeds: [discordEmbed]
      })
    })

    if (discordRes.ok) {
      const discordData = await discordRes.json()
      return NextResponse.json({ success: true, messageId: discordData.id })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Błąd wywoływania Webhooka:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// AUTOMATYCZNE USUWANIE WIADOMOŚCI Z DISCORDA
export async function DELETE(req) {
  try {
    const { messageId, fullPartyMessageId } = await req.json()
    const webhookUrl = process.env.DISCORD_EXPEDITIONS_WEBHOOK_URL

    if (!webhookUrl) {
      return NextResponse.json({ message: 'Brak adresu Webhooka' }, { status: 200 })
    }

    const cleanBaseUrl = webhookUrl.split('?')[0]

    // 1. Usuwanie głównego ogłoszenia
    if (messageId) {
      await fetch(`${cleanBaseUrl}/messages/${messageId}`, { method: 'DELETE' })
    }

    // 2. Usuwanie powiadomienia o pełnej drużynie
    if (fullPartyMessageId) {
      await fetch(`${cleanBaseUrl}/messages/${fullPartyMessageId}`, { method: 'DELETE' })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Błąd usuwania z Discorda:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}