'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Home,
  Shield,
  Swords,
  ShoppingBag,
  Users,
  Skull,
  Clock,
  Coins,
  Hammer,
  User,
  ShieldCheck,
  CalendarDays,
  BellRing,
  MessageSquareText,
  X,
} from 'lucide-react'

const NAV_SECTIONS = [
  {
    label: 'Społeczność',
    items: [
      { href: '/', label: 'Tawerna', icon: Home, desc: 'Strona główna' },
      { href: '/aktualnosci', label: 'Goniec Królewski', icon: MessageSquareText, desc: 'Wieści i patch notes' },
      { href: '/gildie', label: 'Gildie', icon: Shield, desc: 'Rejestr formacji' },
      { href: '/wyprawy', label: 'Wyprawy', icon: Users, desc: 'Zbiórki grupowe' },
      { href: '/kalendarz', label: 'Kalendarz', icon: CalendarDays, desc: 'Wydarzenia gildii' },
    ],
  },
  {
    label: 'Ekwipunek',
    items: [
      { href: '/buildy', label: 'Kuźnia Buildów', icon: Swords, desc: 'Zestawy bojowe' },
      { href: '/rynek', label: 'Rynek', icon: ShoppingBag, desc: 'Handel P2P' },
      { href: '/kalkulator-craftingu', label: 'Kalkulator', icon: Hammer, desc: 'Zysk z craftingu' },
    ],
  },
  {
    label: 'Bitwa',
    items: [
      { href: '/killboard', label: 'Kroniki Walk', icon: Skull, desc: 'Killboard' },
      { href: '/loot-split', label: 'Podział Łupów', icon: Coins, desc: 'Loot splitter' },
      { href: '/timery', label: 'Timery', icon: Clock, desc: 'Zegary ZvZ' },
    ],
  },
  {
    label: 'Gracz',
    items: [
      { href: '/profil', label: 'Mój Profil', icon: User, desc: 'Postać' },
      { href: '/aktywnosc', label: 'Aktywność', icon: BellRing, desc: 'Odpowiedzi i zaproszenia' },
      { href: '/obserwowane', label: 'Obserwowane', icon: BellRing, desc: 'Wartownia zmian' },
      { href: '/wiadomosci', label: 'Skrzynka handlowa', icon: MessageSquareText, desc: 'Prywatne negocjacje' },
    ],
  },
]

export default function AppSidebar({ isOpen, isAdmin = false, onClose }) {
  const pathname = usePathname()
  const sections = isAdmin
    ? [...NAV_SECTIONS, { label: 'Administracja', items: [{ href: '/admin', label: 'Panel administratora', icon: ShieldCheck, desc: 'Moderacja i stan portalu' }] }]
    : NAV_SECTIONS

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`sidebar-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside className={`sidebar ${isOpen ? 'open' : ''}`} aria-label="Główna nawigacja">
        {/* Brand */}
        <div className="sidebar-brand">
          <Link href="/" prefetch={false} className="sidebar-brand-link" onClick={onClose}>
            <span className="sidebar-brand-icon"><Image src="/logo-256.webp" alt="" width={42} height={42} priority /></span>
            <span className="sidebar-brand-text">
              <strong>Albion Polska</strong>
              <span>Królewska kompania</span>
            </span>
          </Link>
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="ml-auto md:hidden text-[var(--text-muted)] hover:text-[var(--text-bright)] transition cursor-pointer"
            style={{ background: 'none', border: 'none', padding: '4px' }}
            aria-label="Zamknij menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav" aria-label="Sekcje portalu">
          {sections.map((section) => (
            <div key={section.label}>
              <div className="sidebar-section-label">{section.label}</div>
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && pathname?.startsWith(item.href))

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={false}
                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                    onClick={onClose}
                    title={item.desc}
                  >
                    <Icon />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-realm"><span className="status-dot online" /> Portal aktywny</div>
          <Link href="/regulamin" prefetch={false} className="hover:text-[var(--gold)] transition">
            Regulamin
          </Link>
          {' · '}
          <Link href="/prywatnosc" prefetch={false} className="hover:text-[var(--gold)] transition">
            Prywatność
          </Link>
          <div className="mt-1">
            © {new Date().getFullYear()} Albion Polska Portal
          </div>
        </div>
      </aside>
    </>
  )
}
