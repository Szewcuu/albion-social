'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Shield, Swords, ShoppingBag, Hammer, User } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: 'Główna', icon: Home },
  { href: '/gildie', label: 'Gildie', icon: Shield },
  { href: '/buildy', label: 'Buildy', icon: Swords },
  { href: '/rynek', label: 'Rynek', icon: ShoppingBag },
  { href: '/kalkulator-craftingu', label: 'Crafting', icon: Hammer },
  { href: '/profil', label: 'Profil', icon: User },
]

export default function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 block lg:hidden bg-[#070305]/90 backdrop-blur-xl border-t border-[#d8ad4a]/25 px-2 py-1.5 shadow-[0_-10px_25px_rgba(0,0,0,0.7)]">
      <nav className="flex items-center justify-around font-mono">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-[#f3ba2f] bg-[#f3ba2f]/10 font-bold scale-105 shadow-[0_0_12px_rgba(243,186,47,0.25)] border border-[#f3ba2f]/30'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
              }`}
            >
              <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? 'scale-110 text-[#f3ba2f]' : ''}`} />
              <span className="text-[9px] mt-0.5 tracking-tight uppercase">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
