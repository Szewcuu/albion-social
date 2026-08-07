'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { 
  Home, 
  Shield, 
  Users, 
  ShoppingBag, 
  Swords, 
  Hammer, 
  User, 
  LogOut, 
  Globe, 
  ExternalLink,
  ChevronRight
} from 'lucide-react'

const MENU = [
  { href: '/', label: 'Główna', icon: Home },
  { href: '/gildie', label: 'Gildie & ZvZ', icon: Shield },
  { href: '/wyprawy', label: 'Wyprawy & Party', icon: Users },
  { href: '/rynek', label: 'Rynek P2P', icon: ShoppingBag },
  { href: '/kalkulator-craftingu', label: 'Crafting Profit', icon: Hammer },
  { href: '/buildy', label: 'Kuźnia Buildów', icon: Swords },
  { href: '/profil', label: 'Twój Profil', icon: User },
]

export default function RebornSidebar({ user, logout }) {
  const pathname = usePathname()

  return (
    <aside className="w-64 shrink-0 hidden lg:flex flex-col justify-between p-5 reborn-sidebar min-h-screen fixed left-0 top-0 z-40">
      <div className="space-y-6">
        {/* LOGO BRAND */}
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-amber-500/40 bg-black shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
            <Image src="/logo-256.webp" alt="Logo" width={40} height={40} className="w-full h-full object-cover" />
          </div>
          <div>
            <div className="font-bold text-white tracking-wide text-base leading-tight font-display">
              Albion<span className="text-amber-400">Social</span>
            </div>
            <div className="text-[10px] text-gray-400 font-mono font-bold uppercase tracking-widest">
              Portal 5.0 Reborn
            </div>
          </div>
        </div>

        {/* SERVER STATUS MINIWIDGET */}
        <div className="bg-[#080b10] border border-amber-500/20 p-3 rounded-2xl space-y-1.5 font-mono text-[11px]">
          <div className="flex items-center justify-between text-gray-400">
            <span className="flex items-center gap-1.5 text-amber-400 font-bold">
              <Globe className="w-3.5 h-3.5" /> Serwery Albion
            </span>
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> OK
            </span>
          </div>
          <div className="text-[10px] text-gray-400 flex justify-between">
            <span>EU: <b className="text-emerald-400">24ms</b></span>
            <span>NA: <b className="text-emerald-400">110ms</b></span>
            <span>ASIA: <b className="text-emerald-400">185ms</b></span>
          </div>
        </div>

        {/* NAWIGACJA MENU */}
        <nav className="space-y-1.5">
          <div className="px-3 text-[10px] font-mono font-bold uppercase tracking-widest text-gray-500 mb-2">
            Nawigacja Główna
          </div>

          {MENU.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`reborn-nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-gray-400'}`} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-amber-400" />}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* FOOTER & LOGOUT */}
      <div className="space-y-3 pt-4 border-t border-white/10 font-mono text-xs">
        {user ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 p-2 bg-black/40 rounded-xl border border-white/5">
              {user.user_metadata?.avatar_url ? (
                <Image src={user.user_metadata.avatar_url} alt="Avatar" width={32} height={32} className="w-8 h-8 rounded-lg object-cover border border-amber-400/50" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">?</div>
              )}
              <div className="overflow-hidden">
                <div className="text-white font-bold truncate text-xs">
                  {(user.user_metadata?.full_name || 'Gracz').replace(/#0$/, '')}
                </div>
                <div className="text-[9px] text-emerald-400">Zalogowany</div>
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full p-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-rose-300 font-bold flex items-center justify-center gap-2 text-xs transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Wyloguj
            </button>
          </div>
        ) : (
          <a
            href="https://wiki.albiononline.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs transition"
          >
            <span className="flex items-center gap-2"><ExternalLink className="w-3.5 h-3.5 text-amber-400" /> Oficjalna Wiki</span>
          </a>
        )}
      </div>
    </aside>
  )
}
