import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const rawNick = searchParams.get('nick')
  const region = searchParams.get('region') || 'europe' // Domyślnie Europa

  if (!rawNick || rawNick.trim().length < 2) {
    return NextResponse.json({ error: 'Nick musi mieć co najmniej 2 znaki' }, { status: 400 })
  }

  const cleanNick = rawNick.trim()

  // Dobieramy odpowiednią subdomenę API Albiona zależnie od regionu
  let baseUrl = 'https://gameinfo-ams.albiononline.com/api/gameinfo' // Europa (AMS)
  if (region === 'america') {
    baseUrl = 'https://gameinfo.albiononline.com/api/gameinfo' // Ameryka (West)
  } else if (region === 'asia') {
    baseUrl = 'https://gameinfo-sgp.albiononline.com/api/gameinfo' // Azja (SGP)
  }

  try {
    // 1. Zapytanie wyszukujące gracza
    const searchUrl = `${baseUrl}/search?q=${encodeURIComponent(cleanNick)}`
    
    const searchRes = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
      },
      cache: 'no-store'
    })

    if (!searchRes.ok) {
      return NextResponse.json({ error: 'Błąd odpowiedzi z serwera Albiona' }, { status: searchRes.status })
    }

    const searchData = await searchRes.json()

    if (!searchData || !searchData.players || searchData.players.length === 0) {
      return NextResponse.json({ 
        error: `Nie znaleziono gracza "${cleanNick}" na serwerze ${region.toUpperCase()}. Sprawdź poprawność nicku lub wybierz inny serwer.` 
      }, { status: 404 })
    }

    // Dopasowanie nazwy postaci
    const playerData = searchData.players.find(
      p => p.Name.toLowerCase() === cleanNick.toLowerCase()
    ) || searchData.players[0]

    // 2. Pobranie szczegółowych statystyk po ID
    const statsUrl = `${baseUrl}/players/${playerData.Id}`
    const statsRes = await fetch(statsUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
      },
      cache: 'no-store'
    })

    if (statsRes.ok) {
      const fullStats = await statsRes.json()
      return NextResponse.json(fullStats)
    }

    // Fallback z danymi z wyszukiwarki
    return NextResponse.json({
      Id: playerData.Id,
      Name: playerData.Name,
      GuildName: playerData.GuildName || 'Bez Gildii',
      AllianceName: playerData.AllianceName || '',
      KillFame: playerData.KillFame || 0,
      DeathFame: playerData.DeathFame || 0,
      FameRatio: playerData.FameRatio || 0,
      LifetimeStatistics: { PvE: { Total: 0 } }
    })

  } catch (err) {
    console.error('Błąd w routcie Killboardu:', err)
    return NextResponse.json({ error: 'Błąd połączenia z serwerami Albiona' }, { status: 500 })
  }
}