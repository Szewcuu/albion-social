import { NextResponse } from 'next/server'

import { createSupabaseAdminClient, requireApiUser } from '@/lib/server/supabaseAdmin'
import { readProductDirection } from '@/lib/server/productDirection'

const EMPTY_STATS = {
  verifiedPlayers: 0,
  totalPvpFame: 0,
  activeBuilds: 0,
  activeMarketOffers: 0,
  guildsCount: 0,
}

function normalizeStats(value) {
  return Object.fromEntries(Object.keys(EMPTY_STATS).map((key) => [
    key,
    Math.max(0, Number(value?.[key]) || 0),
  ]))
}

export async function GET(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status })

    const supabase = createSupabaseAdminClient()
    const [{ data, error }, productDirection] = await Promise.all([
      supabase.rpc('portal_overview_stats'),
      readProductDirection(supabase, auth.user.id),
    ])
    if (error) throw error

    return NextResponse.json(
      { stats: normalizeStats(data), productDirection },
      { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' } },
    )
  } catch (error) {
    console.error('Nie udało się pobrać podsumowania portalu:', error)
    return NextResponse.json({ error: 'Nie udało się pobrać podsumowania portalu.' }, { status: 500 })
  }
}
