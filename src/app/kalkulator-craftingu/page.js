'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, CheckCircle2, Coins, Hammer, RefreshCw, ArrowRightLeft as Route, ShieldCheck, Sparkles, Zap } from 'lucide-react'

import CustomSelect from '@/components/ui/CustomSelect'
import { EmptyState, LoadingState, StatusNotice } from '@/components/ui/FeedbackState'
import {
  calculateRefiningProfit,
  getPresetReturnRate,
  getRefiningRecipe,
  quoteAgeHours,
  REFINING_CITIES,
  REFINING_RESOURCES,
} from '@/lib/refiningCalculator'

const ItemPriceHistoryChart = dynamic(() => import('@/components/market/ItemPriceHistoryChart'), { loading: () => <ToolLoading label="Ładowanie historii ceny…" /> })
const GoldExchangeWidget = dynamic(() => import('@/components/economy/GoldExchangeWidget'), { loading: () => <ToolLoading label="Ładowanie kursu złota…" /> })
const TradeArbitrageCalculator = dynamic(() => import('@/components/market/TradeArbitrageCalculator'), { loading: () => <ToolLoading label="Ładowanie kalkulatora trasy…" /> })

const TIERS = [4, 5, 6, 7, 8]
const ENCHANTS = [0, 1, 2, 3, 4]
const REGIONS = [
  { value: 'europe', label: 'Europa (AMS)' },
  { value: 'america', label: 'Ameryka (NWA)' },
  { value: 'asia', label: 'Azja (SGP)' },
]

function ToolLoading({ label }) {
  return <LoadingState label={label} compact className="panel rounded-3xl" />
}

function formatSilver(value) {
  return `${Math.round(Number(value) || 0).toLocaleString('pl-PL')} Silver`
}

function formatAmount(value) {
  return Number(value || 0).toLocaleString('pl-PL', { maximumFractionDigits: 1 })
}

function quoteKey(itemId, city) {
  return `${itemId}:${city}`
}

function observedAtLabel(timestamp) {
  const age = quoteAgeHours(timestamp)
  if (age === null) return 'brak czasu skanu'
  if (age < 1) return `${Math.max(1, Math.round(age * 60))} min temu`
  if (age < 48) return `${Math.round(age)} godz. temu`
  return `${Math.round(age / 24)} dni temu`
}

