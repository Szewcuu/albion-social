'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect, memo } from 'react'
import { 
  Home, 
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
  Globe 
} from 'lucide-react'

// ZEGAR UTC ALBION
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
    <span className="font-mono text-xs font-bold text-amber-400 tracking-wider flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      {time || '00:00:00 UTC'}
    </span>
  )
})

const NAV_ITEMS = [
  { href: '/', label: 'Główna', icon: Home },
  { href: '/gildie', label: 'Gildie & ZvZ', icon: Shield },
  { href: '/wyprawy', label: 'Wyprawy', icon: Users },
  { href: '/rynek', label: 'Rynek P2P', icon: ShoppingBag },
  { href: '/kalkulator-craftingu', label: 'Crafting', icon: Hammer },
  { href: '/buildy', label: 'Buildy', icon: Swords },
  { href: '/profil', label: 'Profil', icon: User },
]

export default function HyperHudHeader({ user, logout, notifications = [], markAllAsRead }) {
  const pathname = usePathname()
  const [notifOpen, setNotifOpen] = useState(false)
  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <header className="sticky top-4 z-50 w-full max-w-[1580px] mx-auto px-4">
      <div className="hud-topbar p-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* LOGO BRAND */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-11 h-11 rounded-2xl overflow-hidden border border-amber-400/60 bg-black shadow-[0_0_20px_rgba(251,191,36,0.3)] group-hover:scale-105 transition-transform">
            <Image src="/logo-256.webp" alt="Logo Albion Social" width={44} height={44} className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="font-display font-black text-white text-lg tracking-wide leading-none group-hover:text-amber-400 transition">
              Albion<span className="text-amber-400">Social</span>
            </div>
            <div className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest mt-0.5">
              Command HUD 6.0
            </div>
          </div>
        </Link>

        {/* NAWIGACJA TABS */}
        <nav className="hidden lg:flex items-center gap-1 font-mono">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`hud-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* SERWER CLOCK & NOTIF & USER */}
        <div className="flex items-center gap-3">
          <div className="bg-black/50 border border-amber-400/30 px-3.5 py-1.5 rounded-xl flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <ServerClock />
          </div>

          {user && (
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="p-2.5 bg-black/60 border border-amber-400/30 hover:border-amber-400 text-amber-400 rounded-xl relative transition cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-[#0c0914]/95 border border-amber-400/50 rounded-2xl shadow-2xl p-4 z-50 space-y-3 backdrop-blur-2xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-xs font-mono font-bold text-amber-400 uppercase">Powiadomienia</span>
                    {unreadCount > 0 && markAllAsRead && (
                      <button onClick={markAllAsRead} className="text-[10px] text-gray-400 hover:text-white transition flex items-center gap-1 cursor-pointer">
                        <Check className="w-3 h-3 text-emerald-400" /> Przeczytane
                      </button>
                    )}
                  </div>

                  <div className="max-h-64 overflow-y-auto space-y-2 text-xs">
                    {notifications.length === 0 ? (
                      <p className="text-center text-gray-500 italic py-4">Brak powiadomień</p>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className="p-2.5 rounded-xl bg-black/50 border border-white/10 text-gray-200">
                          <div className="flex justify-between items-start font-bold">
                            <span>{n.title}</span>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-1">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {user && logout && (
            <button
              onClick={logout}
              className="p-2.5 bg-rose-950/40 hover:bg-rose-900/80 border border-rose-800/50 text-rose-300 rounded-xl transition cursor-pointer"
              title="Wyloguj z portalu"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </header>
  )
}
