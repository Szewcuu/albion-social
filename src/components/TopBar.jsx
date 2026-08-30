'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, BookOpen, CalendarDays, Check as CheckCheck, ChevronDown, LogIn, ArrowLeft as LogOut, Compass as Map, ChevronDown as Menu, RefreshCw, Shield, ShieldCheck, Swords, ShoppingBag, MessageSquare, ShieldAlert, UserRound } from 'lucide-react'

const PAGE_NAMES = {
  '/': 'Tawerna',
  '/gildie': 'Rejestr Gildii',
  '/buildy': 'Kuźnia Buildów',
  '/buildy/create': 'Nowy Build',
  '/rynek': 'Rynek P2P',
  '/kalkulator-craftingu': 'Kalkulator Craftingu',
  '/killboard': 'Kroniki Walk',
  '/loot-split': 'Podział Łupów',
  '/timery': 'Timery Świata',
  '/wyprawy': 'Wyprawy & Party',
  '/kalendarz': 'Kalendarz Wydarzeń',
  '/profil': 'Mój Profil',
  '/obserwowane': 'Obserwowane',
  '/wiadomosci': 'Skrzynka handlowa',
  '/regulamin': 'Regulamin',
  '/prywatnosc': 'Polityka Prywatności',
}

const getNotificationIcon = (type, title) => {
  const t = (type || title || '').toLowerCase()
  if (t.includes('expedition') || t.includes('wypraw') || t.includes('zgłoszeni')) return Swords
  if (t.includes('market') || t.includes('rynek') || t.includes('ofert')) return ShoppingBag
  if (t.includes('comment') || t.includes('komentarz')) return MessageSquare
  if (t.includes('event') || t.includes('wydarzeni')) return CalendarDays
  if (t.includes('build')) return BookOpen
  if (t.includes('guild') || t.includes('gildi')) return Shield
  if (t.includes('player') || t.includes('gracz')) return UserRound
  if (t.includes('system') || t.includes('admin') || t.includes('kara')) return ShieldAlert
  return Bell
}

