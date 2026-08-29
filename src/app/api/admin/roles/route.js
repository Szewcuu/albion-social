import { NextResponse } from 'next/server'

import {
  createSupabaseAdminClient,
  createSupabaseRequestClient,
  getPortalRole,
  isPortalAdmin,
  requireApiUser,
} from '@/lib/server/supabaseAdmin'
import { cleanText } from '@/lib/server/validation'
import { isModerationId } from '@/lib/server/moderation'

const ROLES = ['member', 'moderator', 'admin']
const jsonError = (message, status) => NextResponse.json({ error: message }, { status })

async function authorizeAdmin(request) {
  const auth = await requireApiUser(request)
  if (auth.error) return { error: jsonError(auth.error, auth.status) }
  const supabase = createSupabaseRequestClient(request)
  if (!(await isPortalAdmin(supabase, auth.user.id))) return { error: jsonError('Tylko administrator może zarządzać rolami.', 403) }
  return { auth, supabase }
}

export async function GET(request) {
  try {
    const access = await authorizeAdmin(request)
    if (access.error) return access.error

    const { data, error } = await createSupabaseAdminClient()
      .from('profiles')
      .select('id, username, avatar_url, role, is_admin')
      .order('username', { ascending: true })
      .limit(200)
    if (error) throw error

    return NextResponse.json({
      currentRole: await getPortalRole(access.supabase, access.auth.user.id),
      users: (data || []).map((profile) => ({
        id: profile.id,
        username: profile.username || 'Użytkownik bez nazwy',
        avatarUrl: profile.avatar_url || null,
        role: profile.is_admin ? 'admin' : profile.role || 'member',
        isCurrentUser: profile.id === access.auth.user.id,
      })),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Błąd listy ról:', error)
    return jsonError('Nie udało się pobrać ról użytkowników.', 500)
  }
}

export async function PATCH(request) {
  try {
    const access = await authorizeAdmin(request)
    if (access.error) return access.error

    const body = await request.json().catch(() => null)
    const userId = body?.userId
    const role = typeof body?.role === 'string' && ROLES.includes(body.role) ? body.role : null
    const reason = cleanText(body?.reason, { min: 3, max: 500 })
    if (!isModerationId(userId) || !role || !reason) return jsonError('Nieprawidłowa zmiana roli.', 400)

    const { data, error } = await createSupabaseAdminClient().rpc('service_set_portal_role', {
      p_actor_id: access.auth.user.id,
      p_user_id: userId,
      p_role: role,
      p_reason: reason,
    })
    if (error) throw error
    return NextResponse.json({ userId, role: data })
  } catch (error) {
    console.error('Błąd zmiany roli:', error)
    return jsonError(error?.message?.includes('ostatniego administratora') ? 'Nie można zdegradować ostatniego administratora.' : 'Nie udało się zmienić roli.', 500)
  }
}
