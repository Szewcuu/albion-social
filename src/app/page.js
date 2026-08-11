'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Activity,
  ChevronRight,
  Clock,
  Coins,
  Compass,
  Flame,
  Hammer,
  LogIn,
  Shield,
  ShoppingBag,
  Skull,
  Swords,
  Users,
} from 'lucide-react'
import ChatBox from '@/components/ChatBox'
import PortalAnalyticsWidget from '@/components/stats/PortalAnalyticsWidget'
import { supabase } from '@/lib/supabase'

const MODULES = [
  { href: '/gildie', eyebrow: 'Formacje i ZvZ', label: 'Rejestr Gildii', desc: 'Znajdź kompanię, sprawdź jej kroniki bitewne albo wystaw własny manifest rekrutacyjny.', icon: Shield, tone: 'forest', marker: 'I' },
  { href: '/buildy', eyebrow: 'Doktryny bojowe', label: 'Kuźnia Buildów', desc: 'Twórz, oceniaj i zapisuj zestawy PvP, PvE oraz ZvZ razem z pełną taktyką użycia.', icon: Swords, tone: 'blood', marker: 'II' },
  { href: '/rynek', eyebrow: 'Handel bez prowizji', label: 'Rynek P2P', desc: 'Przeglądaj oferty graczy i porównuj ich wyceny z danymi Albion Online Data Project.', icon: ShoppingBag, tone: 'sky', marker: 'III' },
  { href: '/kalkulator-craftingu', eyebrow: 'Ekonomia Albionu', label: 'Kalkulator Craftingu', desc: 'Policz zwrot surowców, koszt stacji, podatki oraz rzeczywisty zysk dla każdego miasta.', icon: Hammer, tone: 'gold', marker: 'IV' },
  { href: '/wyprawy', eyebrow: 'Party finder', label: 'Wyprawy i Zbiórki', desc: 'Zbierz drużynę, ustal wymagane IP i przeprowadź kompanię od zapisów do wymarszu.', icon: Users, tone: 'purple', marker: 'V' },
  { href: '/killboard', eyebrow: 'Kroniki konfliktu', label: 'Killboard', desc: 'Odszukaj wojownika, przejrzyj ostatnie walki, sławę oraz utracone wyposażenie.', icon: Skull, tone: 'blood', marker: 'VI' },
  { href: '/timery', eyebrow: 'Czas świata', label: 'Timery Albionu', desc: 'Pilnuj okien terytoriów, zamków i najważniejszych terminów dla regionów EU, NA i Asia.', icon: Clock, tone: 'sky', marker: 'VII' },
  { href: '/loot-split', eyebrow: 'Skarbiec drużyny', label: 'Podział Łupów', desc: 'Rozlicz srebro i przedmioty po wyprawie, a potem przygotuj czytelny raport dla grupy.', icon: Coins, tone: 'gold', marker: 'VIII' },
]

