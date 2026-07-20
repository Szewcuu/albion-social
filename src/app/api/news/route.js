import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Pobieramy najświeższe wieści i aktualizacje o Albionie zbierane przez Google News RSS
    const response = await fetch('https://news.google.com/rss/search?q=Albion+Online&hl=en-US&gl=US&ceid=US:en', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      next: { revalidate: 1800 } // Odświeżaj co 30 minut
    })

    if (!response.ok) {
      throw new Error(`Błąd bramki sieciowej: ${response.status}`)
    }

    const xmlText = await response.text()

    // Sprawdzony, lekki parser regex dla obiektów typu XML <item>
    const items = []
    const itemMatches = xmlText.matchAll(/<item>([\s\S]*?)<\/item>/g)

    for (const match of itemMatches) {
      if (items.length >= 5) break // Tylko 5 najświeższych wpisów
      
      const itemContent = match[1]
      
      // Wyciągamy tytuł (odcinając dopisek o źródle na końcu)
      let title = itemContent.match(/<title>([\s\S]*?)<\/title>/)?.[1] || 'Wiadomość z Albiona'
      title = title.replace(/ - [^-]+$/, '').trim()
                 
      // Wyciągamy link kierujący do artykułu
      const link = itemContent.match(/<link>([\s\S]*?)<\/link>/)?.[1] || 'https://albiononline.com'
      
      // Formatujemy poprawnie datę publikacji
      const pubDateRaw = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || ''
      const pubDate = pubDateRaw ? new Date(pubDateRaw).toLocaleDateString('pl-PL') : 'Niedawno'
      
      // Jako opis wyciągamy nazwę serwisu informacyjnego
      const source = itemContent.match(/<source[\s\S]*?>([\s\S]*?)<\/source>/)?.[1] || 'Oficjalne Media'

      items.push({
        title,
        link,
        pubDate,
        contentSnippet: `Aktualności publikowane przez: ${source}. Kliknij, aby przeczytać pełny raport taktyczny na stronie źródłowej.`
      })
    }

    return NextResponse.json(items)
  } catch (error) {
    console.error('Błąd pobierania stabilnego feedu:', error.message)
    return NextResponse.json({ error: 'Kurier miejski napotkał blokadę' }, { status: 500 })
  }
}