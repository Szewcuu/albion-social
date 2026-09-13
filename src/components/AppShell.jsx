'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { migrateLegacyBrowserSession, portalAuth } from '@/lib/supabaseAuth'
import { authenticatedFetch } from '@/lib/authenticatedFetch'
import { scheduleIdleTask } from '@/lib/clientIdle'
import AppSidebar from './AppSidebar'
import TopBar from './TopBar'
import MobileBottomNav from './MobileBottomNav'
import { PortalSessionProvider } from '@/contexts/PortalSessionContext'

const GUEST_PUBLIC_PATHS = new Set(['/', '/regulamin', '/prywatnosc', '/auth/nowe-haslo'])

function ProtectedRouteLoadingShell() {
  return (
    <div className="app-shell auth-pending" role="status" aria-live="polite" aria-label="Sprawdzanie sesji">
      <div className="world-backdrop" aria-hidden="true" />
      <aside className="sidebar" aria-hidden="true">
        <div className="border-b border-white/[.06] p-5">
          <div className="h-11 w-40 animate-pulse rounded bg-white/[.04]" />
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar" aria-hidden="true">
          <div className="h-4 w-36 animate-pulse rounded bg-white/[.04]" />
          <div className="h-10 w-28 animate-pulse rounded bg-white/[.04]" />
        </header>

        <main id="main-content" className="app-content" aria-hidden="true">
          <div className="page-content">
            <div className="subpage-header">
              <div className="h-10 w-64 max-w-[70%] animate-pulse rounded bg-white/[.05]" />
              <div className="mt-2 h-[22px] w-[520px] max-w-[85%] animate-pulse rounded bg-white/[.035]" />
            </div>
            <div className="relative z-10 mx-auto mt-2 w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
              <div className="panel min-h-[200px] animate-pulse rounded-3xl p-5">
                <div className="flex items-center gap-3">
                  <span className="loading-crest" />
                  <div className="h-4 w-44 rounded bg-white/[.04]" />
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      <span className="sr-only">Sprawdzanie sesji…</span>
    </div>
  )
}

