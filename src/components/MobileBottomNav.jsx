'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Shield, Swords, ShoppingBag, User } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/', label: 'Tawerna', icon: Home },
  { href: '/gildie', label: 'Gildie', icon: Shield },
  { href: '/buildy', label: 'Buildy', icon: Swords },
  { href: '/rynek', label: 'Rynek', icon: ShoppingBag },
  { href: '/profil', label: 'Profil', icon: User },
]

export default function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <div className="mobile-bottom-nav">
      <nav className="mobile-nav-items">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive =
            pathname === item.href ||
            (item.href !== '/' && pathname?.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={`mobile-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
