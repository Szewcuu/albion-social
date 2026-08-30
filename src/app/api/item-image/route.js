// src/app/api/item-image/route.js
import { NextResponse } from 'next/server'

const ALLOWED_SIZES = new Set([30, 32, 40, 48, 56, 60, 64, 70, 72, 80, 96, 128])
const ALLOWED_QUALITIES = new Set([1, 2, 3, 4, 5])

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
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
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

  const sanitizedId = rawId.trim().replace(/\s+/g, '_').toUpperCase()
  const requestedSize = Number.parseInt(searchParams.get('size') || '128', 10)
  const requestedQuality = Number.parseInt(searchParams.get('quality') || '1', 10)
  const size = ALLOWED_SIZES.has(requestedSize) ? requestedSize : 128
  const quality = ALLOWED_QUALITIES.has(requestedQuality) ? requestedQuality : 1

  if (!/^T[1-8]_[A-Z0-9_]+(?:@[1-4])?$/.test(sanitizedId)) {
    return fallbackImage()
  }

  const externalUrl = `https://render.albiononline.com/v1/item/${encodeURIComponent(sanitizedId)}.png?quality=${quality}&size=${size}`

  try {
    const res = await fetch(externalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      next: { revalidate: 604800 },
      signal: AbortSignal.timeout(5000),
    })

    if (!res.ok || !res.headers.get('content-type')?.startsWith('image/')) return fallbackImage()

    const buffer = await res.arrayBuffer()
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=2592000',
        'X-Item-Image-Fallback': '0',
      },
    })
  } catch {
    return fallbackImage()
  }
}
