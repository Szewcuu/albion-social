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
  ArrowRight,
  Users,
  Crown,
  Map,
  Hammer
} from 'lucide-react'
import ChatBox from '@/components/ChatBox'

// ZEGAR UTC
const ServerClock = memo(function ServerClock() {
  const [utcTime, setUtcTime] = useState('')

  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setUtcTime(now.toLocaleTimeString('pl-PL', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    updateClock()
    const timer = setInterval(updateClock, 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <span className="font-mono font-bold text-[#f3ba2f] tracking-wider text-lg">
      {utcTime || '00:00:00'}
    </span>
  )
})

export default function Home() {
  // Stany ogólne użytkownika
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profileOpen, setProfileOpen] = useState(false)

  // Powiadomienia
  const [notifications, setNotifications] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [toastNotification, setToastNotification] = useState(null)

  // Stany Supabase
  const [globalStats, setGlobalStats] = useState({ guildsCount: 0, marketOffersCount: 0 })
  const [albionNews, setAlbionNews] = useState([])

  // Stany Admina
  const [allGuilds, setAllGuilds] = useState([])
  const [allMarketPosts, setAllMarketPosts] = useState([])
  const [allExpeditions, setAllExpeditions] = useState([])
  const [allBuilds, setAllBuilds] = useState([])
  const [adminTab, setAdminTab] = useState('MARKET')

  // Zakładki
  const [rightTab, setRightTab] = useState('ECONOMY')

  // --- PROSTY KALKULATOR MARŻ ---
  const [buyPrice, setBuyPrice] = useState('')
  const [blackMarketPrice, setBlackMarketPrice] = useState('')
  const [hasPremium, setHasPremium] = useState(true)
  const [calcResult, setCalcResult] = useState(null)

  // Obliczanie opłacalności flipu
  const handleCalculateFlip = (e) => {
    e.preventDefault()

    const buy = parseFloat(buyPrice) || 0
    const sell = parseFloat(blackMarketPrice) || 0

    if (buy <= 0 || sell <= 0) return

    const taxRate = hasPremium ? 0.04 : 0.08
    const netSell = sell * (1 - taxRate)

    const profit = Math.round(netSell - buy)
    const roi = ((profit / buy) * 100).toFixed(1)

    let statusText = 'Ryzykowne / Mały Zysk'
    let statusColor = 'bg-amber-950/40 border-amber-800 text-amber-300'

    if (profit >= 50000 && parseFloat(roi) >= 15) {
      statusText = '🔥 Bardzo Opłacalny Transport!'
      statusColor = 'bg-emerald-950/40 border-emerald-800 text-emerald-400'
    } else if (profit < 0) {
      statusText = '⚠️ Transakcja Przyniesie Stratę'
      statusColor = 'bg-rose-950/40 border-rose-800 text-rose-300'
    }

    setCalcResult({
      profit: profit.toLocaleString('pl-PL'),
      roi: roi,
      statusText: statusText,
      statusColor: statusColor
    })
  }

  const fetchNotifications = useCallback(async (userId) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)

    if (data) setNotifications(data)
  }, [])

  const fetchGlobalData = useCallback(async () => {
    try {
      const { count: gCount } = await supabase.from('guilds').select('*', { count: 'exact', head: true })
      const { count: mCount } = await supabase.from('market_items').select('*', { count: 'exact', head: true })
      setGlobalStats({ marketOffersCount: mCount || 0, guildsCount: gCount || 0 })
    } catch (err) {
      console.error(err)
    }
  }, [])

  const fetchUserDataAndRole = useCallback(async (userId) => {
    try {
      const { data: profile } = await supabase.from('profiles').select('is_admin, username').eq('id', userId).single()
      const adminStatus = profile?.is_admin ?? false
      setIsAdmin(adminStatus)

      if (adminStatus) {
        const { data: allG } = await supabase.from('guilds').select('id, name, user_id, profiles(username)').order('created_at', { ascending: false })
        const { data: allM = [] } = await supabase.from('market_items').select('*, profiles(username)').order('created_at', { ascending: false })
        const { data: allE = [] } = await supabase.from('expeditions').select('*, profiles(username)').order('created_at', { ascending: false })
        const { data: allB = [] } = await supabase.from('builds').select('*, profiles(username)').order('created_at', { ascending: false })

        setAllGuilds(allG || [])
        setAllMarketPosts(allM || [])
        setAllExpeditions(allE || [])
        setAllBuilds(allB || [])
      }
    } catch (err) {
      console.error(err)
    }
  }, [])

  const fetchAlbionNews = async () => {
    try {
      const res = await fetch('/api/news')
      const data = await res.json()
      if (data && !data.error) setAlbionNews(data)
    } catch (err) {
      console.error("Błąd ładowania wiadomości:", err)
    }
  }

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return
      const currentUser = session?.user ?? null
      setUser(currentUser)
      setLoading(false)
      if (currentUser) {
        fetchGlobalData()
        fetchAlbionNews()
        fetchUserDataAndRole(currentUser.id)
        fetchNotifications(currentUser.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return
      const currentUser = session?.user ?? null
      setUser(currentUser)
      setLoading(false)
      if (currentUser) {
        fetchGlobalData()
        fetchUserDataAndRole(currentUser.id)
        fetchNotifications(currentUser.id)
      } else {
        setIsAdmin(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [fetchGlobalData, fetchUserDataAndRole, fetchNotifications])

  // SUBSKRYPCJA REALTIME POWIADOMIEŃ
  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`user_notifications_${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        const newNotif = payload.new
        setNotifications(prev => [newNotif, ...prev])
        setToastNotification(newNotif)

        setTimeout(() => {
          setToastNotification(null)
        }, 5000)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const markAllAsRead = async () => {
    if (!user) return
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
  }

  const logout = async () => { await supabase.auth.signOut() }
  const loginWithDiscord = async () => { await supabase.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: window.location.origin } }) }
  
  const deleteMarketPost = async (id) => {
    if (confirm('Usunąć ofertę z rynku?')) {
      const { error } = await supabase.from('market_items').delete().eq('id', id)
      if (!error) { fetchGlobalData(); if (user) fetchUserDataAndRole(user.id); }
    }
  }

  const deleteGuild = async (id) => {
    if (confirm('Spalić dekret tej gildii?')) {
      const { error } = await supabase.from('guilds').delete().eq('id', id)
      if (!error) { fetchGlobalData(); if (user) fetchUserDataAndRole(user.id); }
    }
  }

  const deleteExpedition = async (id) => {
    if (confirm('Czy na pewno chcesz odwołać tę wyprawę z panelu admina?')) {
      try {
        const response = await authenticatedFetch('/api/webhooks/expedition', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expeditionId: id }),
        })

        if (response.ok) {
          fetchGlobalData()
          if (user) fetchUserDataAndRole(user.id)
        }
      } catch (err) {
        console.error('Błąd kasowania wyprawy:', err)
      }
    }
  }

  const deleteBuild = async (id) => {
    if (confirm('Czy na pewno chcesz usunąć ten zestaw uzbrojenia?')) {
      const { error } = await supabase.from('builds').delete().eq('id', id)
      if (!error) { fetchGlobalData(); if (user) fetchUserDataAndRole(user.id); }
    }
  }

  if (loading) {
    return (
      <main className="aopp-shell flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="relative h-16 w-16 overflow-hidden rounded-full border border-[#e2ba5c]/50 shadow-[0_0_40px_rgba(220,176,69,.2)]">
            <Image src="/logo-256.webp" alt="Albion Social" fill sizes="64px" className="object-cover" />
          </div>
          <div className="h-0.5 w-28 overflow-hidden rounded-full bg-[#5c4a24]"><div className="h-full w-1/2 animate-pulse rounded-full bg-[#e2ba5c]" /></div>
          <p className="text-[10px] font-black uppercase tracking-[.28em] text-[#cba84e]">Otwieranie bramy...</p>
        </div>
      </main>
    )
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <main className="aopp-shell min-h-screen overflow-x-hidden text-[#eee8dc] antialiased selection:bg-[#d9aa3c] selection:text-[#17100a]">
      <div className="aopp-world-bg" aria-hidden="true" />
      <div className="aopp-grain" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex w-full max-w-[1540px] flex-1 flex-col px-4 py-4 sm:px-6 lg:px-8 lg:py-6">
        {!user ? (
          <section className="relative my-auto flex min-h-[calc(100vh-2rem)] w-full items-center overflow-hidden rounded-[28px] border border-[#d2a84b]/35 bg-[#0b0b09] p-6 shadow-[0_35px_120px_rgba(0,0,0,.7)] sm:p-10 lg:p-16">
            <Image src="/albion-social-hero.webp" alt="Fantastyczna kraina z warownym miastem" fill priority sizes="100vw" className="object-cover object-[66%_center]" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,10,8,.97)_0%,rgba(8,10,8,.76)_45%,rgba(8,10,8,.2)_75%,rgba(8,10,8,.58)_100%)]" />
            <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(5,7,5,.94)_0%,transparent_55%)]" />
            <div className="relative z-10 w-full max-w-2xl text-left">
              <div className="absolute -top-20 left-0 h-24 w-48 rounded-full bg-[#f3ba2f]/15 blur-2xl pointer-events-none"></div>
              <div className="relative z-10 flex items-center gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full border border-[#f3ba2f]/60 bg-[#0a0408] shadow-[0_0_25px_rgba(243,186,47,0.3)]">
                  <Image src="/logo-256.webp" alt="Logo Albion Social" width={80} height={80} preload className="w-full h-full object-cover scale-105" />
                </div>
                <div>
                  <p className="font-display text-xl font-black tracking-[.08em] text-white">ALBION SOCIAL</p>
                  <p className="text-[10px] font-black uppercase tracking-[.26em] text-[#d9b45a]">Polska społeczność</p>
                </div>
              </div>

              <div className="relative z-10 mt-14 space-y-5">
                <p className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[.28em] text-[#e0bb61] before:h-px before:w-10 before:bg-[#e0bb61]">Twój świat. Twoje zasady.</p>
                <h1 className="font-display text-5xl font-black leading-[.96] tracking-[-.035em] text-[#fffaf0] sm:text-6xl lg:text-7xl">Zbuduj legendę.<br /><span className="text-[#e4b94f]">Razem.</span></h1>
                <p className="max-w-xl text-base leading-7 text-[#d6d0c4] sm:text-lg">Gildie, wyprawy, rynek i narzędzia bojowe polskiej społeczności — w jednym miejscu, zawsze gotowe przed kolejną wyprawą.</p>
              </div>

              <div className="relative z-10 mt-9 flex flex-col gap-3 sm:flex-row">
                <button onClick={loginWithDiscord} className="aopp-primary-button group inline-flex min-h-14 items-center justify-center gap-3 px-7 text-sm font-black uppercase tracking-[.08em]">
                  Wejdź przez Discord <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </button>
                <a href="#atuty" className="aopp-ghost-button inline-flex min-h-14 items-center justify-center px-7 text-sm font-bold uppercase tracking-[.08em]">Poznaj portal</a>
              </div>

              <div id="atuty" className="relative z-10 mt-14 grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 backdrop-blur-sm">
                {[['Gildie', 'Rekrutacja'], ['Wyprawy', 'Party finder'], ['Rynek', 'Handel P2P']].map(([title, label]) => (
                  <div key={title} className="bg-black/45 px-3 py-4 sm:px-5">
                    <p className="font-display text-base font-bold text-white sm:text-lg">{title}</p>
                    <p className="mt-1 text-[9px] font-bold uppercase tracking-[.15em] text-[#c9a84f]">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <div className="w-full space-y-6">
            <header className="aopp-topbar sticky top-3 z-40 flex flex-col items-center justify-between gap-4 rounded-2xl px-4 py-3 sm:px-5 lg:flex-row">
              <div className="flex items-center gap-5 w-full lg:w-auto">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border border-[#f3ba2f]/50 bg-[#0c0407] shadow-[0_0_15px_rgba(243,186,47,0.2)]">
                  <Image src="/logo-256.webp" alt="Logo Albion Social" width={48} height={48} preload className="h-full w-full scale-105 object-cover" />
                </div>

                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="font-display text-xl font-black tracking-wide text-white sm:text-2xl">
                      Albion Social
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold tracking-wider uppercase">
                      Online
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[.18em] text-[#9e998f]">
                    Polska społeczność graczy
                  </p>
                </div>
              </div>

              <nav className="hidden items-center gap-1 xl:flex" aria-label="Główna nawigacja">
                <Link href="/gildie" className="aopp-nav-link">Gildie</Link>
                <Link href="/wyprawy" className="aopp-nav-link">Wyprawy</Link>
                <Link href="/rynek" className="aopp-nav-link">Rynek</Link>
                <Link href="/buildy" className="aopp-nav-link">Buildy</Link>
              </nav>

              <div className="flex flex-wrap items-center justify-end gap-4 w-full lg:w-auto">
                <div className="bg-[#070204] border border-[#240e14] rounded-2xl px-5 py-2.5 flex items-center gap-3">
                  <Clock className="w-4 h-4 text-[#f3ba2f]" />
                  <ServerClock />
                </div>

                {/* CENTRUM POWIADOMIEŃ */}
                <div className="relative">
                  <button 
                    onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
                    className="p-3 bg-[#070204] border border-[#240e14] hover:border-[#f3ba2f]/50 text-[#f3ba2f] rounded-2xl relative transition cursor-pointer"
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
                          <p className="text-center text-gray-500 italic py-4">Brak powiadomień</p>
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
                    className="flex items-center gap-2.5 bg-gradient-to-r from-[#14060b] to-[#070204] border border-[#f3ba2f]/40 hover:border-[#f3ba2f]/80 rounded-2xl px-4 py-2.5 shadow-lg transition-all cursor-pointer group"
                  >
                    <div className="relative">
                      <div className="p-1.5 bg-[#1f0a11] border border-[#f3ba2f]/40 rounded-xl text-[#f3ba2f] group-hover:scale-105 transition-transform">
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

            <section className="aopp-hero relative min-h-[420px] overflow-hidden rounded-[28px] border border-[#cfa94e]/25 shadow-[0_28px_90px_rgba(0,0,0,.46)]">
              <Image src="/albion-social-hero.webp" alt="Widok na fantastyczne miasto i dolinę" fill priority fetchPriority="high" sizes="(max-width: 1540px) 100vw, 1540px" className="object-cover object-[68%_center] transition-transform duration-[1400ms] hover:scale-[1.015]" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,10,8,.95)_0%,rgba(8,10,8,.72)_43%,rgba(8,10,8,.12)_76%,rgba(8,10,8,.45)_100%)]" />
              <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(7,8,7,.88)_0%,transparent_52%)]" />

              <div className="relative z-10 flex min-h-[420px] max-w-3xl flex-col justify-center p-7 sm:p-10 lg:p-14">
                <p className="mb-4 flex items-center gap-3 text-[10px] font-black uppercase tracking-[.28em] text-[#e0bb61] before:h-px before:w-9 before:bg-[#e0bb61]">
                  Centrum dowodzenia • Europa
                </p>
                <h2 className="font-display text-4xl font-black leading-[1.02] tracking-[-.025em] text-[#fffaf0] sm:text-5xl lg:text-6xl">
                  Zbierz drużynę.<br /><span className="text-[#e4b94f]">Zapisz własną legendę.</span>
                </h2>
                <p className="mt-5 max-w-xl text-sm leading-6 text-[#d2ccc0] sm:text-base">
                  Wszystko, czego potrzebuje gracz i dowódca: ludzie, przygotowanie, handel i wspólna wyprawa — bez chaosu między narzędziami.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link href="/wyprawy" className="aopp-primary-button group inline-flex min-h-12 items-center justify-center gap-2 px-6 text-xs font-black uppercase tracking-[.1em]">
                    Znajdź wyprawę <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                  <Link href="/gildie" className="aopp-ghost-button inline-flex min-h-12 items-center justify-center px-6 text-xs font-black uppercase tracking-[.1em]">Poznaj gildie</Link>
                </div>
              </div>

              <div className="absolute bottom-5 right-5 z-10 hidden items-center gap-4 rounded-xl border border-white/10 bg-black/50 px-5 py-3 backdrop-blur-md sm:flex">
                <span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" /><span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" /></span>
                <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#9f9a91]">Świat online</p><p className="font-display text-sm font-bold text-white">Przygoda trwa</p></div>
              </div>
            </section>

            {/* SEKCJA Z KARTAMI I STATYSTYKAMI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="aopp-stat flex items-center gap-4 rounded-2xl p-4">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400"><Globe className="w-5 h-5" /></div>
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase">Status Serwerów</span>
                  <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>W pełni operacyjne</div>
                </div>
              </div>

              <div className="aopp-stat flex items-center gap-4 rounded-2xl p-4">
                <div className="p-3 bg-[#f3ba2f]/10 border border-[#f3ba2f]/20 rounded-xl text-[#f3ba2f]"><ShoppingBag className="w-5 h-5" /></div>
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase">Aktywne oferty rynku</span>
                  <div className="text-sm font-bold text-white mt-0.5 font-mono">{globalStats.marketOffersCount} ogłoszeń</div>
                </div>
              </div>

              <div className="aopp-stat flex items-center gap-4 rounded-2xl p-4">
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400"><Compass className="w-5 h-5" /></div>
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase">Zarejestrowane gildie</span>
                  <div className="text-sm font-bold text-white mt-0.5 font-mono">{globalStats.guildsCount} formacji</div>
                </div>
              </div>

              <a href="https://wiki.albiononline.com" target="_blank" rel="noopener noreferrer" className="aopp-stat group flex cursor-pointer items-center justify-between rounded-2xl p-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400"><ExternalLink className="w-5 h-5" /></div>
                  <div>
                    <span className="text-[10px] font-mono text-gray-400 uppercase">Baza Wiedzy</span>
                    <div className="text-sm font-bold text-white group-hover:text-[#f3ba2f] transition mt-0.5">Oficjalna Wiki</div>
                  </div>
                </div>
              </a>
            </div>

            {/* SIATKA 6 MODUŁÓW PORTALU */}
            <section>
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.24em] text-[#caa64d]">Wybierz swój kierunek</p>
                  <h2 className="font-display mt-1 text-2xl font-black text-white sm:text-3xl">Narzędzia dla każdego stylu gry</h2>
                </div>
                <span className="hidden text-xs text-[#817d75] sm:block">Siedem dróg. Jedna społeczność.</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              
              {/* MODUŁ 01: GILDIE */}
              <Link href="/gildie" className="aopp-module-card group flex min-h-44 flex-col justify-between rounded-2xl p-5">
                <div className="flex justify-between items-start">
                  <div className="rounded-xl border border-[#f3ba2f]/20 bg-[#f3ba2f]/10 p-3 text-[#f3ba2f] transition-transform group-hover:-rotate-3 group-hover:scale-110">
                    <Swords className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 uppercase">Moduł 01</span>
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-white transition-colors group-hover:text-[#f3ba2f]">Rejestr Gildii</h3>
                  <p className="mt-2 text-sm text-[#a9a49b]">Znajdź ludzi do wspólnej gry albo pokaż światu własny sztandar.</p>
                </div>
              </Link>

              {/* MODUŁ 02: WYPRAWY */}
              <Link href="/wyprawy" className="aopp-module-card group flex min-h-44 flex-col justify-between rounded-2xl p-5">
                <div className="flex justify-between items-start">
                  <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-3 text-purple-400 transition-transform group-hover:-rotate-3 group-hover:scale-110">
                    <Shield className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 uppercase">Moduł 02</span>
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-white transition-colors group-hover:text-purple-300">Wyprawy &amp; Party</h3>
                  <p className="mt-2 text-sm text-[#a9a49b]">Zaplanuj aktywność, obsadź role i zsynchronizuj zbiórkę z Discordem.</p>
                </div>
              </Link>

              {/* MODUŁ 03: RYNEK */}
              <Link href="/rynek" className="aopp-module-card group flex min-h-44 flex-col justify-between rounded-2xl p-5">
                <div className="flex justify-between items-start">
                  <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-sky-400 transition-transform group-hover:-rotate-3 group-hover:scale-110">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 uppercase">Moduł 03</span>
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-white transition-colors group-hover:text-sky-300">Tablica Rynku</h3>
                  <p className="mt-2 text-sm text-[#a9a49b]">Kupuj i sprzedawaj bez zbędnego szumu — bezpośrednio między graczami.</p>
                </div>
              </Link>

              {/* MODUŁ 04: LOOT SPLITTER */}
              <Link href="/loot-split" className="aopp-module-card group flex min-h-44 flex-col justify-between rounded-2xl p-5">
                <div className="flex justify-between items-start">
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400 transition-transform group-hover:-rotate-3 group-hover:scale-110">
                    <Coins className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 uppercase">Moduł 04</span>
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-white transition-colors group-hover:text-emerald-300">Loot Splitter</h3>
                  <p className="mt-2 text-sm text-[#a9a49b]">Policz udziały, zwroty i regeary bez arkusza pełnego pomyłek.</p>
                </div>
              </Link>

              {/* MODUŁ 05: TIMERY */}
              <Link href="/timery" className="aopp-module-card group flex min-h-44 flex-col justify-between rounded-2xl p-5">
                <div className="flex justify-between items-start">
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-400 transition-transform group-hover:-rotate-3 group-hover:scale-110">
                    <Compass className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 uppercase">Moduł 05</span>
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-white transition-colors group-hover:text-amber-300">Timery ZvZ &amp; Core</h3>
                  <p className="mt-2 text-sm text-[#a9a49b]">Pilnuj bitew, respawnów i najważniejszych okien aktywności.</p>
                </div>
              </Link>

              {/* MODUŁ 06: KILLBOARD */}
              <Link href="/killboard" className="aopp-module-card group flex min-h-44 flex-col justify-between rounded-2xl p-5">
                <div className="flex justify-between items-start">
                  <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-rose-400 transition-transform group-hover:-rotate-3 group-hover:scale-110">
                    <Skull className="h-6 w-6" />
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 uppercase">Moduł 06</span>
                </div>
                <div>
                  <h3 className="font-display text-xl font-bold text-white transition-colors group-hover:text-rose-300">Killboard Graczy</h3>
                  <p className="mt-2 text-sm text-[#a9a49b]">Prześwietl historię walki, K/D oraz doświadczenie PvP gracza.</p>
                </div>
              </Link>

              <Link href="/buildy" className="aopp-module-card aopp-module-feature group flex min-h-36 flex-col justify-between rounded-2xl p-5 sm:flex-row sm:items-center lg:col-span-3">
                <div className="flex items-center gap-4">
                  <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-3 text-orange-300 transition-transform group-hover:-rotate-3 group-hover:scale-110">
                    <Hammer className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase text-gray-500">Moduł 07</p>
                    <h3 className="font-display mt-1 text-xl font-bold text-white transition-colors group-hover:text-orange-200">Kuźnia Buildów</h3>
                    <p className="mt-1 text-sm text-[#a9a49b]">Buduj, zapisuj i udostępniaj sprawdzone zestawy ekwipunku.</p>
                  </div>
                </div>
                <span className="mt-4 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[.12em] text-[#d9b45a] sm:mt-0">Otwórz kuźnię <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
              </Link>

              </div>
            </section>

            {/* SEKCJA DOLNA: KALKULATOR/ADMIN (LEWA) + CZAT/NEWSY (PRAWA) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEWA KOLUMNA: KALKULATOR & ADMIN */}
              <div className="lg:col-span-6 space-y-6">
                <div className="aopp-panel space-y-6 rounded-3xl p-6 sm:p-8">
                  <div className="flex items-center justify-between border-b border-[#200d13] pb-4">
                    <div className="flex gap-4 font-mono text-xs font-bold uppercase">
                      <button onClick={() => setRightTab('ECONOMY')} className={`pb-1 transition ${rightTab === 'ECONOMY' ? 'text-[#f3ba2f] border-b-2 border-[#f3ba2f]' : 'text-gray-500'}`}>Kalkulator Marż</button>
                      {isAdmin && <button onClick={() => setRightTab('ADMIN')} className={`pb-1 transition ${rightTab === 'ADMIN' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-rose-900'}`}>Panel Inkwizycji</button>}
                    </div>
                    <Calculator className="w-4 h-4 text-gray-500" />
                  </div>

                  {rightTab === 'ECONOMY' && (
                    <form onSubmit={handleCalculateFlip} className="space-y-4 text-xs sm:text-sm">
                      
                      {/* CZYSTE CENY */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-gray-400 mb-1 font-mono text-[10px] uppercase">Cena w Mieście (Silver)</label>
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
                          <label className="block text-gray-400 mb-1 font-mono text-[10px] uppercase">Czarny Rynek Caerleon</label>
                          <input 
                            type="number" 
                            required 
                            placeholder="np. 68000" 
                            value={blackMarketPrice} 
                            onChange={e => setBlackMarketPrice(e.target.value)} 
                            className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-gray-100 font-mono outline-none text-xs focus:border-[#f3ba2f]" 
                          />
                        </div>
                      </div>

                      {/* CHECKBOX PREMIUM */}
                      <div className="flex items-center gap-2 font-mono text-xs text-gray-300 bg-[#050204] p-2.5 rounded-xl border border-[#220e14]">
                        <input 
                          type="checkbox" 
                          id="hasPremium" 
                          checked={hasPremium} 
                          onChange={e => setHasPremium(e.target.checked)}
                          className="rounded bg-[#050204] border-[#220e14] text-[#f3ba2f] cursor-pointer" 
                        />
                        <label htmlFor="hasPremium" className="cursor-pointer text-[11px]">
                          Status Premium (Podatek 4% zamiast 8%)
                        </label>
                      </div>

                      <button type="submit" className="w-full bg-gradient-to-r from-[#f3ba2f] to-[#d9981e] hover:from-[#fcd053] text-black font-extrabold py-3.5 rounded-xl uppercase tracking-wider text-xs transition shadow-md cursor-pointer font-serif">
                        Analizuj Opłacalność
                      </button>

                      {/* WYNIK OBLICZEŃ */}
                      <div className="bg-[#050204] border border-[#220e14] rounded-2xl p-4 text-center">
                        {calcResult ? (
                          <div className="space-y-2 text-xs font-mono">
                            <div className="flex justify-between border-b border-[#1c0b10] pb-2">
                              <span className="text-gray-400">Czysty Zysk (po podatku):</span>
                              <span className="font-bold text-emerald-400">{calcResult.profit} Silver</span>
                            </div>
                            <div className="flex justify-between border-b border-[#1c0b10] pb-2">
                              <span className="text-gray-400">Zwrot Inwestycji (ROI):</span>
                              <span className="font-black text-amber-400">+{calcResult.roi}%</span>
                            </div>
                            <div className={`mt-2 p-2.5 rounded-xl border text-center font-bold uppercase text-[11px] ${calcResult.statusColor}`}>
                              {calcResult.statusText}
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500 italic text-xs py-2 font-mono">
                            Wprowadź ceny, aby wyliczyć marżę transportową do Caerleon.
                          </p>
                        )}
                      </div>
                    </form>
                  )}

                  {rightTab === 'ADMIN' && isAdmin && (
                    <div className="space-y-4 text-xs">
                      <div className="flex justify-between items-center bg-[#050204] p-3 rounded-xl border border-rose-950/60 flex-wrap gap-2">
                        <span className="text-rose-400 font-bold uppercase tracking-wider font-mono">Panel Inkwizycji</span>
                        <div className="flex gap-1 flex-wrap">
                          <button onClick={() => setAdminTab('MARKET')} className={`px-2.5 py-1 rounded-lg font-bold uppercase ${adminTab === 'MARKET' ? 'bg-rose-950 text-rose-300' : 'text-gray-400'}`}>Oferty ({allMarketPosts.length})</button>
                          <button onClick={() => setAdminTab('GUILDS')} className={`px-2.5 py-1 rounded-lg font-bold uppercase ${adminTab === 'GUILDS' ? 'bg-rose-950 text-rose-300' : 'text-gray-400'}`}>Gildie ({allGuilds.length})</button>
                          <button onClick={() => setAdminTab('EXPEDITIONS')} className={`px-2.5 py-1 rounded-lg font-bold uppercase ${adminTab === 'EXPEDITIONS' ? 'bg-rose-950 text-rose-300' : 'text-gray-400'}`}>Wyprawy ({allExpeditions.length})</button>
                          <button onClick={() => setAdminTab('BUILDS')} className={`px-2.5 py-1 rounded-lg font-bold uppercase ${adminTab === 'BUILDS' ? 'bg-rose-950 text-rose-300' : 'text-gray-400'}`}>Buildy ({allBuilds.length})</button>
                        </div>
                      </div>

                      <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1 font-mono">
                        {adminTab === 'MARKET' && (allMarketPosts.length === 0 ? <p className="text-gray-500 italic text-center py-4">Brak ofert.</p> : allMarketPosts.map(p => (
                          <div key={p.id} className="bg-[#050204] border border-rose-950/40 rounded-xl p-2.5 flex justify-between items-center gap-2"><span className="text-gray-200 font-bold">{p.title || p.item_name} - <strong className="text-[#f3ba2f]">{p.price}s</strong></span><button onClick={() => deleteMarketPost(p.id)} className="bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold px-2.5 py-1 rounded uppercase text-[10px]">Usuń</button></div>
                        )))}
                        {adminTab === 'GUILDS' && (allGuilds.length === 0 ? <p className="text-gray-500 italic text-center py-4">Brak gildii.</p> : allGuilds.map(g => (
                          <div key={g.id} className="bg-[#050204] border border-rose-950/40 rounded-xl p-2.5 flex justify-between items-center gap-2"><span className="text-gray-100 font-bold">{g.name}</span><button onClick={() => deleteGuild(g.id)} className="bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold px-2.5 py-1 rounded uppercase text-[10px]">Spal</button></div>
                        )))}
                        {adminTab === 'EXPEDITIONS' && (allExpeditions.length === 0 ? <p className="text-gray-500 italic text-center py-4">Brak wypraw.</p> : allExpeditions.map(e => (
                          <div key={e.id} className="bg-[#050204] border border-rose-950/40 rounded-xl p-2.5 flex justify-between items-center gap-2"><span className="text-gray-100 font-bold">{e.title}</span><button onClick={() => deleteExpedition(e.id)} className="bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold px-2.5 py-1 rounded uppercase text-[10px]">Odwołaj</button></div>
                        )))}
                        {adminTab === 'BUILDS' && (allBuilds.length === 0 ? <p className="text-gray-500 italic text-center py-4">Brak buildów.</p> : allBuilds.map(b => (
                          <div key={b.id} className="bg-[#050204] border border-rose-950/40 rounded-xl p-2.5 flex justify-between items-center gap-2"><span className="text-gray-100 font-bold">{b.title}</span><button onClick={() => deleteBuild(b.id)} className="bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold px-2.5 py-1 rounded uppercase text-[10px]">Usuń</button></div>
                        )))}
                      </div>
                    </div>
                  )}
                </div>

                {/* KRONIKA NEWSÓW */}
                <div className="aopp-panel space-y-4 rounded-3xl p-6 sm:p-8">
                  <div className="flex items-center justify-between border-b border-[#200d13] pb-3">
                    <span className="text-xs font-mono font-bold text-[#f3ba2f] uppercase tracking-wider flex items-center gap-2"><Newspaper className="w-4 h-4" /> Goniec Królewski (Newsy)</span>
                    <span className="text-[10px] text-gray-500 font-mono">RSS Live</span>
                  </div>
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 text-xs">
                    {albionNews.length === 0 ? (<p className="text-xs text-gray-500 italic">Ładowanie kronik...</p>) : (
                      albionNews.map((news, idx) => (
                        <div key={idx} className="border-b border-[#1c0b10] pb-2.5 last:border-none">
                          <a href={news.link} target="_blank" rel="noopener noreferrer" className="text-gray-200 hover:text-[#f3ba2f] font-bold block transition text-xs mb-0.5">{news.title}</a>
                          <p className="text-[11px] text-gray-400 line-clamp-1">{news.contentSnippet}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* PRAWA KOLUMNA: CHATBOX */}
              <div className="lg:col-span-6">
                <ChatBox user={user} isAdmin={isAdmin} />
              </div>
            </div>

          </div>
        )}
      </div>

      {/* TOAST POWIADOMIENIA NA ŻYWO */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm bg-[#0a0408] border-2 border-[#f3ba2f] p-4 rounded-2xl shadow-[0_0_25px_rgba(243,186,47,0.3)] animate-in slide-in-from-bottom-5 duration-300 flex items-start gap-3">
          <div className="p-2 bg-[#f3ba2f]/10 border border-[#f3ba2f]/40 rounded-xl text-[#f3ba2f] shrink-0">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div className="flex-1 text-xs">
            <h4 className="font-bold text-white font-serif text-sm">{toastNotification.title}</h4>
            <p className="text-gray-300 mt-1 leading-relaxed">{toastNotification.message}</p>
          </div>
          <button onClick={() => setToastNotification(null)} className="text-gray-500 hover:text-white transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* FOOTER */}
      <footer className="relative z-20 mt-10 w-full border-t border-[#c39b42]/15 bg-[#070807]/85 py-8 text-center text-xs text-gray-400 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© {new Date().getFullYear()} <span className="text-[#f3ba2f] font-bold">Albion Online Polska Portal</span>.</p>
          <div className="flex gap-4 text-xs font-mono text-gray-400">
            <Link href="/regulamin" className="hover:text-[#f3ba2f] transition">Regulamin</Link>
            <span>•</span>
            <Link href="/prywatnosc" className="hover:text-[#f3ba2f] transition">Polityka Prywatności</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