export default function AppShell({ children, initialUser = null }) {
  const [user, setUser] = useState(initialUser)
  const [isAdmin, setIsAdmin] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationState, setNotificationState] = useState({ loading: false, error: '' })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authReady, setAuthReady] = useState(Boolean(initialUser))
  const hydratedUserIdRef = useRef(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
  }, [pathname])

  const loginWithOAuth = useCallback(async (provider, next = '/') => {
    const callback = new URL('/auth/callback', window.location.origin)
    callback.searchParams.set('next', next.startsWith('/') && !next.startsWith('//') ? next : '/')
    const { error } = await portalAuth.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callback.toString() },
    })
    if (error) throw error
  }, [])

  const logout = useCallback(async () => {
    await portalAuth.auth.signOut()
    setUser(null)
    setIsAdmin(false)
  }, [])

  const fetchNotifications = useCallback(async () => {
    setNotificationState({ loading: true, error: '' })
    try {
      const response = await authenticatedFetch('/api/notifications', { cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error)

      setNotifications(result.notifications || [])
      setIsAdmin(['moderator', 'admin'].includes(result.role))
      setNotificationState({ loading: false, error: '' })
    } catch {
      setNotificationState({ loading: false, error: 'Nie udało się pobrać powiadomień.' })
    }
  }, [])

  const hydrateUserServices = useCallback((currentUser) => {
    if (!currentUser) {
      hydratedUserIdRef.current = null
      setNotifications([])
      setIsAdmin(false)
      return
    }
    if (hydratedUserIdRef.current === currentUser.id) return

    hydratedUserIdRef.current = currentUser.id
    void fetchNotifications()
  }, [fetchNotifications])

  const markAllAsRead = useCallback(async () => {
    if (!user) return
    try {
      const response = await authenticatedFetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (!response.ok) throw new Error('notification-update-failed')
    } catch {
      setNotificationState((current) => ({ ...current, error: 'Nie udało się oznaczyć powiadomień jako przeczytane.' }))
      return false
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    return true
  }, [user])

  const markSingleAsRead = useCallback(async (notificationId) => {
    if (!user || !notificationId) return
    setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)))
    try {
      const response = await authenticatedFetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId }),
      })
      if (!response.ok) throw new Error('notification-update-failed')
    } catch {
      // Ignore error
    }
  }, [user])

  useEffect(() => {
    const refresh = () => void fetchNotifications()
    window.addEventListener('portal:notifications-changed', refresh)
    return () => window.removeEventListener('portal:notifications-changed', refresh)
  }, [fetchNotifications])

  useEffect(() => {
    let active = true
    let cancelServices = () => {}

    const applySession = (session) => {
      if (!active) return
      const currentUser = session?.user ?? null
      setUser(currentUser)
      setAuthReady(true)
      cancelServices()
      if (currentUser) {
        cancelServices = scheduleIdleTask(
          () => hydrateUserServices(currentUser),
          { minimumDelay: 1_000, timeout: 1_800 },
        )
      } else {
        cancelServices = () => {}
        hydrateUserServices(null)
      }
    }

    void migrateLegacyBrowserSession().then((migrated) => {
      if (migrated) {
        window.location.reload()
        return
      }

      portalAuth.auth.getSession().then(({ data: { session } }) => {
        applySession(session)
      })
    })

    const { data: { subscription } } = portalAuth.auth.onAuthStateChange((_event, session) => {
      applySession(session)
    })

    return () => {
      active = false
      cancelServices()
      subscription.unsubscribe()
    }
  }, [hydrateUserServices])

  useEffect(() => {
    if (!user?.id) return undefined

    return scheduleIdleTask(() => {
      void import('@/lib/preferenceSync').then(({ syncPortalPreferences }) => (
        syncPortalPreferences(user.id)
      ))
    }, { minimumDelay: 7_000, timeout: 8_000 })
  }, [user?.id])

  useEffect(() => {
    if (!user?.id) return undefined

    let notificationChannel = null
    let supabaseClient = null
    let active = true
    const cancelSubscription = scheduleIdleTask(() => {
      void import('@/lib/supabase').then(({ supabase }) => {
        if (!active) return
        supabaseClient = supabase
        notificationChannel = supabase
          .channel(`notifications-${user.id}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
            (payload) => {
              if (payload.eventType === 'INSERT') {
                setNotifications((current) => [payload.new, ...current.filter((item) => item.id !== payload.new.id)].slice(0, 20))
              }
              if (payload.eventType === 'UPDATE') {
                setNotifications((current) => current.map((item) => item.id === payload.new.id ? payload.new : item))
              }
              if (payload.eventType === 'DELETE') {
                setNotifications((current) => current.filter((item) => item.id !== payload.old.id))
              }
            },
          )
          .subscribe()
      })
    }, { minimumDelay: 7_000, timeout: 8_000 })

    return () => {
      active = false
      cancelSubscription()
      if (notificationChannel) supabaseClient.removeChannel(notificationChannel)
    }
  }, [user?.id])

  const guestPublicPage = !user && GUEST_PUBLIC_PATHS.has(pathname)
  const guestBlocked = authReady && !user && !guestPublicPage

  useEffect(() => {
    if (guestBlocked) router.replace('/')
  }, [guestBlocked, router])

  const sessionValue = useMemo(() => ({
    user,
    isAdmin,
    loginWithOAuth,
    logout,
  }), [isAdmin, loginWithOAuth, logout, user])

  if (!authReady && !GUEST_PUBLIC_PATHS.has(pathname)) {
    return <ProtectedRouteLoadingShell />
  }

  if (guestBlocked) {
    return (
      <div className="auth-loading-screen" role="status" aria-live="polite">
        <span className="loading-crest" aria-hidden="true" />
        Powrót do bramy logowania…
      </div>
    )
  }

  const guestLanding = guestPublicPage && pathname === '/'
  const guestLegalPage = guestPublicPage && pathname !== '/'

  return (
    <PortalSessionProvider value={sessionValue}>
    <div className={`app-shell ${guestLanding ? 'guest-landing' : ''} ${guestLegalPage ? 'guest-public' : ''}`}>
      <a href="#main-content" className="skip-link">Przejdź do treści</a>
      <div className="world-backdrop" aria-hidden="true" />
      {user && (
        <AppSidebar
          isOpen={sidebarOpen}
          isAdmin={isAdmin}
          onClose={() => setSidebarOpen(false)}
        />
      )}

      <div className="app-main">
        {!guestLanding && (
          <TopBar
            user={user}
            logout={logout}
            notifications={notifications}
            notificationState={notificationState}
            markAllAsRead={markAllAsRead}
            markSingleAsRead={markSingleAsRead}
            refreshNotifications={() => user?.id && fetchNotifications()}
            onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          />
        )}

        <main id="main-content" className="app-content">{children}</main>
      </div>

      {user && <MobileBottomNav />}
    </div>
    </PortalSessionProvider>
  )
}
