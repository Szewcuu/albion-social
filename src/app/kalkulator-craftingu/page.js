'use client'

import { useState, useEffect, useCallback } from 'react'
import { Hammer, Sparkles, TrendingUp, TrendingDown, Coins, Percent, Zap, LoaderCircle, AlertCircle, RefreshCw } from 'lucide-react'
import HyperHudHeader from '@/components/HyperHudHeader'
import PortalSubpageHeader from '@/components/PortalSubpageHeader'

const RESOURCES = [
  { id: 'CLOTH', label: 'Tkanina (Cloth)', rawId: 'FIBER' },
  { id: 'LEATHER', label: 'Skóra (Leather)', rawId: 'HIDE' },
  { id: 'METALBAR', label: 'Metal (Ingot)', rawId: 'ORE' },
  { id: 'PLANKS', label: 'Drewno (Planks)', rawId: 'WOOD' },
  { id: 'STONEBLOCK', label: 'Kamień (Stone Block)', rawId: 'ROCK' },
]

const TIERS = [
  { level: 'T4', label: 'Tier 4' },
  { level: 'T5', label: 'Tier 5' },
  { level: 'T6', label: 'Tier 6' },
  { level: 'T7', label: 'Tier 7' },
  { level: 'T8', label: 'Tier 8' },
]

const ENCHANTS = [
  { level: '0', label: '@0 (Zwykły)' },
  { level: '1', label: '@1 (Uncommon)' },
  { level: '2', label: '@2 (Rare)' },
  { level: '3', label: '@3 (Exceptional)' },
  { level: '4', label: '@4 (Pristine)' },
]

