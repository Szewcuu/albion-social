import { NextResponse } from 'next/server'

import { parseProfileCard } from '@/lib/profilePreferences'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { createSupabaseAdminClient, requireApiUser } from '@/lib/server/supabaseAdmin'

const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' }
const jsonError = (message, status, headers) => NextResponse.json(
  { error: message },
  { status, headers: { ...NO_STORE_HEADERS, ...headers } },
)

export async function PATCH(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const rateLimit = await checkRateLimit(`profile-card:${auth.user.id}`, {
      limit: 20,
      windowMs: 10 * 60_000,
    })
    if (!rateLimit.allowed) {
      return jsonError('Zapisujesz profil zbyt często. Spróbuj ponownie później.', 429, {
        'Retry-After': String(rateLimit.retryAfter),
      })
    }

    const parsed = parseProfileCard(await request.json().catch(() => null))
    if (parsed.error) return jsonError(parsed.error, 400)

    const admin = createSupabaseAdminClient()
    const { data: currentProfile, error: profileError } = await admin
      .from('profiles')
      .select('ingame_nick, main_server, is_verified, verified_player_id')
      .eq('id', auth.user.id)
      .maybeSingle()
    if (profileError) throw profileError
    if (!currentProfile) return jsonError('Nie znaleziono profilu użytkownika.', 404)

    if (parsed.value.featuredBuildIds.length) {
      const { data: ownedBuilds, error: buildsError } = await admin
        .from('builds')
        .select('id')
        .eq('user_id', auth.user.id)
        .eq('status', 'visible')
        .in('id', parsed.value.featuredBuildIds)
      if (buildsError) throw buildsError
      if ((ownedBuilds || []).length !== parsed.value.featuredBuildIds.length) {
        return jsonError('Wyróżnić można wyłącznie własne, publiczne buildy.', 400)
      }
    }

    const characterIsVerified = currentProfile.is_verified === true && Boolean(currentProfile.verified_player_id)
    const updates = {
      ingame_nick: characterIsVerified ? currentProfile.ingame_nick : parsed.value.ingameNick,
      main_server: characterIsVerified ? currentProfile.main_server : parsed.value.mainServer,
      guild_name: parsed.value.guildName,
      main_role: parsed.value.mainRole,
      avg_ip: parsed.value.avgIp,
      bio: parsed.value.bio,
      favorite_builds_public: parsed.value.favoriteBuildsPublic,
      favorite_roles: parsed.value.favoriteRoles,
      featured_build_ids: parsed.value.featuredBuildIds,
      updated_at: new Date().toISOString(),
    }

    const { data: profile, error: updateError } = await admin
      .from('profiles')
      .update(updates)
      .eq('id', auth.user.id)
      .select('id, ingame_nick, main_server, guild_name, main_role, avg_ip, bio, favorite_builds_public, favorite_roles, featured_build_ids')
      .single()
    if (updateError) throw updateError

    return NextResponse.json({ profile }, { headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error('Błąd zapisu publicznej karty profilu:', error)
    return jsonError('Nie udało się zapisać karty postaci.', 500)
  }
}
