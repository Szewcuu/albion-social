// src/app/api/item-image/route.js
import { NextResponse } from 'next/server'

const FALLBACK_SVG = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="Brak grafiki przedmiotu">
    <rect width="64" height="64" rx="14" fill="#120d0a"/>
    <path d="M21 25h22l-2 25H23l-2-25Z" fill="#d9aa3d" fill-opacity=".16" stroke="#d9aa3d" stroke-width="3"/>
    <path d="M26 25c0-5 2-9 6-9s6 4 6 9" fill="none" stroke="#f0c75e" stroke-width="3" stroke-linecap="round"/>
    <path d="M27 36h10M32 31v10" stroke="#f0c75e" stroke-width="3" stroke-linecap="round"/>
  </svg>
`.trim()

function fallbackImage() {
  return new NextResponse(FALLBACK_SVG, {
    status: 200,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      'X-Item-Image-Fallback': '1',
    },
  })
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const rawId = searchParams.get('id')

  if (!rawId) {
    return new NextResponse('Missing item id', { status: 400 })
  }

  let sanitizedId = rawId.trim().replace(/\s+/g, '_').toUpperCase()

  // Gwarantowane mapowanie laski klątw na działający asset w bazie renderera Albiona
  const upper = sanitizedId
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

  if (!/^T[1-8]_[A-Z0-9_]+(?:@[1-4])?$/.test(sanitizedId)) {
    return fallbackImage()
  }

  const externalUrl = `https://render.albiononline.com/v1/item/${encodeURIComponent(sanitizedId)}.png?size=128`

  try {
    const res = await fetch(externalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    })

    if (!res.ok) return fallbackImage()

    const buffer = await res.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'X-Item-Image-Fallback': '0',
      },
    })
  } catch {
    return fallbackImage()
  }
}
