import { NextResponse } from 'next/server'

import { checkRateLimit } from '@/lib/server/rateLimit'
import {
  createSupabaseAdminClient,
  requireApiUser,
} from '@/lib/server/supabaseAdmin'

const CONFIRMATION = 'USUŃ KONTO'
const jsonError = (message, status, headers) => (
  NextResponse.json({ error: message }, { status, headers })
)

export async function DELETE(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const rateLimit = await checkRateLimit(`account-delete:${auth.user.id}`, {
      limit: 3,
      windowMs: 60 * 60 * 1000,
    })
    if (!rateLimit.allowed) {
      return jsonError(
        'Wykonano zbyt wiele prób. Spróbuj ponownie później.',
        429,
        { 'Retry-After': String(rateLimit.retryAfter) },
      )
    }

    const body = await request.json().catch(() => null)
    if (body?.confirmation !== CONFIRMATION) {
      return jsonError(`Wpisz dokładnie frazę „${CONFIRMATION}”.`, 400)
    }

    const supabase = createSupabaseAdminClient()
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_admin')
      .eq('id', auth.user.id)
      .maybeSingle()
    if (profileError) throw profileError

    const isAdmin = profile?.is_admin === true || profile?.role === 'admin'
    if (isAdmin) {
      const { count, error: countError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .or('is_admin.eq.true,role.eq.admin')
      if (countError) throw countError
      if ((count || 0) <= 1) {
        return jsonError('Nie można usunąć ostatniego konta administratora.', 409)
      }
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(auth.user.id)
    if (deleteError) {
      console.error('Supabase odrzucił usunięcie użytkownika:', deleteError.message)
      return jsonError(
        deleteError.message?.toLowerCase().includes('storage')
          ? 'Najpierw usuń pliki należące do tego konta.'
          : 'Nie udało się trwale usunąć konta.',
        500,
      )
    }

    return NextResponse.json(
      { deleted: true },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('Błąd trwałego usuwania konta:', error)
    return jsonError('Nie udało się trwale usunąć konta.', 500)
  }
}
