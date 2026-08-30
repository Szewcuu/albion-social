import { NextResponse } from 'next/server'
import { getAlbionNews } from '@/lib/server/albionNews'

export async function GET() {
  const result = await getAlbionNews()
  return NextResponse.json(result, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400' },
  })
}
