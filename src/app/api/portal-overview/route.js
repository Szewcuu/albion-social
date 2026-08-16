import { NextResponse } from 'next/server'

import { createSupabaseAdminClient, requireApiUser } from '@/lib/server/supabaseAdmin'

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

    const { data, error } = await createSupabaseAdminClient().rpc('portal_overview_stats')
    if (error) throw error

    return NextResponse.json(
      { stats: normalizeStats(data) },
      { headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' } },
    )
  } catch (error) {
    console.error('Nie udało się pobrać podsumowania portalu:', error)
    return NextResponse.json({ error: 'Nie udało się pobrać podsumowania portalu.' }, { status: 500 })
  }
}
