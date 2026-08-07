import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  if (code) {
    try {
      await supabase.auth.exchangeCodeForSession(code)
    } catch (err) {
      console.error('Błąd wymiany kodu OAuth w /auth/callback:', err)
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
