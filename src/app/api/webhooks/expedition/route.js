import { NextResponse } from 'next/server'

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

    // Adres Twojego portalu
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://albion-social.vercel.app'

    // POWIADOMIENIE 1: ZEBRANO PEŁNY SKŁAD (PARTY FULL)
    if (type === 'PARTY_FULL') {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `🎉 **DRUŻYNA SKOMPLETOWANA!** Wyprawa **${title}** ma już pełny skład!`,
          embeds: [{
            title: `✅ PEŁNY SKŁAD: ${title}`,
            url: `${appUrl}/wyprawy`,
            description: `Szykujcie ekwipunek! Zbiórka zaplanowana na **${start_time}**.`,
            color: 0x10b981, // Zielony akcent sukcesu
            fields: [
              { name: '🎯 Aktywność', value: activity_type, inline: true },
              { name: '👑 Lider Drużyny', value: creator, inline: true },
            ],
            footer: { text: 'Albion Online Polska Portal • Dołącz do innych wypraw' },
            timestamp: new Date().toISOString()
          }]
        })
      })
      return NextResponse.json({ success: true })
    }

    // POWIADOMIENIE 2: NOWA WYPRAWA (DEDYKOWANE KOLORY)
    let embedColor = 0xc59b27 // Domyślny Złoty

    if (activity_type?.includes('Statyk')) {
      embedColor = 0x3b82f6 // Niebieski
    } else if (activity_type?.includes('Karawana')) {
      embedColor = 0xf59e0b // Złoty / Bursztynowy
    } else if (activity_type?.includes('Ava') || activity_type?.includes('Hellgate')) {
      embedColor = 0xa855f7 // Fioletowy
    } else if (activity_type?.includes('Ganking') || activity_type?.includes('Roaming')) {
      embedColor = 0xef4444 // Czerwony
    }

    // Formatowanie rozpiski ról
    const rolesList = [
      max_tanks > 0 ? `🛡️ Tank: **${max_tanks}**` : null,
      max_healers > 0 ? `💚 Heal: **${max_healers}**` : null,
      max_dps > 0 ? `⚔️ DPS: **${max_dps}**` : null,
      max_supports > 0 ? `🔮 Supp: **${max_supports}**` : null,
    ].filter(Boolean).join(' • ') || 'Dowolny skład'

    const discordEmbed = {
      title: `⚔️ NOWA WYPRAWA: ${title}`,
      url: `${appUrl}/wyprawy`, // Klikalny tytuł przekierowujący na portal
      description: description ? `> ${description}` : 'Brak dodatkowego opisu. Kliknij poniżej, aby dołączyć!',
      color: embedColor,
      fields: [
        { name: '🎯 Aktywność', value: activity_type, inline: true },
        { name: '🌐 Serwer', value: server, inline: true },
        { name: '⏰ Czas Zbiórki', value: start_time, inline: true },
        { name: '🛡️ Wymagane IP', value: `${min_ip}+`, inline: true },
        { name: '👑 Lider Drużyny', value: creator, inline: true },
        { name: '👥 Poszukiwane Miejsca', value: rolesList, inline: false },
      ],
      footer: {
        text: 'Albion Online Polska Portal • Kliknij nagłówek, aby otworzyć wyprawy'
      },
      timestamp: new Date().toISOString()
    }

    // Dodatkowy ping @here tylko dla Karawan Handlowych
    const contentText = activity_type?.includes('Karawana') 
      ? `📢 @here **Zwołano ochronę Karawany Handlowej do Caerleon!** [👉 Dołącz do składu!](${appUrl}/wyprawy)`
      : `📢 **Zwołano nową drużynę!** [👉 Kliknij tutaj, aby zarezerwować miejsce!](${appUrl}/wyprawy)`

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: contentText,
        embeds: [discordEmbed]
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Błąd wywoływania Webhooka:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}