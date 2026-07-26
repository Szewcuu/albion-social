'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState, memo, useCallback } from 'react'
import Link from 'next/link'
import { Swords, ShoppingBag, Shield, Clock, Newspaper, Calculator, Globe, Compass, ExternalLink, LogOut, ChevronDown, User, Bell, Check, X } from 'lucide-react'
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
  const [selectedItem, setSelectedItem] = useState('T4_BAG')  
  const [selectedCity, setSelectedCity] = useState('Martlock')
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

  // Kalkulator
  const [buyPrice, setBuyPrice] = useState('')
  const [blackMarketPrice, setBlackMarketPrice] = useState('')
  const [marketTax, setMarketTax] = useState('8')
  const [calcResult, setCalcResult] = useState(null)

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
        const { data: allG } = await supabase.from('guilds').select('*, profiles(username)').order('created_at', { ascending: false })
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

  // SUBSKRYPCJA POWIADOMIEŃ W CZASIE RZECZYWISTYM (REALTIME)
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

        // Automatyczne schowanie wysuwanego toasta po 5 sekundach
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

  const fetchAlbionNews = async () => {
    try {
      const res = await fetch('/api/news')
      const data = await res.json()
      if (data && !data.error) setAlbionNews(data)
    } catch (err) {
      console.error("Błąd ładowania wiadomości:", err)
    }
  }

  const handleCalculateFlip = (e) => {
    e.preventDefault()
    const cost = parseFloat(buyPrice) || 0
    const rawRevenue = parseFloat(blackMarketPrice) || 0
    const taxPercent = parseFloat(marketTax) || 0

    if (cost <= 0 || rawRevenue <= 0) return

    const taxAmount = rawRevenue * (taxPercent / 100)
    const setupFee = rawRevenue * 0.01
    const netRevenue = rawRevenue - taxAmount - setupFee
    const profit = netRevenue - cost
    const roi = (profit / cost) * 100

    let statusText = "Nieopłacalne / Wysokie ryzyko"
    let statusColor = "text-rose-400 border-rose-900/50 bg-rose-950/20"

    if (roi >= 10 && roi < 25) {
      statusText = "Umiarkowany zysk"
      statusColor = "text-amber-400 border-amber-900/50 bg-amber-950/20"
    } else if (roi >= 25) {
      statusText = "Złoty interes! Pakuj towary do Caerleon!"
      statusColor = "text-emerald-400 border-emerald-900/50 bg-[#050204]"
    }

    setCalcResult({ profit: Math.round(profit).toLocaleString('pl-PL'), roi: roi.toFixed(1), statusColor, statusText })
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

  const deleteExpedition = async (id, discordMsgId, fullPartyMsgId) => {
    if (confirm('Czy na pewno chcesz odwołać tę wyprawę z panelu admina? Wiadomości z Discorda zostaną również usunięte.')) {
      if (discordMsgId || fullPartyMsgId) {
        try {
          await fetch('/api/webhooks/expedition', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              messageId: discordMsgId,
              fullPartyMessageId: fullPartyMsgId 
            })
          })
        } catch (err) {
          console.error('Błąd kasowania na Discordzie:', err)
        }
      }

      const { error } = await supabase.from('expeditions').delete().eq('id', id)
      if (!error) { fetchGlobalData(); if (user) fetchUserDataAndRole(user.id); }
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
      <main className="flex min-h-screen items-center justify-center bg-[#050305] text-xl font-mono tracking-widest">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#f3ba2f] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(243,186,47,0.5)]"></div>
          <p className="text-[#f3ba2f] font-bold text-sm">Ładowanie...</p>
        </div>
      </main>
    )
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <main 
      className={`flex flex-col justify-between antialiased font-sans select-none relative text-gray-300 ${
        !user 
          ? 'h-screen overflow-hidden bg-no-repeat bg-center' 
          : 'min-h-screen bg-[#050305]'
      }`}
      style={!user ? { 
        backgroundImage: "url('/albion-bg.jpg')",
        backgroundSize: 'cover' 
      } : undefined}
    >
      {!user ? (
        <div className="fixed inset-0 bg-[#050305]/80 z-0 pointer-events-none"></div>
      ) : (
        <>
          <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1d0b12] via-[#050305] to-[#020102] z-0 pointer-events-none"></div>
          <div className="fixed inset-0 opacity-10 bg-[radial-gradient(#f3ba2f_1px,transparent_1px)] [background-size:24px_24px] z-0 pointer-events-none"></div>
        </>
      )}

      <div className="w-full flex-1 flex flex-col items-center p-4 sm:p-6 lg:p-8 z-10 max-w-[1600px] mx-auto justify-center">
        {!user ? (
          <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto space-y-8 text-center my-auto">
            <div className="w-full bg-[#0a0408]/95 border border-[#f3ba2f]/40 rounded-3xl p-8 sm:p-10 shadow-[0_0_50px_rgba(243,186,47,0.12)] space-y-7 relative overflow-hidden">
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-48 h-24 bg-[#f3ba2f]/15 rounded-full blur-2xl pointer-events-none"></div>
              <div className="flex justify-center relative z-10">
                <div className="w-20 h-20 rounded-full border-2 border-[#f3ba2f]/60 overflow-hidden shrink-0 shadow-[0_0_25px_rgba(243,186,47,0.3)] bg-[#0a0408]">
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-cover scale-105" />
                </div>
              </div>

              <div className="space-y-2 relative z-10">
                <h1 className="text-2xl sm:text-3xl font-black text-[#f3ba2f] font-serif uppercase">Albion Online Portal</h1>
                <p className="text-xs text-gray-400">Oficjalna platforma społecznościowa</p>
              </div>

              <div className="space-y-3 relative z-10">
                <button onClick={loginWithDiscord} className="w-full bg-gradient-to-r from-[#5865F2] to-[#4752C4] text-white font-black py-3.5 rounded-xl uppercase text-xs">
                  Zaloguj przez Discord
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full space-y-6">
            <header className="bg-[#0c0407] border border-[#2c1219] rounded-3xl p-6 sm:p-8 shadow-xl relative flex flex-col lg:flex-row items-center justify-between gap-6 z-30">
              <div className="flex items-center gap-5 w-full lg:w-auto">
                <div className="w-16 h-16 rounded-full border-2 border-[#f3ba2f]/50 overflow-hidden shrink-0 shadow-[0_0_15px_rgba(243,186,47,0.2)] bg-[#0c0407]">
                  <img src="/logo.png" alt="Logo" className="w-full h-full object-cover scale-105" />
                </div>

                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide font-serif">
                      Albion Online Polska Portal
                    </h1>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold tracking-wider uppercase">
                      Online
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 font-mono mt-1">
                    Autonomiczny Węzeł Handlowo-Bojowy • Sektor Główny
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-4 w-full lg:w-auto">
                <div className="bg-[#070204] border border-[#240e14] rounded-2xl px-5 py-2.5 flex items-center gap-3">
                  <Clock className="w-4 h-4 text-[#f3ba2f]" />
                  <ServerClock />
                </div>

                {/* CENTRUM POWIADOMIEŃ (DZWONEK) */}
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

                  {/* MENU POWIADOMIEŃ */}
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

                {/* DYSKRETNY PRZYCISK PROFILU */}
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

                  {/* PEŁNE MENU PROFILU */}
                  {profileOpen && (
                    <div className="absolute right-0 mt-3 w-80 bg-[#0a0408]/95 border border-[#f3ba2f]/50 rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.8)] p-5 z-50 space-y-4 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="flex items-center gap-3.5 border-b border-[#200d13] pb-4">
                        <div className="relative shrink-0">
                          {user.user_metadata?.avatar_url ? (
                            <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-12 h-12 rounded-2xl object-cover border-2 border-[#f3ba2f] shadow-[0_0_12px_rgba(243,186,47,0.3)]" />
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

                      {/* PRZYCISKI W MENU */}
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

            {/* SEKCJA Z KARTAMI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-[#0c0407] border border-[#281017] rounded-2xl p-4 flex items-center gap-4 shadow-lg">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400"><Globe className="w-5 h-5" /></div>
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase">Status Serwerów</span>
                  <div className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>W pełni operacyjne</div>
                </div>
              </div>
              <div className="bg-[#0c0407] border border-[#281017] rounded-2xl p-4 flex items-center gap-4 shadow-lg">
                <div className="p-3 bg-[#f3ba2f]/10 border border-[#f3ba2f]/20 rounded-xl text-[#f3ba2f]"><ShoppingBag className="w-5 h-5" /></div>
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase">Aktywne oferty rynku</span>
                  <div className="text-sm font-bold text-white mt-0.5 font-mono">{globalStats.marketOffersCount} ogłoszeń</div>
                </div>
              </div>
              <div className="bg-[#0c0407] border border-[#281017] rounded-2xl p-4 flex items-center gap-4 shadow-lg">
                <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400"><Compass className="w-5 h-5" /></div>
                <div>
                  <span className="text-[10px] font-mono text-gray-400 uppercase">Zarejestrowane gildie</span>
                  <div className="text-sm font-bold text-white mt-0.5 font-mono">{globalStats.guildsCount} formacji</div>
                </div>
              </div>
              <a href="https://wiki.albiononline.com" target="_blank" rel="noopener noreferrer" className="bg-[#0c0407] border border-[#281017] hover:border-[#f3ba2f]/40 rounded-2xl p-4 flex items-center justify-between shadow-lg transition group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-xl text-sky-400"><ExternalLink className="w-5 h-5" /></div>
                  <div>
                    <span className="text-[10px] font-mono text-gray-400 uppercase">Baza Wiedzy</span>
                    <div className="text-sm font-bold text-white group-hover:text-[#f3ba2f] transition mt-0.5">Oficjalna Wiki</div>
                  </div>
                </div>
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Link href="/gildie" className="group bg-[#0c0407] hover:bg-[#15060b] border border-[#281017] hover:border-[#f3ba2f]/50 rounded-2xl p-5 transition-all flex flex-col justify-between space-y-4 shadow-xl">
                <div className="flex justify-between items-start"><div className="p-3 bg-[#f3ba2f]/10 rounded-xl text-[#f3ba2f]"><Swords className="w-6 h-6" /></div><span className="text-[10px] font-mono text-gray-500 uppercase">Moduł 01</span></div>
                <div><h3 className="font-bold text-white text-base group-hover:text-[#f3ba2f] transition">Rejestr Gildii</h3><p className="text-xs text-gray-400 mt-1">Przeglądaj polskie formacje i aplikuj do struktur.</p></div>
              </Link>
              <Link href="/wyprawy" className="group bg-[#0c0407] hover:bg-[#15060b] border border-[#281017] hover:border-purple-500/50 rounded-2xl p-5 transition-all flex flex-col justify-between space-y-4 shadow-xl">
                <div className="flex justify-between items-start"><div className="p-3 bg-purple-500/10 rounded-xl text-purple-400"><Shield className="w-6 h-6" /></div><span className="text-[10px] font-mono text-gray-500 uppercase">Moduł 02</span></div>
                <div><h3 className="font-bold text-white text-base group-hover:text-purple-300 transition">Wyprawy &amp; Party</h3><p className="text-xs text-gray-400 mt-1">Koordynacja wypadów i integracja z Discordem.</p></div>
              </Link>
              <Link href="/rynek" className="group bg-[#0c0407] hover:bg-[#15060b] border border-[#281017] hover:border-sky-500/50 rounded-2xl p-5 transition-all flex flex-col justify-between space-y-4 shadow-xl">
                <div className="flex justify-between items-start"><div className="p-3 bg-sky-500/10 rounded-xl text-sky-400"><ShoppingBag className="w-6 h-6" /></div><span className="text-[10px] font-mono text-gray-500 uppercase">Moduł 03</span></div>
                <div><h3 className="font-bold text-white text-base group-hover:text-sky-300 transition">Tablica Rynku</h3><p className="text-xs text-gray-400 mt-1">Ogłoszenia handlowe i oferty społeczności.</p></div>
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-6 space-y-6">
                <div className="bg-[#0c0407] border border-[#281017] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between border-b border-[#200d13] pb-4">
                    <div className="flex gap-4 font-mono text-xs font-bold uppercase">
                      <button onClick={() => setRightTab('ECONOMY')} className={`pb-1 transition ${rightTab === 'ECONOMY' ? 'text-[#f3ba2f] border-b-2 border-[#f3ba2f]' : 'text-gray-500'}`}>Kalkulator Marż</button>
                      {isAdmin && <button onClick={() => setRightTab('ADMIN')} className={`pb-1 transition ${rightTab === 'ADMIN' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-rose-900'}`}>Panel Inkwizycji</button>}
                    </div>
                    <Calculator className="w-4 h-4 text-gray-500" />
                  </div>

                  {rightTab === 'ECONOMY' && (
                    <form onSubmit={handleCalculateFlip} className="space-y-4 text-xs sm:text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-gray-400 mb-1 font-mono text-[11px] uppercase">Przedmiot</label>
                          <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-gray-200 outline-none text-xs focus:border-[#f3ba2f]">
                            <option value="T4_BAG">Torba T4</option>
                            <option value="T5_BAG">Torba T5</option>
                            <option value="T6_BAG">Torba T6</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-gray-400 mb-1 font-mono text-[11px] uppercase">Miasto Zakupu</label>
                          <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-gray-200 outline-none text-xs focus:border-[#f3ba2f]">
                            <option value="Martlock">Martlock</option>
                            <option value="Lymhurst">Lymhurst</option>
                            <option value="FortSterling">Fort Sterling</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-gray-400 mb-1 font-mono text-[11px] uppercase">Cena w mieście</label>
                          <input type="number" required placeholder="Wpisz cenę" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-gray-100 font-mono outline-none text-xs focus:border-[#f3ba2f]" />
                        </div>
                        <div>
                          <label className="block text-gray-400 mb-1 font-mono text-[11px] uppercase">Cena Czarny Rynek</label>
                          <input type="number" required placeholder="Wpisz cenę" value={blackMarketPrice} onChange={e => setBlackMarketPrice(e.target.value)} className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-gray-100 font-mono outline-none text-xs focus:border-[#f3ba2f]" />
                        </div>
                      </div>

                      <button type="submit" className="w-full bg-gradient-to-r from-[#f3ba2f] to-[#d9981e] hover:from-[#fcd053] text-black font-extrabold py-3.5 rounded-xl uppercase tracking-wider text-xs transition shadow-md">Analizuj Opłacalność</button>

                      <div className="bg-[#050204] border border-[#220e14] rounded-2xl p-4 text-center">
                        {calcResult ? (
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between border-b border-[#1c0b10] pb-2"><span className="text-gray-400">Czysty zysk:</span><span className="font-mono font-bold text-gray-100">{calcResult.profit} Silver</span></div>
                            <div className="flex justify-between border-b border-[#1c0b10] pb-2"><span className="text-gray-400">Zwrot inwestycji (ROI):</span><span className="font-mono font-black text-amber-400">+{calcResult.roi}%</span></div>
                            <div className={`mt-2 p-2.5 rounded-xl border text-center font-bold uppercase text-[11px] ${calcResult.statusColor}`}>{calcResult.statusText}</div>
                          </div>
                        ) : (<p className="text-gray-500 italic text-xs py-2">Wprowadź ceny, aby wyliczyć marżę transportową do Caerleon.</p>)}
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

                      <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1">
                        {adminTab === 'MARKET' && (allMarketPosts.length === 0 ? <p className="text-gray-500 italic text-center py-4">Brak ofert.</p> : allMarketPosts.map(p => (
                          <div key={p.id} className="bg-[#050204] border border-rose-950/40 rounded-xl p-2.5 flex justify-between items-center gap-2"><span className="text-gray-200 font-bold">{p.title || p.item_name} - <strong className="text-[#f3ba2f]">{p.price}s</strong></span><button onClick={() => deleteMarketPost(p.id)} className="bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold px-2.5 py-1 rounded uppercase text-[10px]">Usuń</button></div>
                        )))}
                        {adminTab === 'GUILDS' && (allGuilds.length === 0 ? <p className="text-gray-500 italic text-center py-4">Brak gildii.</p> : allGuilds.map(g => (
                          <div key={g.id} className="bg-[#050204] border border-rose-950/40 rounded-xl p-2.5 flex justify-between items-center gap-2"><span className="text-gray-100 font-bold">{g.name}</span><button onClick={() => deleteGuild(g.id)} className="bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold px-2.5 py-1 rounded uppercase text-[10px]">Spal</button></div>
                        )))}
                        {adminTab === 'EXPEDITIONS' && (allExpeditions.length === 0 ? <p className="text-gray-500 italic text-center py-4">Brak wypraw.</p> : allExpeditions.map(e => (
                          <div key={e.id} className="bg-[#050204] border border-rose-950/40 rounded-xl p-2.5 flex justify-between items-center gap-2"><span className="text-gray-100 font-bold">{e.title}</span><button onClick={() => deleteExpedition(e.id, e.discord_message_id, e.full_party_message_id)} className="bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold px-2.5 py-1 rounded uppercase text-[10px]">Odwołaj</button></div>
                        )))}
                        {adminTab === 'BUILDS' && (allBuilds.length === 0 ? <p className="text-gray-500 italic text-center py-4">Brak buildów.</p> : allBuilds.map(b => (
                          <div key={b.id} className="bg-[#050204] border border-rose-950/40 rounded-xl p-2.5 flex justify-between items-center gap-2"><span className="text-gray-100 font-bold">{b.title}</span><button onClick={() => deleteBuild(b.id)} className="bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold px-2.5 py-1 rounded uppercase text-[10px]">Usuń</button></div>
                        )))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-[#0c0407] border border-[#281017] rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
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

              <div className="lg:col-span-6">
                <ChatBox user={user} isAdmin={isAdmin} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TOAST POWIADOMIENIA NA ŻYWO (PRAWY DOLNY RÓG) */}
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

      <footer className="w-full bg-[#030102] border-t border-[#200d13] py-8 text-center text-xs text-gray-500 relative z-20 shadow-[0_-30px_60px_#030102]">
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