import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { isPublicPortalPath } from '@/lib/authRoutes'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function redirectWithCookies(request, response, pathname) {
  const redirectResponse = NextResponse.redirect(new URL(pathname, request.url))
  response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie))
  return redirectResponse
}

export async function proxy(request) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  const authenticated = Boolean(data?.claims?.sub)

  if (!authenticated && !isPublicPortalPath(request.nextUrl.pathname)) {
    return redirectWithCookies(request, response, '/')
  }

  return response
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|.*\\.[^/]+$).*)',
  ],
}
