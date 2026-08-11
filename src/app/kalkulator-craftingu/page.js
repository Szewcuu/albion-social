'use client'

import CustomSelect from '@/components/ui/CustomSelect'

import { useState, useEffect, useCallback } from 'react'
import { Hammer, Sparkles, TrendingUp, TrendingDown, Coins, Percent, Zap, LoaderCircle, AlertCircle, RefreshCw } from 'lucide-react'
import GoldExchangeWidget from '@/components/economy/GoldExchangeWidget'
import TradeArbitrageCalculator from '@/components/market/TradeArbitrageCalculator'

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

const CITY_BONUSES = {
  'Lymhurst': { bonusResource: 'PLANKS', baseRrr: 28.5, focusRrr: 47.9, label: 'Lymhurst (Bonus: Drewno / Planks)' },
  'Martlock': { bonusResource: 'LEATHER', baseRrr: 28.5, focusRrr: 47.9, label: 'Martlock (Bonus: Skóra / Leather)' },
  'Thetford': { bonusResource: 'METALBAR', baseRrr: 28.5, focusRrr: 47.9, label: 'Thetford (Bonus: Metal / Ore)' },
  'Fort Sterling': { bonusResource: 'CLOTH', baseRrr: 28.5, focusRrr: 47.9, label: 'Fort Sterling (Bonus: Tkanina / Cloth)' },
  'Bridgewatch': { bonusResource: 'STONEBLOCK', baseRrr: 28.5, focusRrr: 47.9, label: 'Bridgewatch (Bonus: Kamień / Stone)' },
  'Caerleon': { bonusResource: 'ALL', baseRrr: 15.2, focusRrr: 43.5, label: 'Caerleon (Czerwona Strefa)' },
  'Brecilien': { bonusResource: 'ALL', baseRrr: 20.0, focusRrr: 45.0, label: 'Brecilien (Mgły)' },
}

export default function CraftingCalculatorPage() {
  const [resourceType, setResourceType] = useState('PLANKS')
  const [tier, setTier] = useState('T5')
  const [enchant, setEnchant] = useState('0')
  const [server, setServer] = useState('Europa')
  const [selectedCity, setSelectedCity] = useState('Lymhurst')
  const [useFocus, setUseFocus] = useState(true)
  const [rrr, setRrr] = useState(47.9) // RRR %
  const [stationTax, setStationTax] = useState(500) // Tax per 100 nutrition
  const [quantity, setQuantity] = useState(100)

  const applyCityRrr = useCallback((city, focus, resType) => {
    const cityConfig = CITY_BONUSES[city] || CITY_BONUSES['Lymhurst']
    const hasBonus = cityConfig.bonusResource === 'ALL' || cityConfig.bonusResource === resType
    const baseRrr = hasBonus ? cityConfig.baseRrr : 15.2
    const finalRrr = focus ? (hasBonus ? cityConfig.focusRrr : 43.5) : baseRrr
    setRrr(finalRrr)
  }, [])

  const handleCityChange = (newCity) => {
    setSelectedCity(newCity)
    applyCityRrr(newCity, useFocus, resourceType)
  }

  const handleFocusToggle = () => {
    const newFocus = !useFocus
    setUseFocus(newFocus)
    applyCityRrr(selectedCity, newFocus, resourceType)
  }

  const handleResourceChange = (newRes) => {
    setResourceType(newRes)
    applyCityRrr(selectedCity, useFocus, newRes)
  }

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
    <div className="page-content">
      <div className="subpage-header">
        <h1>Kalkulator Craftingu</h1>
        <p>Oblicz zysk netto z craftingu uwzględniając Return Rate (RRR) oraz opłaty stanowisk.</p>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8 mt-2">
        <GoldExchangeWidget />
        <TradeArbitrageCalculator />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* USTAWIENIA CRAFTINGU */}
          <div className="lg:col-span-5 space-y-5">
            <div className="panel rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-display text-lg font-bold text-[#fff] flex items-center gap-2">
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
                  <CustomSelect
                    label="Typ Surowca / Przedmiotu"
                    value={resourceType}
                    onChange={(val) => handleResourceChange(val)}
                    options={RESOURCES.map((r) => ({ value: r.id, label: r.label }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <CustomSelect
                      label="Miasto Rzemiosła (Bonus RRR)"
                      value={selectedCity}
                      onChange={(val) => handleCityChange(val)}
                      options={Object.keys(CITY_BONUSES).map(city => ({ value: city, label: CITY_BONUSES[city].label }))}
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <button
                      type="button"
                      onClick={handleFocusToggle}
                      className={`w-full py-3 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                        useFocus
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                      }`}
                    >
                      <Zap className={`w-3.5 h-3.5 ${useFocus ? 'text-amber-400' : 'text-gray-500'}`} />
                      <span>{useFocus ? 'Skupienie (Focus) ON' : 'Skupienie (Focus) OFF'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <CustomSelect
                      label="Tier Surowca"
                      value={tier}
                      onChange={(val) => setTier(val)}
                      options={TIERS.map((t) => ({ value: t.level, label: t.label }))}
                    />
                  </div>

                  <div>
                    <CustomSelect
                      label="Zaklęcie (@Enchant)"
                      value={enchant}
                      onChange={(val) => setEnchant(val)}
                      options={ENCHANTS.map((e) => ({ value: e.level, label: e.label }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <CustomSelect
                      label="Serwer Gry"
                      value={server}
                      onChange={(val) => setServer(val)}
                      options={[
                        { value: 'Europa', label: 'Europa (AMS)' },
                        { value: 'Ameryka', label: 'Ameryka (NWA)' },
                        { value: 'Azja', label: 'Azja (SGP)' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Ilość Sztuk</label>
                    <input
                      type="number"
                      min={1}
                      max={10000}
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl p-3 text-gray-100 outline-none"
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
            <div className="panel rounded-3xl p-6 space-y-5">
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
                    <div className="bg-[var(--bg-elevated)] p-3.5 rounded-2xl border border-[#200d14]">
                      <div className="text-[9px] text-gray-400 uppercase">Przychód Ogólny</div>
                      <div className="text-sm font-bold text-amber-200 mt-0.5">{totalRevenue.toLocaleString('pl-PL')} Silver</div>
                    </div>

                    <div className="bg-[var(--bg-elevated)] p-3.5 rounded-2xl border border-[#200d14]">
                      <div className="text-[9px] text-gray-400 uppercase">Koszt po Zwrocie RRR</div>
                      <div className="text-sm font-bold text-rose-300 mt-0.5">{totalCost.toLocaleString('pl-PL')} Silver</div>
                    </div>

                    <div className="bg-[var(--bg-elevated)] p-3.5 rounded-2xl border border-[#200d14] col-span-2 sm:col-span-1">
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
    </div>
  )
}