export default function Home() {
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loginBusy, setLoginBusy] = useState(false)
  const [authError, setAuthError] = useState('')
  const [globalStats, setGlobalStats] = useState({ guildsCount: 0, marketOffersCount: 0 })

  const fetchGlobalStats = useCallback(async () => {
    const [{ count: guildsCount }, { count: marketOffersCount }] = await Promise.all([
      supabase.from('guilds').select('*', { count: 'exact', head: true }),
      supabase.from('market_items').select('*', { count: 'exact', head: true }),
    ])
    setGlobalStats({ guildsCount: guildsCount || 0, marketOffersCount: marketOffersCount || 0 })
  }, [])

  const readAdminStatus = useCallback(async (userId) => {
    const { data, error } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()
    if (!error) {
      setIsAdmin(['moderator', 'admin'].includes(data?.role))
      return
    }
    const { data: legacyProfile } = await supabase.from('profiles').select('is_admin').eq('id', userId).maybeSingle()
    setIsAdmin(legacyProfile?.is_admin === true)
  }, [])

  useEffect(() => {
    let active = true
    const statsTimer = window.setTimeout(fetchGlobalStats, 0)

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return
      const currentUser = session?.user || null
      setUser(currentUser)
      setAuthReady(true)
      if (currentUser) readAdminStatus(currentUser.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      const currentUser = session?.user || null
      setUser(currentUser)
      setAuthReady(true)
      if (currentUser) readAdminStatus(currentUser.id)
      else setIsAdmin(false)
    })

    return () => {
      active = false
      window.clearTimeout(statsTimer)
      subscription.unsubscribe()
    }
  }, [fetchGlobalStats, readAdminStatus])

  const loginWithDiscord = async () => {
    if (loginBusy) return
    setLoginBusy(true)
    setAuthError('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setAuthError('Nie udało się rozpocząć logowania Discord. Spróbuj ponownie.')
      setLoginBusy(false)
    }
  }

  if (!authReady) {
    return <div className="auth-loading-screen" role="status"><span className="loading-crest" /> Otwieranie bramy Albionu…</div>
  }

  if (!user) {
    return (
      <div className="guest-home">
        <section className="guest-welcome" aria-labelledby="welcome-title">
          <div className="welcome-hero-art" aria-hidden="true" />
          <div className="welcome-hero-vignette" aria-hidden="true" />
          <div className="guest-welcome-copy">
            <Image className="welcome-crest" src="/logo-256.webp" alt="Herb Albion Polska" width={88} height={88} priority />
            <div className="welcome-kicker"><Flame aria-hidden="true" /> Polska społeczność · wszystkie serwery Albionu</div>
            <h1 id="welcome-title">Twoja historia<br /><em>zaczyna się tutaj.</em></h1>
            <p>Polskie forum i baza wypadowa dla graczy Albion Online. Jedno konto łączy rozmowy społeczności, gildie, buildy, handel i wspólne wyprawy.</p>
          </div>

          <div className="guest-login-card">
            <span className="login-seal"><Shield aria-hidden="true" /></span>
            <p className="ledger-overline">Brama do kompanii</p>
            <h2>Dołącz do Albion Polska</h2>
            <p>Zaloguj się kontem Discord, aby wejść do tawerny, publikować treści i korzystać z pełnych narzędzi portalu.</p>
            <button type="button" onClick={loginWithDiscord} disabled={loginBusy} className="btn btn-discord btn-hero">
              <LogIn aria-hidden="true" /> {loginBusy ? 'Otwieranie bramy…' : 'Wejdź przez Discord'}
            </button>
            {authError && <p role="alert" className="welcome-error">{authError}</p>}
            <div className="guest-login-trust"><span><span className="status-dot online" /> Portal aktywny</span><span><Compass aria-hidden="true" /> Europa · Ameryka · Azja</span></div>
            <small>Logując się, akceptujesz <Link href="/regulamin">regulamin</Link> i <Link href="/prywatnosc">politykę prywatności</Link>.</small>
          </div>
        </section>

        <footer className="guest-footer">
          <Link href="/" className="guest-footer-brand"><Image src="/logo-256.webp" alt="" width={34} height={34} /><span><strong>Albion Polska</strong><small>Portal społeczności graczy</small></span></Link>
          <p>Nieoficjalny projekt społecznościowy. Albion Online jest własnością Sandbox Interactive GmbH.</p>
          <nav aria-label="Stopka"><Link href="/regulamin">Regulamin</Link><Link href="/prywatnosc">Prywatność</Link></nav>
        </footer>
      </div>
    )
  }

  const displayName = (user.user_metadata?.full_name || user.user_metadata?.name || 'Wojowniku').replace(/#0$/, '')

  return (
    <div className="member-home space-y-5 animate-fade-in">
      {/* 1. KANAPA / WELCOME BANNER */}
      <section className="member-intro p-5 sm:p-6" aria-labelledby="member-title">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="welcome-kicker"><Activity aria-hidden="true" /> Kompania Online</span>
            <h1 id="member-title" className="text-2xl font-black">Witaj w tawernie, <em>{displayName}</em></h1>
            <p className="text-xs text-gray-400 mt-1">Główny punkt wypadowy polskiej społeczności Albion Online.</p>
          </div>
          <dl className="member-stats flex items-center gap-4">
            <div><dt>Gildie</dt><dd>{globalStats.guildsCount}</dd></div>
            <div><dt>Oferty rynku</dt><dd>{globalStats.marketOffersCount}</dd></div>
            <div><dt>Serwery</dt><dd><span className="status-dot online" /> Wszystkie</dd></div>
          </dl>
        </div>
      </section>

      {/* 2. ZWIĘZŁY PASEK SZYBKIEGO DOSTĘPU (QUICK NAV DOCK) */}
      <div className="panel p-3.5 flex items-center gap-2 overflow-x-auto scrollbar-none border-amber-400/20">
        <span className="text-[10px] font-mono font-bold uppercase text-amber-400 shrink-0 px-2 flex items-center gap-1">
          <Compass className="w-3.5 h-3.5" /> Szybki Dostęp:
        </span>
        <div className="flex items-center gap-2 shrink-0">
          {MODULES.map((m) => {
            const Icon = m.icon
            return (
              <Link
                key={m.href}
                href={m.href}
                className="chip flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-amber-500/20 border border-white/10 hover:border-amber-400/50 text-xs text-gray-200 hover:text-amber-300 font-bold transition whitespace-nowrap"
              >
                <Icon className="w-3.5 h-3.5 text-amber-400" />
                <span>{m.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* 3. DWUKOLUMNOWY CZAT I ANALITYKA PORTALU */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7">
          <ChatBox user={user} isAdmin={isAdmin} />
        </div>
        <div className="lg:col-span-5">
          <PortalAnalyticsWidget />
        </div>
      </div>
    </div>
  )
}
