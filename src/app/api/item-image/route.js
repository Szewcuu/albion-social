// Cache obrazków itemów z Albion render API
// Przechowuje je na Vercel z long cache TTL

const ALBION_RENDER_API = 'https://render.albiononline.com/v1/item'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const itemId = searchParams.get('id')

  // Walidacja
  if (!itemId) {
    return new Response(JSON.stringify({ error: 'Missing id parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  // Czyszczenie ID (remove enchant level @X)
  const cleanId = itemId.split('@')[0]

  try {
    // Pobierz obrazek z Albion API
    const imageUrl = `${ALBION_RENDER_API}/${cleanId}.png?quality=1`
    
    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      // Timeout po 5 sekundach
      signal: AbortSignal.timeout(5000)
    })

    if (!response.ok) {
      console.warn(`Failed to fetch image for ${cleanId}: ${response.status}`)
      return new Response(JSON.stringify({ error: 'Item image not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Pobierz image buffer
    const buffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') || 'image/png'

    // Return z agresywnym cachingiem - 30 dni
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=2592000, immutable', // 30 dni
        'CDN-Cache-Control': 'max-age=2592000'
      }
    })
  } catch (error) {
    console.error(`Error fetching item image for ${cleanId}:`, error.message)
    
    // Na timeout/error zwróć 504 żeby client wiedział że fallback
    return new Response(JSON.stringify({ error: 'Failed to fetch image' }), {
      status: 504,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, max-age=60' // Cache error 1 min
      }
    })
  }
}
