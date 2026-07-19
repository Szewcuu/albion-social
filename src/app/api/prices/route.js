import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const item = searchParams.get('item')
  const city = searchParams.get('city')

  if (!item || !city) {
    return NextResponse.json({ error: 'Brak parametrów item lub city' }, { status: 400 })
  }

  try {
    // Serwer Next.js pobiera dane bez problemów z CORS
    const res = await fetch(
      `https://europe.albion-online-data.com/api/v2/stats/prices/${item}?locations=${city},Caerleon`,
      { cache: 'no-store' }
    )
    const data = await res.json()
    
    return NextResponse.json(data)
  } catch (error) {
    console.error('Błąd serwera przy pobieraniu z Albion API:', error)
    return NextResponse.json({ error: 'Błąd zewnętrznego API' }, { status: 500 })
  }
}