'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function Home() {
  const [selectedItem, setSelectedItem] = useState('T4_BAG')  
  const [selectedCity, setSelectedCity] = useState('Martlock')
  const [isFetchingApi, setIsFetchingApi] = useState(false)
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [utcTime, setUtcTime] = useState('')

  // Stany Supabase
  const [myGuilds, setMyGuilds] = useState([])
  const [myMarketPosts, setMyMarketPosts] = useState([])
  const [globalStats, setGlobalStats] = useState({ guilds: 0, market: 0 })
  const [albionNews, setAlbionNews] = useState([])
  const [recentGlobalPosts, setRecentGlobalPosts] = useState([])

  // Stany Admina
  const [allGuilds, setAllGuilds] = useState([])
  const [allMarketPosts, setAllMarketPosts] = useState([])
  const [adminTab, setAdminTab] = useState('MARKET')

  // Zakładki w prawym panelu
  const [rightTab, setRightTab] = useState('ECONOMY')

  // Stany dla Kalkulatora Czarnego Rynku
  const [buyPrice, setBuyPrice] = useState('')
  const [blackMarketPrice, setBlackMarketPrice] = useState('')
  const [marketTax, setMarketTax] = useState('8')
  const [calcResult, setCalcResult] = useState(null)

  // Stany dla czatu
  const [chatMessages, setChatMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [activeChannel, setActiveChannel] = useState('GLOBALNY')
  const chatLoading = chatMessages.length === 0
  const chatEndRef = useRef(null)

  useEffect(() => {
    const updateClock = () => {
      const now = new Date()
      setUtcTime(now.toLocaleTimeString('pl-PL', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    updateClock()
    const timer = setInterval(updateClock, 1000)

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
        setMyGuilds([])
        setMyMarketPosts([])
        setLoading(false)
      }
    })

    // Subskrypcja Realtime
    const chatChannel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          setChatMessages((prev) => [...prev, payload.new])
        }
      )
      .subscribe()

    return () => {
      clearInterval(timer)
      subscription.unsubscribe()
      supabase.removeChannel(chatChannel)
    }
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [chatMessages])

  const fetchInitialChat = async () => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*, profiles(username, avatar_url)')
      .order('created_at', { ascending: true })
      .limit(50)
      
    if (data && data.length > 0) {
      const mapped = data.map(msg => ({
        ...msg,
        username: msg.profiles?.username || msg.username,
        avatar_url: msg.profiles?.avatar_url || null
      }))
      setChatMessages(mapped)
    } else {
      setChatMessages([{ id: 'init', channel: 'SYSTEM', username: 'System', text: 'Połączono z węzłem miejskim Albion Online Polska Portal. Czat aktywny.' }])
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
    const { data: recent } = await supabase.from('market_posts').select('*, profiles(username)').order('created_at', { ascending: false }).limit(3)
    setRecentGlobalPosts(recent || [])
    const { count: gCount } = await supabase.from('guilds').select('*', { count: 'exact', head: true })
    const { count: mCount } = await supabase.from('market_posts').select('*', { count: 'exact', head: true })
    setGlobalStats({ marketOffersCount: mCount || 0, guildsCount: gCount || 0 })
  }

  const fetchUserDataAndRole = async (userId) => {
    try {
      const { data: profile } = await supabase.from('profiles').select('is_admin, username').eq('id', userId).single()
      const adminStatus = profile?.is_admin ?? false
      setIsAdmin(adminStatus)

      const { data: guilds } = await supabase.from('guilds').select('*').eq('user_id', userId)
      const { data: market = [] } = await supabase.from('market_posts').select('*').eq('user_id', userId).order('created_at', { ascending: false })

      setMyGuilds(guilds || [])
      setMyMarketPosts(market || [])

      if (adminStatus) {
        const { data: allG } = await supabase.from('guilds').select('*, profiles(username)').order('created_at', { ascending: false })
        const { data: allM } = await supabase.from('market_posts').select('*, profiles(username)').order('created_at', { ascending: false })
        setAllGuilds(allG || [])
        setAllMarketPosts(allM || [])
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

    const { error } = await supabase.from('chat_messages').insert([
      {
        user_id: user.id,
        channel: activeChannel,
        username: user.user_metadata?.full_name || 'Gracz',
        text: newMessage.trim()
      }
    ])

    if (!error) setNewMessage('')
  }

  const fetchLivePrices = async () => {
    setIsFetchingApi(true)
    try {
      const res = await fetch(`/api/prices?item=${selectedItem}&city=${selectedCity}`)
      const data = await res.json()

      if (data && data.length > 0 && !data.error) {
        const cityData = data.find(p => p?.location && p.location.toLowerCase() === selectedCity.toLowerCase())
        const blackMarketData = data.find(p => p?.location && p.location.toLowerCase() === 'caerleon')

        let updated = false

        if (cityData && cityData.sell_price_min > 0) {
          setBuyPrice(cityData.sell_price_min.toString())
          updated = true
        }

        if (blackMarketData && blackMarketData.buy_price_max > 0) {
          setBlackMarketPrice(blackMarketData.buy_price_max.toString())
          updated = true
        }

        if (!updated) {
          alert("Baza API nie posiada aktualnych, niezerowych cen dla tego przedmiotu. Wpisz ceny ręcznie.")
        }
      } else {
        alert("Brak danych w bazie API dla tego przedmiotu. Spróbuj wybrać inny z listy.")
      }
    } catch (err) {
      console.error("Błąd pobierania cen:", err)
      alert("Nie udało się przetworzyć danych rynkowych.")
    } finally {
      setIsFetchingApi(false)
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

    let statusText = "Nieopłacalne / Za duże ryzyko"
    let statusColor = "text-red-400 border-red-900/40 bg-red-950/20"

    if (roi >= 10 && roi < 25) {
      statusText = "Umiarkowany zysk / Przeciętny zwrot"
      statusColor = "text-yellow-400 border-yellow-900/40 bg-yellow-950/20"
    } else if (roi >= 25) {
      statusText = "Złoty interes! Pakuj woła do Caerleon!"
      statusColor = "text-emerald-400 border-emerald-900/40 bg-emerald-950/20"
    }

    setCalcResult({ profit: Math.round(profit).toLocaleString('pl-PL'), roi: roi.toFixed(1), statusColor, statusText })
  }

  const logout = async () => { await supabase.auth.signOut() }
  const loginWithDiscord = async () => { await supabase.auth.signInWithOAuth({ provider: 'discord', options: { redirectTo: window.location.origin } }) }
  
  const deleteMarketPost = async (id) => {
    if (confirm('Usunąć kontrakt handlowy?')) {
      const { error } = await supabase.from('market_posts').delete().eq('id', id)
      if (!error) { fetchGlobalData(); if (user) fetchUserDataAndRole(user.id); }
    }
  }

  const deleteGuild = async (id) => {
    if (confirm('Spalić dekret tej gildii?')) {
      const { error } = await supabase.from('guilds').delete().eq('id', id)
      if (!error) { fetchGlobalData(); if (user) fetchUserDataAndRole(user.id); }
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050507] text-xl font-serif tracking-widest">
        <p className="text-[#c59b27] animate-pulse">ŁADOWANIE REJESTRU KRÓLEWSKIEGO...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen animate-bg-drift text-[#bcbbc2] p-4 sm:p-6 flex flex-col items-center antialiased font-albion-ui select-none relative overflow-hidden">
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Inter:wght@400;500;700;800&display=swap');
        .font-albion-title { font-family: 'Cinzel', serif; }
        .font-albion-ui { font-family: 'Inter', sans-serif; }

        @keyframes bgDrift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-bg-drift {
          background: linear-gradient(-45deg, #121216, #1a191f, #221c15, #16151a);
          background-size: 300% 300%;
          animation: bgDrift 35s ease infinite;
        }
        .animate-pulse-fast {
          animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .4; }
        }
        @keyframes floatEmber {
          0% { transform: translateY(105vh) translateX(0px) scale(0.6); opacity: 0; }
          15% { opacity: 0.35; filter: blur(1px); }
          50% { transform: translateY(45vh) translateX(25px) scale(1.3); opacity: 0.50; filter: blur(2px); }
          85% { opacity: 0.20; }
          100% { transform: translateY(-5vh) translateX(-15px) scale(0.8); opacity: 0; }
        }
        @keyframes fogPulse {
          0% { transform: scale(1) translate(0px, 0px); opacity: 0.15; }
          50% { transform: scale(1.15) translate(20px, -10px); opacity: 0.28; }
          100% { transform: scale(1) translate(0px, 0px); opacity: 0.15; }
        }
        .ember-particle { position: absolute; background: radial-gradient(circle, rgba(243,169,59,0.85) 0%, rgba(197,155,39,0.2) 60%, transparent 100%); border-radius: 50%; pointer-events: none; z-index: 0; }
        .magic-fog { position: absolute; width: 600px; height: 600px; background: radial-gradient(circle, rgba(147,51,234,0.08) 0%, rgba(197,155,39,0.04) 50%, transparent 80%); pointer-events: none; filter: blur(40px); z-index: 0; }
      `}</style>

      <div className="magic-fog top-[-100px] left-[-100px]" style={{ animation: 'fogPulse 20s ease-in-out infinite' }}></div>
      <div className="magic-fog bottom-[-150px] right-[-100px]" style={{ animation: 'fogPulse 25s ease-in-out infinite', animationDelay: '-5s' }}></div>
      <div className="ember-particle w-3 h-3" style={{ left: '8%', animation: 'floatEmber 18s linear infinite' }}></div>
      <div className="ember-particle w-4 h-4" style={{ left: '52%', animation: 'floatEmber 28s linear infinite', animationDelay: '-2s' }}></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.55)_100%)] pointer-events-none z-0"></div>
      
      {!user ? (
        <div className="flex flex-col items-center justify-center min-h-screen w-full max-w-5xl mx-auto z-10 space-y-12 px-6 py-16">
          
          {/* NAGŁÓWEK POWITALNY */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl sm:text-5xl font-black text-[#c59b27] tracking-widest font-albion-title drop-shadow-[0_5px_15px_rgba(0,0,0,0.6)]">
              ALBION ONLINE POLSKA
            </h1>
            <p className="text-base sm:text-lg text-gray-300 uppercase tracking-widest font-bold max-w-2xl mx-auto leading-relaxed">
              Polski węzeł społecznościowy: kalkulatory handlowe, zbrojownia taktyczna oraz rejestr gildii
            </p>
          </div>

          {/* GŁÓWNY PANEL LOGOWANIA */}
          <div className="max-w-md w-full bg-[#141419] border-2 border-[#c59b27] p-8 text-center shadow-[0_20px_50px_rgba(0,0,0,0.9)]">
            <span className="text-sm text-[#c59b27] font-bold tracking-widest block uppercase font-mono mb-4">BRAMA DO KRONIK MIEJSKICH</span>
            
            <div className="space-y-4">
              {/* AKTYWNE LOGOWANIE DISCORD */}
              <button 
                onClick={loginWithDiscord} 
                className="w-full bg-gradient-to-b from-[#dca62b] to-[#a87a1e] hover:from-[#f0b73a] hover:to-[#be8c27] text-black font-black py-4 px-8 border border-[#4a3a1d] tracking-wider text-sm uppercase transition font-albion-title active:scale-95 shadow-md"
              >
                Zaloguj przez Discord
              </button>

              {/* ZABLOKOWANE LOGOWANIE GOOGLE (WKRÓTCE) */}
              <button 
                disabled 
                className="w-full bg-[#16161c]/50 text-gray-600 font-black py-4 px-8 border border-[#2c2c3b]/50 tracking-wider text-sm uppercase font-albion-title cursor-not-allowed flex items-center justify-center gap-2 relative"
              >
                <span>Zaloguj przez Google</span>
                <span className="text-[10px] bg-[#f0b73a] text-black px-2 py-0.5 rounded-sm font-sans font-black tracking-normal normal-case shadow-[0_0_10px_rgba(240,183,58,0.4)]">
                  Wkrótce
                </span>
              </button>
            </div>
          </div>

          {/* PRAWDZIWE OPISY MODUŁÓW */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-sm sm:text-base">
            <div className="bg-[#141419]/60 border border-[#23232c] p-6 rounded-sm shadow-xl space-y-3">
              <div className="text-2xl">📊</div>
              <h3 className="font-bold text-[#c59b27] font-albion-title text-base sm:text-lg tracking-wide uppercase">Kalkulator Caerleon</h3>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                Analizuj marże transportowe i zyski ze skupu na Czarnym Rynku. Pobieraj aktualne ceny live i sprawdzaj rentowność flipów przed wyruszeniem z karawaną handlową.
              </p>
            </div>

            <div className="bg-[#141419]/60 border border-[#23232c] p-6 rounded-sm shadow-xl space-y-3">
              <div className="text-2xl">🛡️</div>
              <h3 className="font-bold text-sky-400 font-albion-title text-base sm:text-lg tracking-wide uppercase">Królewska Zbrojownia</h3>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                Przeglądaj, oceniaj i twórz strategiczne zestawy rynsztunku. Filtruj buildy pod PvP Solo, ZvZ, PvE / HCE czy Ganking stworzone przez społeczność.
              </p>
            </div>

            <div className="bg-[#141419]/60 border border-[#23232c] p-6 rounded-sm shadow-xl space-y-3">
              <div className="text-2xl">⚔️</div>
              <h3 className="font-bold text-emerald-400 font-albion-title text-base sm:text-lg tracking-wide uppercase">Rejestr Gildii</h3>
              <p className="text-gray-300 leading-relaxed text-sm sm:text-base">
                Znajdź swoją nową armię na serwerze. Sprawdzaj statusy rekrutacji polskich sojuszy i aplikuj bezpośrednio do ich struktur Discord.
              </p>
            </div>
          </div>

        </div>
      ) : (
        
        <div className="max-w-7xl w-full space-y-5 z-10 text-sm sm:text-base">
          
          {/* NAGŁÓWEK MIEJSKI */}
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#141419] border-2 border-[#c59b27] p-5 shadow-2xl relative">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-100 font-albion-title tracking-wider flex items-center gap-2 flex-wrap">
                🏰 TABLICA MIEJSKA <span className="text-[#c59b27] text-sm font-sans bg-[#1d1d24] px-3 py-1 border border-[#2c2c38] font-bold">ALBION ONLINE POLSKA PORTAL</span>
              </h1>
              <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mt-1">Lokalny punkt informacyjny wolnego miasta</p>
            </div>
            
            <div className="flex items-center gap-5 bg-[#0b0b0d] py-3 px-6 rounded-sm border-2 border-[#c59b27]/50 self-stretch sm:self-auto justify-between shadow-2xl">
              <div className="flex items-center gap-4">
                {user.user_metadata?.avatar_url && (
                  <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-11 h-11 rounded-sm border-2 border-[#c59b27] shadow-md" />
                )}
                <div className="flex flex-col">
                  <span className="text-xs text-gray-400 uppercase tracking-widest font-bold font-mono">{isAdmin ? 'Inkwizytor' : 'Wojownik'}</span>
                  <span className="font-extrabold text-base text-emerald-400 tracking-wide font-mono">{user.user_metadata?.full_name}</span>
                </div>
              </div>
              <button onClick={logout} className="text-xs bg-red-950/60 hover:bg-red-900 border border-red-900/40 text-red-400 font-bold px-4 py-2 rounded-sm transition uppercase tracking-wider ml-4">Opuść</button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* LEWA FLANKA */}
            <div className="lg:col-span-4 space-y-5">
              <div className="bg-[#141419] border-2 border-[#c59b27] p-5 shadow-xl">
                <h2 className="text-sm font-black text-[#c59b27] uppercase tracking-widest mb-4 border-b border-[#23232c] pb-2 font-albion-title">Katalogi Główne</h2>
                <div className="space-y-4">
                  
                  {/* ⚔️ REJESTR POLSKICH GILDII */}
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2, filter: "brightness(1.15)" }}
                    whileTap={{ scale: 0.98, y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <Link href="/gildie" className="w-full block bg-gradient-to-b from-[#dca62b] to-[#a87a1e] hover:from-[#f0b73a] hover:to-[#be8c27] text-black font-black py-3 px-5 text-sm text-center uppercase tracking-widest border border-[#4a3a1d] transition shadow-md">
                      ⚔️ Rejestr Polskich Gildii
                    </Link>
                  </motion.div>

                  {/* 💰 TABLICA OGŁOSZEŃ RYNKU */}
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2, filter: "brightness(1.15)" }}
                    whileTap={{ scale: 0.98, y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <Link href="/rynek" className="w-full block bg-[#1d1d24] hover:bg-[#25252e] text-gray-200 border border-[#2c2c3b] font-black py-3 px-5 text-sm text-center uppercase tracking-widest transition shadow-md">
                      💰 Tablica Ogłoszeń Rynku
                    </Link>
                  </motion.div>

                  {/* 🛡️ INTERAKTYWNY KREATOR BUILDÓW */}
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2, filter: "brightness(1.15)" }}
                    whileTap={{ scale: 0.98, y: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  >
                    <Link href="/buildy" className="w-full block bg-gradient-to-b from-[#966f2d] to-[#5a461d] hover:from-[#a87a1e] hover:to-[#735924] text-gray-200 border border-[#4a3a1d] font-black py-3 px-5 text-sm text-center uppercase tracking-widest transition shadow-md">
                      🛡️ Interaktywny Kreator Buildów (BETA)
                    </Link>
                  </motion.div>

                </div>
              </div>

              <div className="bg-[#141419] border border-[#23232c] p-5 shadow-xl space-y-4">
                <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest font-albion-title border-b border-[#1f1f26] pb-2">WIADOMOŚĆI ALBIONU</h2>
                
                {/* GONIEC KRÓLEWSKI */}
                <div className="bg-[#0b0b0d] border border-[#1f1f26] p-4 shadow-xl space-y-4">
                  <h3 className="text-sm font-black text-[#c59b27] uppercase tracking-widest font-albion-title border-b border-[#1f1f26] pb-2">
                    📜 Goniec Królewski (Oficjalne Newsy)
                  </h3>
                  <div className="space-y-4 max-h-[260px] overflow-y-auto pr-2 text-sm scrollbar-thin scrollbar-thumb-[#c59b27] scrollbar-track-[#0b0b0d] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#0b0b0d] [&::-webkit-scrollbar-thumb]:bg-[#c59b27] [&::-webkit-scrollbar-thumb]:border [&::-webkit-scrollbar-thumb]:border-[#23232c]">
                    {albionNews.length === 0 ? (
                      <div className="space-y-4 animate-pulse-fast">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="border-b border-[#1f1f26]/60 pb-3 last:border-none last:pb-0 space-y-2">
                            <div className="flex justify-between">
                              <div className="h-2.5 w-16 bg-[#1f1f26] rounded"></div>
                              <div className="h-2.5 w-12 bg-[#1f1f26] rounded"></div>
                            </div>
                            <div className="h-3.5 w-3/4 bg-[#1f1f26] rounded"></div>
                            <div className="space-y-1">
                              <div className="h-2.5 w-full bg-[#1f1f26] rounded"></div>
                              <div className="h-2.5 w-5/6 bg-[#1f1f26] rounded"></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      albionNews.map((news, idx) => (
                        <div key={idx} className="border-b border-[#1f1f26]/60 pb-3 last:border-none last:pb-0">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-mono text-gray-400 font-bold">{news.pubDate}</span>
                            <span className="text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1.5 py-0.5 font-bold">OFFICIAL</span>
                          </div>
                          <a href={news.link} target="_blank" rel="noopener noreferrer" className="text-gray-200 hover:text-[#c59b27] font-bold block transition leading-snug mb-1 text-sm sm:text-base">
                            {news.title}
                          </a>
                          <p className="text-xs sm:text-sm text-gray-400 line-clamp-2 leading-relaxed">
                            {news.contentSnippet}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="bg-[#0b0b0d] border border-[#1f1f26] p-4 text-center shadow-inner">
                  <span className="text-xs text-gray-500 font-bold tracking-widest block uppercase font-mono mb-1">SERVER TIME (UTC)</span>
                  <span className="text-3xl font-mono font-black text-[#c59b27] tracking-widest">{utcTime || '00:00:00'}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-[#0b0b0d] p-4 border border-[#1f1f26]">
                    <span className="text-gray-400 block text-xs uppercase font-bold tracking-wider mb-1.5">Oferty Rynku</span>
                    {loading ? (
                      <div className="h-5 w-12 bg-[#1f1f26] rounded animate-pulse-fast mx-auto my-0.5"></div>
                    ) : (
                      <span className="text-base sm:text-lg font-mono font-black text-amber-500">{globalStats?.marketOffersCount || 0}</span>
                    )}
                  </div>

                  <div className="bg-[#0b0b0d] p-4 border border-[#1f1f26]">
                    <span className="text-gray-400 block text-xs uppercase font-bold tracking-wider mb-1.5">Polskie Gildie</span>
                    {loading ? (
                      <div className="h-5 w-12 bg-[#1f1f26] rounded animate-pulse-fast mx-auto my-0.5"></div>
                    ) : (
                      <span className="text-base sm:text-lg font-mono font-black text-emerald-500">{globalStats?.guildsCount || 0}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* PRAWA FLANKA */}
            <div className="lg:col-span-8 space-y-5">
              
              <div className="bg-[#141419] border-2 border-[#c59b27] p-5 shadow-2xl relative">
                <div className="flex gap-4 border-b border-[#23232c] pb-3 mb-5 text-sm sm:text-base">
                  <button onClick={() => setRightTab('ECONOMY')} className={`font-black uppercase tracking-wider font-albion-title pb-1 border-b-2 transition ${rightTab === 'ECONOMY' ? 'text-[#c59b27] border-[#c59b27]' : 'text-gray-400 border-transparent hover:text-gray-200'}`}>📋 Kalkulator Caerleon (BETA)</button>
                  {isAdmin && (
                    <button onClick={() => setRightTab('ADMIN')} className={`font-black uppercase tracking-wider font-albion-title pb-1 border-b-2 transition ${rightTab === 'ADMIN' ? 'text-red-500 border-red-500' : 'text-red-800 border-transparent hover:text-red-400'}`}>⚔️ Księga Inkwizycji (Admin)</button>
                  )}
                </div>

                {rightTab === 'ECONOMY' && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start text-sm sm:text-base">
                    <form onSubmit={handleCalculateFlip} className="md:col-span-6 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">Przedmiot (ID)</label>
                          <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} className="w-full bg-[#0b0b0d] border border-[#23232c] p-3 text-white font-bold cursor-pointer focus:border-[#c59b27] focus:outline-none text-sm">
                            <option value="T4_BAG">Torba T4 (Pospolita)</option>
                            <option value="T5_BAG">Torba T5 (Pospolita)</option>
                            <option value="T6_BAG">Torba T6 (Pospolita)</option>
                            <option value="T4_ARMOR_PLATE_SET1">Kurtka Żołnierza T4</option>
                            <option value="T6_ARMOR_PLATE_SET1">Kurtka Żołnierza T6</option>
                            <option value="T4_CAPE">Peleryna T4</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">Miasto Zakupu</label>
                          <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="w-full bg-[#0b0b0d] border border-[#23232c] p-3 text-white font-bold cursor-pointer focus:border-[#c59b27] focus:outline-none text-sm">
                            <option value="Martlock">Martlock</option>
                            <option value="Lymhurst">Lymhurst</option>
                            <option value="FortSterling">Fort Sterling</option>
                            <option value="Bridgewatch">Bridgewatch</option>
                            <option value="Thetford">Thetford</option>
                          </select>
                        </div>
                      </div>

                      <button type="button" onClick={fetchLivePrices} disabled={isFetchingApi} className="w-full bg-[#1b1b22] hover:bg-[#282833] text-[#c59b27] border border-[#c59b27]/30 py-2 px-4 uppercase tracking-wider text-xs font-black transition disabled:opacity-50">
                        {isFetchingApi ? '📡 POBIERANIE DANYCH...' : '🔄 POBIERZ CENY LIVE Z ALBIONA (NIEDOSTĘPNE)'}
                      </button>

                      <div className="border-t border-[#23232c] my-2 pt-3">
                        <label className="block text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">Cena Zakupu w mieście</label>
                        <input type="number" required placeholder="Wpisz lub pobierz cenę live" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} className="w-full bg-[#0b0b0d] border border-[#23232c] p-3 text-white font-mono focus:border-[#c59b27] focus:outline-none text-sm" />
                      </div>
                      
                      <div>
                        <label className="block text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">Cena skupu na Czarnym Rynku</label>
                        <input type="number" required placeholder="Wpisz lub pobierz cenę live" value={blackMarketPrice} onChange={e => setBlackMarketPrice(e.target.value)} className="w-full bg-[#0b0b0d] border border-[#23232c] p-3 text-white font-mono focus:border-[#c59b27] focus:outline-none text-sm" />
                      </div>

                      <div>
                        <label className="block text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">Podatek w Caerleon</label>
                        <select value={marketTax} onChange={e => setMarketTax(e.target.value)} className="w-full bg-[#0b0b0d] border border-[#23232c] p-3 text-white font-bold cursor-pointer focus:border-[#c59b27] focus:outline-none text-sm">
                          <option value="4">4% (Premium / Szybka sprzedaż)</option>
                          <option value="8">8% (Premium / Oferta)</option>
                          <option value="15">15% (Bez Premium / Oferta)</option>
                        </select>
                      </div>
                      
                      <button type="submit" className="w-full bg-gradient-to-b from-[#dca62b] to-[#a87a1e] text-black font-black py-3 px-5 uppercase tracking-widest border border-[#4a3a1d] transition font-albion-title transform active:scale-95 text-sm sm:text-base">Analizuj Marżę</button>
                    </form>

                    <div className="md:col-span-6 h-full flex flex-col justify-between space-y-4">
                      <div className="bg-[#0b0b0d] border border-[#23232c] p-5 rounded-sm space-y-3 min-h-[190px] flex flex-col justify-center shadow-inner">
                        {calcResult ? (
                          <div className="space-y-3 text-sm sm:text-base">
                            <div className="flex justify-between border-b border-[#1f1f26] pb-2"><span className="text-gray-400">Czysty zysk (Netto):</span><span className="font-mono font-bold text-gray-100 text-base">{calcResult.profit} Silver</span></div>
                            <div className="flex justify-between border-b border-[#1f1f26] pb-2"><span className="text-gray-400">Zwrot z inwestycji (ROI):</span><span className="font-mono font-black text-amber-400 text-base">+{calcResult.roi}%</span></div>
                            <div className={`mt-3 p-3 border text-center font-black uppercase tracking-wider text-xs sm:text-sm ${calcResult.statusColor}`}>{calcResult.statusText}</div>
                          </div>
                        ) : (
                          <p className="text-gray-500 italic text-center text-sm">Wprowadź wartości cenowe po lewej stronie, aby sprawdzić rentowność transportu.</p>
                        )}
                      </div>

                      {/* OSTATNIE KONTRAKTY Z BAZY */}
                      <div className="bg-[#0b0b0d] border border-[#23232c] p-4 rounded-sm space-y-3">
                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider block border-b border-[#1f1f26] pb-1.5">Ostatnie ogłoszenia z tablicy</span>
                        {loading ? (
                          <div className="space-y-2 animate-pulse-fast">
                            <div className="h-4 bg-[#1f1f26] rounded w-full"></div>
                            <div className="h-4 bg-[#1f1f26] rounded w-5/6"></div>
                          </div>
                        ) : recentGlobalPosts.length === 0 ? (
                          <p className="text-sm text-gray-500 italic">Brak nowych zleceń kupna/sprzedaży.</p>
                        ) : (
                          recentGlobalPosts.map(post => (
                            <div key={post.id} className="text-sm flex justify-between border-b border-[#1f1f26]/40 pb-1.5 last:border-none last:pb-0">
                              <span className="text-gray-300 font-mono">[{post.server}] {post.item_name}</span>
                              <span className="text-[#c59b27] font-bold font-mono">{post.price.toLocaleString()} Silver</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {rightTab === 'ADMIN' && isAdmin && (
                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between items-center bg-[#0b0b0d] p-3 border border-red-950/40 flex-wrap gap-2">
                      <span className="text-red-400 font-bold uppercase text-xs tracking-wider">Panel Kontrolny Wyższego Inkwizytora</span>
                      <div className="flex gap-1 bg-[#141419] p-1 border border-[#23232c]">
                        <button onClick={() => setAdminTab('MARKET')} className={`px-3 py-1 text-xs font-black uppercase transition ${adminTab === 'MARKET' ? 'bg-red-950 text-red-400 border border-red-900/40' : 'text-gray-400 hover:text-white'}`}>Oferty ({allMarketPosts.length})</button>
                        <button onClick={() => setAdminTab('GUILDS')} className={`px-3 py-1 text-xs font-black uppercase transition ${adminTab === 'GUILDS' ? 'bg-red-950 text-red-400 border border-red-900/40' : 'text-gray-400 hover:text-white'}`}>Gildie ({allGuilds.length})</button>
                      </div>
                    </div>
                    <div className="max-h-[250px] overflow-y-auto pr-1 space-y-2 scrollbar-thin">
                      {adminTab === 'MARKET' ? allMarketPosts.map(post => (
                        <div key={post.id} className="bg-[#0b0b0d] border border-red-950/40 p-3 flex justify-between items-center hover:border-red-900/40 transition text-sm flex-wrap gap-2">
                          <div><span className="text-purple-400 font-bold font-mono mr-1.5">[{post.server}]</span><span className="text-gray-200 font-bold">{post.item_name}</span> za <span className="text-[#c59b27] font-bold font-mono">{post.price}</span></div>
                          <button onClick={() => deleteMarketPost(post.id)} className="bg-red-950 hover:bg-red-900 text-red-400 font-black px-4 py-2 border border-red-900/60 uppercase text-xs tracking-wider transition">ANULUJ KONTRAKT</button>
                        </div>
                      )) : allGuilds.map(guild => (
                        <div key={guild.id} className="bg-[#0b0b0d] border border-red-950/40 p-3 flex justify-between items-center hover:border-red-900/40 transition text-sm flex-wrap gap-2">
                          <div><span className="text-purple-400 font-bold font-mono mr-1.5">[{guild.server}]</span><span className="text-gray-100 font-albion-title font-bold">{guild.name}</span></div>
                          <button onClick={() => deleteGuild(guild.id)} className="bg-red-950 hover:bg-red-900 text-red-400 font-black px-4 py-2 border border-red-900/60 uppercase text-xs tracking-wider transition">SPAL DEKRET</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* CZAT SPOŁECZNOŚCIOWO-SYSTEMOWY W KLIMACIE ALBIONA */}
              <div className="bg-[#141419] border-2 border-[#c59b27] p-5 shadow-[0_15px_30px_rgba(0,0,0,0.7)] h-[480px] flex flex-col justify-between relative text-gray-300 font-sans">
                
                {/* NAGŁÓWEK KANAŁÓW */}
                <div className="flex gap-2 border-b border-[#23232c] pb-2.5 mb-4 text-xs font-black uppercase tracking-widest font-albion-title items-center flex-wrap">
                  <span className="text-[#c59b27] mr-1">📜 KANAŁY:</span>
                  {['GLOBALNY', 'HANDEL', 'REKRUTACJA', 'SYSTEM'].map((ch) => (
                    <button 
                      key={ch} 
                      onClick={() => { setActiveChannel(ch); }} 
                      className={`px-3 py-1.5 border transition rounded-sm text-xs ${
                        activeChannel === ch 
                          ? 'bg-[#c59b27] text-black border-[#4a3a1d] font-black shadow-md' 
                          : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-[#1f1f26]'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>

                {/* STRUMIŃ WIADOMOŚCI */}
                <div className="space-y-3 overflow-y-auto flex-1 pr-1 text-sm leading-relaxed select-text scrollbar-thin scrollbar-thumb-[#c59b27] scrollbar-track-[#0b0b0d] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-[#0b0b0d] [&::-webkit-scrollbar-thumb]:bg-[#c59b27] [&::-webkit-scrollbar-thumb]:border [&::-webkit-scrollbar-thumb]:border-[#23232c]">
                  {chatLoading ? (
                    <div className="space-y-4 animate-pulse-fast">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-3 items-center">
                          <div className="w-9 h-9 bg-[#1f1f26] border border-[#23232c] rounded-sm"></div>
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-[#1f1f26] rounded w-1/4"></div>
                            <div className="h-3 bg-[#1f1f26] rounded w-2/3"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    chatMessages
                      .filter(msg => activeChannel === 'GLOBALNY' || msg.channel === activeChannel || msg.channel === 'SYSTEM')
                      .map((msg) => {
                        const messageTime = msg.created_at ? new Date(msg.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : 'Niedawno';
                        const userAvatar = msg.avatar_url || (msg.user_id === user?.id ? user?.user_metadata?.avatar_url : null);

                        return (
                          <motion.div 
                            key={msg.id} 
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.18 }}
                            className="flex items-start gap-3 border-b border-[#1f1f26]/40 pb-2.5 last:border-none last:pb-0 hover:bg-[#1d1d24]/40 p-1.5 -mx-1.5 rounded-sm transition text-sm"
                          >
                            {/* AWATAR Z DISCORDA */}
                            {userAvatar && msg.channel !== 'SYSTEM' ? (
                              <img 
                                src={userAvatar} 
                                alt="Discord Avatar" 
                                className={`w-9 h-9 rounded-sm object-cover border shadow-md shrink-0 ${
                                  msg.role === 'ADMIN' ? 'border-[#c59b27]' : 'border-[#23232c]'
                                }`} 
                              />
                            ) : (
                              <div className={`w-9 h-9 rounded-sm flex items-center justify-center font-black text-sm shrink-0 border shadow-md ${
                                msg.channel === 'SYSTEM' ? 'bg-[#1b1b22] border-gray-700 text-gray-500 font-mono' :
                                msg.role === 'ADMIN' ? 'bg-red-950/60 border-[#c59b27] text-[#c59b27]' : 'bg-[#1d1d24] border-[#2c2c3b] text-sky-400'
                              }`}>
                                {msg.username ? msg.username.charAt(0).toUpperCase() : 'S'}
                              </div>
                            )}

                            {/* DANE I TREŚĆ TEKSTOWA */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className={`font-bold tracking-wide text-sm sm:text-base ${
                                  msg.channel === 'SYSTEM' ? 'text-gray-400 font-mono text-xs' :
                                  msg.role === 'ADMIN' ? 'text-[#c59b27] font-albion-title' : 'text-sky-400 font-semibold'
                                }`}>
                                  {msg.username || 'System'}
                                </span>
                                
                                {msg.channel !== 'SYSTEM' && (
                                  <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm border ${
                                    msg.role === 'ADMIN' ? 'bg-red-950 text-red-400 border-red-900/40' : 'bg-[#1d1d24] text-gray-400 border-[#23232c]'
                                  }`}>
                                    {msg.role === 'ADMIN' ? 'Inkwizytor' : 'Wojownik'}
                                  </span>
                                )}
                                
                                <span className="text-xs text-gray-500 font-mono font-bold">{messageTime}</span>
                              </div>

                              <div className="mt-1 break-words">
                                <span className={`text-sm sm:text-base ${
                                  msg.channel === 'SYSTEM' ? 'text-gray-500 italic font-mono text-xs' : 
                                  msg.channel === 'HANDEL' ? 'text-amber-100/90' :
                                  msg.channel === 'REKRUTACJA' ? 'text-purple-100/90' :
                                  msg.role === 'ADMIN' ? 'text-gray-100 font-medium' : 'text-gray-200'
                                }`}>
                                  {msg.text}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* POLE WPISYWANIA */}
                <form onSubmit={handleSendChatMessage} className="mt-3 flex gap-2 items-center bg-[#0b0b0d] border border-[#23232c] rounded-sm px-3 py-2 focus-within:border-[#c59b27]/70 transition">
                  <input
                    type="text"
                    maxLength="120"
                    disabled={activeChannel === 'SYSTEM'}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={activeChannel === 'SYSTEM' ? 'Dekret królewski zablokowany...' : `Napisz na kanale ${activeChannel.toLowerCase()}...`}
                    className="flex-1 bg-transparent text-sm text-white focus:outline-none placeholder-gray-500 disabled:opacity-40"
                  />

                  <button 
                    type="submit" 
                    disabled={activeChannel === 'SYSTEM'} 
                    className="bg-gradient-to-b from-[#dca62b] to-[#a87a1e] hover:from-[#f0b73a] hover:to-[#be8c27] text-black px-5 py-1.5 text-xs font-black font-albion-title uppercase border border-[#4a3a1d] rounded-sm transition active:scale-95 disabled:hidden"
                  >
                    Wyślij
                  </button>
                </form>

              </div>

            </div>
          </div>

        </div>
      )}
    </main>
  )
}