export default function TopBar({
  user,
  logout,
  notifications,
  notificationState,
  markAllAsRead,
  markSingleAsRead,
  refreshNotifications,
  loginWithDiscord,
  onMenuToggle,
}) {
  const pathname = usePathname()
  const [showNotifs, setShowNotifs] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const notifRef = useRef(null)
  const userRef = useRef(null)

  const pageName = PAGE_NAMES[pathname] || 'Albion Polska'
  const unreadCount = notifications?.filter((notification) => !notification.is_read).length || 0
  const displayName = user
    ? (user.user_metadata?.full_name || user.user_metadata?.name || 'Gracz').replace(/#0$/, '')
    : null
  const avatarUrl = user?.user_metadata?.avatar_url

  useEffect(() => {
    const handler = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotifs(false)
      if (userRef.current && !userRef.current.contains(event.target)) setShowUserMenu(false)
    }
    const keyboardHandler = (event) => {
      if (event.key === 'Escape') {
        setShowNotifs(false)
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyboardHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyboardHandler)
    }
  }, [])

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="topbar-menu-btn" onClick={onMenuToggle} aria-label="Menu"><Menu className="w-5 h-5" /></button>
        <Link href="/" className="topbar-guest-brand" aria-label="Albion Polska — strona główna">
          <Image src="/logo-256.webp" alt="" width={34} height={34} /><span>Albion Polska</span>
        </Link>
        <span className="topbar-breadcrumb"><Map className="h-4 w-4" aria-hidden="true" /> {pageName}</span>
        <span className="topbar-realm" title="Portal obsługuje wszystkie serwery Albion Online">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" /> Wszystkie serwery
        </span>
      </div>

      <div className="topbar-right">
        {user ? (
          <>
            <div ref={notifRef} className="relative">
              <button
                className="topbar-btn"
                onClick={() => setShowNotifs((current) => !current)}
                aria-label={unreadCount > 0 ? `Powiadomienia, nieprzeczytane: ${unreadCount}` : 'Powiadomienia'}
                aria-expanded={showNotifs}
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && <span className="notification-count">{unreadCount > 9 ? '9+' : unreadCount}</span>}
              </button>

              {showNotifs && (
                <div className="notification-popover" role="region" aria-label="Lista powiadomień">
                  <div className="notification-popover-header">
                    <div><strong>Powiadomienia</strong><small>{unreadCount > 0 ? `${unreadCount} nieprzeczytane` : 'Wszystko przeczytane'}</small></div>
                    <div>
                      <button type="button" onClick={refreshNotifications} aria-label="Odśwież powiadomienia" disabled={notificationState?.loading}><RefreshCw className={notificationState?.loading ? 'spin' : ''} /></button>
                      {unreadCount > 0 && <button type="button" onClick={markAllAsRead} aria-label="Oznacz wszystkie jako przeczytane"><CheckCheck /></button>}
                    </div>
                  </div>
                  <div className="notification-list">
                    {notificationState?.loading && notifications?.length === 0 ? (
                      <div className="notification-empty"><RefreshCw className="spin" /> Pobieranie powiadomień…</div>
                    ) : notificationState?.error ? (
                      <div className="notification-empty error">{notificationState.error}<button type="button" onClick={refreshNotifications}>Spróbuj ponownie</button></div>
                    ) : notifications?.length > 0 ? (
                      notifications.slice(0, 10).map((notification) => {
                        const IconComponent = getNotificationIcon(notification.type, notification.title)

                        return (
                          <Link
                            key={notification.id}
                            href={notification.link || '#'}
                            className={`notification-item ${notification.is_read ? 'read' : 'unread'}`}
                            onClick={() => {
                              if (!notification.is_read && markSingleAsRead) {
                                markSingleAsRead(notification.id)
                              }
                              setShowNotifs(false)
                            }}
                          >
                            <span className="notification-item-icon" aria-hidden="true">
                              <IconComponent />
                            </span>
                            <span className="notification-item-content">
                              <span className="notification-item-title-row">
                                <strong>{notification.title || 'Nowe powiadomienie'}</strong>
                                {!notification.is_read && <span className="notification-unread-dot" />}
                              </span>
                              <small>{notification.message || notification.content || 'Otwórz, aby zobaczyć szczegóły.'}</small>
                              {notification.created_at && (
                                <time>
                                  {new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(notification.created_at))}
                                </time>
                              )}
                            </span>
                          </Link>
                        )
                      })
                    ) : (
                      <div className="notification-empty"><Bell /><strong>Cisza w gołębniku</strong><span>Nowe zgłoszenia do gildii i wypraw pojawią się tutaj.</span></div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div ref={userRef} className="relative">
              <button className="topbar-user" onClick={() => setShowUserMenu((current) => !current)} aria-label={`Menu użytkownika ${displayName}`} aria-expanded={showUserMenu}>
                {avatarUrl ? (
                  <Image src={avatarUrl} alt="" width={30} height={30} className="topbar-avatar" />
                ) : (
                  <div className="topbar-avatar flex items-center justify-center bg-[var(--bg-panel)] text-[var(--gold)] text-xs font-bold" style={{ fontFamily: 'var(--font-heading)' }}>{displayName?.charAt(0).toUpperCase()}</div>
                )}
                <span className="topbar-username hidden sm:block">{displayName}</span><ChevronDown className="w-3 h-3 text-[var(--text-muted)]" />
              </button>
              {showUserMenu && (
                <div className="user-popover">
                  <Link href="/wiadomosci" onClick={() => setShowUserMenu(false)}><MessageSquare /> Skrzynka handlowa</Link>
                  <button onClick={() => { logout(); setShowUserMenu(false) }}><LogOut /> Wyloguj się</button>
                </div>
              )}
            </div>
          </>
        ) : (
          <button onClick={loginWithDiscord} className="btn btn-discord btn-sm" aria-label="Zaloguj przez Discord"><LogIn className="w-4 h-4" /><span className="hidden sm:inline">Zaloguj przez Discord</span><span className="sm:hidden">Zaloguj</span></button>
        )}
      </div>
    </header>
  )
}
