'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { syncPortalPreferences } from '@/lib/preferenceSync'
import AppSidebar from './AppSidebar'
import TopBar from './TopBar'
import MobileBottomNav from './MobileBottomNav'
import { PortalSessionProvider } from '@/contexts/PortalSessionContext'

const GUEST_PUBLIC_PATHS = new Set(['/', '/regulamin', '/prywatnosc'])

export default function AppShell({ children }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [notificationState, setNotificationState] = useState({ loading: false, error: '' })
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

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

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      const currentUser = session?.user ?? null
      setUser(currentUser)
      setAuthReady(true)
      if (currentUser) {
        fetchNotifications(currentUser.id)
        readAdminStatus(currentUser.id)
        void syncPortalPreferences(currentUser.id)
      } else {
        setIsAdmin(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      const currentUser = session?.user ?? null
      setUser(currentUser)
      setAuthReady(true)
      if (currentUser) {
        fetchNotifications(currentUser.id)
        readAdminStatus(currentUser.id)
        void syncPortalPreferences(currentUser.id)
      } else {
        setNotifications([])
        setIsAdmin(false)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [fetchNotifications, readAdminStatus])

  useEffect(() => {
    if (!user?.id) return undefined

    const notificationChannel = supabase
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

    return () => {
      supabase.removeChannel(notificationChannel)
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
    authReady,
    loginWithDiscord,
    logout,
  }), [authReady, isAdmin, loginWithDiscord, logout, user])

  if (!authReady || guestBlocked) {
    return (
      <div className="auth-loading-screen" role="status" aria-live="polite">
        <span className="loading-crest" aria-hidden="true" />
        {guestBlocked ? 'Powrót do bramy logowania…' : 'Sprawdzanie sesji…'}
      </div>
    )
  }

  const guestLanding = guestPublicPage && pathname === '/'
  const guestLegalPage = guestPublicPage && pathname !== '/'

  return (
    <PortalSessionProvider value={sessionValue}>
    <div className={`app-shell ${guestLanding ? 'guest-landing' : ''} ${guestLegalPage ? 'guest-public' : ''} ${authReady ? 'auth-ready' : 'auth-pending'}`}>
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