export default function CraftingCalculatorPage() {
  const [resourceType, setResourceType] = useState('PLANKS')
  const [tier, setTier] = useState('T5')
  const [enchant, setEnchant] = useState('0')
  const [server, setServer] = useState('Europa')
  const [rrr, setRrr] = useState(36.7) // RRR %
  const [stationTax, setStationTax] = useState(500) // Tax per 100 nutrition
  const [quantity, setQuantity] = useState(100)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [priceData, setPriceData] = useState(null)

  const getItemId = useCallback(() => {
    const enc = enchant !== '0' ? `_LEVEL${enchant}@${enchant}` : ''
    return `${tier}_${resourceType}${enc}`
  }, [tier, resourceType, enchant])

  const fetchPrices = useCallback(async () => {
    setLoading(true)
    setError(null)
    const itemId = getItemId()
    const regionKey = server.toLowerCase().includes('ameryka') ? 'america' : server.toLowerCase().includes('azja') ? 'asia' : 'europe'

    try {
      let rawPrices = []
      try {
        const res = await fetch(`/api/prices?mode=current&items=${encodeURIComponent(itemId)}&region=${regionKey}&cities=Caerleon,Martlock,Lymhurst,Bridgewatch,Fort%20Sterling,Thetford,Brecilien`)
        if (res.ok) {
          const data = await res.json()
          rawPrices = data.data || []
        }
      } catch {
        rawPrices = []
      }

      // Fallback pobierający dane bezpośrednio w przeglądarce jeśli serwer pośredniczący zasygnalizuje błąd
      if (!rawPrices || rawPrices.length === 0) {
        const host = regionKey === 'america' ? 'west' : regionKey === 'asia' ? 'east' : 'europe'
        const directRes = await fetch(`https://${host}.albion-online-data.com/api/v2/stats/prices/${encodeURIComponent(itemId)}.json?locations=Caerleon,Martlock,Lymhurst,Bridgewatch,FortSterling,Thetford,Brecilien`)
        if (directRes.ok) {
          rawPrices = await directRes.json()
        }
      }

      const validPrices = (rawPrices || []).filter(p => p.sell_price_min > 0)
      if (validPrices.length === 0) {
        setError(`Brak aktywnych danych cenowych dla przedmiotu ${itemId} na serwerze ${server}. (Cena nie została jeszcze zeskanowana przez graczy)`)
        setPriceData(null)
      } else {
        validPrices.sort((a, b) => a.sell_price_min - b.sell_price_min)
        const cheapest = validPrices[0]
        const avg = Math.round(validPrices.reduce((sum, p) => sum + p.sell_price_min, 0) / validPrices.length)

        setPriceData({
          cheapestCity: cheapest.city,
          minPrice: cheapest.sell_price_min,
          avgPrice: avg,
        })
      }
    } catch (err) {
      setError(err.message || 'Błąd pobierania cen.')
      setPriceData(null)
    } finally {
      setLoading(false)
    }
  }, [getItemId, server])

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPrices()
    }, 0)
    return () => clearTimeout(timer)
  }, [fetchPrices])

  // Przeliczenia zysku z uwzględnieniem RRR
  const unitPrice = priceData?.minPrice || 0
  const rawMaterialEstCost = Math.round(unitPrice * 0.7) // szacowany koszt surowca
  const returnRateMultiplier = 1 - rrr / 100
  const totalCost = Math.round(quantity * rawMaterialEstCost * returnRateMultiplier + (quantity * (stationTax / 10)))
  const totalRevenue = Math.round(quantity * unitPrice)
  const netProfit = totalRevenue - totalCost
  const profitPerItem = quantity > 0 ? Math.round(netProfit / quantity) : 0

  return (
    <main className="hud-shell min-h-screen text-[#f3f4f6] pb-12">
      <HyperHudHeader />

      <div className="relative z-10 mx-auto w-full max-w-[1580px] space-y-7 p-4 sm:p-6 lg:p-8 mt-4">
        <PortalSubpageHeader
          eyebrow="Kalkulator Ekonomii • Albion Online Polska"
          title={<>Kalkulator Zysku z Craftingu<br /><span className="text-[#e5bb55]">&amp; Przetwarzania Surowców</span></>}
          description="Wyliczaj zysk netto w Srebrze na podstawie danych cenowych w czasie rzeczywistym z Albion Data Project API, uwzględniając Return Rate (RRR) oraz opłaty stanowisk."
          icon={Hammer}
          tone="gold"
          stats={[
            { label: 'Serwer', value: server },
            { label: 'RRR', value: `${rrr}%` },
            { label: 'Szacowany Zysk', value: `${profitPerItem.toLocaleString('pl-PL')} / szt` },
          ]}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* USTAWIENIA CRAFTINGU */}
          <div className="lg:col-span-5 space-y-5">
            <div className="aopp-panel rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-display text-lg font-bold text-[#fff8e8] flex items-center gap-2">
                  <Hammer className="w-5 h-5 text-amber-400" /> Parametry Rzemiosła
                </h3>
                <button
                  onClick={fetchPrices}
                  disabled={loading}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-amber-300 text-xs font-mono transition flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Odśwież ceny
                </button>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Typ Surowca / Przedmiotu</label>
                  <select
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value)}
                    className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-amber-200 outline-none cursor-pointer"
                  >
                    {RESOURCES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Tier Surowca</label>
                    <select
                      value={tier}
                      onChange={(e) => setTier(e.target.value)}
                      className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-amber-200 outline-none cursor-pointer"
                    >
                      {TIERS.map(t => <option key={t.level} value={t.level}>{t.label}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Zaklęcie (@Enchant)</label>
                    <select
                      value={enchant}
                      onChange={(e) => setEnchant(e.target.value)}
                      className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-amber-200 outline-none cursor-pointer"
                    >
                      {ENCHANTS.map(e => <option key={e.level} value={e.level}>{e.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Serwer Gry</label>
                    <select
                      value={server}
                      onChange={(e) => setServer(e.target.value)}
                      className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-amber-200 outline-none cursor-pointer"
                    >
                      <option value="Europa">Europa (AMS)</option>
                      <option value="Ameryka">Ameryka (NWA)</option>
                      <option value="Azja">Azja (SGP)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Ilość Sztuk</label>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                      className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-gray-100 outline-none"
                    />
                  </div>
                </div>

                {/* SUWAKI RRR I PODATKU */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-emerald-400 mb-1">
                      <span>Zwrot Surowców (RRR %):</span>
                      <span>{rrr}%</span>
                    </div>
                    <input
                      type="range"
                      min={15.2}
                      max={53.9}
                      step={0.1}
                      value={rrr}
                      onChange={(e) => setRrr(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-gray-400 mt-0.5">
                      <span>15.2% (Standard)</span>
                      <span>36.7% (Miasto + Skupienie)</span>
                      <span>53.9% (Max Bonus)</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-amber-300 mb-1">
                      <span>Podatek Stanowiska (Tax):</span>
                      <span>{stationTax} Silver / 100 odżywiania</span>
                    </div>
                    <input
                      type="range"
                      min={100}
                      max={2000}
                      step={50}
                      value={stationTax}
                      onChange={(e) => setStationTax(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PRAWA KOLUMNA: PODSUMOWANIE EKONOMICZNE */}
          <div className="lg:col-span-7 space-y-5">
            <div className="aopp-panel rounded-3xl p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="text-[10px] font-mono uppercase text-gray-400">Wybrany Przedmiot:</div>
                  <div className="text-lg font-bold text-amber-200 font-mono">{getItemId()}</div>
                </div>

                {priceData && (
                  <div className="text-right font-mono">
                    <div className="text-[10px] text-gray-400">Cena w {priceData.cheapestCity}:</div>
                    <div className="text-sm font-bold text-emerald-400">{priceData.minPrice.toLocaleString('pl-PL')} Silver</div>
                  </div>
                )}
              </div>

              {loading && (
                <div className="py-12 text-center space-y-3 font-mono text-xs text-amber-400">
                  <LoaderCircle className="w-8 h-8 animate-spin mx-auto text-amber-400" />
                  <div>Pobieranie aktualnych cen z miast królewskich...</div>
                </div>
              )}

              {error && !loading && (
                <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-800/50 p-4 rounded-2xl text-rose-300 text-xs font-mono">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {priceData && !loading && (
                <div className="space-y-5">
                  {/* GLÓWNY WYNIK ZYSKU */}
                  <div className={`p-5 rounded-3xl border ${
                    netProfit > 0
                      ? 'bg-gradient-to-r from-emerald-950/60 to-emerald-900/40 border-emerald-500/40'
                      : 'bg-gradient-to-r from-rose-950/60 to-rose-900/40 border-rose-500/40'
                  }`}>
                    <div className="flex items-center justify-between font-mono">
                      <div>
                        <div className="text-xs uppercase font-bold text-gray-300">Szacowany Zysk Netto ({quantity} szt):</div>
                        <div className={`text-3xl font-black mt-1 ${netProfit > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                          {netProfit > 0 ? '+' : ''}{netProfit.toLocaleString('pl-PL')} Silver
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] uppercase text-gray-400">Zysk na 1 sztukę:</div>
                        <div className={`text-lg font-bold ${netProfit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {profitPerItem > 0 ? '+' : ''}{profitPerItem.toLocaleString('pl-PL')} Silver
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* STATYSTYKI SZCZEGÓŁOWE */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
                    <div className="bg-[#050204] p-3.5 rounded-2xl border border-[#200d14]">
                      <div className="text-[9px] text-gray-400 uppercase">Przychód Ogólny</div>
                      <div className="text-sm font-bold text-amber-200 mt-0.5">{totalRevenue.toLocaleString('pl-PL')} Silver</div>
                    </div>

                    <div className="bg-[#050204] p-3.5 rounded-2xl border border-[#200d14]">
                      <div className="text-[9px] text-gray-400 uppercase">Koszt po Zwrocie RRR</div>
                      <div className="text-sm font-bold text-rose-300 mt-0.5">{totalCost.toLocaleString('pl-PL')} Silver</div>
                    </div>

                    <div className="bg-[#050204] p-3.5 rounded-2xl border border-[#200d14] col-span-2 sm:col-span-1">
                      <div className="text-[9px] text-gray-400 uppercase">Oszczędność z RRR</div>
                      <div className="text-sm font-bold text-emerald-400 mt-0.5">
                        +{Math.round(quantity * rawMaterialEstCost * (rrr / 100)).toLocaleString('pl-PL')} Silver
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
