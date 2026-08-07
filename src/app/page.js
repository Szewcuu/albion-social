'use client'

import { supabase } from '@/lib/supabase'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
  Coins
} from 'lucide-react'
import HyperHudHeader from '@/components/HyperHudHeader'
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
    <div className="hud-shell min-h-screen pb-12">
      
      {/* FLOATING HYPER HUD HEADER */}
      <HyperHudHeader 
        user={user} 
        logout={logout} 
        notifications={notifications} 
        markAllAsRead={markAllAsRead} 
      />

      <div className="max-w-[1580px] mx-auto px-4 mt-6 space-y-8">
        {!user ? (
          /* NIEZALOGOWANY HERO HUD 6.0 */
          <section className="hud-card p-8 sm:p-12 lg:p-16 border-amber-400/40 relative overflow-hidden">
            <Image src="/albion-social-hero.webp" alt="Hero" fill priority sizes="100vw" className="object-cover opacity-20" />
            <div className="relative z-10 max-w-3xl space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/40 text-amber-400 font-mono text-xs font-bold uppercase tracking-widest">
                <Sparkles className="w-4 h-4 text-amber-400" /> Wygodny Portal Społeczności 6.0
              </div>

              <h1 className="font-display text-4xl sm:text-6xl font-black text-white leading-tight">
                Polska Społeczność<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-400 to-orange-500">
                  Albion Online Command Hub
                </span>
              </h1>

              <p className="text-gray-300 text-base max-w-xl leading-relaxed">
                Rejestr gildii, wycena rynku w czasie rzeczywistym z Albion Data Project API, kalkulator craftingu i party finder.
              </p>

              <div className="pt-2">
                <button onClick={loginWithDiscord} className="hud-btn-primary flex items-center gap-3 text-sm">
                  Wejdź przez Discord <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        ) : (
          /* ZALOGOWANY HYPER HUD 6.0 DASHBOARD */
          <div className="space-y-8">
            
            {/* HERO HERO COMMAND CONSOLE */}
            <section className="hud-card p-6 sm:p-10 border-amber-400/40 relative overflow-hidden">
              <Image src="/albion-social-hero.webp" alt="Hero" fill priority sizes="100vw" className="object-cover opacity-15" />
              
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-8 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-xl bg-amber-400/10 border border-amber-400/40 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-4 h-4" /> Centrum Dowodzenia 6.0
                  </div>

                  <h2 className="font-display text-3xl sm:text-5xl font-black text-white leading-tight">
                    Witaj w Nowym Interfejsie HUD
                  </h2>

                  <p className="text-gray-300 text-sm sm:text-base max-w-xl">
                    Wszystkie podstrony i moduły zostały zsynchronizowane w nowym układzie Hyper-Gaming HUD.
                  </p>

                  <div className="pt-2 flex flex-wrap gap-3">
                    <Link href="/gildie" className="hud-btn-primary text-xs flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Gildie &amp; ZvZ
                    </Link>

                    <Link href="/kalkulator-craftingu" className="hud-btn-secondary text-xs flex items-center gap-2">
                      <Hammer className="w-4 h-4 text-amber-400" /> Kalkulator Craftingu
                    </Link>

                    <Link href="/rynek" className="hud-btn-secondary text-xs flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-sky-400" /> Rynek P2P
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-4 bg-black/70 border border-amber-400/30 p-5 rounded-2xl font-mono text-xs space-y-4 backdrop-blur-xl">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="text-amber-400 font-bold uppercase text-[11px] flex items-center gap-1.5">
                      <Globe className="w-4 h-4" /> Status Serwerów Albion
                    </span>
                    <span className="text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Online
                    </span>
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-white/5">
                      <span className="text-gray-300 font-bold">Europa (AMS)</span>
                      <span className="text-emerald-400 font-bold">24 ms</span>
                    </div>

                    <div className="flex items-center justify-between bg-black/40 p-2.5 rounded-xl border border-white/5">
                      <span className="text-gray-300 font-bold">Ameryka (NWA)</span>
                      <span className="text-emerald-400 font-bold">110 ms</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-[10px] pt-1">
                    <div className="bg-black/50 p-2 rounded-xl border border-white/10">
                      <div className="text-gray-400">Gildie w Bazie</div>
                      <div className="text-sm font-bold text-amber-400 mt-0.5">{globalStats.guildsCount}</div>
                    </div>

                    <div className="bg-black/50 p-2 rounded-xl border border-white/10">
                      <div className="text-gray-400">Oferty Rynku</div>
                      <div className="text-sm font-bold text-emerald-400 mt-0.5">{globalStats.marketOffersCount}</div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* BENTO SIATKA KAFELKÓW HYPER HUD 6.0 */}
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-display text-2xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" /> Wszystkie Moduły Portalu 6.0
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                {/* MODUŁ 1: GILDIE */}
                <Link href="/gildie" className="hud-card md:col-span-2 p-6 flex flex-col justify-between min-h-[220px]">
                  <div className="flex justify-between items-start">
                    <div className="p-3.5 bg-amber-400/15 border border-amber-400/40 text-amber-400 rounded-2xl">
                      <Shield className="w-7 h-7" />
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-3 py-1 rounded-full uppercase">
                      Rekrutacja &amp; ZvZ Inspector
                    </span>
                  </div>

                  <div className="space-y-2 mt-4">
                    <h4 className="font-display text-2xl font-bold text-white group-hover:text-amber-400 transition">
                      Rejestr Gildii &amp; Starcia ZvZ
                    </h4>
                    <p className="text-gray-300 text-sm max-w-xl">
                      Przeglądaj polskie gildie w Albion Online, sprawdzaj Kill Fame, wskaźniki K/D w starciach ZvZ oraz bezpośrednio aplikuj.
                    </p>
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono mt-4">
                    <span className="text-amber-400 font-bold">{globalStats.guildsCount} zarejestrowanych gildii</span>
                    <span className="text-gray-400 font-bold">Otwórz Moduł &rarr;</span>
                  </div>
                </Link>

                {/* MODUŁ 2: CRAFTING */}
                <Link href="/kalkulator-craftingu" className="hud-card p-6 flex flex-col justify-between min-h-[220px]">
                  <div className="flex justify-between items-start">
                    <div className="p-3.5 bg-amber-400/15 border border-amber-400/40 text-amber-400 rounded-2xl">
                      <Hammer className="w-7 h-7" />
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2.5 py-1 rounded-full uppercase">
                      Ceny API Live
                    </span>
                  </div>

                  <div className="space-y-1.5 mt-3">
                    <h4 className="font-display text-xl font-bold text-white">
                      Kalkulator Craftingu
                    </h4>
                    <p className="text-xs text-gray-300">
                      Wyliczaj zysk netto w Srebrze na surowcach z uwzględnieniem RRR % i cen z rynków królewskich.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                    <span className="text-amber-400 font-bold">Wycena Live</span>
                    <span className="text-gray-400">&rarr;</span>
                  </div>
                </Link>

                {/* MODUŁ 3: RYNEK P2P */}
                <Link href="/rynek" className="hud-card p-6 flex flex-col justify-between min-h-[200px]">
                  <div className="flex justify-between items-start">
                    <div className="p-3.5 bg-sky-500/15 border border-sky-500/40 text-sky-400 rounded-2xl">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-mono font-bold text-sky-400">{globalStats.marketOffersCount} Ofert</span>
                  </div>

                  <div className="space-y-1.5 mt-3">
                    <h4 className="font-display text-xl font-bold text-white">
                      Rynek P2P
                    </h4>
                    <p className="text-xs text-gray-300">
                      Kupuj i sprzedawaj wyposażenie bez podatków z podglądem okazjonalnych cen rynkowych.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                    <span className="text-sky-400 font-bold">Wystaw Ofertę</span>
                    <span className="text-gray-400">&rarr;</span>
                  </div>
                </Link>

                {/* MODUŁ 4: BUILDY */}
                <Link href="/buildy" className="hud-card p-6 flex flex-col justify-between min-h-[200px]">
                  <div className="flex justify-between items-start">
                    <div className="p-3.5 bg-rose-500/15 border border-rose-500/40 text-rose-400 rounded-2xl">
                      <Swords className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-mono font-bold text-rose-400">Kreator IP</span>
                  </div>

                  <div className="space-y-1.5 mt-3">
                    <h4 className="font-display text-xl font-bold text-white">
                      Kuźnia Buildów
                    </h4>
                    <p className="text-xs text-gray-300">
                      Twórz, zapisuj i udostępniaj zestawy ekwipunku na PvP, ZvZ i PvE.
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                    <span className="text-rose-400 font-bold">Przeglądaj Buildy</span>
                    <span className="text-gray-400">&rarr;</span>
                  </div>
                </Link>

                {/* MODUŁ 5: WYPRAWY */}
                <Link href="/wyprawy" className="hud-card p-6 flex flex-col justify-between min-h-[200px]">
                  <div className="flex justify-between items-start">
                    <div className="p-3.5 bg-purple-500/15 border border-purple-500/40 text-purple-400 rounded-2xl">
                      <Users className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-mono font-bold text-purple-400">Party Finder</span>
                  </div>

                  <div className="space-y-1.5 mt-3">
                    <h4 className="font-display text-xl font-bold text-white">
                      Wyprawy &amp; Party
                    </h4>
                    <p className="text-xs text-gray-300">
                      Zbiórki rajdowe z weryfikacją wymagań IP oraz powiadomieniami na Discordzie.
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
                <div className="hud-card p-6 sm:p-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex gap-4 font-mono text-xs font-bold uppercase">
                      <button onClick={() => setRightTab('ECONOMY')} className={`pb-1 cursor-pointer transition ${rightTab === 'ECONOMY' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-500'}`}>Kalkulator Marż</button>
                      {isAdmin && <button onClick={() => setRightTab('ADMIN')} className={`pb-1 cursor-pointer transition ${rightTab === 'ADMIN' ? 'text-rose-400 border-b-2 border-rose-500' : 'text-rose-900'}`}>Panel Admina</button>}
                    </div>
                    <Calculator className="w-4 h-4 text-gray-400" />
                  </div>

                  {rightTab === 'ECONOMY' && (
                    <form onSubmit={handleCalculateFlip} className="space-y-4 text-xs font-mono">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-gray-400 mb-1 text-[10px] uppercase">Cena Zakupu (Silver)</label>
                          <input 
                            type="number" 
                            required 
                            placeholder="np. 45000" 
                            value={buyPrice} 
                            onChange={e => setBuyPrice(e.target.value)} 
                            className="w-full p-3 text-xs outline-none" 
                          />
                        </div>

                        <div>
                          <label className="block text-gray-400 mb-1 text-[10px] uppercase">Cena Sprzedaży (Silver)</label>
                          <input 
                            type="number" 
                            required 
                            placeholder="np. 68000" 
                            value={sellPrice} 
                            onChange={e => setSellPrice(e.target.value)} 
                            className="w-full p-3 text-xs outline-none" 
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-gray-400 mb-1 text-[10px] uppercase">Podatek Rynku</label>
                        <select 
                          value={feeRate} 
                          onChange={e => setFeeRate(e.target.value)}
                          className="w-full p-3 text-xs outline-none cursor-pointer"
                        >
                          <option value="4">4% (z Premium i Wystawieniem Orderu)</option>
                          <option value="8">8% (Standard bez Premium)</option>
                          <option value="10">10% (Pobór Opłat i Podatek Bezpośredni)</option>
                        </select>
                      </div>

                      <button type="submit" className="hud-btn-primary w-full py-3 text-xs uppercase tracking-wider">
                        Oblicz Marżę Zysku
                      </button>

                      {flipResult && (
                        <div className="mt-4 p-4 rounded-2xl bg-black/60 border border-amber-400/30 space-y-2 font-mono text-xs">
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
                            <span className={`font-bold ${parseFloat(flipResult.margin) > 0 ? 'text-amber-400' : 'text-rose-400'}`}>
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
