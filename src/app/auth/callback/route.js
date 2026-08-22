import { NextResponse } from 'next/server'
import { portalAuth } from '@/lib/supabaseAuth'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  if (code) {
    try {
      await portalAuth.exchangeCodeForSession(code)
    } catch (err) {
      console.error('Błąd wymiany kodu OAuth w /auth/callback:', err)
    }
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin))
}
