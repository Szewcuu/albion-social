import { NextResponse } from 'next/server'

import {
  createSupabaseAdminClient,
  createSupabaseRequestClient,
  isPortalStaff,
  requireApiUser,
} from '@/lib/server/supabaseAdmin'

const jsonError = (message, status) => NextResponse.json({ error: message }, { status })

export async function GET(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)
    const supabase = createSupabaseRequestClient(request)
    if (!(await isPortalStaff(supabase, auth.user.id))) return jsonError('Nie masz uprawnień personelu moderacyjnego.', 403)

    const admin = createSupabaseAdminClient()
    const { data, error } = await admin
      .from('moderation_audit_log')
      .select('id, actor_id, actor_role, action, entity_type, entity_id, reason, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error

    const actorIds = [...new Set((data || []).map((entry) => entry.actor_id).filter(Boolean))]
    const { data: actors, error: actorsError } = actorIds.length
      ? await admin.from('profiles').select('id, username').in('id', actorIds)
      : { data: [], error: null }
    if (actorsError) throw actorsError
    const actorNames = new Map((actors || []).map((actor) => [actor.id, actor.username]))

    return NextResponse.json({ entries: (data || []).map((entry) => ({
      id: entry.id,
      actorId: entry.actor_id,
      actorName: entry.actor_id ? actorNames.get(entry.actor_id) || 'Nieznany użytkownik' : 'Konto usunięte',
      actorRole: entry.actor_role,
      action: entry.action,
      entityType: entry.entity_type,
      entityId: entry.entity_id,
      reason: entry.reason,
      createdAt: entry.created_at,
    })) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Błąd dziennika moderacji:', error)
    return jsonError('Nie udało się pobrać dziennika moderacji.', 500)
  }
}
