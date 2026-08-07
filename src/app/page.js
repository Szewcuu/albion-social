'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState, memo, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { 
  Shield, 
  ShoppingBag, 
  Swords, 
  Hammer, 
  Users, 
  Clock, 
  Calculator, 
  Bell, 
  Check, 
  ArrowRight,
  Sparkles,
  TrendingUp,
  Globe,
  Plus
} from 'lucide-react'
import RebornSidebar from '@/components/RebornSidebar'
import ChatBox from '@/components/ChatBox'

// ZEGAR UTC
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
    <span className="font-mono text-xs font-bold text-amber-400 tracking-wider flex items-center gap-2">
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
  })

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
  }

  const fetchGlobalStats = useCallback(async () => {
    const [{ count: gCount }, { count: mCount }] = await Promise.all([
      supabase.from('guilds').select('*', { count: 'exact', head: true }),
      supabase.from('market_items').select('*', { count: 'exact', head: true })
    ])
    setGlobalStats({
      guildsCount: gCount || 0,
      marketOffersCount: mCount || 0,
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
    }, 0)

    return () => clearTimeout(timer)
  }, [fetchGlobalStats, fetchNotifications])

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
    <div className="reborn-shell flex min-h-screen text-[#f1f5f9]">
      
      {/* BOCZNY PASEK NAWIGACJI (DOCK 5.0) */}
      <RebornSidebar user={user} logout={logout} />

      {/* GLÓWNA TREŚĆ STRONY */}
      <div className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto">
        
        {/* GÓRNY PASEK TAKTYCZNY */}
        <header className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#0a0d14]/90 border border-white/10 p-4 rounded-2xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold rounded-lg uppercase">
              Albion Social 5.0 Reborn
            </span>
            <span className="text-gray-400 text-xs font-mono hidden md:inline">
              Polska Społeczność Graczy Albion Online
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-[#05070a] border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <ServerClock />
            </div>

            {user && (
              <div className="relative">
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="p-2.5 bg-[#05070a] border border-white/10 hover:border-amber-400/50 text-amber-400 rounded-xl relative transition cursor-pointer"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[9px] font-mono font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-3 w-80 bg-[#0a0d14]/95 border border-amber-400/40 rounded-2xl shadow-2xl p-4 z-50 space-y-3 backdrop-blur-xl">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <span className="text-xs font-mono font-bold text-amber-400 uppercase">Powiadomienia</span>
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
                          <div key={n.id} className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-gray-200">
                            <div className="flex justify-between items-start font-bold">
                              <span>{n.title}</span>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {!user ? (
          /* WITAJ (NIEZALOGOWANY) HERO REBORN */
          <section className="relative overflow-hidden rounded-3xl border border-amber-500/30 p-8 sm:p-12 lg:p-16 bg-gradient-to-r from-[#0d0910] via-[#080509] to-[#040205] shadow-2xl">
            <Image src="/albion-social-hero.webp" alt="Hero" fill priority sizes="100vw" className="object-cover opacity-25" />
            <div className="relative z-10 max-w-2xl space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold uppercase">
                <Sparkles className="w-4 h-4 text-amber-400" /> Dołącz do Polskiej Społeczności
              </div>

              <h1 className="font-display text-4xl sm:text-6xl font-black text-white leading-tight">
                Zbuduj Legendę.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500">
                  Gildie, Handel i Crafting.
                </span>
              </h1>

              <p className="text-gray-300 text-base leading-relaxed">
                Narzędzie dla każdego gracza i dowódcy Albion Online: rejestr gildii, wycena cen rynkowych z API w czasie rzeczywistym oraz kalkulatory zysku rzemieślniczego.
              </p>

              <div className="pt-2">
                <button onClick={loginWithDiscord} className="reborn-btn-primary inline-flex items-center gap-3 text-sm">
                  Wejdź przez Discord <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        ) : (
          /* BENTO DASHBOARD 5.0 REBORN */
          <div className="space-y-8">
            
            {/* HERO HERO BANNER */}
            <section className="relative overflow-hidden rounded-3xl border border-amber-500/30 p-6 sm:p-8 lg:p-10 bg-gradient-to-r from-[#0d0a12] via-[#09060b] to-[#040205] shadow-2xl">
              <Image src="/albion-social-hero.webp" alt="Hero" fill priority sizes="100vw" className="object-cover opacity-20" />
              
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                <div className="lg:col-span-8 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-bold uppercase">
                    <Sparkles className="w-4 h-4" /> Centrum Dowodzenia Gracza
                  </div>

                  <h2 className="font-display text-3xl sm:text-5xl font-black text-white leading-tight">
                    Wybierz Swój Cel Bitewny
                  </h2>

                  <p className="text-gray-300 text-sm sm:text-base max-w-xl">
                    Wszystkie narzędzia gildyjne, kalkulatory ekonomiczne i wyprawy w jednym miejscu.
                  </p>

                  <div className="pt-2 flex flex-wrap gap-3">
                    <Link href="/gildie" className="reborn-btn-primary text-xs flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Rejestr Gildii &amp; ZvZ
                    </Link>

                    <Link href="/kalkulator-craftingu" className="reborn-btn-secondary text-xs flex items-center gap-2">
                      <Hammer className="w-4 h-4 text-amber-400" /> Kalkulator Craftingu
                    </Link>

                    <Link href="/rynek" className="reborn-btn-secondary text-xs flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-sky-400" /> Rynek P2P
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-4 bg-black/60 border border-white/10 p-5 rounded-2xl font-mono text-xs space-y-3 backdrop-blur-md">
                  <div className="text-amber-400 font-bold uppercase text-[11px] flex items-center justify-between border-b border-white/10 pb-2">
                    <span>Statystyki Portalu</span>
                    <span className="text-emerald-400 text-[10px]">Online</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-[#05070a] p-3 rounded-xl border border-white/5">
                      <div className="text-gray-400 text-[10px] uppercase">Gildie w Bazie</div>
                      <div className="text-base font-bold text-amber-300 mt-0.5">{globalStats.guildsCount}</div>
                    </div>

                    <div className="bg-[#05070a] p-3 rounded-xl border border-white/5">
                      <div className="text-gray-400 text-[10px] uppercase">Oferty Rynku</div>
                      <div className="text-base font-bold text-emerald-400 mt-0.5">{globalStats.marketOffersCount}</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* SIATKA MODUŁÓW BENTO 5.0 REBORN */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-display text-2xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" /> Moduły Dedykowane 5.0
                </h3>
                <span className="text-xs text-gray-400 font-mono">Dla Gracza i Gildii</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                
                {/* MODUŁ 1: GILDIE (LARGE 2-COL) */}
                <Link href="/gildie" className="reborn-card md:col-span-2 p-6 flex flex-col justify-between min-h-[220px]">
                  <div className="flex justify-between items-start">
                    <div className="p-3.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-2xl">
                      <Shield className="w-7 h-7" />
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full uppercase">
                      Rekrutacja &amp; ZvZ Inspector
                    </span>
                  </div>

                  <div className="space-y-2 mt-4">
                    <h4 className="font-display text-2xl font-bold text-white group-hover:text-amber-300">
                      Rejestr Gildii &amp; Starcia ZvZ
                    </h4>
                    <p className="text-gray-300 text-sm max-w-xl">
                      Przeglądaj polskie gildie w Albion Online, sprawdzaj statystyki K/D z bitew ZvZ i bezpośrednio aplikuj.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono mt-4">
                    <span className="text-amber-400 font-bold">{globalStats.guildsCount} zarejestrowanych gildii</span>
                    <span className="text-gray-400">Otwórz Moduł &rarr;</span>
                  </div>
                </Link>

                {/* MODUŁ 2: CRAFTING */}
                <Link href="/kalkulator-craftingu" className="reborn-card p-6 flex flex-col justify-between min-h-[220px]">
                  <div className="flex justify-between items-start">
                    <div className="p-3.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-2xl">
                      <Hammer className="w-7 h-7" />
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full uppercase">
                      Live Wycena
                    </span>
                  </div>

                  <div className="space-y-1.5 mt-3">
                    <h4 className="font-display text-xl font-bold text-white">
                      Kalkulator Craftingu
                    </h4>
                    <p className="text-xs text-gray-300">
                      Wyliczaj zysk netto w Srebrze na surowcach z uwzględnieniem RRR % i cen z miast królewskich.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                    <span className="text-amber-400 font-bold">Ceny API na żywo</span>
                    <span className="text-gray-400">&rarr;</span>
                  </div>
                </Link>

                {/* MODUŁ 3: RYNEK P2P */}
                <Link href="/rynek" className="reborn-card p-6 flex flex-col justify-between min-h-[200px]">
                  <div className="flex justify-between items-start">
                    <div className="p-3.5 bg-sky-500/15 border border-sky-500/30 text-sky-400 rounded-2xl">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-mono font-bold text-sky-400">{globalStats.marketOffersCount} Ofert</span>
                  </div>

                  <div className="space-y-1.5 mt-3">
                    <h4 className="font-display text-xl font-bold text-white">
                      Rynek P2P
                    </h4>
                    <p className="text-xs text-gray-300">
                      Handel bezpośredni między graczami bez prowizji w grze z live wyceną rynkową.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                    <span className="text-sky-400 font-bold">Wystaw Ofertę</span>
                    <span className="text-gray-400">&rarr;</span>
                  </div>
                </Link>

                {/* MODUŁ 4: BUILDY */}
                <Link href="/buildy" className="reborn-card p-6 flex flex-col justify-between min-h-[200px]">
                  <div className="flex justify-between items-start">
                    <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 text-rose-400 rounded-2xl">
                      <Swords className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-mono font-bold text-rose-400">Kreator IP</span>
                  </div>

                  <div className="space-y-1.5 mt-3">
                    <h4 className="font-display text-xl font-bold text-white">
                      Kuźnia Buildów
                    </h4>
                    <p className="text-xs text-gray-300">
                      Twórz, zapisuj i oceniaj zestawy ekwipunku na PvP, ZvZ i PvE.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                    <span className="text-rose-400 font-bold">Przeglądaj Buildy</span>
                    <span className="text-gray-400">&rarr;</span>
                  </div>
                </Link>

                {/* MODUŁ 5: WYPRAWY */}
                <Link href="/wyprawy" className="reborn-card p-6 flex flex-col justify-between min-h-[200px]">
                  <div className="flex justify-between items-start">
                    <div className="p-3.5 bg-purple-500/15 border border-purple-500/30 text-purple-400 rounded-2xl">
                      <Users className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-mono font-bold text-purple-400">Party Finder</span>
                  </div>

                  <div className="space-y-1.5 mt-3">
                    <h4 className="font-display text-xl font-bold text-white">
                      Wyprawy &amp; Party
                    </h4>
                    <p className="text-xs text-gray-300">
                      Organizuj zbiórki rajdowe z weryfikacją IP oraz powiadomieniami na Discordzie.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                    <span className="text-purple-400 font-bold">Dołącz do Rajdu</span>
                    <span className="text-gray-400">&rarr;</span>
                  </div>
                </Link>

              </div>
            </section>

            {/* SEKCJA KALKULATOR & CZAT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* LEWA KOLUMNA: KALKULATOR FLIPÓW */}
              <div className="lg:col-span-6 space-y-6">
                <div className="reborn-card p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex gap-4 font-mono text-xs font-bold uppercase">
                      <button onClick={() => setRightTab('ECONOMY')} className={`pb-1 cursor-pointer transition ${rightTab === 'ECONOMY' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-500'}`}>Kalkulator Marż</button>
                      {isAdmin && <button onClick={() => setRightTab('ADMIN')} className={`pb-1 cursor-pointer transition ${rightTab === 'ADMIN' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-rose-900'}`}>Panel Admina</button>}
                    </div>
                    <Calculator className="w-4 h-4 text-gray-400" />
                  </div>

                  {rightTab === 'ECONOMY' && (
                    <form onSubmit={handleCalculateFlip} className="space-y-4 text-xs">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-gray-400 mb-1 font-mono text-[10px] uppercase">Cena Zakupu (Silver)</label>
                          <input 
                            type="number" 
                            required 
                            placeholder="np. 45000" 
                            value={buyPrice} 
                            onChange={e => setBuyPrice(e.target.value)} 
                            className="w-full p-3 font-mono text-xs outline-none" 
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
                            className="w-full p-3 font-mono text-xs outline-none" 
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-gray-400 mb-1 font-mono text-[10px] uppercase">Podatek Rynku</label>
                        <select 
                          value={feeRate} 
                          onChange={e => setFeeRate(e.target.value)}
                          className="w-full p-3 font-mono text-xs outline-none cursor-pointer"
                        >
                          <option value="4">4% (z Premium i Wystawieniem Orderu)</option>
                          <option value="8">8% (Standard bez Premium)</option>
                          <option value="10">10% (Pobór Opłat i Podatek Bezpośredni)</option>
                        </select>
                      </div>

                      <button type="submit" className="reborn-btn-primary w-full py-3 text-xs uppercase tracking-wider">
                        Oblicz Marżę Zysku
                      </button>

                      {flipResult && (
                        <div className="mt-4 p-4 rounded-2xl bg-[#05070a] border border-amber-500/30 space-y-2 font-mono text-xs">
                          <div className="flex justify-between text-gray-400">
                            <span>Zapłacony Podatek:</span>
                            <span className="text-rose-400 font-bold">-{flipResult.taxAmount.toLocaleString('pl-PL')} Silver</span>
                          </div>
                          <div className="flex justify-between text-gray-200 border-t border-white/10 pt-2">
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

              {/* PRAWA KOLUMNA: CZAT SPOŁECZNOŚCIOWY */}
              <div className="lg:col-span-6">
                <ChatBox user={user} />
              </div>

            </div>

          </div>
        )}
      </div>
    </div>
  )
}
