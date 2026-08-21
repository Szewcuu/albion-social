'use client'

import { useState, useEffect, useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { scheduleIdleTask } from '@/lib/clientIdle'
import { syncPortalPreferences } from '@/lib/preferenceSync'
import AppSidebar from './AppSidebar'
import TopBar from './TopBar'
import MobileBottomNav from './MobileBottomNav'
import { PortalSessionProvider } from '@/contexts/PortalSessionContext'

const GUEST_PUBLIC_PATHS = new Set(['/', '/regulamin', '/prywatnosc'])

function hasPersistedSupabaseSession() {
  try {
    return Object.keys(window.localStorage).some((key) => /^sb-.+-auth-token$/.test(key))
  } catch {
    return false
  }
}

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

export default function AppShell({ children }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationState, setNotificationState] = useState({ loading: false, error: '' })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [hasAuthHint, setHasAuthHint] = useState(false)
  const hydratedUserIdRef = useRef(null)
  const pathname = usePathname()
  const router = useRouter()

  useLayoutEffect(() => {
    // Celowo przed pierwszym paintem: istniejąca sesja nie może odsłonić bramki gościa ani wywołać CLS.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasAuthHint(hasPersistedSupabaseSession())
  }, [])

  const readAdminStatus = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('role, is_admin')
      .eq('id', userId)
      .maybeSingle()

    setIsAdmin(!error && (data?.is_admin === true || ['moderator', 'admin'].includes(data?.role)))
  }, [])

  const loginWithDiscord = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) throw error
  }, [])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
  }, [])

  const fetchNotifications = useCallback(async (userId) => {
    setNotificationState({ loading: true, error: '' })
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      setNotificationState({ loading: false, error: 'Nie udało się pobrać powiadomień.' })
      return
    }
    setNotifications(data || [])
    setNotificationState({ loading: false, error: '' })
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
    fetchNotifications(currentUser.id)
    readAdminStatus(currentUser.id)
    void syncPortalPreferences(currentUser.id)
  }, [fetchNotifications, readAdminStatus])

  const markAllAsRead = useCallback(async () => {
    if (!user) return
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)

    if (error) {
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
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id)
    } catch {
      // Ignore error
    }
  }, [user])

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

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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

    let notificationChannel = null
    const cancelSubscription = scheduleIdleTask(() => {
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
    }, { minimumDelay: 2_500, timeout: 2_500 })

    return () => {
      cancelSubscription()
      if (notificationChannel) supabase.removeChannel(notificationChannel)
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
    loginWithDiscord,
    logout,
  }), [isAdmin, loginWithDiscord, logout, user])

  if (!authReady && (!GUEST_PUBLIC_PATHS.has(pathname) || hasAuthHint)) {
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
            refreshNotifications={() => user?.id && fetchNotifications(user.id)}
            loginWithDiscord={loginWithDiscord}
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
