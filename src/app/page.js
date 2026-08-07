'use client'

import { supabase } from '@/lib/supabase'
import { authenticatedFetch } from '@/lib/authenticatedFetch'
import { useEffect, useState, memo, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Swords, 
  ShoppingBag, 
  Shield, 
  Skull,
  Clock, 
  Newspaper, 
  Calculator, 
  Globe, 
  Compass, 
  ExternalLink, 
  LogOut, 
  ChevronDown, 
  User, 
  Bell, 
  Check, 
  X, 
  Coins,
  Hammer,
  ArrowRight,
  Users,
  Crown,
  Sparkles,
  Zap,
  TrendingUp,
  Activity
} from 'lucide-react'
import ChatBox from '@/components/ChatBox'

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
    <span className="font-mono text-xs font-bold text-[#f3ba2f] tracking-widest flex items-center gap-1.5">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
      </span>
      {time || '00:00:00 UTC'}
    </span>
  )
})

export default function Home() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [rightTab, setRightTab] = useState('ECONOMY')

  // FLIP CALCULATOR STATE
  const [buyPrice, setBuyPrice] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [feeRate, setFeeRate] = useState('8')
  const [flipResult, setFlipResult] = useState(null)

  // STATYSTYKI PORTALU
  const [globalStats, setGlobalStats] = useState({
    guildsCount: 0,
    marketOffersCount: 0,
    onlineCount: 42
  })

  // RSS NEWSY
  const [news, setNews] = useState([])

  const loginWithDiscord = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: `${window.location.origin}/auth/callback` }
    })
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
    setProfileOpen(false)
  }

  const fetchGlobalStats = useCallback(async () => {
    const [{ count: gCount }, { count: mCount }] = await Promise.all([
      supabase.from('guilds').select('*', { count: 'exact', head: true }),
      supabase.from('market_items').select('*', { count: 'exact', head: true })
    ])
    setGlobalStats({
      guildsCount: gCount || 0,
      marketOffersCount: mCount || 0,
      onlineCount: Math.floor(Math.random() * 30) + 35
    })
  }, [])

  const fetchNotifications = useCallback(async (userId) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (data) setNotifications(data)
  }, [])

  const markAllAsRead = useCallback(async () => {
    if (!user) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)

    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }, [user])

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch('/api/news')
      if (res.ok) {
        const data = await res.json()
        setNews(data.slice(0, 4))
      }
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (currentUser) {
          fetchNotifications(currentUser.id)
          supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single()
            .then(({ data }) => {
              if (data?.role === 'admin') setIsAdmin(true)
            })
        }
      })

      fetchGlobalStats()
      fetchNews()
    }, 0)

    return () => clearTimeout(timer)
  }, [fetchGlobalStats, fetchNotifications, fetchNews])

  const handleCalculateFlip = (e) => {
    e.preventDefault()
    const buy = parseFloat(buyPrice) || 0
    const sell = parseFloat(sellPrice) || 0
    const tax = parseFloat(feeRate) / 100

    if (buy <= 0 || sell <= 0) return

    const totalTax = sell * tax
    const netProfit = sell - totalTax - buy
    const margin = (netProfit / buy) * 100

    setFlipResult({
      buy,
      sell,
      taxAmount: Math.round(totalTax),
      netProfit: Math.round(netProfit),
      margin: margin.toFixed(1)
    })
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <main className="aopp-shell min-h-screen overflow-x-hidden text-[#eee8dc] antialiased selection:bg-[#f3ba2f] selection:text-black">
      <div className="aopp-world-bg" aria-hidden="true" />
      <div className="aopp-grain" aria-hidden="true" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1580px] flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8 lg:py-6 space-y-7">
        {!user ? (
          /* EKPRYZYCZNA STRONA LANDINGOWA (NIEZALOGOWANY) */
          <section className="relative my-auto flex min-h-[calc(100vh-3rem)] w-full items-center overflow-hidden rounded-[32px] border border-[#f3ba2f]/35 bg-[#0b0508] p-6 shadow-[0_35px_120px_rgba(0,0,0,.85)] sm:p-10 lg:p-16">
            <Image src="/albion-social-hero.webp" alt="Fantastyczna kraina Albion Online" fill priority sizes="100vw" className="object-cover object-[66%_center]" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,5,8,.97)_0%,rgba(8,5,8,.78)_45%,rgba(8,5,8,.25)_75%,rgba(8,5,8,.65)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(5,2,4,.95)_0%,transparent_55%)]" />

            <div className="relative z-10 w-full max-w-2xl text-left space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-[#f3ba2f]/60 bg-[#0a0408] shadow-[0_0_25px_rgba(243,186,47,0.35)]">
                  <Image src="/logo-256.webp" alt="Logo Albion Social" width={80} height={80} priority className="w-full h-full object-cover scale-105" />
                </div>
                <div>
                  <p className="font-display text-2xl font-black tracking-wider text-white">ALBION SOCIAL</p>
                  <p className="text-[10px] font-black uppercase tracking-[.28em] text-[#f3ba2f]">Polska Społeczność Graczy</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[.28em] text-[#e0bb61] before:h-px before:w-10 before:bg-[#e0bb61]">
                  Jedno centrum • Wszystkie gildie • Zero szumu
                </p>
                <h1 className="font-display text-5xl font-black leading-[.96] tracking-[-.035em] text-[#fffaf0] sm:text-6xl lg:text-7xl">
                  Twórz historię.<br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffe07d] via-[#f3ba2f] to-[#d87631]">Walcz i handluj.</span>
                </h1>
                <p className="max-w-xl text-base leading-7 text-[#d6d0c4] sm:text-lg">
                  Rejestr gildii, starcia ZvZ, automatyczna wycena rynkowa P2P z Albion Data API oraz kalkulator craftingu w jednym zintegrowanym portalu.
                </p>
              </div>

              <div className="pt-2 flex flex-col gap-3 sm:flex-row">
                <button onClick={loginWithDiscord} className="aopp-primary-button group inline-flex min-h-14 items-center justify-center gap-3 px-8 text-sm font-black uppercase tracking-wider cursor-pointer shadow-[0_0_25px_rgba(243,186,47,0.3)]">
                  Zaloguj przez Discord <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                <a href="#atuty" className="aopp-ghost-button inline-flex min-h-14 items-center justify-center px-8 text-sm font-bold uppercase tracking-wider">
                  Przeglądaj Funkcje
                </a>
              </div>

              <div id="atuty" className="grid grid-cols-3 gap-2 overflow-hidden rounded-2xl border border-white/10 bg-black/50 p-1.5 backdrop-blur-md">
                {[['🏰 Gildie & ZvZ', 'Rekrutacja & K/D'], ['🔨 Crafting', 'Zysk z RRR'], ['💰 Rynek P2P', 'Live Wycena API']].map(([title, label]) => (
                  <div key={title} className="bg-black/60 p-3.5 rounded-xl border border-white/5">
                    <p className="font-display text-sm font-bold text-white sm:text-base">{title}</p>
                    <p className="mt-0.5 text-[9px] font-mono uppercase text-[#f3ba2f]">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          /* ZALOGOWANY DOK ZARZĄDZANIA & PORTAL 2.0 BENTO DASHBOARD */
          <div className="w-full space-y-7">
            
            {/* GLÓWNY PASEK NAWIGACJI (TOP BAR 2.0) */}
            <header className="aopp-topbar sticky top-3 z-40 flex flex-col items-center justify-between gap-4 rounded-3xl p-4 sm:px-6 lg:flex-row bg-[#080407]/90 backdrop-blur-xl border border-[#f3ba2f]/30 shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
              <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-start">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[#f3ba2f]/60 bg-[#0c0407] shadow-[0_0_15px_rgba(243,186,47,0.25)]">
                    <Image src="/logo-256.webp" alt="Logo Albion Social" width={44} height={44} priority className="h-full w-full scale-105 object-cover" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="font-display text-lg font-black tracking-wide text-white sm:text-xl">
                        Albion Social
                      </h1>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-bold uppercase">
                        Live 2.0
                      </span>
                    </div>
                    <p className="text-[9px] font-mono uppercase tracking-widest text-gray-400">
                      Polska Społeczność
                    </p>
                  </div>
                </div>

                <div className="block xl:hidden">
                  <ServerClock />
                </div>
              </div>

              <nav className="hidden items-center gap-1.5 xl:flex font-mono text-xs" aria-label="Główna nawigacja">
                <Link href="/gildie" className="px-4 py-2 rounded-xl text-gray-300 hover:text-amber-300 hover:bg-white/5 transition flex items-center gap-1.5 font-bold">
                  <Shield className="w-4 h-4 text-purple-400" /> Gildie
                </Link>
                <Link href="/wyprawy" className="px-4 py-2 rounded-xl text-gray-300 hover:text-amber-300 hover:bg-white/5 transition flex items-center gap-1.5 font-bold">
                  <Users className="w-4 h-4 text-sky-400" /> Wyprawy
                </Link>
                <Link href="/rynek" className="px-4 py-2 rounded-xl text-gray-300 hover:text-amber-300 hover:bg-white/5 transition flex items-center gap-1.5 font-bold">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" /> Rynek P2P
                </Link>
                <Link href="/buildy" className="px-4 py-2 rounded-xl text-gray-300 hover:text-amber-300 hover:bg-white/5 transition flex items-center gap-1.5 font-bold">
                  <Swords className="w-4 h-4 text-rose-400" /> Buildy
                </Link>
                <Link href="/kalkulator-craftingu" className="px-4 py-2 bg-[#f3ba2f]/10 border border-[#f3ba2f]/30 rounded-xl text-[#f3ba2f] font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(243,186,47,0.15)]">
                  <Hammer className="w-4 h-4 text-amber-400" /> Crafting
                </Link>
              </nav>

              <div className="flex items-center justify-end gap-3 w-full lg:w-auto">
                <div className="hidden xl:flex bg-[#050204] border border-[#240e14] rounded-2xl px-4 py-2 items-center gap-3">
                  <Clock className="w-4 h-4 text-[#f3ba2f]" />
                  <ServerClock />
                </div>

                {/* CENTRUM POWIADOMIEŃ */}
                <div className="relative">
                  <button 
                    onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                    className="p-2.5 bg-[#050204] border border-[#240e14] hover:border-[#f3ba2f]/50 text-[#f3ba2f] rounded-2xl relative transition cursor-pointer"
                    title="Powiadomienia"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 mt-3 w-80 bg-[#0a0408]/95 border border-[#f3ba2f]/50 rounded-3xl shadow-2xl p-4 z-50 space-y-3 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center justify-between border-b border-[#200d13] pb-2">
                        <span className="text-xs font-mono font-bold text-[#f3ba2f] uppercase">Powiadomienia</span>
                        {unreadCount > 0 && (
                          <button onClick={markAllAsRead} className="text-[10px] text-gray-400 hover:text-white transition flex items-center gap-1 cursor-pointer">
                            <Check className="w-3 h-3 text-emerald-400" /> Przeczytane
                          </button>
                        )}
                      </div>

                      <div className="max-h-64 overflow-y-auto space-y-2 text-xs">
                        {notifications.length === 0 ? (
                          <p className="text-center text-gray-500 italic py-4">Brak nowych powiadomień</p>
                        ) : (
                          notifications.map((n) => (
                            <div key={n.id} className={`p-2.5 rounded-xl border transition ${n.is_read ? 'bg-[#050204] border-[#1c0b10] text-gray-400' : 'bg-[#18080f] border-[#f3ba2f]/30 text-gray-100 font-bold'}`}>
                              <div className="flex justify-between items-start">
                                <span>{n.title}</span>
                                <span className="text-[9px] font-mono text-gray-500">{new Date(n.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p className="text-[11px] font-normal mt-1 leading-snug">{n.message}</p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* PRZYCISK PROFILU */}
                <div className="relative">
                  <button 
                    onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
                    className="flex items-center gap-2.5 bg-gradient-to-r from-[#14060b] to-[#070204] border border-[#f3ba2f]/40 hover:border-[#f3ba2f]/80 rounded-2xl px-4 py-2 shadow-lg transition-all cursor-pointer group"
                  >
                    <div className="relative">
                      <div className="p-1 bg-[#1f0a11] border border-[#f3ba2f]/40 rounded-xl text-[#f3ba2f] group-hover:scale-105 transition-transform">
                        <User className="w-4 h-4" />
                      </div>
                      <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#070204] rounded-full"></span>
                    </div>

                    <span className="font-extrabold text-xs text-white font-mono uppercase tracking-wider">
                      Profil
                    </span>

                    <ChevronDown className={`w-3.5 h-3.5 text-[#f3ba2f] transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-3 w-80 bg-[#0a0408]/95 border border-[#f3ba2f]/50 rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.8)] p-5 z-50 space-y-4 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center gap-3.5 border-b border-[#200d13] pb-4">
                        <div className="relative shrink-0">
                          {user.user_metadata?.avatar_url ? (
                            <Image src={user.user_metadata.avatar_url} alt="Avatar użytkownika" width={48} height={48} className="w-12 h-12 rounded-2xl object-cover border-2 border-[#f3ba2f] shadow-[0_0_12px_rgba(243,186,47,0.3)]" />
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-[#2a1118] border-2 border-[#f3ba2f] flex items-center justify-center font-bold text-[#f3ba2f]">?</div>
                          )}
                          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-[#0a0408] rounded-full"></span>
                        </div>

                        <div className="flex flex-col text-left overflow-hidden">
                          <span className="font-serif font-black text-base text-white truncate">
                            {(user.user_metadata?.full_name || 'Gracz').replace(/#0$/, '')}
                          </span>
                          <span className={`text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded-md border w-fit mt-1 ${isAdmin ? 'bg-rose-950/80 border-rose-800/60 text-rose-300' : 'bg-[#1c0a10] border-[#3d1823] text-[#f3ba2f]'}`}>
                            {isAdmin ? '🛡️ Inkwizytor' : '⚔️ Wojownik'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 font-mono text-xs">
                        <Link href="/profil" onClick={() => setProfileOpen(false)} className="flex items-center justify-between p-3 bg-[#18080f] hover:bg-[#280c18] border border-[#f3ba2f]/40 rounded-2xl transition group text-[#f3ba2f] font-bold">
                          <span className="flex items-center gap-2.5"><User className="w-4 h-4" /> Karta Postaci &amp; Edycja</span>
                          <span className="text-[10px] bg-[#f3ba2f] text-black px-2.5 py-0.5 rounded-lg font-black">&rarr;</span>
                        </Link>

                        <Link href="/wyprawy" onClick={() => setProfileOpen(false)} className="flex items-center justify-between p-3 bg-[#050204] hover:bg-[#18080f] border border-[#220e14] hover:border-[#f3ba2f]/40 rounded-2xl transition group text-gray-300 hover:text-white">
                          <span className="flex items-center gap-2.5"><Shield className="w-4 h-4 text-purple-400" /> Moje Wyprawy</span>
                          <span className="text-[10px] bg-purple-950/80 text-purple-300 border border-purple-800/50 px-2.5 py-0.5 rounded-lg font-bold">Otwórz</span>
                        </Link>

                        <Link href="/rynek" onClick={() => setProfileOpen(false)} className="flex items-center justify-between p-3 bg-[#050204] hover:bg-[#18080f] border border-[#220e14] hover:border-[#f3ba2f]/40 rounded-2xl transition group text-gray-300 hover:text-white">
                          <span className="flex items-center gap-2.5"><ShoppingBag className="w-4 h-4 text-sky-400" /> Moje Oferty Rynku</span>
                          <span className="text-[10px] bg-sky-950/80 text-sky-300 border border-sky-800/50 px-2.5 py-0.5 rounded-lg font-bold">Otwórz</span>
                        </Link>
                      </div>

                      <div className="pt-2 border-t border-[#200d13]">
                        <button onClick={logout} className="w-full bg-rose-950/60 hover:bg-rose-900 border border-rose-900/60 text-rose-300 font-extrabold p-3 rounded-2xl uppercase text-xs tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow">
                          <LogOut className="w-4 h-4" /> Wyloguj Z Portalu
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </header>

            {/* SEKCJA HERO 2.0 (CENTRUM DOWODZENIA) */}
            <section className="relative min-h-[380px] overflow-hidden rounded-[32px] border border-[#f3ba2f]/35 bg-[#090407] p-6 sm:p-8 lg:p-12 shadow-[0_30px_90px_rgba(0,0,0,0.7)]">
              <Image src="/albion-social-hero.webp" alt="Albion Hero View" fill priority sizes="100vw" className="object-cover object-[65%_center] opacity-35" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#060305] via-[#060305]/90 to-transparent" />

              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#c89d3c]/10 border border-[#c89d3c]/40 text-[#e5b74c] text-[10px] font-mono font-bold uppercase tracking-widest">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Wielki Kodeks Gildii &amp; Karczma Albion Online 3.0</span>
                  </div>

                  <h2 className="font-display text-4xl font-black leading-tight text-[#f0e4d0] sm:text-5xl lg:text-6xl">
                    Księga Przygód i Zwiadu<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#f0cf77] via-[#c89d3c] to-[#9e6d24]">Gromadź Wojska i Zasoby</span>
                  </h2>

                  <p className="max-w-2xl text-sm leading-6 text-[#c5b59c] sm:text-base">
                    Rejestr formacji gildyjnych, wycena rynków królewskich, kalkulator rzemiosła oraz tablica wypraw woskowych – wszystko w jednym kodeksie.
                  </p>

                  <div className="pt-2 flex flex-wrap gap-3">
                    <Link href="/gildie" className="aopp-primary-button inline-flex items-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-wider">
                      <Shield className="w-4 h-4" /> Rejestr Gildii &amp; ZvZ
                    </Link>

                    <Link href="/kalkulator-craftingu" className="bg-[#1a0f07] hover:bg-[#2c1a0e] border border-[#f3ba2f]/50 text-amber-300 font-bold px-6 py-3 rounded-2xl text-xs uppercase tracking-wider transition flex items-center gap-2">
                      <Hammer className="w-4 h-4 text-amber-400" /> Kalkulator Craftingu
                    </Link>

                    <Link href="/rynek" className="bg-black/50 hover:bg-black/80 border border-white/15 text-gray-200 font-bold px-6 py-3 rounded-2xl text-xs uppercase tracking-wider transition flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-sky-400" /> Rynek P2P
                    </Link>
                  </div>
                </div>

                {/* STATS PANE & SERVERS STATUS */}
                <div className="lg:col-span-4 bg-[#050204]/90 border border-[#f3ba2f]/25 p-5 rounded-3xl space-y-4 backdrop-blur-md font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-[#200d14] pb-2">
                    <span className="text-amber-400 font-bold uppercase text-[11px] flex items-center gap-1.5">
                      <Globe className="w-4 h-4" /> Status Serwerów Albion
                    </span>
                    <span className="text-emerald-400 text-[10px] uppercase font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Online
                    </span>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div className="flex items-center justify-between bg-[#080407] p-2.5 rounded-xl border border-[#200d14]">
                      <span className="text-gray-300 font-bold">Europa (AMS)</span>
                      <span className="text-emerald-400 font-bold">24 ms • Operacyjny</span>
                    </div>

                    <div className="flex items-center justify-between bg-[#080407] p-2.5 rounded-xl border border-[#200d14]">
                      <span className="text-gray-300 font-bold">Ameryka (NWA)</span>
                      <span className="text-emerald-400 font-bold">110 ms • Operacyjny</span>
                    </div>

                    <div className="flex items-center justify-between bg-[#080407] p-2.5 rounded-xl border border-[#200d14]">
                      <span className="text-gray-300 font-bold">Azja (SGP)</span>
                      <span className="text-emerald-400 font-bold">185 ms • Operacyjny</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-[10px] pt-1">
                    <div className="bg-[#080407] p-2 rounded-xl border border-[#200d14]">
                      <div className="text-gray-400">Gildie w Rejestrze</div>
                      <div className="text-sm font-bold text-amber-200 mt-0.5">{globalStats.guildsCount}</div>
                    </div>

                    <div className="bg-[#080407] p-2 rounded-xl border border-[#200d14]">
                      <div className="text-gray-400">Oferty Rynku P2P</div>
                      <div className="text-sm font-bold text-emerald-300 mt-0.5">{globalStats.marketOffersCount}</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* BENTO GRID 2.0 (MODUŁY PORTALU) */}
            <section className="space-y-4">
              <div className="flex items-end justify-between border-b border-white/10 pb-3">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">Bento Dashboard 2.0</p>
                  <h3 className="font-display text-2xl font-black text-white sm:text-3xl">Główne Moduły Społecznościowe</h3>
                </div>
                <span className="text-xs text-gray-400 font-mono hidden sm:block">7 Dedykowanych Narzędzi dla Gracza</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                
                {/* BENTO CARD 1: GILDIE (LARGE 2-COL FEATURE) */}
                <Link href="/gildie" className="aopp-module-card md:col-span-2 group p-6 rounded-3xl border border-[#f3ba2f]/35 flex flex-col justify-between min-h-[220px] bg-gradient-to-br from-[#12080d] via-[#090407] to-[#040203]">
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-[#f3ba2f]/15 border border-[#f3ba2f]/40 text-[#f3ba2f] rounded-2xl group-hover:scale-110 transition-transform">
                      <Shield className="w-7 h-7" />
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 uppercase font-bold bg-[#f3ba2f]/10 border border-[#f3ba2f]/30 px-3 py-1 rounded-full">
                      Rejestr Gildii &amp; ZvZ Inspector
                    </span>
                  </div>

                  <div className="space-y-2 mt-4">
                    <h4 className="font-display text-2xl font-black text-white group-hover:text-amber-300 transition">
                      Gildie &amp; Starcia Sezonowe ZvZ
                    </h4>
                    <p className="text-sm text-gray-300 max-w-xl">
                      Przeglądaj polskie gildie w Albion Online, sprawdzaj Kill Fame, wskaźniki K/D w starciach ZvZ oraz bezpośrednio aplikuj do wymarzonej formacji.
                    </p>
                  </div>

                  <div className="pt-4 flex items-center justify-between text-xs font-mono border-t border-white/10 mt-4">
                    <span className="text-amber-400 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Przeglądaj {globalStats.guildsCount} zarejestrowanych gildii
                    </span>
                    <span className="text-gray-400 group-hover:text-white flex items-center gap-1">
                      Otwórz Moduł &rarr;
                    </span>
                  </div>
                </Link>

                {/* BENTO CARD 2: CRAFTING CALCULATOR */}
                <Link href="/kalkulator-craftingu" className="aopp-module-card group p-6 rounded-3xl border border-amber-500/35 flex flex-col justify-between min-h-[220px] bg-gradient-to-br from-[#180f08] to-[#080407]">
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-amber-500/15 border border-amber-500/40 text-amber-400 rounded-2xl group-hover:scale-110 transition-transform">
                      <Hammer className="w-7 h-7" />
                    </div>
                    <span className="text-[10px] font-mono text-amber-300 uppercase font-bold bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">
                      Nowe Narzędzie
                    </span>
                  </div>

                  <div className="space-y-1.5 mt-3">
                    <h4 className="font-display text-xl font-bold text-white group-hover:text-amber-300 transition">
                      Kalkulator Craftingu
                    </h4>
                    <p className="text-xs text-gray-300">
                      Wyliczaj czysty zysk netto w Srebrze na surowcach z uwzględnieniem RRR % i cen z rynków królewskich.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                    <span className="text-amber-300 font-bold">Wyceny API na żywo</span>
                    <span className="text-gray-400 group-hover:text-white">&rarr;</span>
                  </div>
                </Link>

                {/* BENTO CARD 3: RYNEK P2P */}
                <Link href="/rynek" className="aopp-module-card group p-6 rounded-3xl border border-sky-500/35 flex flex-col justify-between min-h-[200px] bg-gradient-to-br from-[#0a1218] to-[#04080b]">
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-sky-500/15 border border-sky-500/40 text-sky-400 rounded-2xl group-hover:scale-110 transition-transform">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono text-sky-300 uppercase font-bold">
                      {globalStats.marketOffersCount} Ofert
                    </span>
                  </div>

                  <div className="space-y-1.5 mt-3">
                    <h4 className="font-display text-xl font-bold text-white group-hover:text-sky-300 transition">
                      Rynek P2P &amp; Live Wycena
                    </h4>
                    <p className="text-xs text-gray-300">
                      Kupuj i sprzedawaj wyposażenie bez podatków w grze z podglądem okazjonalnych cen rynkowych.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                    <span className="text-sky-400 font-bold">Wystaw Ogłoszenie</span>
                    <span className="text-gray-400 group-hover:text-white">&rarr;</span>
                  </div>
                </Link>

                {/* BENTO CARD 4: BUILDY */}
                <Link href="/buildy" className="aopp-module-card group p-6 rounded-3xl border border-rose-500/35 flex flex-col justify-between min-h-[200px] bg-gradient-to-br from-[#180a0d] to-[#080305]">
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-rose-500/15 border border-rose-500/40 text-rose-400 rounded-2xl group-hover:scale-110 transition-transform">
                      <Swords className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono text-rose-300 uppercase font-bold">
                      Kreator IP
                    </span>
                  </div>

                  <div className="space-y-1.5 mt-3">
                    <h4 className="font-display text-xl font-bold text-white group-hover:text-rose-300 transition">
                      Kuźnia Buildów
                    </h4>
                    <p className="text-xs text-gray-300">
                      Twórz, oceniaj i dziel się sprawdzonymi zestawami ekwipunku na PvP, ZvZ i PvE.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                    <span className="text-rose-400 font-bold">Przeglądaj Rejestr</span>
                    <span className="text-gray-400 group-hover:text-white">&rarr;</span>
                  </div>
                </Link>

                {/* BENTO CARD 5: WYPRAWY */}
                <Link href="/wyprawy" className="aopp-module-card group p-6 rounded-3xl border border-purple-500/35 flex flex-col justify-between min-h-[200px] bg-gradient-to-br from-[#120a18] to-[#060308]">
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-purple-500/15 border border-purple-500/40 text-purple-400 rounded-2xl group-hover:scale-110 transition-transform">
                      <Users className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-mono text-purple-300 uppercase font-bold">
                      Party Planner
                    </span>
                  </div>

                  <div className="space-y-1.5 mt-3">
                    <h4 className="font-display text-xl font-bold text-white group-hover:text-purple-300 transition">
                      Wyprawy &amp; Rajdy Gildyjne
                    </h4>
                    <p className="text-xs text-gray-300">
                      Zbiórki na HCE, Statyki i Ava Dungi z weryfikacją IP oraz powiadomieniami na Discordzie.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                    <span className="text-purple-400 font-bold">Dołącz do Drużyny</span>
                    <span className="text-gray-400 group-hover:text-white">&rarr;</span>
                  </div>
                </Link>

              </div>
            </section>

            {/* SEKCJA DOLNA: MARŻE + CHAT SPOŁECZNOŚCIOWY */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEWA KOLUMNA: KALKULATOR MARŻ & FLIPÓW */}
              <div className="lg:col-span-6 space-y-6">
                <div className="aopp-panel space-y-6 rounded-3xl p-6 sm:p-8">
                  <div className="flex items-center justify-between border-b border-[#200d13] pb-4">
                    <div className="flex gap-4 font-mono text-xs font-bold uppercase">
                      <button onClick={() => setRightTab('ECONOMY')} className={`pb-1 transition cursor-pointer ${rightTab === 'ECONOMY' ? 'text-[#f3ba2f] border-b-2 border-[#f3ba2f]' : 'text-gray-500'}`}>Kalkulator Marż &amp; Flipów</button>
                      {isAdmin && <button onClick={() => setRightTab('ADMIN')} className={`pb-1 transition cursor-pointer ${rightTab === 'ADMIN' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-rose-900'}`}>Panel Admina</button>}
                    </div>
                    <Calculator className="w-4 h-4 text-gray-500" />
                  </div>

                  {rightTab === 'ECONOMY' && (
                    <form onSubmit={handleCalculateFlip} className="space-y-4 text-xs sm:text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-gray-400 mb-1 font-mono text-[10px] uppercase">Cena Zakupu (Silver)</label>
                          <input 
                            type="number" 
                            required 
                            placeholder="np. 45000" 
                            value={buyPrice} 
                            onChange={e => setBuyPrice(e.target.value)} 
                            className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-gray-100 font-mono outline-none text-xs focus:border-[#f3ba2f]" 
                          />
                        </div>

                        <div>
                          <label className="block text-gray-400 mb-1 font-mono text-[10px] uppercase">Cena Sprzedaży (Silver)</label>
                          <input 
                            type="number" 
                            required 
                            placeholder="np. 68000" 
                            value={sellPrice} 
                            onChange={e => setSellPrice(e.target.value)} 
                            className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-gray-100 font-mono outline-none text-xs focus:border-[#f3ba2f]" 
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-gray-400 mb-1 font-mono text-[10px] uppercase">Podatek Rynku</label>
                        <select 
                          value={feeRate} 
                          onChange={e => setFeeRate(e.target.value)}
                          className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-gray-200 font-mono text-xs outline-none cursor-pointer"
                        >
                          <option value="4">4% (z Premium i Wystawieniem Orderu)</option>
                          <option value="8">8% (Standard bez Premium)</option>
                          <option value="10">10% (Pobór Opłat i Podatek Bezpośredni)</option>
                        </select>
                      </div>

                      <button type="submit" className="aopp-primary-button w-full py-3 text-xs font-black uppercase tracking-wider cursor-pointer">
                        Oblicz Marżę Zysku
                      </button>

                      {flipResult && (
                        <div className="mt-4 p-4 rounded-2xl bg-[#050204] border border-[#f3ba2f]/30 space-y-2 font-mono text-xs">
                          <div className="flex justify-between text-gray-400">
                            <span>Zapłacony Podatek:</span>
                            <span className="text-rose-400 font-bold">-{flipResult.taxAmount.toLocaleString('pl-PL')} Silver</span>
                          </div>
                          <div className="flex justify-between text-gray-200 border-t border-[#1c0b10] pt-2">
                            <span>Zysk Netto:</span>
                            <span className={`font-bold ${flipResult.netProfit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {flipResult.netProfit > 0 ? '+' : ''}{flipResult.netProfit.toLocaleString('pl-PL')} Silver
                            </span>
                          </div>
                          <div className="flex justify-between text-gray-200">
                            <span>Zwrot z Inwestycji (ROI):</span>
                            <span className={`font-bold ${parseFloat(flipResult.margin) > 0 ? 'text-amber-300' : 'text-rose-400'}`}>
                              {flipResult.margin}%
                            </span>
                          </div>
                        </div>
                      )}
                    </form>
                  )}
                </div>
              </div>

              {/* PRAWA KOLUMNA: CZAT CZATU NA ŻYWO */}
              <div className="lg:col-span-6">
                <ChatBox user={user} />
              </div>

            </div>

          </div>
        )}
      </div>
    </main>
  )
}
