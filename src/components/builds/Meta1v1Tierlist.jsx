'use client'
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Swords, Shield, Search, Flame, Award, TrendingUp, ChevronRight, Zap, RefreshCw, AlertCircle, Sparkles } from 'lucide-react'
import { itemImageUrl } from '@/lib/buildSlots'

const TIER_COLORS = {
  'S+': { badge: 'border-amber-400/50 bg-amber-500/15 text-amber-300', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)] border-amber-400/30' },
  'S': { badge: 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300', glow: 'shadow-[0_0_15px_rgba(34,197,94,0.12)] border-emerald-400/30' },
  'A': { badge: 'border-sky-400/50 bg-sky-500/15 text-sky-300', glow: 'border-sky-400/30' },
  'B': { badge: 'border-violet-400/50 bg-violet-500/15 text-violet-300', glow: 'border-violet-400/30' },
  'C': { badge: 'border-gray-500/50 bg-gray-500/15 text-gray-300', glow: 'border-gray-500/30' },
}

function MetaItemIcon({ itemId, name, size }) {
  return <img src={itemImageUrl(itemId, 1, size)} alt="" title={name || itemId} width={size} height={size} loading="lazy" decoding="async" className="albion-item-image" />
}

export default function Meta1v1Tierlist() {
  const [metaWeapons, setMetaWeapons] = useState([])
  const [metadata, setMetadata] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTier, setSelectedTier] = useState('ALL')
  const [activeDetailWeapon, setActiveDetailWeapon] = useState(null)

  useEffect(() => {
    let isMounted = true

    fetch('/api/albion/meta')
      .then(async res => {
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.error || 'Nie udało się pobrać danych 1v1 Meta.')
        return payload
      })
      .then(resData => {
        if (!isMounted) return
        if (resData.data) {
          setMetaWeapons(resData.data)
          setMetadata(resData.meta || null)
        } else {
          setError('Nie udało się pobrać danych 1v1 Meta.')
        }
      })
      .catch((requestError) => {
        if (isMounted) setError(requestError.message || 'Błąd połączenia z API 1v1 Meta.')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const filteredWeapons = useMemo(() => {
    return metaWeapons.filter(w => {
      const matchesSearch = !searchTerm.trim() || 
        w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        w.playstyle.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesTier = selectedTier === 'ALL' || w.tier === selectedTier
      return matchesSearch && matchesTier
    })
  }, [metaWeapons, searchTerm, selectedTier])

  const groupedByTier = useMemo(() => {
    const tiers = ['S+', 'S', 'A', 'B', 'C']
    const result = {}
    tiers.forEach(t => {
      result[t] = filteredWeapons.filter(w => w.tier === t)
    })
    return result
  }, [filteredWeapons])

  return (
    <div className="space-y-6 animate-fade-in">
      {/* NAGŁÓWEK SEKCJII META 1V1 */}
      <div className="panel p-6 border-amber-400/30 bg-amber-950/15 rounded-3xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-300">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="badge badge-amber font-mono text-[9px] uppercase font-bold">Dane obserwacyjne</span>
                <span className="text-[10px] text-gray-400 font-mono">Publiczne pojedynki solo · wszystkie serwery</span>
              </div>
              <h2 className="font-display text-2xl font-black text-white mt-1">Tierlista Uzbrojenia 1v1</h2>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-amber-300 bg-black/40 border border-white/10 px-3.5 py-2 rounded-xl">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Gameinfo API — <strong>odświeżanie co 5 min</strong></span>
          </div>
        </div>

        <div className="rounded-xl border border-amber-400/25 bg-amber-400/8 px-4 py-3 text-[11px] leading-5 text-amber-100">
          {metadata?.methodology || 'Ranking jest obliczany z najnowszych publicznych zdarzeń solo zwracanych przez regionalne Gameinfo API.'}
          {metadata?.availableRegions?.length > 0 && <span className="mt-2 block text-amber-200/70">Źródła: {metadata.availableRegions.join(', ')} · {metadata.fetchedEvents || 0} zdarzeń · {metadata.validDuels || 0} poprawnych pojedynków.</span>}
          {metadata?.unavailableRegions?.length > 0 && <span className="mt-1 block text-rose-300">Chwilowo niedostępne regiony: {metadata.unavailableRegions.join(', ')}.</span>}
          {metadata?.failedRequests > 0 && <span className="mt-1 block text-rose-300">Ranking jest częściowy: nie pobrano {metadata.failedRequests} z {metadata.requestedPages} porcji danych.</span>}
        </div>

        {/* WYSZUKIWARKA I FILTRY TIERÓW */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono text-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Szukaj broni lub stylu gry (np. Battleaxe, Dagger, Curse)..."
              className="w-full bg-[#070305] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-amber-400/60"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'S+', 'S', 'A', 'B', 'C'].map(tierKey => (
              <button
                key={tierKey}
                onClick={() => setSelectedTier(tierKey)}
                className={`px-3 py-2 rounded-xl font-bold uppercase transition text-xs whitespace-nowrap cursor-pointer ${
                  selectedTier === tierKey
                    ? 'bg-amber-500/20 border border-amber-400 text-amber-300 shadow-md'
                    : 'bg-black/40 border border-white/8 text-gray-400 hover:text-white'
                }`}
              >
                {tierKey === 'ALL' ? 'Wszystkie tiery' : `Tier ${tierKey}`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RENDEROWANIE TIERÓW */}
      {loading ? (
        <div className="panel p-16 text-center text-xs font-mono text-gray-400 space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400" />
          <p>Analizowanie najnowszych pojedynków z regionalnego Gameinfo API...</p>
        </div>
      ) : error ? (
        <div className="panel p-8 text-center text-xs font-mono text-rose-300 space-y-2 border-rose-500/30">
          <AlertCircle className="w-6 h-6 mx-auto text-rose-400" />
          <p>{error}</p>
        </div>
      ) : metaWeapons.length === 0 ? (
        <div className="panel p-10 text-center text-xs font-mono text-gray-300 space-y-2 border-amber-500/20">
          <AlertCircle className="w-6 h-6 mx-auto text-amber-400" />
          <p>Próbka nie zawiera jeszcze wystarczającej liczby pojedynków dla wiarygodnego rankingu.</p>
          <p className="text-[10px] text-gray-500">Nie pokazujemy danych zastępczych ani ręcznie wpisanych wyników.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {['S+', 'S', 'A', 'B', 'C'].map(tierName => {
            const list = groupedByTier[tierName] || []
            if (!list.length && selectedTier !== 'ALL' && selectedTier !== tierName) return null
            if (!list.length) return null

            const colors = TIER_COLORS[tierName] || TIER_COLORS['B']

            return (
              <section key={tierName} className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className={`px-3.5 py-1 rounded-xl border text-sm font-black font-mono tracking-wider ${colors.badge}`}>
                    TIER {tierName}
                  </span>
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-[10px] font-mono text-gray-400">{list.length} broni w tierze</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {list.map(weapon => (
                    <article
                      key={weapon.id}
                      className={`panel p-5 space-y-4 relative transition hover:border-amber-400/40 cursor-pointer ${colors.glow}`}
                      onClick={() => setActiveDetailWeapon(weapon)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3.5">
                          <div className="w-14 h-14 rounded-2xl bg-black/60 border border-amber-400/30 p-1 flex items-center justify-center shrink-0 overflow-hidden relative">
                            <MetaItemIcon itemId={weapon.weaponId} name={weapon.name} size={52} />
                          </div>

                          <div>
                            <h3 className="font-display text-base font-bold text-white group-hover:text-amber-300">
                              {weapon.name}
                            </h3>
                            <p className="text-[10px] font-mono text-gray-400 mt-0.5">{weapon.role}</p>
                          </div>
                        </div>

                        <div className="text-right font-mono shrink-0">
                          <div className="text-xs font-black text-emerald-400">{weapon.score}% wynik ważony</div>
                          <div className="text-[10px] text-gray-400">{weapon.matches} wystąpień · {weapon.popularity}% próby</div>
                        </div>
                      </div>

                      {/* OPIS STYLU GRY */}
                      <p className="text-xs text-gray-300 leading-relaxed font-sans line-clamp-2">
                        {weapon.playstyle}
                      </p>

                      {/* RECOMMENDED EQUIPMENT PREVIEW */}
                      {weapon.bestBuild && (
                        <div className="pt-3 border-t border-white/8 flex items-center justify-between font-mono text-[10px]">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400 uppercase text-[9px]">Najczęstszy zwycięski zestaw:</span>
                            <div className="flex items-center gap-1">
                              {[weapon.bestBuild.head, weapon.bestBuild.armor, weapon.bestBuild.shoes, weapon.bestBuild.cape]
                                .filter(Boolean)
                                .map((itemCode, i) => (
                                  <div key={i} className="w-6 h-6 rounded-md bg-black/50 border border-white/10 p-0.5 overflow-visible">
                                    <MetaItemIcon itemId={itemCode} size={20} />
                                  </div>
                                ))}
                            </div>
                          </div>

                          <span className="text-amber-300 font-bold flex items-center gap-1">
                            Szczegóły <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* DETAIL MODAL FOR SELECTED WEAPON */}
      {activeDetailWeapon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 animate-fade-in">
          <div className="panel w-full max-w-xl p-6 space-y-5 border-amber-400/40 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-black/70 border border-amber-400/40 p-1 flex items-center justify-center shrink-0">
                  <MetaItemIcon itemId={activeDetailWeapon.weaponId} name={activeDetailWeapon.name} size={60} />
                </div>
                <div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${TIER_COLORS[activeDetailWeapon.tier]?.badge}`}>
                    TIER {activeDetailWeapon.tier}
                  </span>
                  <h3 className="font-display text-xl font-bold text-white mt-1">{activeDetailWeapon.name}</h3>
                  <p className="text-xs font-mono text-amber-300">{activeDetailWeapon.role}</p>
                </div>
              </div>

              <button
                onClick={() => setActiveDetailWeapon(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* STATS BAR */}
            <div className="grid grid-cols-3 gap-3 font-mono text-xs text-center">
              <div className="p-3 rounded-2xl bg-black/40 border border-white/8">
                <span className="text-[9px] text-gray-400 uppercase block">Skuteczność surowa</span>
                <span className="text-lg font-bold text-emerald-400">{activeDetailWeapon.winrate}%</span>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 border border-white/8">
                <span className="text-[9px] text-gray-400 uppercase block">Wielkość próby</span>
                <span className="text-lg font-bold text-sky-300">{activeDetailWeapon.matches}</span>
              </div>
              <div className="p-3 rounded-2xl bg-black/40 border border-white/8">
                <span className="text-[9px] text-gray-400 uppercase block">Średnie IP</span>
                <span className="text-lg font-bold text-amber-300">{activeDetailWeapon.avgIp || '—'}</span>
              </div>
            </div>

            {/* STYL GRY */}
            <div className="space-y-1.5 font-sans">
              <h4 className="text-xs font-mono font-bold text-amber-400 uppercase">Analiza Taktyczna & Styl Gry:</h4>
              <p className="text-xs text-gray-200 leading-relaxed bg-black/30 p-3.5 rounded-2xl border border-white/5">
                {activeDetailWeapon.playstyle}
              </p>
            </div>

            {/* PEŁNY ZESTAW EKWIPUNKU */}
            {activeDetailWeapon.bestBuild && (
              <div className="space-y-2 font-mono">
                <h4 className="text-xs font-bold text-amber-400 uppercase">Najczęstszy zwycięski zestaw:</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/8 flex items-center gap-2.5">
                    <MetaItemIcon itemId={activeDetailWeapon.bestBuild.head} name={activeDetailWeapon.bestBuild.headName} size={32} />
                    <div><span className="text-[9px] text-gray-400 block uppercase">Głowa</span><span className="text-xs font-bold text-white">{activeDetailWeapon.bestBuild.headName}</span></div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/8 flex items-center gap-2.5">
                    <MetaItemIcon itemId={activeDetailWeapon.bestBuild.armor} name={activeDetailWeapon.bestBuild.armorName} size={32} />
                    <div><span className="text-[9px] text-gray-400 block uppercase">Klatka</span><span className="text-xs font-bold text-white">{activeDetailWeapon.bestBuild.armorName}</span></div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/8 flex items-center gap-2.5">
                    <MetaItemIcon itemId={activeDetailWeapon.bestBuild.shoes} name={activeDetailWeapon.bestBuild.shoesName} size={32} />
                    <div><span className="text-[9px] text-gray-400 block uppercase">Buty</span><span className="text-xs font-bold text-white">{activeDetailWeapon.bestBuild.shoesName}</span></div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/8 flex items-center gap-2.5">
                    <MetaItemIcon itemId={activeDetailWeapon.bestBuild.cape} name={activeDetailWeapon.bestBuild.capeName} size={32} />
                    <div><span className="text-[9px] text-gray-400 block uppercase">Peleryna</span><span className="text-xs font-bold text-white">{activeDetailWeapon.bestBuild.capeName}</span></div>
                  </div>
                </div>
              </div>
            )}

            {/* COUNTER MATCHUPS */}
            <div className="grid grid-cols-2 gap-3 font-mono text-xs">
              <div className="p-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-1">
                <span className="text-emerald-400 font-bold uppercase text-[9px] block">Najczęściej pokonuje:</span>
                <p className="text-emerald-200 text-[11px]">{activeDetailWeapon.strongAgainst.join(', ') || 'Brak wystarczającej próbki'}</p>
              </div>
              <div className="p-3 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-1">
                <span className="text-rose-400 font-bold uppercase text-[9px] block">Najczęściej przegrywa z:</span>
                <p className="text-rose-200 text-[11px]">{activeDetailWeapon.weakAgainst.join(', ') || 'Brak wystarczającej próbki'}</p>
              </div>
            </div>

            {/* ACTION BUTTON */}
            <Link
              href="/buildy/create"
              onClick={() => setActiveDetailWeapon(null)}
              className="btn btn-primary w-full py-3 flex items-center justify-center gap-2 font-mono text-xs uppercase font-bold"
            >
              <Zap className="w-4 h-4" /> Stwórz Własny Build z Tą Bronią
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
