import { NextResponse } from 'next/server'
import { safePortalNext } from '@/lib/authFlow'
import { createServerSupabaseClient } from '@/lib/server/supabaseSession'

const EMAIL_OTP_TYPES = new Set([
  'email',
  'email_change',
  'invite',
  'magiclink',
  'recovery',
  'signup',
])

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = safePortalNext(requestUrl.searchParams.get('next'), '/')
  const destination = new URL(next, requestUrl.origin)

  if (!tokenHash || !EMAIL_OTP_TYPES.has(type)) {
    destination.searchParams.set('auth_error', 'invalid_token')
    return NextResponse.redirect(destination)
  }

  try {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    })

    if (error) throw error
  } catch (error) {
    console.error('Błąd weryfikacji linku e-mail w /auth/confirm:', error)
    destination.searchParams.set('auth_error', 'invalid_token')
  }

  return NextResponse.redirect(destination)
}
