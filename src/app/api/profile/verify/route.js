import { NextResponse } from 'next/server'

import { ALBION_REGIONS, AlbionApiError, getAlbionPlayerOverview } from '@/lib/server/albionApi'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { createSupabaseAdminClient, requireApiUser } from '@/lib/server/supabaseAdmin'
import { cleanAlbionId, cleanEnum } from '@/lib/server/validation'

const jsonError = (message, status, headers) => (
  NextResponse.json({ error: message }, { status, headers })
)

const SERVER_LABELS = {
  europe: 'Europa',
  america: 'Ameryka',
  asia: 'Azja',
}

export async function POST(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const rateLimit = await checkRateLimit(`profile-verify:${auth.user.id}`, {
      limit: 8,
      windowMs: 60 * 60 * 1000,
    })
    if (!rateLimit.allowed) {
      return jsonError('Limit prób weryfikacji został osiągnięty.', 429, {
        'Retry-After': String(rateLimit.retryAfter),
      })
    }

    const body = await request.json().catch(() => null)
    const playerId = cleanAlbionId(body?.playerId)
    const region = cleanEnum(body?.region, Object.keys(ALBION_REGIONS))
    if (!playerId || !region) return jsonError('Nieprawidłowa postać lub serwer Albionu.', 400)

    const overview = await getAlbionPlayerOverview(playerId, region, 3)
    const player = overview?.player
    if (!player?.id || !player?.name) return jsonError('Nie znaleziono postaci w API Albionu.', 404)

    const verifiedAt = new Date().toISOString()
    const profile = {
      ingame_nick: player.name,
      guild_name: player.guildName || '',
      main_server: SERVER_LABELS[region],
      is_verified: true,
      verified_player_id: player.id,
      verified_server: SERVER_LABELS[region],
      pvp_fame: player.killFame || 0,
      pve_fame: player.fame?.pve || 0,
      verified_at: verifiedAt,
      updated_at: verifiedAt,
    }

    const { error } = await createSupabaseAdminClient()
      .from('profiles')
      .update(profile)
      .eq('id', auth.user.id)
    if (error) throw error

    return NextResponse.json({ profile }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof AlbionApiError) {
      return jsonError(error.message, error.status || 502)
    }

    console.error('Błąd serwerowej weryfikacji postaci:', error)
    return jsonError('Nie udało się zweryfikować postaci.', 500)
  }
}
