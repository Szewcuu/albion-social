'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect, memo } from 'react'
import { 
  Shield, 
  Users, 
  ShoppingBag, 
  Hammer, 
  Swords, 
  User, 
  Clock, 
  Bell, 
  Check, 
  LogOut, 
  ChevronDown 
} from 'lucide-react'

// LIVE UTC CLOCK
const ServerClock = memo(function ServerClock() {
  const [time, setTime] = useState('')

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const utcHours = String(now.getUTCHours()).padStart(2, '0')
      const utcMinutes = String(now.getUTCMinutes()).padStart(2, '0')
      const utcSeconds = String(now.getUTCSeconds()).padStart(2, '0')
      setTime(`${utcHours}:${utcMinutes}:${utcSeconds} UTC`)
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <span className="font-mono text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
      {time || '00:00:00 UTC'}
    </span>
  )
})

const NAV_LINKS = [
  { href: '/gildie', label: 'Gildie', icon: Shield },
  { href: '/wyprawy', label: 'Wyprawy', icon: Users },
  { href: '/rynek', label: 'Rynek P2P', icon: ShoppingBag },
  { href: '/kalkulator-craftingu', label: 'Crafting', icon: Hammer },
  { href: '/buildy', label: 'Buildy', icon: Swords },
]

export default function ModernHeader({ user, logout, notifications = [], markAllAsRead, loginWithDiscord }) {
  const pathname = usePathname()
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <header className="modern-header sticky top-0 z-50 w-full px-4 py-3">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
        
        {/* LOGO BRAND */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold group-hover:scale-105 transition">
            <Image src="/logo-256.webp" alt="Logo" width={36} height={36} className="w-full h-full object-cover" />
          </div>
          <span className="font-bold text-white text-base tracking-tight">
            Albion<span className="text-emerald-400">Social</span>
          </span>
        </Link>

        {/* NAWIGACJA MENU */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`modern-nav-link ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* CLOCK & USER PANEL */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 bg-black/40 border border-white/10 px-3 py-1.5 rounded-lg text-xs">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <ServerClock />
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              {/* NOTIFICATION BUTTON */}
              <div className="relative">
                <button
                  onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                  className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 rounded-lg relative transition cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-[#0d1117] border border-white/10 rounded-xl shadow-2xl p-3.5 z-50 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="font-semibold text-gray-300">Powiadomienia</span>
                      {unreadCount > 0 && markAllAsRead && (
                        <button onClick={markAllAsRead} className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer">
                          <Check className="w-3 h-3" /> Przeczytane
                        </button>
                      )}
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {notifications.length === 0 ? (
                        <p className="text-center text-gray-500 italic py-3">Brak powiadomień</p>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className="p-2 rounded-lg bg-white/5 text-gray-200">
                            <div className="font-semibold">{n.title}</div>
                            <p className="text-[11px] text-gray-400 mt-0.5">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* PROFILE DROPDOWN */}
              <div className="relative">
                <button
                  onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg px-2.5 py-1.5 transition cursor-pointer text-xs font-medium text-white"
                >
                  {user.user_metadata?.avatar_url ? (
                    <Image src={user.user_metadata.avatar_url} alt="Avatar" width={24} height={24} className="w-6 h-6 rounded-md object-cover" />
                  ) : (
                    <div className="w-6 h-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">?</div>
                  )}
                  <span className="max-w-28 truncate">{user.user_metadata?.full_name?.replace(/#0$/, '') || 'Gracz'}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#0d1117] border border-white/10 rounded-xl shadow-2xl p-2 z-50 space-y-1 text-xs font-medium">
                    <Link
                      href="/profil"
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition"
                    >
                      <User className="w-4 h-4 text-emerald-400" /> Profil gracza
                    </Link>
                    {logout && (
                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 px-3 py-2 text-rose-400 hover:bg-rose-950/30 rounded-lg transition text-left cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" /> Wyloguj
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={loginWithDiscord}
              className="modern-btn-primary text-xs flex items-center gap-2"
            >
              Zaloguj przez Discord
            </button>
          )}

        </div>

      </div>
    </header>
  )
}