export default function CraftingCalculatorPage() {
  const [resourceType, setResourceType] = useState('PLANKS')
  const [tier, setTier] = useState(5)
  const [enchant, setEnchant] = useState(0)
  const [region, setRegion] = useState('europe')
  const [craftCity, setCraftCity] = useState('Fort Sterling')
  const [buyCity, setBuyCity] = useState('Fort Sterling')
  const [sellCity, setSellCity] = useState('Fort Sterling')
  const [useFocus, setUseFocus] = useState(false)
  const [rrr, setRrr] = useState(36.7)
  const [quantity, setQuantity] = useState(100)
  const [stationFee, setStationFee] = useState(500)
  const [marketFee, setMarketFee] = useState(6.5)
  const [priceInputs, setPriceInputs] = useState({})
  const [quotes, setQuotes] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [showHistory, setShowHistory] = useState(false)
  const [activeExtra, setActiveExtra] = useState(null)

  const selectedResource = useMemo(() => REFINING_RESOURCES.find((resource) => resource.id === resourceType), [resourceType])
  const recipe = useMemo(() => getRefiningRecipe({ resourceType, tier, enchant }), [resourceType, tier, enchant])

  const fetchPrices = useCallback(async () => {
    setLoading(true)
    setError(null)
    setNotice(null)
    const itemIds = [recipe.output.itemId, ...recipe.ingredients.map((ingredient) => ingredient.itemId)]
    const cities = [...new Set([buyCity, sellCity])]
    const params = new URLSearchParams({ mode: 'current', items: itemIds.join(','), cities: cities.join(','), qualities: '1', region })

    try {
      const response = await fetch(`/api/prices?${params}`)
      const payload = await response.json()
      if (!response.ok) throw new Error(payload?.error?.message || 'Nie udało się pobrać skanów rynku.')
      const rows = Array.isArray(payload.data) ? payload.data : []
      const nextQuotes = Object.fromEntries(rows.map((row) => [quoteKey(row.item_id, row.city), row]))
      const nextPrices = {}
      for (const ingredient of recipe.ingredients) nextPrices[ingredient.itemId] = Number(nextQuotes[quoteKey(ingredient.itemId, buyCity)]?.sell_price_min) || 0
      nextPrices[recipe.output.itemId] = Number(nextQuotes[quoteKey(recipe.output.itemId, sellCity)]?.sell_price_min) || 0
      const missingCount = Object.values(nextPrices).filter((price) => price <= 0).length
      setQuotes(nextQuotes)
      setPriceInputs(nextPrices)
      if (missingCount > 0) setNotice(`Brakuje ${missingCount} ${missingCount === 1 ? 'ceny' : 'cen'} w wybranych miastach. Uzupełnij je ręcznie albo zmień rynek.`)
    } catch (fetchError) {
      setQuotes({})
      setPriceInputs(Object.fromEntries([recipe.output, ...recipe.ingredients].map((item) => [item.itemId, 0])))
      setError(fetchError.message || 'Albion Online Data Project chwilowo nie odpowiada. Ceny możesz wpisać ręcznie.')
    } finally {
      setLoading(false)
    }
  }, [buyCity, recipe, region, sellCity])

  useEffect(() => {
    const timer = window.setTimeout(fetchPrices, 150)
    return () => window.clearTimeout(timer)
  }, [fetchPrices])

  const result = useMemo(() => calculateRefiningProfit({
    recipe,
    quantity,
    ingredientPrices: priceInputs,
    outputPrice: priceInputs[recipe.output.itemId],
    returnRate: rrr,
    stationFeePerHundredNutrition: stationFee,
    marketFeeRate: marketFee,
  }), [marketFee, priceInputs, quantity, recipe, rrr, stationFee])

  const requiredPriceIds = [recipe.output.itemId, ...recipe.ingredients.map((ingredient) => ingredient.itemId)]
  const hasCompletePrices = requiredPriceIds.every((itemId) => Number(priceInputs[itemId]) > 0)
  const staleQuotes = [...recipe.ingredients.map((ingredient) => quotes[quoteKey(ingredient.itemId, buyCity)]), quotes[quoteKey(recipe.output.itemId, sellCity)]]
    .filter((quote) => quote && quoteAgeHours(quote.sell_price_min_date) > 12)

  function handleResourceChange(nextResourceId) {
    const resource = REFINING_RESOURCES.find((entry) => entry.id === nextResourceId)
    setResourceType(nextResourceId)
    setCraftCity(resource.bonusCity)
    setRrr(getPresetReturnRate({ craftCity: resource.bonusCity, bonusCity: resource.bonusCity, useFocus }))
    if (resource.enchantable === false) setEnchant(0)
  }

  function handleCraftCityChange(nextCity) {
    setCraftCity(nextCity)
    setRrr(getPresetReturnRate({ craftCity: nextCity, bonusCity: recipe.bonusCity, useFocus }))
  }

  function handleFocusToggle() {
    const nextFocus = !useFocus
    setUseFocus(nextFocus)
    setRrr(getPresetReturnRate({ craftCity, bonusCity: recipe.bonusCity, useFocus: nextFocus }))
  }

  function updatePrice(itemId, value) {
    setPriceInputs((current) => ({ ...current, [itemId]: Math.max(0, Number(value) || 0) }))
  }

  return (
    <div className="page-content">
      <div className="subpage-header">
        <h1>Kalkulator Rafinacji</h1>
        <p>Policz koszt prawdziwej receptury, zwrot materiałów, opłatę stanowiska i sprzedaż na wybranym rynku.</p>
      </div>

      <main className="relative z-10 mx-auto mt-2 w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8">
        <section className="panel overflow-hidden rounded-3xl border border-amber-500/20">
          <div className="grid gap-4 border-b border-white/8 bg-black/20 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-amber-300"><Hammer className="h-5 w-5" /></div>
              <div>
                <span className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Warsztat ekonomisty</span>
                <h2 className="mt-1 font-display text-2xl font-black text-[var(--text-bright)]">Jedna receptura. Wszystkie koszty na stole.</h2>
                <p className="mt-1 max-w-3xl text-sm text-[var(--text-muted)]">Ceny pochodzą ze skanów społeczności Albion Data Project. Każdą z nich możesz poprawić zgodnie z rynkiem widocznym w grze.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 px-3 py-2 font-mono text-[10px] text-emerald-200"><ShieldCheck className="h-4 w-4" />Bez cen zastępczych i ukrytych kosztów</div>
          </div>

          <div className="grid gap-6 p-5 sm:p-6 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <CustomSelect label="Co rafinujesz" value={resourceType} onChange={handleResourceChange} options={REFINING_RESOURCES.map((resource) => ({ value: resource.id, label: resource.label }))} />
                <CustomSelect label="Serwer rynku" value={region} onChange={setRegion} options={REGIONS} />
                <CustomSelect label="Tier" value={tier} onChange={(value) => setTier(Number(value))} options={TIERS.map((value) => ({ value, label: `Tier ${value}` }))} />
                <CustomSelect label="Enchant" value={enchant} disabled={selectedResource.enchantable === false} onChange={(value) => setEnchant(Number(value))} options={ENCHANTS.map((value) => ({ value, label: `.${value}${value === 0 ? ' — zwykły' : ''}` }))} />
              </div>

              {selectedResource.enchantable === false && <p className="rounded-xl border border-sky-500/20 bg-sky-950/20 p-3 font-mono text-[10px] text-sky-200">Bloki kamienne nie mają enchantów. Enchantowane skały zwiększają skalę receptury, a nie tworzą bloków .1–.4.</p>}

              <div className="grid gap-3 sm:grid-cols-3">
                <CustomSelect label="Kup materiały w" value={buyCity} onChange={setBuyCity} options={REFINING_CITIES} />
                <CustomSelect label="Rafinuj w" value={craftCity} onChange={handleCraftCityChange} options={REFINING_CITIES} />
                <CustomSelect label="Sprzedaj w" value={sellCity} onChange={setSellCity} options={REFINING_CITIES} />
              </div>

              <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div><p className="font-mono text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Zwrot materiałów</p><p className="mt-1 text-sm text-[var(--text-primary)]">{craftCity === recipe.bonusCity ? `Bonus ${recipe.resource.label.toLowerCase()}: ${recipe.bonusCity}` : `Bez specjalizacji: bonus jest w ${recipe.bonusCity}`}</p></div>
                  <button type="button" onClick={handleFocusToggle} aria-pressed={useFocus} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 font-mono text-[11px] font-black transition ${useFocus ? 'border-amber-400 bg-amber-500/20 text-amber-200' : 'border-white/10 bg-white/5 text-[var(--text-muted)] hover:border-amber-400/40'}`}><Zap className="h-4 w-4" />{useFocus ? 'Focus włączony' : 'Focus wyłączony'}</button>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_132px] sm:items-end">
                  <div><div className="mb-1 flex justify-between font-mono text-[10px] font-bold text-emerald-300"><span>RRR — możesz skorygować ręcznie</span><span>{rrr.toFixed(1)}%</span></div><input aria-label="Zwrot materiałów RRR" type="range" min="0" max="60" step="0.1" value={rrr} onChange={(event) => setRrr(Number(event.target.value))} className="w-full accent-emerald-500" /></div>
                  <label className="font-mono text-[10px] font-bold uppercase text-[var(--text-muted)]">Liczba sztuk<input type="number" min="1" max="10000" value={quantity} onChange={(event) => setQuantity(Math.min(10000, Math.max(1, Number(event.target.value) || 1)))} className="mt-1 w-full rounded-xl border border-[var(--border-warm)] bg-[var(--bg-stone)] p-3 text-[var(--text-bright)] outline-none focus:border-[var(--gold)]" /></label>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="font-mono text-[10px] font-bold uppercase text-[var(--text-muted)]">Opłata stanowiska / 100 odżywiania<input type="number" min="0" value={stationFee} onChange={(event) => setStationFee(Math.max(0, Number(event.target.value) || 0))} className="mt-1 w-full rounded-xl border border-[var(--border-warm)] bg-[var(--bg-stone)] p-3 text-[var(--text-bright)] outline-none focus:border-[var(--gold)]" /></label>
                <label className="font-mono text-[10px] font-bold uppercase text-[var(--text-muted)]">Łączne opłaty sprzedaży<div className="relative mt-1"><input type="number" min="0" max="100" step="0.1" value={marketFee} onChange={(event) => setMarketFee(Math.min(100, Math.max(0, Number(event.target.value) || 0)))} className="w-full rounded-xl border border-[var(--border-warm)] bg-[var(--bg-stone)] p-3 pr-9 text-[var(--text-bright)] outline-none focus:border-[var(--gold)]" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">%</span></div></label>
              </div>
              <p className="font-mono text-[9px] leading-relaxed text-[var(--text-faded)]">Preset 6,5% odpowiada podatkowi Premium 4% i opłacie wystawienia 2,5%. Zmień go, jeśli używasz innego sposobu sprzedaży.</p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><p className="font-mono text-[10px] font-black uppercase tracking-wider text-amber-300">Receptura {recipe.output.label}</p><p className="mt-1 text-sm text-[var(--text-muted)]">Kupno: {buyCity} • sprzedaż: {sellCity}</p></div>
                <button type="button" onClick={fetchPrices} disabled={loading} className="flex min-h-11 items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 font-mono text-[10px] font-black uppercase text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-60"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Odśwież skany</button>
              </div>

              {error && <StatusNotice type="error"><span><strong className="block">Źródło cen jest niedostępne</strong>{error} Wynik pojawi się dopiero po uzupełnieniu wszystkich pól.</span></StatusNotice>}
              {notice && !error && <StatusNotice>{notice}</StatusNotice>}
              {staleQuotes.length > 0 && <StatusNotice><span>{staleQuotes.length === 1 ? 'Jeden skan ma' : `${staleQuotes.length} skany mają`} ponad 12 godzin. Porównaj ceny w grze przed inwestycją.</span></StatusNotice>}

              <div className="space-y-2">
                {recipe.ingredients.map((ingredient) => <PriceRow key={ingredient.itemId} item={ingredient} role={`Materiał ×${ingredient.quantity}`} city={buyCity} value={priceInputs[ingredient.itemId]} quote={quotes[quoteKey(ingredient.itemId, buyCity)]} onChange={updatePrice} />)}
                <div className="flex justify-center py-0.5 text-[var(--gold)]"><Sparkles className="h-4 w-4" /></div>
                <PriceRow item={recipe.output} role="Produkt ×1" city={sellCity} value={priceInputs[recipe.output.itemId]} quote={quotes[quoteKey(recipe.output.itemId, sellCity)]} onChange={updatePrice} output />
              </div>

              {loading ? <LoadingState label="Pobieranie trzech notowań…" compact /> : hasCompletePrices ? <ResultPanel result={result} rrr={rrr} /> : <EmptyState icon={Coins} title="Uzupełnij brakujące ceny" description="Nie pokazujemy zysku opartego na zerach ani sztucznych założeniach." compact />}
            </div>
          </div>
        </section>

        <section className="panel rounded-3xl p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div><p className="font-mono text-[10px] font-black uppercase tracking-wider text-[var(--gold)]">Narzędzia pomocnicze</p><h2 className="mt-1 font-display text-xl font-black text-[var(--text-bright)]">Otwieraj tylko wtedy, gdy ich potrzebujesz</h2></div>
            <div className="flex flex-wrap gap-2">
              <ToolButton active={showHistory} onClick={() => setShowHistory((value) => !value)} icon={BarChart3}>Historia produktu</ToolButton>
              <ToolButton active={activeExtra === 'gold'} onClick={() => setActiveExtra((value) => value === 'gold' ? null : 'gold')} icon={Coins}>Kurs złota</ToolButton>
              <ToolButton active={activeExtra === 'route'} onClick={() => setActiveExtra((value) => value === 'route' ? null : 'route')} icon={Route}>Ręczna trasa</ToolButton>
            </div>
          </div>
        </section>

        {showHistory && <ItemPriceHistoryChart itemId={recipe.output.itemId} defaultCity={sellCity} />}
        {activeExtra === 'gold' && <GoldExchangeWidget />}
        {activeExtra === 'route' && <TradeArbitrageCalculator />}
      </main>
    </div>
  )
}

function PriceRow({ item, role, city, value, quote, onChange, output = false }) {
  const age = quoteAgeHours(quote?.sell_price_min_date)
  const stale = age !== null && age > 12
  return (
    <div className={`grid gap-3 rounded-2xl border p-3 sm:grid-cols-[1fr_170px] sm:items-center ${output ? 'border-emerald-500/25 bg-emerald-950/15' : 'border-white/8 bg-black/20'}`}>
      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`font-mono text-[9px] font-black uppercase tracking-wider ${output ? 'text-emerald-300' : 'text-amber-300'}`}>{role}</span><span className="text-[10px] text-[var(--text-faded)]">{city}</span></div><p className="mt-1 truncate font-mono text-xs font-bold text-[var(--text-bright)]">{item.label}</p><p className={`mt-1 font-mono text-[9px] ${stale ? 'text-sky-300' : 'text-[var(--text-faded)]'}`}>{quote?.sell_price_min > 0 ? `Skan sprzedaży: ${observedAtLabel(quote.sell_price_min_date)}${stale ? ' — sprawdź w grze' : ''}` : 'Brak skanu — wpisz cenę z gry'}</p></div>
      <label className="font-mono text-[9px] font-bold uppercase text-[var(--text-muted)]">Cena za sztukę<div className="relative mt-1"><input aria-label={`Cena ${item.label}`} type="number" min="0" value={value ?? 0} onChange={(event) => onChange(item.itemId, event.target.value)} className="w-full rounded-xl border border-[var(--border-warm)] bg-[var(--bg-stone)] p-3 pr-14 text-right text-xs font-bold text-[var(--text-bright)] outline-none focus:border-[var(--gold)]" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-[var(--text-faded)]">silver</span></div></label>
    </div>
  )
}

function ResultPanel({ result, rrr }) {
  const positive = result.profit >= 0
  return (
    <div className={`overflow-hidden rounded-3xl border ${positive ? 'border-emerald-500/35 bg-emerald-950/20' : 'border-rose-500/35 bg-rose-950/20'}`}>
      <div className="grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-end"><div><p className="font-mono text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">Wynik po wszystkich zadeklarowanych kosztach</p><p className={`mt-1 font-display text-3xl font-black ${positive ? 'text-emerald-300' : 'text-rose-300'}`}>{result.profit >= 0 ? '+' : ''}{formatSilver(result.profit)}</p></div><div className="sm:text-right"><p className="text-[10px] text-[var(--text-muted)]">na sztukę</p><p className={`font-mono text-sm font-black ${positive ? 'text-emerald-200' : 'text-rose-200'}`}>{result.profitPerCraft >= 0 ? '+' : ''}{formatSilver(result.profitPerCraft)}</p></div></div>
      <div className="grid grid-cols-2 border-t border-white/8 bg-black/15 sm:grid-cols-4"><ResultMetric label="Materiały po RRR" value={formatSilver(result.materialCost)} /><ResultMetric label="Stanowisko" value={formatSilver(result.stationCost)} /><ResultMetric label="Opłaty rynku" value={formatSilver(result.marketFees)} /><ResultMetric label="ROI" value={`${result.roi >= 0 ? '+' : ''}${result.roi.toFixed(1)}%`} /></div>
      <div className="space-y-2 border-t border-white/8 p-4"><div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase text-emerald-200"><CheckCircle2 className="h-4 w-4" />Rzeczywiste składniki zwracane przy RRR {rrr.toFixed(1)}%</div>{result.materials.map((material) => <div key={material.itemId} className="flex justify-between gap-3 text-xs text-[var(--text-muted)]"><span>{material.label}</span><span className="font-mono text-[var(--text-primary)]">zużycie {formatAmount(material.consumed)} / zwrot {formatAmount(material.returned)}</span></div>)}<p className="pt-1 font-mono text-[9px] text-[var(--text-faded)]">Odżywianie: {formatAmount(result.nutritionPerCraft)} na craft • przychód netto po rynku: {formatSilver(result.netRevenue)}</p></div>
    </div>
  )
}

function ResultMetric({ label, value }) {
  return <div className="border-r border-t border-white/8 p-3 last:border-r-0 sm:border-t-0"><p className="font-mono text-[8px] font-bold uppercase text-[var(--text-faded)]">{label}</p><p className="mt-1 font-mono text-xs font-black text-[var(--text-primary)]">{value}</p></div>
}

function ToolButton({ active, onClick, icon: Icon, children }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={`flex min-h-11 items-center gap-2 rounded-xl border px-3 font-mono text-[10px] font-black uppercase transition ${active ? 'border-amber-400 bg-amber-500/20 text-amber-200' : 'border-white/10 bg-black/20 text-[var(--text-muted)] hover:border-amber-400/30 hover:text-[var(--text-primary)]'}`}><Icon className="h-4 w-4" />{children}</button>
}
