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

const PROFILE_FIELDS = 'ingame_nick, guild_name, main_server, is_verified, verified_player_id, verified_server, verified_region, pvp_fame, pve_fame, verified_at'

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
    const admin = createSupabaseAdminClient()
    const { data: existingLink, error: existingLinkError } = await admin
      .from('profiles')
      .select('id')
      .eq('verified_region', region)
      .ilike('verified_player_id', player.id)
      .eq('is_verified', true)
      .neq('id', auth.user.id)
      .maybeSingle()
    if (existingLinkError) throw existingLinkError
    if (existingLink) {
      return jsonError('Ta postać jest już przypięta do innego konta portalu.', 409)
    }

    const profile = {
      ingame_nick: player.name,
      guild_name: player.guildName || '',
      main_server: SERVER_LABELS[region],
      is_verified: true,
      verified_player_id: player.id,
      verified_server: SERVER_LABELS[region],
      verified_region: region,
      pvp_fame: player.killFame || 0,
      pve_fame: player.fame?.pve || 0,
      verified_at: verifiedAt,
      updated_at: verifiedAt,
    }

    const { data: savedProfile, error } = await admin
      .from('profiles')
      .update(profile)
      .eq('id', auth.user.id)
      .select(PROFILE_FIELDS)
      .single()
    if (error) throw error

    return NextResponse.json({ profile: savedProfile }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    if (error instanceof AlbionApiError) {
      return jsonError(error.message, error.status || 502)
    }

    if (error?.code === '23505') {
      return jsonError('Ta postać jest już przypięta do innego konta portalu.', 409)
    }

    console.error('Błąd serwerowego przypięcia postaci:', error)
    return jsonError('Nie udało się przypiąć postaci.', 500)
  }
}

export async function DELETE(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const rateLimit = await checkRateLimit(`profile-unlink:${auth.user.id}`, {
      limit: 12,
      windowMs: 60 * 60 * 1000,
    })
    if (!rateLimit.allowed) {
      return jsonError('Limit zmian przypięcia został osiągnięty.', 429, {
        'Retry-After': String(rateLimit.retryAfter),
      })
    }

    const unlinkedAt = new Date().toISOString()
    const { data: profile, error } = await createSupabaseAdminClient()
      .from('profiles')
      .update({
        is_verified: false,
        verified_player_id: null,
        verified_server: null,
        verified_region: null,
        pvp_fame: 0,
        pve_fame: 0,
        verified_at: null,
        updated_at: unlinkedAt,
      })
      .eq('id', auth.user.id)
      .select(PROFILE_FIELDS)
      .single()
    if (error) throw error

    return NextResponse.json({ profile }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Błąd odłączania postaci:', error)
    return jsonError('Nie udało się odłączyć postaci.', 500)
  }
}
