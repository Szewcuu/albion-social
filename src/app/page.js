'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { 
  Shield, 
  ShoppingBag, 
  Swords, 
  Hammer, 
  Users, 
  Calculator, 
  ArrowRight,
  Sparkles,
  Globe,
  Check
} from 'lucide-react'
import ModernHeader from '@/components/ModernHeader'
import ChatBox from '@/components/ChatBox'

export default function Home() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
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

  return (
    <div className="modern-shell min-h-screen pb-12">
      
      {/* HEADER */}
      <ModernHeader 
        user={user} 
        logout={logout} 
        notifications={notifications} 
        markAllAsRead={markAllAsRead} 
        loginWithDiscord={loginWithDiscord}
      />

      <main className="max-w-[1400px] mx-auto px-4 mt-6 space-y-8">
        
        {/* HERO SECTION */}
        <section className="modern-card p-6 sm:p-10 bg-gradient-to-r from-[#0d131a] via-[#0f172a] to-[#090c10] border-emerald-500/20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" /> Portal społeczności graczy Albion Online
              </div>

              <h1 className="text-3xl sm:text-5xl font-bold text-white tracking-tight leading-tight">
                Znajdź gildie, handluj bez prowizji i przeliczaj zysk z craftingu
              </h1>

              <p className="text-gray-300 text-sm sm:text-base max-w-2xl leading-relaxed">
                Platforma społecznościowa integrująca polskie gildie, wycenę rynku z Albion Data Project API, kalkulator marży oraz organizatora wypraw.
              </p>

              <div className="pt-2 flex flex-wrap gap-3">
                {!user ? (
                  <button onClick={loginWithDiscord} className="modern-btn-primary text-xs flex items-center gap-2">
                    Zaloguj przez Discord <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <Link href="/gildie" className="modern-btn-primary text-xs flex items-center gap-2">
                    <Shield className="w-4 h-4" /> Przeglądaj Gildie
                  </Link>
                )}
                
                <Link href="/kalkulator-craftingu" className="modern-btn-secondary text-xs flex items-center gap-2">
                  <Hammer className="w-4 h-4 text-emerald-400" /> Kalkulator Craftingu
                </Link>

                <Link href="/rynek" className="modern-btn-secondary text-xs flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-cyan-400" /> Rynek P2P
                </Link>
              </div>
            </div>

            {/* SERVER STATUS & STATS */}
            <div className="lg:col-span-4 bg-black/40 border border-white/10 p-5 rounded-2xl space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-gray-300 font-semibold flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-emerald-400" /> Serwery Albion
                </span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Działają
                </span>
              </div>

              <div className="space-y-2 font-mono text-[11px]">
                <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg">
                  <span className="text-gray-300">Europa (AMS)</span>
                  <span className="text-emerald-400 font-bold">24 ms</span>
                </div>
                <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg">
                  <span className="text-gray-300">Ameryka (NWA)</span>
                  <span className="text-emerald-400 font-bold">110 ms</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center pt-1 font-mono">
                <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                  <div className="text-gray-400 text-[10px]">Gildie</div>
                  <div className="text-base font-bold text-emerald-400 mt-0.5">{globalStats.guildsCount}</div>
                </div>

                <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                  <div className="text-gray-400 text-[10px]">Oferty Rynku</div>
                  <div className="text-base font-bold text-cyan-400 mt-0.5">{globalStats.marketOffersCount}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SIATKA MODUŁÓW BENTO */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight">
            Główne moduły serwisu
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            
            {/* MODUŁ 1: GILDIE */}
            <Link href="/gildie" className="modern-card md:col-span-2 p-6 flex flex-col justify-between min-h-[200px]">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                  <Shield className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full">
                  Baza Sojuszy &amp; ZvZ Inspector
                </span>
              </div>

              <div className="space-y-1.5 mt-4">
                <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition">
                  Rejestr Gildii &amp; Statystyki ZvZ
                </h3>
                <p className="text-gray-300 text-sm max-w-xl">
                  Baza polskich gildii w Albion Online z podglądem statystyk Kill Fame z bitew ZvZ oraz bezpośrednią rekrutacją.
                </p>
              </div>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs font-medium mt-4 text-gray-400">
                <span className="text-emerald-400 font-bold">{globalStats.guildsCount} zarejestrowanych gildii</span>
                <span>Otwórz &rarr;</span>
              </div>
            </Link>

            {/* MODUŁ 2: CRAFTING */}
            <Link href="/kalkulator-craftingu" className="modern-card p-6 flex flex-col justify-between min-h-[200px]">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                  <Hammer className="w-6 h-6" />
                </div>
                <span className="text-xs font-semibold text-emerald-400">Live API</span>
              </div>

              <div className="space-y-1 mt-3">
                <h3 className="text-lg font-bold text-white">
                  Kalkulator Craftingu
                </h3>
                <p className="text-xs text-gray-300">
                  Wyliczaj zysk netto z uwzględnieniem RRR % i opłat stanowisk w miastach.
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                <span className="text-emerald-400 font-semibold">Oblicz Zysk</span>
                <span>&rarr;</span>
              </div>
            </Link>

            {/* MODUŁ 3: RYNEK P2P */}
            <Link href="/rynek" className="modern-card p-6 flex flex-col justify-between min-h-[180px]">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-cyan-400">{globalStats.marketOffersCount} Ofert</span>
              </div>

              <div className="space-y-1 mt-3">
                <h3 className="text-lg font-bold text-white">
                  Rynek P2P
                </h3>
                <p className="text-xs text-gray-300">
                  Ogłoszenia handlowe bezpośrednio od graczy bez prowizji w grze.
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                <span className="text-cyan-400 font-semibold">Zobacz Oferty</span>
                <span>&rarr;</span>
              </div>
            </Link>

            {/* MODUŁ 4: BUILDY */}
            <Link href="/buildy" className="modern-card p-6 flex flex-col justify-between min-h-[180px]">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
                  <Swords className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-rose-400">Kreator Zestawów</span>
              </div>

              <div className="space-y-1 mt-3">
                <h3 className="text-lg font-bold text-white">
                  Kuźnia Buildów
                </h3>
                <p className="text-xs text-gray-300">
                  Twórz i oceniaj zestawy ekwipunku na PvP, ZvZ oraz PvE.
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                <span className="text-rose-400 font-semibold">Przeglądaj Buildy</span>
                <span>&rarr;</span>
              </div>
            </Link>

            {/* MODUŁ 5: WYPRAWY */}
            <Link href="/wyprawy" className="modern-card p-6 flex flex-col justify-between min-h-[180px]">
              <div className="flex justify-between items-start">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-amber-400">Party Finder</span>
              </div>

              <div className="space-y-1 mt-3">
                <h3 className="text-lg font-bold text-white">
                  Wyprawy &amp; Party
                </h3>
                <p className="text-xs text-gray-300">
                  Organizuj zbiórki rajdowe z weryfikacją wymagań IP.
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-400">
                <span className="text-amber-400 font-semibold">Dołącz do Zbiórki</span>
                <span>&rarr;</span>
              </div>
            </Link>

          </div>
        </section>

        {/* KALKULATOR & CZAT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          <div className="lg:col-span-6 space-y-6">
            <div className="modern-card p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex gap-3 text-xs font-semibold">
                  <button onClick={() => setRightTab('ECONOMY')} className={`pb-1 cursor-pointer transition ${rightTab === 'ECONOMY' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-gray-500'}`}>Kalkulator Marż</button>
                  {isAdmin && <button onClick={() => setRightTab('ADMIN')} className={`pb-1 cursor-pointer transition ${rightTab === 'ADMIN' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-rose-900'}`}>Panel Admina</button>}
                </div>
                <Calculator className="w-4 h-4 text-gray-400" />
              </div>

              {rightTab === 'ECONOMY' && (
                <form onSubmit={handleCalculateFlip} className="space-y-3.5 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-400 mb-1 text-[11px] font-medium">Cena Zakupu (Silver)</label>
                      <input 
                        type="number" 
                        required 
                        placeholder="np. 45000" 
                        value={buyPrice} 
                        onChange={e => setBuyPrice(e.target.value)} 
                        className="w-full p-2.5 text-xs outline-none" 
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1 text-[11px] font-medium">Cena Sprzedaży (Silver)</label>
                      <input 
                        type="number" 
                        required 
                        placeholder="np. 68000" 
                        value={sellPrice} 
                        onChange={e => setSellPrice(e.target.value)} 
                        className="w-full p-2.5 text-xs outline-none" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 text-[11px] font-medium">Podatek Rynku</label>
                    <select 
                      value={feeRate} 
                      onChange={e => setFeeRate(e.target.value)}
                      className="w-full p-2.5 text-xs outline-none cursor-pointer"
                    >
                      <option value="4">4% (z Premium i Orderem)</option>
                      <option value="8">8% (Standard bez Premium)</option>
                      <option value="10">10% (Pobór Opłat i Podatek)</option>
                    </select>
                  </div>

                  <button type="submit" className="modern-btn-primary w-full py-2.5 text-xs">
                    Oblicz Zysk Netto
                  </button>

                  {flipResult && (
                    <div className="mt-3 p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-1.5 font-mono text-xs">
                      <div className="flex justify-between text-gray-400">
                        <span>Podatek:</span>
                        <span className="text-rose-400">-{flipResult.taxAmount.toLocaleString('pl-PL')} Silver</span>
                      </div>
                      <div className="flex justify-between text-gray-200 border-t border-white/10 pt-1.5">
                        <span>Zysk Netto:</span>
                        <span className={`font-bold ${flipResult.netProfit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {flipResult.netProfit > 0 ? '+' : ''}{flipResult.netProfit.toLocaleString('pl-PL')} Silver
                        </span>
                      </div>
                      <div className="flex justify-between text-gray-200">
                        <span>ROI:</span>
                        <span className={`font-bold ${parseFloat(flipResult.margin) > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {flipResult.margin}%
                        </span>
                      </div>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>

          <div className="lg:col-span-6">
            <ChatBox user={user} />
          </div>

        </div>

      </main>
    </div>
  )
}
