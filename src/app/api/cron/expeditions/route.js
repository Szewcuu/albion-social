import { NextResponse } from 'next/server'

import {
  deleteExpeditionDiscordMessages,
  deleteExpeditionRecords,
  getExpeditionCutoff,
} from '@/lib/server/expeditionCleanup'
import { createSupabaseAdminClient } from '@/lib/server/supabaseAdmin'

export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Brak autoryzacji.' }, { status: 401 })
  }

  try {
    const supabase = createSupabaseAdminClient()
    const cutoff = getExpeditionCutoff().toISOString()
    const { data: expired, error } = await supabase
      .from('expeditions')
      .select('id, discord_message_id, full_party_message_id')
      .lt('created_at', cutoff)
      .limit(100)

    if (error) throw new Error('Nie udało się pobrać wygasłych wypraw.')

    const results = []
    for (const expedition of expired || []) {
      try {
        const discord = await deleteExpeditionDiscordMessages(expedition)
        await deleteExpeditionRecords(supabase, expedition.id)
        results.push({ id: expedition.id, deleted: true, discord })
      } catch (cleanupError) {
        results.push({ id: expedition.id, deleted: false, error: cleanupError.message })
      }
    }

    return NextResponse.json({
      success: results.every((result) => result.deleted),
      cutoff,
      checked: expired?.length || 0,
      deleted: results.filter((result) => result.deleted).length,
      failed: results.filter((result) => !result.deleted).length,
      results,
    })
  } catch (error) {
    console.error('Błąd automatycznego czyszczenia wypraw:', error)
    return NextResponse.json({ error: 'Nie udało się wyczyścić wygasłych wypraw.' }, { status: 500 })
  }
}
