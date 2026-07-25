// src/app/api/item-image/route.js
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const rawId = searchParams.get('id')

  if (!rawId) {
    return new NextResponse('Missing item id', { status: 400 })
  }

  let sanitizedId = rawId.trim().replace(/\s+/g, '_')

  // Gwarantowane mapowanie laski klątw na działający asset w bazie renderera Albiona
  const upper = sanitizedId.toUpperCase()
  if (upper.includes('CURSESTAFF') || upper.includes('CURSED')) {
    if (upper.includes('T8')) sanitizedId = 'T8_2H_CURSESTAFF'
    else if (upper.includes('T7')) sanitizedId = 'T7_2H_CURSESTAFF'
    else if (upper.includes('T6')) sanitizedId = 'T6_2H_CURSESTAFF'
    else if (upper.includes('T5')) sanitizedId = 'T5_2H_CURSESTAFF'
    else sanitizedId = 'T4_2H_CURSESTAFF'
  }
  if (upper.includes('POTION_HEAL')) {
    sanitizedId = 'T4_POTION_HEAL'
  }

  const externalUrl = `https://render.albiononline.com/v1/item/${sanitizedId}.png`

  try {
    const res = await fetch(externalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    })

    if (!res.ok) {
      return new NextResponse('Image not found', { status: 404 })
    }

    const buffer = await res.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    })
  } catch (err) {
    return new NextResponse('Error fetching image', { status: 500 })
  }
}