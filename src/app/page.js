'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState, useRef, memo } from 'react'
import Link from 'next/link'
import { Castle, Swords, ShoppingBag, Shield, Trash2, Send } from 'lucide-react'

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
    <span className="text-3xl font-mono font-black text-[#c59b27] tracking-widest drop-shadow">
      {utcTime || '00:00:00'}
    </span>
  )
})

export default function Home() {
  const [selectedItem, setSelectedItem] = useState('T4_BAG')  
  const [selectedCity, setSelectedCity] = useState('Martlock')
  const [isFetchingApi, setIsFetchingApi] = useState(false)
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

    // Subskrypcja Realtime
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

    let statusText = "Nieopłacalne / Za duże ryzyko"
    let statusColor = "text-red-400 border-red-900/40 bg-red-950/20"

    if (roi >= 10 && roi < 25) {
      statusText = "Umiarkowany zysk"
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

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080506] text-xl font-serif tracking-widest">
        <p className="text-[#c59b27] animate-pulse font-bold">ŁADOWANIE REJESTRU KRÓLEWSKIEGO...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex flex-col justify-between antialiased font-sans select-none relative bg-[#080506] text-[#bcbbc2]">
      
      {/* TŁO */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#1b0a0d] via-[#0d0708] to-[#050304] z-0 pointer-events-none"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/30 via-transparent to-transparent z-0 pointer-events-none"></div>
      
      {/* TREŚĆ */}
      <div className="w-full flex-1 flex flex-col items-center justify-center p-4 sm:p-6 text-[#bcbbc2] z-10">
        {!user ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-5xl mx-auto space-y-10 px-4 py-8">
            <div className="text-center space-y-3">
              <h1 className="text-4xl sm:text-6xl font-black text-[#c59b27] tracking-widest font-serif">
                ALBION ONLINE POLSKA
              </h1>
              <p className="text-base sm:text-lg text-gray-300 uppercase tracking-widest font-bold max-w-2xl mx-auto">
                Polski Węzeł Społecznościowy Caerleon
              </p>
            </div>

            <div className="max-w-md w-full bg-[#120a0c] border-2 border-[#c59b27] p-8 text-center shadow-2xl">
              <span className="text-sm text-[#c59b27] font-bold tracking-widest block uppercase font-mono mb-4">
                Brama do Kronik Miejskich
              </span>
              <button 
                onClick={loginWithDiscord} 
                className="w-full bg-gradient-to-r from-[#c59b27] to-[#a87a1e] hover:from-[#dca62b] text-black font-black py-4 px-6 border border-[#4a3a1d] tracking-wider text-sm uppercase transition font-serif shadow-lg"
              >
                Zaloguj przez Discord
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-base">
              <div className="bg-[#120a0c] border border-[#3a1a1e] p-6 shadow-xl space-y-3">
                <div className="text-3xl">📊</div>
                <h3 className="font-bold text-[#c59b27] font-serif text-lg uppercase tracking-wider">Kalkulator Caerleon</h3>
                <p className="text-gray-300 leading-relaxed text-sm">Analizuj marże transportowe i zyski ze skupu na Czarnym Rynku.</p>
              </div>
              <div className="bg-[#120a0c] border border-[#3a1a1e] p-6 shadow-xl space-y-3">
                <div className="text-3xl">🛡️</div>
                <h3 className="font-bold text-sky-400 font-serif text-lg uppercase tracking-wider">Królewska Zbrojownia</h3>
                <p className="text-gray-300 leading-relaxed text-sm">Przeglądaj i twórz zestawy rynsztunku do PvP, ZvZ i PvE.</p>
              </div>
              <div className="bg-[#120a0c] border border-[#3a1a1e] p-6 shadow-xl space-y-3">
                <div className="text-3xl">⚔️</div>
                <h3 className="font-bold text-emerald-400 font-serif text-lg uppercase tracking-wider">Rejestr Gildii</h3>
                <p className="text-gray-300 leading-relaxed text-sm">Znajdź nową gildię i aplikuj bezpośrednio do ich rekruterów.</p>
              </div>
            </div>
          </div>
        ) : (
          
          <div className="max-w-7xl w-full space-y-6 text-base my-2">
            
            {/* PROFILE HEADER */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#120a0c] border-2 border-[#c59b27]/80 p-5 shadow-2xl">
              <div>
                <h1 className="text-2xl font-black text-gray-100 flex items-center gap-2 font-serif uppercase tracking-wider">
                  <Castle className="w-8 h-8 text-[#c59b27]" />
                  <span>Tablica Miejska Caerleon</span>
                </h1>
                <p className="text-xs text-gray-400 uppercase tracking-widest font-bold mt-1">Lokalny punkt informacyjny wolnego miasta</p>
              </div>
              
              <div className="flex items-center gap-4 bg-[#080506] py-3 px-5 border border-[#3a1a1e] self-stretch sm:self-auto justify-between">
                <div className="flex items-center gap-3">
                  {user.user_metadata?.avatar_url && (
                    <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-11 h-11 border border-[#c59b27]" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400 uppercase font-bold font-mono">{isAdmin ? 'Inkwizytor' : 'Wojownik'}</span>
                    <span className="font-extrabold text-base text-emerald-400 font-mono">{(user.user_metadata?.full_name || 'Gracz').replace(/#0$/, '')}</span>
                  </div>
                </div>
                <button onClick={logout} className="text-xs bg-[#2b0d10] hover:bg-red-900 border border-red-700/60 text-red-200 font-bold px-4 py-2 uppercase tracking-wider transition ml-3">
                  Opuść
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* LEWA STRONA */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* PRZYCISKI MODUŁÓW */}
                <div className="bg-[#120a0c] border border-[#3a1a1e] p-5 shadow-xl space-y-4">
                  <h2 className="text-sm font-black text-[#c59b27] uppercase tracking-widest border-b border-[#3a1a1e] pb-2 font-serif">
                    Katalogi Główne
                  </h2>
                  <div className="space-y-3">
                    <Link href="/gildie" className="w-full block bg-gradient-to-r from-[#c59b27] to-[#a87a1e] hover:from-[#dca62b] text-black font-black py-3.5 px-4 text-sm text-center uppercase tracking-widest transition shadow font-serif">
                      ⚔️ Rejestr Polskich Gildii
                    </Link>
                    <Link href="/rynek" className="w-full block bg-[#080506] hover:bg-[#1a0c0e] text-gray-200 border border-[#3a1a1e] font-black py-3.5 px-4 text-sm text-center uppercase tracking-widest transition shadow font-serif">
                      💰 Tablica Ogłoszeń Rynku
                    </Link>
                    <Link href="/buildy" className="w-full block bg-[#2b0d10] hover:bg-red-900 text-red-200 border border-red-800/60 font-black py-3.5 px-4 text-sm text-center uppercase tracking-widest transition shadow font-serif">
                      🛡️ Kreator &amp; Zestawy Bojowe
                    </Link>
                  </div>
                </div>

                {/* NEWSY & ZEGAREK */}
                <div className="bg-[#120a0c] border border-[#3a1a1e] p-5 shadow-xl space-y-4">
                  <div className="bg-[#080506] border border-[#2b181a] p-4 space-y-3">
                    <h3 className="text-xs font-black text-[#c59b27] uppercase tracking-widest font-serif border-b border-[#2b181a] pb-2">
                      📜 Goniec Królewski (Newsy)
                    </h3>
                    <div className="space-y-3 max-h-[240px] overflow-y-auto pr-2 text-xs">
                      {albionNews.length === 0 ? (
                        <p className="text-xs text-gray-500 italic">Ładowanie kronik...</p>
                      ) : (
                        albionNews.map((news, idx) => (
                          <div key={idx} className="border-b border-[#2b181a] pb-2.5 last:border-none">
                            <a href={news.link} target="_blank" rel="noopener noreferrer" className="text-gray-200 hover:text-[#c59b27] font-bold block transition text-sm mb-1">
                              {news.title}
                            </a>
                            <p className="text-xs text-gray-400 line-clamp-2">{news.contentSnippet}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="bg-[#080506] border border-[#2b181a] p-4 text-center">
                    <span className="text-xs text-gray-500 font-bold tracking-widest block uppercase font-mono mb-1">Czas Serwera (UTC)</span>
                    <ServerClock />
                  </div>
                </div>
              </div>

              {/* PRAWA STRONA: KALKULATOR & CZAT */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* KALKULATOR / ADMIN PANEL */}
                <div className="bg-[#120a0c] border border-[#3a1a1e] p-5 shadow-xl">
                  <div className="flex gap-4 border-b border-[#3a1a1e] pb-3 mb-4 text-sm font-serif font-black uppercase tracking-wider">
                    <button onClick={() => setRightTab('ECONOMY')} className={`pb-1 border-b-2 transition ${rightTab === 'ECONOMY' ? 'text-[#c59b27] border-[#c59b27]' : 'text-gray-400 border-transparent hover:text-gray-200'}`}>
                      📋 Kalkulator Caerleon (Flip)
                    </button>
                    {isAdmin && (
                      <button onClick={() => setRightTab('ADMIN')} className={`pb-1 border-b-2 transition ${rightTab === 'ADMIN' ? 'text-red-400 border-red-500' : 'text-red-800 border-transparent hover:text-red-400'}`}>
                        ⚔️ Panel Inkwizycji (Admin)
                      </button>
                    )}
                  </div>

                  {/* KONTENT 1: KALKULATOR */}
                  {rightTab === 'ECONOMY' && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start text-xs sm:text-sm">
                      <form onSubmit={handleCalculateFlip} className="md:col-span-6 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-gray-400 mb-1 font-bold uppercase">Przedmiot</label>
                            <select value={selectedItem} onChange={e => setSelectedItem(e.target.value)} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-200 outline-none">
                              <option value="T4_BAG">Torba T4</option>
                              <option value="T5_BAG">Torba T5</option>
                              <option value="T6_BAG">Torba T6</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-gray-400 mb-1 font-bold uppercase">Miasto Zakupu</label>
                            <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-200 outline-none">
                              <option value="Martlock">Martlock</option>
                              <option value="Lymhurst">Lymhurst</option>
                              <option value="FortSterling">Fort Sterling</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-gray-400 mb-1 font-bold uppercase">Cena Zakupu w mieście</label>
                          <input type="number" required placeholder="Wpisz cenę" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 font-mono outline-none text-sm" />
                        </div>
                        
                        <div>
                          <label className="block text-gray-400 mb-1 font-bold uppercase">Cena na Czarnym Rynku</label>
                          <input type="number" required placeholder="Wpisz cenę" value={blackMarketPrice} onChange={e => setBlackMarketPrice(e.target.value)} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 font-mono outline-none text-sm" />
                        </div>

                        <button type="submit" className="w-full bg-gradient-to-r from-[#c59b27] to-[#a87a1e] hover:from-[#dca62b] text-black font-black py-3 uppercase tracking-widest font-serif transition">
                          Analizuj Marżę
                        </button>
                      </form>

                      <div className="md:col-span-6 h-full flex flex-col justify-between space-y-4">
                        <div className="bg-[#080506] border border-[#2b181a] p-4 rounded-sm space-y-2 min-h-[160px] flex flex-col justify-center">
                          {calcResult ? (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between border-b border-[#2b181a] pb-1.5"><span className="text-gray-400">Czysty zysk:</span><span className="font-mono font-bold text-gray-100">{calcResult.profit} Silver</span></div>
                              <div className="flex justify-between border-b border-[#2b181a] pb-1.5"><span className="text-gray-400">Zwrot (ROI):</span><span className="font-mono font-black text-amber-400">+{calcResult.roi}%</span></div>
                              <div className={`mt-2 p-2 border text-center font-black uppercase text-xs ${calcResult.statusColor}`}>{calcResult.statusText}</div>
                            </div>
                          ) : (
                            <p className="text-gray-500 italic text-center text-xs">Wprowadź ceny, aby obliczyć zysk.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* KONTENT 2: PANEL ADMINA (INKWIZYCJA) */}
                  {rightTab === 'ADMIN' && isAdmin && (
                    <div className="space-y-4 text-xs sm:text-sm">
                      <div className="flex justify-between items-center bg-[#080506] p-3 border border-red-950/60 flex-wrap gap-2">
                        <span className="text-red-400 font-bold uppercase text-xs tracking-wider">
                          Panel Kontrolny Wyższego Inkwizytora
                        </span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setAdminTab('MARKET')} 
                            className={`px-3 py-1 text-xs font-black uppercase transition ${
                              adminTab === 'MARKET' ? 'bg-red-950 text-red-400 border border-red-900/60' : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            Oferty Rynku ({allMarketPosts.length})
                          </button>
                          <button 
                            onClick={() => setAdminTab('GUILDS')} 
                            className={`px-3 py-1 text-xs font-black uppercase transition ${
                              adminTab === 'GUILDS' ? 'bg-red-950 text-red-400 border border-red-900/60' : 'text-gray-400 hover:text-white'
                            }`}
                          >
                            Dekrety Gildii ({allGuilds.length})
                          </button>
                        </div>
                      </div>

                      <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                        {adminTab === 'MARKET' ? (
                          allMarketPosts.length === 0 ? (
                            <p className="text-gray-500 italic text-center py-6">Brak ofert na rynku do zarządzania.</p>
                          ) : (
                            allMarketPosts.map(post => (
                              <div key={post.id} className="bg-[#080506] border border-red-950/40 p-3 flex justify-between items-center hover:border-red-900/60 transition flex-wrap gap-2">
                                <div>
                                  <span className="text-purple-400 font-mono font-bold mr-2">[{post.city || post.server || 'Caerleon'}]</span>
                                  <span className="text-gray-200 font-bold">{post.title || post.item_name}</span>
                                  <span className="text-[#c59b27] font-bold font-mono ml-2">{post.price} Silver</span>
                                </div>
                                <button 
                                  onClick={() => deleteMarketPost(post.id)} 
                                  className="bg-red-950 hover:bg-red-900 text-red-400 font-black px-3 py-1 border border-red-900/60 uppercase text-xs tracking-wider transition"
                                >
                                  Anuluj
                                </button>
                              </div>
                            ))
                          )
                        ) : (
                          allGuilds.length === 0 ? (
                            <p className="text-gray-500 italic text-center py-6">Brak zarejestrowanych gildii.</p>
                          ) : (
                            allGuilds.map(guild => (
                              <div key={guild.id} className="bg-[#080506] border border-red-950/40 p-3 flex justify-between items-center hover:border-red-900/60 transition flex-wrap gap-2">
                                <div>
                                  <span className="text-purple-400 font-mono font-bold mr-2">[{guild.server}]</span>
                                  <span className="text-gray-100 font-serif font-bold">{guild.name}</span>
                                </div>
                                <button 
                                  onClick={() => deleteGuild(guild.id)} 
                                  className="bg-red-950 hover:bg-red-900 text-red-400 font-black px-3 py-1 border border-red-900/60 uppercase text-xs tracking-wider transition"
                                >
                                  Spal Dekret
                                </button>
                              </div>
                            ))
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* CZAT SPOŁECZNOŚCIOWY */}
                <div className="bg-[#120a0c] border border-[#3a1a1e] p-5 h-[500px] flex flex-col justify-between shadow-xl">
                  
                  {/* KANAŁY */}
                  <div className="flex gap-2 border-b border-[#3a1a1e] pb-3 mb-3 text-xs font-serif font-black uppercase tracking-wider items-center flex-wrap">
                    <span className="text-[#c59b27] mr-1">📜 KANAŁY:</span>
                    {['GLOBALNY', 'HANDEL', 'REKRUTACJA', 'SYSTEM'].map((ch) => (
                      <button 
                        key={ch} 
                        onClick={() => { setActiveChannel(ch); }} 
                        className={`px-3 py-1.5 transition border text-xs ${
                          activeChannel === ch 
                            ? 'bg-[#c59b27] text-black border-[#4a3a1d] font-bold' 
                            : 'text-gray-400 border-transparent hover:text-gray-200'
                        }`}
                      >
                        {ch}
                      </button>
                    ))}
                  </div>

                  {/* TEKST CZATU */}
                  <div 
                    ref={chatContainerRef}
                    className="space-y-3 overflow-y-auto flex-1 w-full pr-1 text-sm sm:text-base select-text flex flex-col"
                  >
                    {chatLoading ? (
                      <p className="text-gray-500 italic text-center py-4">Ładowanie czatu...</p>
                    ) : (
                      chatMessages
                        .filter(msg => activeChannel === 'GLOBALNY' || msg.channel === activeChannel || msg.channel === 'SYSTEM')
                        .map((msg) => {
                          const messageTime = msg.created_at ? new Date(msg.created_at).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '';
                          const userAvatar = msg.avatar_url || (msg.user_id === user?.id ? user?.user_metadata?.avatar_url : null);
                          const cleanDisplayName = (msg.username || 'System').replace(/#0$/, '');

                          return (
                            <div 
                              key={msg.id} 
                              className="flex items-start gap-3 border-b border-[#2b181a]/50 pb-2.5 last:border-none"
                            >
                              {userAvatar && msg.channel !== 'SYSTEM' ? (
                                <img src={userAvatar} alt="Avatar" className="w-9 h-9 object-cover border border-[#3a1a1e] shrink-0" />
                              ) : (
                                <div className="w-9 h-9 flex items-center justify-center font-bold text-sm shrink-0 border bg-[#080506] border-[#3a1a1e] text-[#c59b27]">
                                  {cleanDisplayName.charAt(0).toUpperCase()}
                                </div>
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`font-bold text-sm ${msg.role === 'ADMIN' ? 'text-[#c59b27] font-serif' : 'text-sky-400'}`}>
                                    {cleanDisplayName}
                                  </span>
                                  
                                  <span className="text-xs text-gray-500 font-mono">{messageTime}</span>

                                  {isAdmin && msg.channel !== 'SYSTEM' && (
                                    <button onClick={() => deleteChatMessage(msg.id)} className="text-red-400 hover:underline text-xs ml-auto">
                                      <Trash2 className="w-3.5 h-3.5 inline" />
                                    </button>
                                  )}
                                </div>

                                <p className="text-gray-100 mt-1 whitespace-pre-wrap leading-relaxed chat-message-text">
                                  {msg.text}
                                </p>
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>

                  {/* INPUT CZATU */}
                  <form onSubmit={handleSendChatMessage} className="mt-3 flex gap-2 items-center bg-[#080506] border border-[#2b181a] p-2.5">
                    <input
                      type="text"
                      maxLength="120"
                      disabled={activeChannel === 'SYSTEM'}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={activeChannel === 'SYSTEM' ? 'Kanał zablokowany...' : `Wiadomość na kanale ${activeChannel.toLowerCase()}...`}
                      className="flex-1 bg-transparent text-sm text-gray-100 focus:outline-none placeholder-gray-500"
                    />

                    <button 
                      type="submit" 
                      disabled={activeChannel === 'SYSTEM'} 
                      className="bg-gradient-to-r from-[#c59b27] to-[#a87a1e] hover:from-[#dca62b] text-black px-5 py-2 text-xs font-black font-serif uppercase transition disabled:hidden flex items-center gap-1"
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

      {/* FOOTER */}
      <footer className="w-full bg-[#050304] border-t border-[#3a1a1e] py-6 text-center text-xs text-gray-500 mt-8 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© {new Date().getFullYear()} <span className="text-[#c59b27] font-bold">Albion Online Polska Portal</span>.</p>
          <div className="flex gap-4 text-xs font-mono text-gray-400">
            <Link href="/regulamin" className="hover:text-[#c59b27] transition">Regulamin</Link>
            <span>•</span>
            <Link href="/prywatnosc" className="hover:text-[#c59b27] transition">Polityka Prywatności</Link>
          </div>
        </div>
      </footer>

    </main>
  )
}