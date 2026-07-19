'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'

export default function Home() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [utcTime, setUtcTime] = useState('')

  // Stany Supabase
  const [myGuilds, setMyGuilds] = useState([])
  const [myMarketPosts, setMyMarketPosts] = useState([])
  const [globalStats, setGlobalStats] = useState({ guilds: 0, market: 0 })
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

  // JAWNIE ZDEFINIOWANE STANY DLA CZATU (Naprawia ReferenceError)
  const [chatMessages, setChatMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [activeChannel, setActiveChannel] = useState('GLOBALNY')
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

  // Bezpieczne przewijanie czatu (nie zjeżdża z całą stroną w dół)
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [chatMessages])

  const fetchInitialChat = async () => {
    const { data } = await supabase.from('chat_messages').select('*').order('created_at', { ascending: true }).limit(50)
    if (data && data.length > 0) {
      setChatMessages(data)
    } else {
      setChatMessages([{ id: 'init', channel: 'SYSTEM', username: 'System', text: 'Połączono z węzłem miejskim Albion Online Polska Portal. Czat aktywny.' }])
    }
  }

  const fetchGlobalData = async () => {
    const { data: recent } = await supabase.from('market_posts').select('*, profiles(username)').order('created_at', { ascending: false }).limit(3)
    setRecentGlobalPosts(recent || [])
    const { count: gCount } = await supabase.from('guilds').select('*', { count: 'exact', head: true })
    const { count: mCount } = await supabase.from('market_posts').select('*', { count: 'exact', head: true })
    setGlobalStats({ guilds: gCount || 0, market: mCount || 0 })
  }

  const fetchUserDataAndRole = async (userId) => {
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
    setLoading(false)
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
    let statusColor = "text-red-500 border-red-900/40 bg-red-950/20"

    if (roi >= 10 && roi < 25) {
      statusText = "Umiarkowany zysk / Przeciętny zwrot"
      statusColor = "text-yellow-500 border-yellow-900/40 bg-yellow-950/20"
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
      <main className="flex min-h-screen items-center justify-center bg-[#050507] text-white font-serif tracking-widest">
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
          background: linear-gradient(-45deg, #020203, #080706, #140f0a, #040405);
          background-size: 300% 300%;
          animation: bgDrift 35s ease infinite;
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.85)_100%)] pointer-events-none z-0"></div>
      
      {!user ? (
        <div className="max-w-md w-full bg-[#141419] border-2 border-[#c59b27] p-8 text-center shadow-[0_15px_40px_rgba(0,0,0,0.8)] mt-36 z-10">
          <h1 className="text-3xl font-black mb-1 text-[#c59b27] tracking-widest font-albion-title">ALBION ONLINE POLSKA</h1>
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold border-b border-[#23232b] pb-3 mb-6">Polski Węzeł Społeczności</p>
          <button onClick={loginWithDiscord} className="w-full bg-gradient-to-b from-[#dca62b] to-[#a87a1e] hover:from-[#f0b73a] hover:to-[#be8c27] text-black font-black py-3 px-6 border border-[#4a3a1d] tracking-wider text-xs uppercase transition font-albion-title">Zaloguj przez Discord</button>
        </div>
      ) : (
        
        <div className="max-w-7xl w-full space-y-5 animate-fade-in z-10">
          
          {/* NAGŁÓWEK MIEJSKI */}
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#141419] border-2 border-[#c59b27] p-4 shadow-2xl relative">
            <div>
              <h1 className="text-2xl font-black text-gray-100 font-albion-title tracking-wider flex items-center gap-2">
                🏰 TABLICA MIEJSKA <span className="text-[#c59b27] text-xs font-sans bg-[#1d1d24] px-2 py-0.5 border border-[#2c2c38] font-bold">ALBION ONLINE POLSKA PORTAL</span>
              </h1>
              <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mt-0.5">Lokalny punkt informacyjny wolnego miasta</p>
            </div>
            
            <div className="flex items-center gap-5 bg-[#0b0b0d] py-2.5 px-5 rounded-sm border-2 border-[#c59b27]/50 self-stretch sm:self-auto justify-between shadow-2xl">
              <div className="flex items-center gap-3.5">
                {user.user_metadata?.avatar_url && (
                  <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-10 h-10 rounded-sm border-2 border-[#c59b27] shadow-md" />
                )}
                <div className="flex flex-col">
                  <span className="text-[8px] text-gray-500 uppercase tracking-widest font-bold font-mono">{isAdmin ? 'Inkwizytor' : 'Wojownik'}</span>
                  <span className="font-extrabold text-sm text-emerald-400 tracking-wide font-mono">{user.user_metadata?.full_name}</span>
                </div>
              </div>
              <button onClick={logout} className="text-[10px] bg-red-950/60 hover:bg-red-900 border border-red-900/40 text-red-400 font-bold px-3 py-1.5 rounded-sm transition uppercase tracking-wider ml-2">Opuść</button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            
            {/* LEWA FLANKA */}
            <div className="lg:col-span-4 space-y-5">
              <div className="bg-[#141419] border-2 border-[#c59b27] p-4 shadow-xl">
                <h2 className="text-[10px] font-black text-[#c59b27] uppercase tracking-widest mb-3 border-b border-[#23232c] pb-1.5 font-albion-title">Katalogi Główne</h2>
                <div className="space-y-2">
                  <Link href="/gildie" className="w-full block bg-gradient-to-b from-[#dca62b] to-[#a87a1e] hover:from-[#f0b73a] hover:to-[#be8c27] text-black font-black py-2.5 px-4 text-xs text-center uppercase tracking-widest border border-[#4a3a1d] transition">⚔️ Rejestr Polskich Gildii</Link>
                  <Link href="/rynek" className="w-full block bg-[#1d1d24] hover:bg-[#25252e] text-gray-200 border border-[#2c2c3b] font-black py-2.5 px-4 text-xs text-center uppercase tracking-widest transition">💰 Tablica Ogłoszeń Rynku</Link>
                  <Link href="/buildy" className="w-full block bg-gradient-to-b from-[#966f2d] to-[#5a461d] hover:from-[#a87a1e] hover:to-[#735924] text-gray-200 border border-[#4a3a1d] font-black py-2.5 px-4 text-xs text-center uppercase tracking-widest transition">🛡️ Interaktywny Kreator Buildów</Link>
                </div>
              </div>

              <div className="bg-[#141419] border border-[#23232c] p-4 shadow-xl">
                <h2 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3 font-albion-title border-b border-[#1f1f26] pb-1">Czas i Statystyki</h2>
                <div className="bg-[#0b0b0d] border border-[#1f1f26] p-3 text-center mb-3 shadow-inner">
                  <span className="text-[8px] text-gray-600 font-bold tracking-widest block uppercase font-mono">SERVER TIME (UTC)</span>
                  <span className="text-2xl font-mono font-black text-[#c59b27] tracking-widest">{utcTime || '00:00:00'}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                  <div className="bg-[#1d1d24] p-2 border border-[#232333]"><span className="text-gray-500 block text-[8px] font-sans font-bold uppercase">Oferty Rynku</span><span className="text-amber-500 font-bold text-sm">{globalStats.market}</span></div>
                  <div className="bg-[#1d1d24] p-2 border border-[#232333]"><span className="text-gray-500 block text-[8px] font-sans font-bold uppercase">Polskie Gildie</span><span className="text-emerald-500 font-bold text-sm">{globalStats.guilds}</span></div>
                </div>
              </div>
            </div>

            {/* PRAWA FLANKA */}
            <div className="lg:col-span-8 space-y-5">
              
              <div className="bg-[#141419] border-2 border-[#c59b27] p-5 shadow-2xl relative">
                <div className="flex gap-4 border-b border-[#23232c] pb-3 mb-5 text-xs">
                  <button onClick={() => setRightTab('ECONOMY')} className={`font-black uppercase tracking-wider font-albion-title pb-1 border-b-2 transition ${rightTab === 'ECONOMY' ? 'text-[#c59b27] border-[#c59b27]' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>📋 Kalkulator Caerleon</button>
                  {isAdmin && (
                    <button onClick={() => setRightTab('ADMIN')} className={`font-black uppercase tracking-wider font-albion-title pb-1 border-b-2 transition ${rightTab === 'ADMIN' ? 'text-red-500 border-red-500' : 'text-red-900 border-transparent hover:text-red-400'}`}>⚔️ Księga Inkwizycji (Admin)</button>
                  )}
                </div>

                {rightTab === 'ECONOMY' && (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start text-xs animate-fade-in">
                    <form onSubmit={handleCalculateFlip} className="md:col-span-6 space-y-3">
                      <div>
                        <label className="block text-[9px] text-gray-500 mb-1 font-bold uppercase tracking-wider">Cena Zakupu w Mieście Królewskim</label>
                        <input type="number" required placeholder="Np. 120000" value={buyPrice} onChange={e => setBuyPrice(e.target.value)} className="w-full bg-[#0b0b0d] border border-[#23232c] p-2 text-white font-mono focus:border-[#c59b27] focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[9px] text-gray-500 mb-1 font-bold uppercase tracking-wider">Cena skupu na Czarnym Rynku</label>
                        <input type="number" required placeholder="Np. 195000" value={blackMarketPrice} onChange={e => setBlackMarketPrice(e.target.value)} className="w-full bg-[#0b0b0d] border border-[#23232c] p-2 text-white font-mono focus:border-[#c59b27] focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[9px] text-gray-500 mb-1 font-bold uppercase tracking-wider">Podatek w Caerleon</label>
                        <select value={marketTax} onChange={e => setMarketTax(e.target.value)} className="w-full bg-[#0b0b0d] border border-[#23232c] p-2 text-white font-bold cursor-pointer focus:border-[#c59b27] focus:outline-none">
                          <option value="4">4% (Premium / Szybka sprzedaż)</option>
                          <option value="8">8% (Premium / Oferta)</option>
                          <option value="15">15% (Bez Premium / Oferta)</option>
                        </select>
                      </div>
                      <button type="submit" className="w-full bg-gradient-to-b from-[#dca62b] to-[#a87a1e] text-black font-black py-2.5 px-4 uppercase tracking-widest border border-[#4a3a1d] transition font-albion-title transform active:scale-95">Analizuj Marżę</button>
                    </form>

                    <div className="md:col-span-6 h-full flex flex-col justify-between">
                      <div className="bg-[#0b0b0d] border border-[#23232c] p-4 rounded-sm space-y-2.5 min-h-[165px] flex flex-col justify-center shadow-inner">
                        {calcResult ? (
                          <div className="space-y-2">
                            <div className="flex justify-between border-b border-[#1f1f26] pb-1.5"><span className="text-gray-500">Czysty zysk (Netto):</span><span className="font-mono font-bold text-gray-100">{calcResult.profit} Silver</span></div>
                            <div className="flex justify-between border-b border-[#1f1f26] pb-1.5"><span className="text-gray-500">Zwrot z inwestycji (ROI):</span><span className="font-mono font-black text-amber-400">+{calcResult.roi}%</span></div>
                            <div className={`mt-2 p-2 border text-center font-bold uppercase tracking-wider text-[10px] ${calcResult.statusColor}`}>{calcResult.statusText}</div>
                          </div>
                        ) : (
                          <p className="text-gray-600 italic text-center text-[11px]">Wprowadź wartości cenowe po lewej stronie, aby sprawdzić rentowność transportu.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {rightTab === 'ADMIN' && isAdmin && (
                  <div className="space-y-4 animate-fade-in text-xs">
                    <div className="flex justify-between items-center bg-[#0b0b0d] p-2 border border-red-950/40">
                      <span className="text-red-400 font-bold uppercase text-[9px] tracking-wider">Panel Kontrolny Wyższego Inkwizytora</span>
                      <div className="flex gap-1 bg-[#141419] p-0.5 border border-[#23232c]">
                        <button onClick={() => setAdminTab('MARKET')} className={`px-3 py-1 text-[9px] font-black uppercase transition ${adminTab === 'MARKET' ? 'bg-red-950 text-red-400 border border-red-900/40' : 'text-gray-500 hover:text-white'}`}>Oferty ({allMarketPosts.length})</button>
                        <button onClick={() => setAdminTab('GUILDS')} className={`px-3 py-1 text-[9px] font-black uppercase transition ${adminTab === 'GUILDS' ? 'bg-red-950 text-red-400 border border-red-900/40' : 'text-gray-500 hover:text-white'}`}>Gildie ({allGuilds.length})</button>
                      </div>
                    </div>
                    <div className="max-h-[220px] overflow-y-auto pr-1 space-y-2">
                      {adminTab === 'MARKET' ? allMarketPosts.map(post => (
                        <div key={post.id} className="bg-[#0b0b0d] border border-red-950/40 p-2.5 flex justify-between items-center hover:border-red-900/40 transition">
                          <div><span className="text-purple-400 font-bold font-mono mr-1">[{post.server}]</span><span className="text-gray-200 font-bold">{post.item_name}</span> za <span className="text-[#c59b27] font-bold font-mono">{post.price}</span></div>
                          <button onClick={() => deleteMarketPost(post.id)} className="bg-red-950 hover:bg-red-900 text-red-400 font-bold px-3 py-1.5 border border-red-900/60 uppercase text-[9px] tracking-wider transition">ANULUJ KONTRAKT</button>
                        </div>
                      )) : allGuilds.map(guild => (
                        <div key={guild.id} className="bg-[#0b0b0d] border border-red-950/40 p-2.5 flex justify-between items-center hover:border-red-900/40 transition">
                          <div><span className="text-purple-400 font-bold font-mono mr-1">[{guild.server}]</span><span className="text-gray-100 font-albion-title font-bold">{guild.name}</span></div>
                          <button onClick={() => deleteGuild(guild.id)} className="bg-red-950 hover:bg-red-900 text-red-400 font-bold px-3 py-1.5 border border-red-900/60 uppercase text-[9px] tracking-wider transition">SPAL DEKRET</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* CZAT SPOŁECZNOŚCIOWO-SYSTEMOWY LIVE Z RANGAMI */}
              <div className="bg-[#060608] border border-[#23232c] rounded-sm p-3 shadow-2xl h-[250px] flex flex-col justify-between">
                
                <div className="flex gap-2 border-b border-[#1c1916] pb-1.5 mb-2 text-[9px] font-black uppercase tracking-wider">
                  {['GLOBALNY', 'HANDEL', 'REKRUTACJA', 'SYSTEM'].map((ch) => (
                    <button key={ch} onClick={() => setActiveChannel(ch)} className={`px-2 py-0.5 border transition ${activeChannel === ch ? 'bg-[#c59b27] text-black border-[#4a3a1d]' : 'text-gray-500 border-transparent hover:text-gray-300'}`}>
                      {ch}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5 overflow-y-auto max-h-[140px] flex-1 pr-1 text-[11px] font-medium leading-relaxed select-text">
                  {chatMessages
                    .filter(msg => activeChannel === 'GLOBALNY' || msg.channel === activeChannel || msg.channel === 'SYSTEM')
                    .map((msg) => (
                      <div key={msg.id} className="animate-fade-in flex items-start gap-1.5">
                        
                        {/* ODZNACZENIA RANG DLA KANAŁÓW GRACZY */}
                        {msg.channel !== 'SYSTEM' && (
                          <span className={`font-black uppercase text-[8px] tracking-widest px-1.5 py-0.5 rounded-sm shrink-0 mt-0.5 ${
                            msg.role === 'ADMIN' ? 'bg-red-950 text-red-400 border border-red-900/40' : 'bg-[#1a1a24] text-gray-500 border border-[#23232c]'
                          }`}>
                            {msg.role === 'ADMIN' ? 'Inkwizytor' : 'Wojownik'}
                          </span>
                        )}

                        <div>
                          <span className={`font-bold mr-1.5 ${
                            msg.channel === 'HANDEL' ? 'text-amber-500' :
                            msg.channel === 'REKRUTACJA' ? 'text-purple-400' :
                            msg.channel === 'SYSTEM' ? 'text-gray-500 font-mono text-[10px]' : 
                            msg.role === 'ADMIN' ? 'text-[#c59b27]' : 'text-sky-400'
                          }`}>
                            [{msg.channel}] {msg.username ? `${msg.username}:` : ''}
                          </span>
                          <span className={msg.channel === 'SYSTEM' ? 'text-gray-500 italic' : msg.role === 'ADMIN' ? 'text-gray-100 font-medium' : 'text-gray-300'}>
                            {msg.text}
                          </span>
                        </div>
                      </div>
                    ))}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendChatMessage} className="mt-2.5 pt-2 border-t border-[#1c1916] flex gap-2">
                  <div className="bg-[#0b0b0d] px-2 py-1 border border-[#23232c] text-[10px] font-bold text-[#c59b27] flex items-center">
                    {activeChannel === 'SYSTEM' ? 'GLOBALNY' : activeChannel}
                  </div>
                  <input
                    type="text"
                    maxLength="120"
                    disabled={activeChannel === 'SYSTEM'}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={activeChannel === 'SYSTEM' ? 'Kanał systemowy jest zablokowany...' : 'Napisz wiadomość na czacie miejskim... [Max 120 znaków]'}
                    className="flex-1 bg-[#0b0b0d] border border-[#23232c] p-1.5 text-xs text-white focus:outline-none focus:border-[#c59b27] disabled:opacity-40"
                  />
                  <button type="submit" disabled={activeChannel === 'SYSTEM'} className="bg-[#201c18] hover:bg-[#c59b27] border border-[#3a3128] hover:text-black text-gray-300 px-4 py-1 text-xs font-bold uppercase transition disabled:hidden">
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