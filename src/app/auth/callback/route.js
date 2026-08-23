import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/server/supabaseSession'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const providerError = requestUrl.searchParams.get('error')
  const requestedNext = requestUrl.searchParams.get('next') ?? '/'
  const next = requestedNext.startsWith('/') && !requestedNext.startsWith('//')
    ? requestedNext
    : '/'

  if (providerError) {
    return NextResponse.redirect(new URL('/?auth_error=provider', requestUrl.origin))
  }

  if (code) {
    try {
      const supabase = await createServerSupabaseClient()
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) throw error
    } catch (err) {
      console.error('Błąd wymiany kodu OAuth w /auth/callback:', err)
      return NextResponse.redirect(new URL('/?auth_error=callback', requestUrl.origin))
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
