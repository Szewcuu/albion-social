'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
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
import { supabase } from '@/lib/supabase'
import { usePortalSession } from '@/contexts/PortalSessionContext'

const ChatBox = dynamic(() => import('@/components/ChatBox'), {
  loading: () => <div className="panel min-h-[430px] animate-pulse" aria-label="Ładowanie czatu tawerny" />,
})
const PortalAnalyticsWidget = dynamic(() => import('@/components/stats/PortalAnalyticsWidget'), {
  loading: () => <div className="panel min-h-[240px] animate-pulse" aria-label="Ładowanie statystyk portalu" />,
})

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
  const { user, isAdmin, loginWithDiscord: startDiscordLogin } = usePortalSession()
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

  useEffect(() => {
    const statsTimer = window.setTimeout(fetchGlobalStats, 0)

    return () => {
      window.clearTimeout(statsTimer)
    }
  }, [fetchGlobalStats])

  const loginWithDiscord = async () => {
    if (loginBusy) return
    setLoginBusy(true)
    setAuthError('')
    try {
      await startDiscordLogin()
    } catch {
      setAuthError('Nie udało się rozpocząć logowania Discord. Spróbuj ponownie.')
      setLoginBusy(false)
    }
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
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 pt-6 space-y-6 animate-fade-in">
      {/* NAGŁÓWEK POWITALNY TAWERNY */}
      <div className="panel p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-amber-400/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-black text-white">Witaj w tawernie, <span className="text-amber-400">{displayName}</span></h1>
            <p className="text-[11px] text-gray-400">Główny punkt wypadowy polskiej społeczności Albion Online.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="bg-black/30 px-3 py-1.5 rounded-xl border border-white/8"><span className="text-gray-400">Gildie:</span> <strong className="text-amber-300">{globalStats.guildsCount}</strong></div>
          <div className="bg-black/30 px-3 py-1.5 rounded-xl border border-white/8"><span className="text-gray-400">Oferty:</span> <strong className="text-emerald-300">{globalStats.marketOffersCount}</strong></div>
          <div className="bg-black/30 px-3 py-1.5 rounded-xl border border-white/8 flex items-center gap-1.5"><span className="status-dot online" /><span className="text-gray-300">Wszystkie Serwery</span></div>
        </div>
      </div>

      {/* DWA KOLUMNY: CZAT I STATYSTYKI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7">
          <ChatBox user={user} isAdmin={isAdmin} />
        </div>
        <div className="lg:col-span-5 space-y-4">
          <PortalAnalyticsWidget />

          {/* SZYBKIE AKCJE SPOŁECZNOŚCI */}
          <div className="panel p-4 space-y-2.5">
            <h3 className="font-display text-xs font-bold text-white flex items-center gap-2 border-b border-white/8 pb-2">
              <Flame className="w-3.5 h-3.5 text-amber-400" /> Szybkie Akcje Gracza
            </h3>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <Link href="/buildy/create" className="p-2.5 rounded-xl bg-white/5 hover:bg-amber-500/10 border border-white/8 hover:border-amber-400/40 text-gray-200 hover:text-amber-300 transition flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px]"><Swords className="w-3.5 h-3.5 text-amber-400" /> Stwórz Build</span>
              </Link>
              <Link href="/rynek" className="p-2.5 rounded-xl bg-white/5 hover:bg-sky-500/10 border border-white/8 hover:border-sky-400/40 text-gray-200 hover:text-sky-300 transition flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px]"><ShoppingBag className="w-3.5 h-3.5 text-sky-400" /> Wystaw Ofertę</span>
              </Link>
              <Link href="/wyprawy" className="p-2.5 rounded-xl bg-white/5 hover:bg-purple-500/10 border border-white/8 hover:border-purple-400/40 text-gray-200 hover:text-purple-300 transition flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px]"><Users className="w-3.5 h-3.5 text-purple-400" /> Wyprawa</span>
              </Link>
              <Link href="/loot-split" className="p-2.5 rounded-xl bg-white/5 hover:bg-emerald-500/10 border border-white/8 hover:border-emerald-400/40 text-gray-200 hover:text-emerald-300 transition flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px]"><Coins className="w-3.5 h-3.5 text-emerald-400" /> Loot Split</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
