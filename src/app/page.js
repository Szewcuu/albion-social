'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState, useRef, memo } from 'react'
import Link from 'next/link'
import { Castle, Swords, ShoppingBag, Shield, Trash2, Send, Flame, Terminal, Clock, Newspaper, Calculator, Radio, ShieldAlert } from 'lucide-react'

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

  // Stany Supabase
  const [globalStats, setGlobalStats] = useState({ guilds: 0, market: 0 })
  const [albionNews, setAlbionNews] = useState([])
  const [recentGlobalPosts, setRecentGlobalPosts] = useState([])

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

  // Czat
  const [chatMessages, setChatMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [activeChannel, setActiveChannel] = useState('GLOBALNY')
  const chatLoading = chatMessages.length === 0
  const chatContainerRef = useRef(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      fetchGlobalData()
      fetchInitialChat()
      fetchAlbionNews()
      if (currentUser) fetchUserDataAndRole(currentUser.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      fetchGlobalData()
      if (currentUser) {
        fetchUserDataAndRole(currentUser.id)
      } else {
        setIsAdmin(false)
        setLoading(false)
      }
    })

    const chatChannel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setChatMessages((prev) => [...prev, payload.new])
          } else if (payload.eventType === 'DELETE') {
            setChatMessages((prev) => prev.filter((msg) => msg.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
      supabase.removeChannel(chatChannel)
    }
  }, [])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatMessages, activeChannel])

  const fetchInitialChat = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*, profiles(username, avatar_url)')
      .order('created_at', { ascending: true })
      .limit(50)
      
    if (data && data.length > 0) {
      const mapped = data.map(msg => ({
        ...msg,
        username: msg.username || msg.profiles?.username || 'Gracz',
        avatar_url: msg.avatar_url || msg.profiles?.avatar_url || null
      }))
      setChatMessages(mapped)
    } else {
      setChatMessages([{ id: 'init', channel: 'SYSTEM', username: 'System', text: 'Połączono z węzłem miejskim AOPP. Czat aktywny.' }])
    }
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

  const fetchGlobalData = async () => {
    const { data: recent } = await supabase.from('market_items').select('*, profiles(username)').order('created_at', { ascending: false }).limit(3)
    setRecentGlobalPosts(recent || [])
    const { count: gCount } = await supabase.from('guilds').select('*', { count: 'exact', head: true })
    const { count: mCount } = await supabase.from('market_items').select('*', { count: 'exact', head: true })
    setGlobalStats({ marketOffersCount: mCount || 0, guildsCount: gCount || 0 })
  }

  const fetchUserDataAndRole = async (userId) => {
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
    } finally {
      setLoading(false)
    }
  }

  const handleSendChatMessage = async (e) => {
    e.preventDefault()
    if (!newMessage.trim() || !user) return

    const rawName = user.user_metadata?.full_name || user.user_metadata?.name || 'Gracz'
    const cleanUsername = rawName.replace(/#0$/, '')

    const { error } = await supabase.from('chat_messages').insert([
      {
        user_id: user.id,
        channel: activeChannel,
        username: cleanUsername,
        text: newMessage.trim()
      }
    ])

    if (!error) setNewMessage('')
  }

  const deleteChatMessage = async (msgId) => {
    if (!isAdmin) return
    if (confirm('Czy na pewno chcesz usunąć tę wiadomość z czatu?')) {
      const { error } = await supabase.from('chat_messages').delete().eq('id', msgId)
      if (!error) {
        setChatMessages((prev) => prev.filter((msg) => msg.id !== msgId))
      }
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
      statusColor = "text-emerald-400 border-emerald-900/50 bg-emerald-950/20"
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

  const deleteExpedition = async (id, discordMsgId) => {
    if (confirm('Czy na pewno chcesz odwołać tę wyprawę z panelu admina? Wiadomość z Discorda zostanie również usunięta.')) {
      if (discordMsgId) {
        try {
          await fetch('/api/webhooks/expedition', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageId: discordMsgId })
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
          <p className="text-[#f3ba2f] font-bold text-sm">SYNCHRONIZACJA SIECI CAERLEON...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col justify-between antialiased font-sans select-none relative bg-[#050305] text-gray-300">
      
      {/* TŁO Z NOWOCZESNĄ VIGNETTE I GLOW */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1d0b12] via-[#050305] to-[#020102] z-0 pointer-events-none"></div>
      <div className="fixed inset-0 opacity-10 bg-[radial-gradient(#f3ba2f_1px,transparent_1px)] [background-size:24px_24px] z-0 pointer-events-none"></div>

      {/* ROZCIĄGNIĘCIE NA PEŁNĄ SZEROKOŚĆ EKRANU Z BEZPIECZNYMI MARGINESAMI */}
      <div className="w-full flex-1 flex flex-col items-center p-4 sm:p-6 lg:p-8 z-10 max-w-[1600px] mx-auto">
        {!user ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-xl mx-auto space-y-8 text-center my-auto">
            <div className="p-4 bg-[#f3ba2f]/10 border border-[#f3ba2f]/30 rounded-2xl text-[#f3ba2f] shadow-[0_0_30px_rgba(243,186,47,0.15)]">
              <Castle className="w-12 h-12" />
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight font-serif">
                ALBION <span className="text-[#f3ba2f]">CAERLEON</span>
              </h1>
              <p className="text-sm text-gray-400 max-w-md mx-auto leading-relaxed">
                Platforma handlowo-społecznościowa polskiej społeczności Albion Online. Zaloguj się, aby uzyskać pełny dostęp do terminali.
              </p>
            </div>
            <button 
              onClick={loginWithDiscord} 
              className="w-full bg-gradient-to-r from-[#f3ba2f] to-[#d9981e] hover:from-[#fcd053] text-black font-extrabold py-4 px-8 rounded-2xl shadow-[0_4px_25px_rgba(243,186,47,0.3)] transition-all duration-300 text-xs uppercase tracking-widest"
            >
              Autoryzacja przez Discord
            </button>
          </div>
        ) : (
          
          <div className="w-full space-y-6">
            
            {/* HERO / TOP BANNER W STYLU KONSOLI OPERACYJNEJ */}
            <header className="bg-gradient-to-r from-[#12070a] via-[#0c0407] to-[#070204] border border-[#2c1219] rounded-3xl p-6 sm:p-8 shadow-[0_15px_40px_rgba(0,0,0,0.6)] relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#f3ba2f]/5 rounded-full blur-3xl pointer-events-none"></div>

              <div className="flex items-center gap-5 w-full lg:w-auto">
                <div className="w-16 h-16 rounded-2xl bg-[#1c0a10] border border-[#3d1823] flex items-center justify-center text-[#f3ba2f] shadow-inner shrink-0">
                  <Castle className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl sm:text-3xl font-black text-white tracking-wide font-serif">
                      Tablica Miejska Caerleon
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

              {/* Prawa strona nagłówka: Zegar + Profil */}
              <div className="flex flex-wrap items-center justify-end gap-4 w-full lg:w-auto">
                <div className="bg-[#070204] border border-[#240e14] rounded-2xl px-5 py-2.5 flex items-center gap-3">
                  <Clock className="w-4 h-4 text-[#f3ba2f]" />
                  <ServerClock />
                </div>

                <div className="flex items-center gap-3 bg-[#070204] border border-[#240e14] rounded-2xl p-2 pl-4">
                  {user.user_metadata?.avatar_url && (
                    <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-9 h-9 rounded-xl object-cover border border-[#f3ba2f]/40" />
                  )}
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] text-gray-400 uppercase font-bold font-mono">
                      {isAdmin ? '🛡️ Inkwizytor' : '⚔️ Wojownik'}
                    </span>
                    <span className="font-bold text-xs text-emerald-400 font-mono">
                      {(user.user_metadata?.full_name || 'Gracz').replace(/#0$/, '')}
                    </span>
                  </div>
                  <button 
                    onClick={logout} 
                    className="ml-2 bg-[#1a080d] hover:bg-rose-950/80 border border-rose-900/40 text-rose-300 font-bold px-3.5 py-2 rounded-xl text-xs uppercase transition tracking-wider"
                  >
                    Wyjdź
                  </button>
                </div>
              </div>
            </header>

            {/* GŁÓWNY GRID: NAWIGACJA JAKO MODERN CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/gildie" className="group bg-[#0c0407] hover:bg-[#15060b] border border-[#281017] hover:border-[#f3ba2f]/50 rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between space-y-4 shadow-xl">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-[#f3ba2f]/10 rounded-xl text-[#f3ba2f] group-hover:scale-110 transition-transform">
                    <Swords className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 uppercase">Moduł 01</span>
                </div>
                <div>
                  <h3 className="font-bold text-white text-base group-hover:text-[#f3ba2f] transition-colors">Rejestr Gildii</h3>
                  <p className="text-xs text-gray-400 mt-1">Przeglądaj polskie formacje i aplikuj do struktur.</p>
                </div>
              </Link>

              <Link href="/wyprawy" className="group bg-[#0c0407] hover:bg-[#15060b] border border-[#281017] hover:border-purple-500/50 rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between space-y-4 shadow-xl">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400 group-hover:scale-110 transition-transform">
                    <Shield className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 uppercase">Moduł 02</span>
                </div>
                <div>
                  <h3 className="font-bold text-white text-base group-hover:text-purple-300 transition-colors">Wyprawy &amp; Party</h3>
                  <p className="text-xs text-gray-400 mt-1">Koordynacja wypadów i integracja z Discordem.</p>
                </div>
              </Link>

              <Link href="/rynek" className="group bg-[#0c0407] hover:bg-[#15060b] border border-[#281017] hover:border-sky-500/50 rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between space-y-4 shadow-xl">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-sky-500/10 rounded-xl text-sky-400 group-hover:scale-110 transition-transform">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 uppercase">Moduł 03</span>
                </div>
                <div>
                  <h3 className="font-bold text-white text-base group-hover:text-sky-300 transition-colors">Tablica Rynku</h3>
                  <p className="text-xs text-gray-400 mt-1">Ogłoszenia handlowe i oferty społeczności.</p>
                </div>
              </Link>

              <Link href="/buildy" className="group bg-[#0c0407] hover:bg-[#15060b] border border-[#281017] hover:border-rose-500/50 rounded-2xl p-5 transition-all duration-300 flex flex-col justify-between space-y-4 shadow-xl">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400 group-hover:scale-110 transition-transform">
                    <Flame className="w-6 h-6" />
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 uppercase">Moduł 04</span>
                </div>
                <div>
                  <h3 className="font-bold text-white text-base group-hover:text-rose-300 transition-colors">Zestawy Bojowe</h3>
                  <p className="text-xs text-gray-400 mt-1">Kreator buildów dla PvP, ZvZ i statyków.</p>
                </div>
              </Link>
            </div>

            {/* SEKCJA ŚRODKOWA: SZEROKI DUAL-PANE (KALKULATOR / ADMIN ORAZ CZAT) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEWY PANEL: KALKULATOR / ADMIN + NEWSY */}
              <div className="lg:col-span-6 space-y-6">
                
                {/* Kalkulator Marż / Admin Panel */}
                <div className="bg-[#0c0407] border border-[#281017] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between border-b border-[#200d13] pb-4">
                    <div className="flex gap-4 font-mono text-xs font-bold uppercase">
                      <button onClick={() => setRightTab('ECONOMY')} className={`pb-1 transition-colors ${rightTab === 'ECONOMY' ? 'text-[#f3ba2f] border-b-2 border-[#f3ba2f]' : 'text-gray-500 hover:text-gray-300'}`}>
                        Kalkulator Marż
                      </button>
                      {isAdmin && (
                        <button onClick={() => setRightTab('ADMIN')} className={`pb-1 transition-colors ${rightTab === 'ADMIN' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-rose-900 hover:text-rose-400'}`}>
                          Panel Inkwizycji
                        </button>
                      )}
                    </div>
                    <Calculator className="w-4 h-4 text-gray-500" />
                  </div>

                  {rightTab === 'ECONOMY' && (
                    <form onSubmit={handleCalculateFlip} className="space-y-4 text-xs sm:text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-gray-400 mb-1 font-mono text-[11px] uppercase">Przedmiot</label>
                          <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-gray-200 outline-none text-xs focus:border-[#f3ba2f] transition-colors">
                            <option value="T4_BAG">Torba T4</option>
                            <option value="T5_BAG">Torba T5</option>
                            <option value="T6_BAG">Torba T6</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-gray-400 mb-1 font-mono text-[11px] uppercase">Miasto Zakupu</label>
                          <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-gray-200 outline-none text-xs focus:border-[#f3ba2f] transition-colors">
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

                      <button type="submit" className="w-full bg-gradient-to-r from-[#f3ba2f] to-[#d9981e] hover:from-[#fcd053] text-black font-extrabold py-3.5 rounded-xl uppercase tracking-wider text-xs transition shadow-md">
                        Analizuj Opłacalność
                      </button>

                      <div className="bg-[#050204] border border-[#220e14] rounded-2xl p-4 text-center">
                        {calcResult ? (
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between border-b border-[#1c0b10] pb-2"><span className="text-gray-400">Czysty zysk:</span><span className="font-mono font-bold text-gray-100">{calcResult.profit} Silver</span></div>
                            <div className="flex justify-between border-b border-[#1c0b10] pb-2"><span className="text-gray-400">Zwrot inwestycji (ROI):</span><span className="font-mono font-black text-amber-400">+{calcResult.roi}%</span></div>
                            <div className={`mt-2 p-2.5 rounded-xl border text-center font-bold uppercase text-[11px] ${calcResult.statusColor}`}>{calcResult.statusText}</div>
                          </div>
                        ) : (
                          <p className="text-gray-500 italic text-xs py-2">Wprowadź ceny, aby wyliczyć marżę transportową do Caerleon.</p>
                        )}
                      </div>
                    </form>
                  )}

                  {rightTab === 'ADMIN' && isAdmin && (
                    <div className="space-y-4 text-xs">
                      <div className="flex justify-between items-center bg-[#050204] p-3 rounded-xl border border-rose-950/60 flex-wrap gap-2">
                        <span className="text-rose-400 font-bold uppercase tracking-wider font-mono">Panel Inkwizycji</span>
                        <div className="flex gap-1 flex-wrap">
                          <button onClick={() => setAdminTab('MARKET')} className={`px-2.5 py-1 rounded-lg font-bold uppercase transition ${adminTab === 'MARKET' ? 'bg-rose-950 text-rose-300' : 'text-gray-400'}`}>Oferty ({allMarketPosts.length})</button>
                          <button onClick={() => setAdminTab('GUILDS')} className={`px-2.5 py-1 rounded-lg font-bold uppercase transition ${adminTab === 'GUILDS' ? 'bg-rose-950 text-rose-300' : 'text-gray-400'}`}>Gildie ({allGuilds.length})</button>
                          <button onClick={() => setAdminTab('EXPEDITIONS')} className={`px-2.5 py-1 rounded-lg font-bold uppercase transition ${adminTab === 'EXPEDITIONS' ? 'bg-rose-950 text-rose-300' : 'text-gray-400'}`}>Wyprawy ({allExpeditions.length})</button>
                          <button onClick={() => setAdminTab('BUILDS')} className={`px-2.5 py-1 rounded-lg font-bold uppercase transition ${adminTab === 'BUILDS' ? 'bg-rose-950 text-rose-300' : 'text-gray-400'}`}>Buildy ({allBuilds.length})</button>
                        </div>
                      </div>

                      <div className="max-h-[250px] overflow-y-auto space-y-2 pr-1">
                        {adminTab === 'MARKET' && (allMarketPosts.length === 0 ? <p className="text-gray-500 italic text-center py-4">Brak ofert.</p> : allMarketPosts.map(p => (
                          <div key={p.id} className="bg-[#050204] border border-rose-950/40 rounded-xl p-2.5 flex justify-between items-center gap-2">
                            <span className="text-gray-200 font-bold">{p.title || p.item_name} - <strong className="text-[#f3ba2f]">{p.price}s</strong></span>
                            <button onClick={() => deleteMarketPost(p.id)} className="bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold px-2.5 py-1 rounded uppercase text-[10px]">Usuń</button>
                          </div>
                        )))}
                        {adminTab === 'GUILDS' && (allGuilds.length === 0 ? <p className="text-gray-500 italic text-center py-4">Brak gildii.</p> : allGuilds.map(g => (
                          <div key={g.id} className="bg-[#050204] border border-rose-950/40 rounded-xl p-2.5 flex justify-between items-center gap-2">
                            <span className="text-gray-100 font-bold">{g.name}</span>
                            <button onClick={() => deleteGuild(g.id)} className="bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold px-2.5 py-1 rounded uppercase text-[10px]">Spal</button>
                          </div>
                        )))}
                        {adminTab === 'EXPEDITIONS' && (allExpeditions.length === 0 ? <p className="text-gray-500 italic text-center py-4">Brak wypraw.</p> : allExpeditions.map(e => (
                          <div key={e.id} className="bg-[#050204] border border-rose-950/40 rounded-xl p-2.5 flex justify-between items-center gap-2">
                            <span className="text-gray-100 font-bold">{e.title}</span>
                            <button onClick={() => deleteExpedition(e.id, e.discord_message_id)} className="bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold px-2.5 py-1 rounded uppercase text-[10px]">Odwołaj</button>
                          </div>
                        )))}
                        {adminTab === 'BUILDS' && (allBuilds.length === 0 ? <p className="text-gray-500 italic text-center py-4">Brak buildów.</p> : allBuilds.map(b => (
                          <div key={b.id} className="bg-[#050204] border border-rose-950/40 rounded-xl p-2.5 flex justify-between items-center gap-2">
                            <span className="text-gray-100 font-bold">{b.title}</span>
                            <button onClick={() => deleteBuild(b.id)} className="bg-rose-950 hover:bg-rose-900 text-rose-300 font-bold px-2.5 py-1 rounded uppercase text-[10px]">Usuń</button>
                          </div>
                        )))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Goniec Królewski (Newsy RSS) */}
                <div className="bg-[#0c0407] border border-[#281017] rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-[#200d13] pb-3">
                    <span className="text-xs font-mono font-bold text-[#f3ba2f] uppercase tracking-wider flex items-center gap-2">
                      <Newspaper className="w-4 h-4" /> Goniec Królewski (Newsy)
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">RSS Live</span>
                  </div>
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 text-xs">
                    {albionNews.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">Ładowanie kronik...</p>
                    ) : (
                      albionNews.map((news, idx) => (
                        <div key={idx} className="border-b border-[#1c0b10] pb-2.5 last:border-none">
                          <a href={news.link} target="_blank" rel="noopener noreferrer" className="text-gray-200 hover:text-[#f3ba2f] font-bold block transition text-xs mb-0.5">
                            {news.title}
                          </a>
                          <p className="text-[11px] text-gray-400 line-clamp-1">{news.contentSnippet}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* PRAWY PANEL: NOWOCZESNY CZAT SPOŁECZNOŚCIOWY */}
              <div className="lg:col-span-6">
                <div className="bg-[#0c0407] border border-[#281017] rounded-3xl p-6 sm:p-8 h-[600px] flex flex-col justify-between shadow-2xl">
                  
                  {/* Nagłówek czatu z kanałami */}
                  <div className="flex items-center justify-between border-b border-[#200d13] pb-4 mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#f3ba2f]">
                      <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <span>STRUMIEŃ KOMUNIKACJI</span>
                    </div>
                    
                    <div className="flex gap-1.5 flex-wrap">
                      {['GLOBALNY', 'HANDEL', 'REKRUTACJA', 'SYSTEM'].map((ch) => (
                        <button 
                          key={ch} 
                          onClick={() => setActiveChannel(ch)} 
                          className={`px-3 py-1.5 rounded-xl transition-all text-[11px] font-mono ${
                            activeChannel === ch 
                              ? 'bg-[#f3ba2f] text-black font-extrabold shadow-[0_0_10px_rgba(243,186,47,0.3)]' 
                              : 'text-gray-400 bg-[#050204] hover:text-gray-200 border border-[#200d13]'
                          }`}
                        >
                          {ch}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lista wiadomości */}
                  <div 
                    ref={chatContainerRef}
                    className="space-y-3 overflow-y-auto flex-1 w-full pr-2 text-sm select-text flex flex-col my-2"
                  >
                    {chatLoading ? (
                      <p className="text-gray-500 italic text-center py-10">Ładowanie bufora wiadomości...</p>
                    ) : (
                      chatMessages
                        .filter(msg => activeChannel === 'GLOBALNY' || msg.channel === activeChannel || msg.channel === 'SYSTEM')
                        .map((msg) => {
                          const messageTime = msg.created_at ? new Date(msg.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '';
                          const userAvatar = msg.avatar_url || (msg.user_id === user?.id ? user?.user_metadata?.avatar_url : null);
                          const cleanDisplayName = (msg.username || 'System').replace(/#0$/, '');

                          return (
                            <div key={msg.id} className="flex items-start gap-3 bg-[#070204]/60 border border-[#1c0b10] p-3.5 rounded-2xl">
                              {userAvatar && msg.channel !== 'SYSTEM' ? (
                                <img src={userAvatar} alt="Avatar" className="w-9 h-9 rounded-xl object-cover border border-[#3d1823] shrink-0 shadow" />
                              ) : (
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 bg-[#12070a] border border-[#3d1823] text-[#f3ba2f]">
                                  {cleanDisplayName.charAt(0).toUpperCase()}
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`font-bold text-xs ${msg.role === 'ADMIN' ? 'text-[#f3ba2f] font-serif' : 'text-sky-400'}`}>
                                    {cleanDisplayName}
                                  </span>
                                  <span className="text-[10px] text-gray-500 font-mono">{messageTime}</span>

                                  {isAdmin && msg.channel !== 'SYSTEM' && (
                                    <button onClick={() => deleteChatMessage(msg.id)} className="text-rose-400 hover:text-rose-300 text-xs ml-auto">
                                      <Trash2 className="w-3.5 h-3.5 inline" />
                                    </button>
                                  )}
                                </div>

                                <p className="text-gray-200 mt-1 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                                  {msg.text}
                                </p>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>

                  {/* Formularz wysyłania */}
                  <form onSubmit={handleSendChatMessage} className="mt-2 flex gap-2 items-center bg-[#050204] border border-[#200d13] rounded-2xl p-2.5 pl-4">
                    <input
                      type="text"
                      maxLength="120"
                      disabled={activeChannel === 'SYSTEM'}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={activeChannel === 'SYSTEM' ? 'Kanał systemowy zablokowany...' : `Napisz wiadomość na kanale ${activeChannel.toLowerCase()}...`}
                      className="flex-1 bg-transparent text-xs sm:text-sm text-gray-100 focus:outline-none placeholder-gray-500"
                    />

                    <button 
                      type="submit" 
                      disabled={activeChannel === 'SYSTEM'} 
                      className="bg-gradient-to-r from-[#f3ba2f] to-[#d9981e] hover:from-[#fcd053] text-black px-5 py-2.5 rounded-xl text-xs font-black uppercase transition disabled:hidden flex items-center gap-1.5 shadow"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Wyślij</span>
                    </button>
                  </form>

                </div>
              </div>

            </div>

          </div>
        )}
      </div>

      <footer className="w-full bg-[#030102] border-t border-[#200d13] py-6 text-center text-xs text-gray-500 mt-12 relative z-10">
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