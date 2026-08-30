'use client'

import CustomSelect from '@/components/ui/CustomSelect'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BellRing,
  Calculator,
  Check,
  ChevronDown,
  Clock3,
  LoaderCircle,
  MapPin as MapPinned,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  X,
} from 'lucide-react'
import { itemImageUrl } from '@/lib/buildSlots'
import { authenticatedFetch } from '@/lib/authenticatedFetch'
import { alertConditionMet, marketPriceKey } from '@/lib/marketPriceAlerts'

const CITIES = ['Caerleon', 'Bridgewatch', 'Fort Sterling', 'Lymhurst', 'Martlock', 'Thetford', 'Brecilien']
const QUALITY_OPTIONS = [
  { value: 1, label: 'Normalna' },
  { value: 2, label: 'Dobra' },
  { value: 3, label: 'Znakomita' },
  { value: 4, label: 'Doskonała' },
  { value: 5, label: 'Arcydzieło' },
]
const REGION_OPTIONS = [
  { value: 'europe', label: 'Europa' },
  { value: 'america', label: 'Ameryka' },
  { value: 'asia', label: 'Azja' },
]
const FAVORITES_KEY = 'aopp-market-favorites'
const DEFAULT_ITEM = { id: 'T4_BAG', name: "Adept's Bag", category: 'bags' }

function formatSilver(value, compact = false) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return 'Brak danych'
  return new Intl.NumberFormat('pl-PL', compact
    ? { notation: 'compact', maximumFractionDigits: 1 }
    : { maximumFractionDigits: 0 }).format(amount)
}

function formatSignedSilver(value, compact = false) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '—'
  const absolute = new Intl.NumberFormat('pl-PL', compact
    ? { notation: 'compact', maximumFractionDigits: 1 }
    : { maximumFractionDigits: 0 }).format(Math.abs(amount))
  return `${amount < 0 ? '−' : amount > 0 ? '+' : ''}${absolute}`
}

function parseApiDate(value) {
  if (!value || value.startsWith('0001-')) return null
  const normalized = /(?:Z|[+-]\d\d:\d\d)$/.test(value) ? value : `${value}Z`
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

function getFreshness(...dates) {
  const validDates = dates.map(parseApiDate).filter(Boolean)
  if (!validDates.length) return { label: 'Brak skanu', tone: 'rose', hours: Infinity }

  const newest = new Date(Math.max(...validDates.map((date) => date.getTime())))
  const hours = Math.max(0, (Date.now() - newest.getTime()) / 3_600_000)
  if (hours < 1) return { label: 'Mniej niż 1 h', tone: 'emerald', hours }
  if (hours <= 12) return { label: `${Math.floor(hours)} h temu`, tone: 'emerald', hours }
  if (hours <= 24) return { label: `${Math.floor(hours)} h temu`, tone: 'amber', hours }
  return { label: `${Math.floor(hours / 24)} d temu`, tone: 'rose', hours }
}

function freshnessClasses(tone) {
  if (tone === 'emerald') return 'border-emerald-400/20 bg-emerald-400/8 text-emerald-300'
  if (tone === 'amber') return 'border-amber-400/20 bg-amber-400/8 text-amber-300'
  return 'border-rose-400/20 bg-rose-400/8 text-rose-300'
}

async function fetchJson(url, signal) {
  const response = await fetch(url, { signal })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body?.error?.message || 'Nie udało się pobrać danych rynku.')
  return body
}

function LineChart({ points, valueLabel = formatSilver, tone = 'amber', emptyText }) {
  const chart = useMemo(() => {
    const values = points.map((point) => Number(point.value)).filter((value) => Number.isFinite(value) && value > 0)
    if (values.length < 2) return null

    const min = Math.min(...values)
    const max = Math.max(...values)
    const spread = Math.max(1, max - min)
    const coordinates = values.map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 100
      const y = 88 - ((value - min) / spread) * 72
      return `${x},${y}`
    }).join(' ')

    return { min, max, coordinates, first: values[0], last: values.at(-1) }
  }, [points])

  if (!chart) {
    return <div className="flex h-44 items-center justify-center rounded-2xl border border-dashed border-white/10 bg-black/15 px-6 text-center text-xs text-[#918b82]">{emptyText}</div>
  }

  const change = ((chart.last - chart.first) / chart.first) * 100
  const stroke = tone === 'sky' ? '#7dd3fc' : '#e5bb55'

  return (
    <div className="relative h-48 overflow-hidden rounded-2xl border border-white/8 bg-black/20 p-4">
      <div className="absolute inset-x-4 top-4 z-10 flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#918b82]">Zakres wartości</p>
          <p className="mt-1 font-mono text-xs text-[#d8d2c8]">{valueLabel(chart.min)} — {valueLabel(chart.max)}</p>
        </div>
        <span className={`rounded-lg border px-2 py-1 font-mono text-[10px] font-bold ${change >= 0 ? 'border-emerald-400/20 bg-emerald-400/8 text-emerald-300' : 'border-rose-400/20 bg-rose-400/8 text-rose-300'}`}>
          {change >= 0 ? '+' : ''}{change.toFixed(1)}%
        </span>
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-x-4 bottom-3 h-32 w-[calc(100%-2rem)]" role="img" aria-label="Wykres zmian wartości">
        <defs>
          <linearGradient id={`chart-${tone}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.3" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[28, 52, 76].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} stroke="rgba(255,255,255,.07)" strokeWidth=".5" />)}
        <polygon points={`0,100 ${chart.coordinates} 100,100`} fill={`url(#chart-${tone})`} />
        <polyline points={chart.coordinates} fill="none" stroke={stroke} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function Metric({ label, value, detail, tone = 'gold' }) {
  const color = tone === 'sky' ? 'text-sky-300' : tone === 'emerald' ? 'text-emerald-300' : tone === 'rose' ? 'text-rose-300' : 'text-[#e5bb55]'
  return (
    <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
      <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#918b82]">{label}</p>
      <p className={`font-display mt-2 text-xl font-black ${color}`}>{value}</p>
      {detail && <p className="mt-1 truncate text-[10px] text-[#8f8a81]">{detail}</p>}
    </div>
  )
}

export default function MarketIntelligence() {
  const [selectedItem, setSelectedItem] = useState(DEFAULT_ITEM)
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [region, setRegion] = useState('europe')
  const [quality, setQuality] = useState(1)
  const [range, setRange] = useState('7d')
  const [historyCity, setHistoryCity] = useState('Caerleon')
  const [activeCities, setActiveCities] = useState(CITIES)
  const [marketData, setMarketData] = useState([])
  const [historyData, setHistoryData] = useState([])
  const [goldData, setGoldData] = useState([])
  const [goldMeta, setGoldMeta] = useState(null)
  const [goldError, setGoldError] = useState('')
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasAnalyzed, setHasAnalyzed] = useState(false)
  const [favorites, setFavorites] = useState([])
  const [priceAlerts, setPriceAlerts] = useState([])
  const [serverHistory, setServerHistory] = useState([])
  const [watchSaving, setWatchSaving] = useState(false)
  const [watchMessage, setWatchMessage] = useState('')
  const [watchDirection, setWatchDirection] = useState('below')
  const [watchTarget, setWatchTarget] = useState('')
  const [buyCost, setBuyCost] = useState('')
  const [sellPrice, setSellPrice] = useState('')
  const [taxRate, setTaxRate] = useState('6.5')
  const [setupFee, setSetupFee] = useState('2.5')
  const [transportCost, setTransportCost] = useState('0')

  useEffect(() => {
    const hydrationTimer = setTimeout(() => {
      try {
        const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]')
        if (Array.isArray(stored)) setFavorites(stored.slice(0, 12))
      } catch {
        localStorage.removeItem(FAVORITES_KEY)
      }
    }, 0)

    return () => clearTimeout(hydrationTimer)
  }, [])

  const loadPriceAlerts = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/price-alerts')
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body?.error || 'Nie udało się pobrać alertów.')
      setPriceAlerts(body.alerts || [])
    } catch (alertError) {
      setWatchMessage(alertError.message)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(loadPriceAlerts, 0)
    return () => clearTimeout(timer)
  }, [loadPriceAlerts])

  useEffect(() => {
    if (query.trim().length < 2) {
      return undefined
    }

    const controller = new AbortController()
    const timeout = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const result = await fetchJson(`/api/items?search=${encodeURIComponent(query.trim())}&limit=12`, controller.signal)
        setSearchResults(result.items || [])
      } catch (searchError) {
        if (searchError.name !== 'AbortError') setSearchResults([])
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false)
      }
    }, 260)

    return () => {
      clearTimeout(timeout)
      controller.abort()
    }
  }, [query])

  const priceRows = useMemo(() => marketData
    .filter((row) => row.item_id === selectedItem.id && Number(row.quality) === Number(quality))
    .map((row) => ({ ...row, freshness: getFreshness(row.sell_price_min_date, row.buy_price_max_date) }))
    .sort((a, b) => CITIES.indexOf(a.city) - CITIES.indexOf(b.city)), [marketData, quality, selectedItem.id])

  const cheapestSell = useMemo(() => priceRows
    .filter((row) => Number(row.sell_price_min) > 0)
    .sort((a, b) => a.sell_price_min - b.sell_price_min)[0] || null, [priceRows])

  const highestBuy = useMemo(() => priceRows
    .filter((row) => Number(row.buy_price_max) > 0)
    .sort((a, b) => b.buy_price_max - a.buy_price_max)[0] || null, [priceRows])

  const historyPoints = useMemo(() => {
    const series = historyData.find((entry) => entry.location === historyCity && Number(entry.quality) === Number(quality))
    return (series?.data || []).map((point) => ({ value: point.avg_price, label: point.timestamp }))
  }, [historyData, historyCity, quality])

  const serverHistoryPoints = useMemo(() => {
    const field = watchDirection === 'above' ? 'buy_price_max' : 'sell_price_min'
    return serverHistory
      .filter((point) => Number(point[field]) > 0)
      .map((point) => ({ value: point[field], label: point.sampled_at }))
  }, [serverHistory, watchDirection])

  const goldPoints = useMemo(() => [...goldData]
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .map((point) => ({ value: point.price, label: point.timestamp })), [goldData])

  const marginResult = useMemo(() => {
    const buy = Number(buyCost) || 0
    const sell = Number(sellPrice) || 0
    const fees = sell * (((Number(taxRate) || 0) + (Number(setupFee) || 0)) / 100)
    const profit = sell - fees - buy
    const roi = buy > 0 ? (profit / buy) * 100 : 0
    return { fees, profit, roi }
  }, [buyCost, sellPrice, setupFee, taxRate])

  const arbitrageResult = useMemo(() => {
    if (!cheapestSell || !highestBuy || cheapestSell.city === highestBuy.city) return null
    const profit = Number(highestBuy.buy_price_max) - Number(cheapestSell.sell_price_min) - (Number(transportCost) || 0)
    const roi = cheapestSell.sell_price_min > 0 ? (profit / cheapestSell.sell_price_min) * 100 : 0
    return { profit, roi }
  }, [cheapestSell, highestBuy, transportCost])

  function selectItem(item) {
    setSelectedItem(item)
    setQuery('')
    setSearchOpen(false)
    setHasAnalyzed(false)
    setMarketData([])
    setHistoryData([])
    setError('')
  }

  function toggleCity(city) {
    setActiveCities((current) => current.includes(city)
      ? current.filter((entry) => entry !== city)
      : [...current, city])
  }

  function toggleFavorite() {
    const exists = favorites.some((item) => item.id === selectedItem.id)
    const next = exists
      ? favorites.filter((item) => item.id !== selectedItem.id)
      : [selectedItem, ...favorites].slice(0, 12)
    setFavorites(next)
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
  }

  async function savePriceWatch() {
    const target = Number(watchTarget)
    if (!Number.isSafeInteger(target) || target <= 0) {
      setWatchMessage('Podaj prawidłowy próg ceny w Silver.')
      return
    }
    setWatchSaving(true)
    setWatchMessage('')
    try {
      const response = await authenticatedFetch('/api/price-alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId: selectedItem.id,
          itemName: selectedItem.name,
          region,
          city: historyCity,
          quality,
          direction: watchDirection,
          targetPrice: target,
        }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body?.error || 'Nie udało się zapisać alertu.')
      if (body.sync) await loadPriceAlerts()
      else setPriceAlerts((current) => [body.alert, ...current.filter((alert) => alert.id !== body.alert.id)])
      setWatchMessage(body.sync ? 'Alert zapisany i sprawdzony na serwerze.' : 'Alert zapisany. Pierwszy skan wykona automat.')
    } catch (watchError) {
      setWatchMessage(watchError.message)
    } finally {
      setWatchSaving(false)
    }
  }

  async function deletePriceWatch() {
    if (!activeWatch) return
    setWatchSaving(true)
    setWatchMessage('')
    try {
      const response = await authenticatedFetch(`/api/price-alerts?id=${encodeURIComponent(activeWatch.id)}`, { method: 'DELETE' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body?.error || 'Nie udało się usunąć alertu.')
      setPriceAlerts((current) => current.filter((alert) => alert.id !== activeWatch.id))
      setWatchTarget('')
      setWatchMessage('Alert został usunięty.')
    } catch (watchError) {
      setWatchMessage(watchError.message)
    } finally {
      setWatchSaving(false)
    }
  }

  async function analyzeMarket() {
    if (!selectedItem?.id || activeCities.length === 0) {
      setError('Wybierz przedmiot i co najmniej jedno miasto.')
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError('')

    try {
      const currentParams = new URLSearchParams({
        mode: 'current',
        items: selectedItem.id,
        cities: activeCities.join(','),
        qualities: String(quality),
        region,
      })
      const historyParams = new URLSearchParams({
        mode: 'history',
        item: selectedItem.id,
        city: historyCity,
        quality: String(quality),
        range,
        region,
      })
      const goldParams = new URLSearchParams({ mode: 'gold', range, region })

      const [currentResult, historyResult, goldResult] = await Promise.allSettled([
        fetchJson(`/api/prices?${currentParams}`, controller.signal),
        fetchJson(`/api/prices?${historyParams}`, controller.signal),
        fetchJson(`/api/prices?${goldParams}`, controller.signal),
      ])

      if (currentResult.status === 'rejected') throw currentResult.reason
      if (historyResult.status === 'rejected') throw historyResult.reason

      const current = currentResult.value
      const history = historyResult.value

      setMarketData(current.data || [])
      setHistoryData(history.data || [])
      if (goldResult.status === 'fulfilled') {
        setGoldData(goldResult.value.data || [])
        setGoldMeta(goldResult.value.meta || null)
        setGoldError('')
      } else {
        setGoldData([])
        setGoldMeta(null)
        setGoldError(goldResult.reason?.message || 'Kurs złota jest chwilowo niedostępny.')
      }
      setMeta(current.meta || null)
      setHasAnalyzed(true)

      try {
        await authenticatedFetch('/api/price-alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'sample', itemId: selectedItem.id, region, cities: activeCities, quality }),
        })
        const storedParams = new URLSearchParams({ item: selectedItem.id, region, city: historyCity, quality: String(quality), days: range === '24h' ? '1' : range === '7d' ? '7' : '30' })
        const storedResponse = await authenticatedFetch(`/api/price-alerts?${storedParams}`)
        const stored = await storedResponse.json().catch(() => ({}))
        if (storedResponse.ok) {
          setServerHistory(stored.history || [])
          setPriceAlerts(stored.alerts || [])
        }
      } catch (storageError) {
        console.error('Nie udało się zaktualizować serwerowej historii rynku:', storageError)
      }

      const firstSell = (current.data || []).filter((row) => row.sell_price_min > 0).sort((a, b) => a.sell_price_min - b.sell_price_min)[0]
      const firstBuy = (current.data || []).filter((row) => row.buy_price_max > 0).sort((a, b) => b.buy_price_max - a.buy_price_max)[0]
      if (firstSell) setBuyCost(String(firstSell.sell_price_min))
      if (firstBuy) setSellPrice(String(firstBuy.buy_price_max))
    } catch (requestError) {
      if (requestError.name !== 'AbortError') setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  const isFavorite = favorites.some((item) => item.id === selectedItem.id)
  const currentGold = goldPoints.at(-1)?.value
  const previousGold = goldPoints.at(-2)?.value
  const goldDelta = currentGold && previousGold ? ((currentGold - previousGold) / previousGold) * 100 : null
  const activeWatch = priceAlerts.find((alert) => marketPriceKey(alert) === marketPriceKey({ itemId: selectedItem.id, region, city: historyCity, quality, priceType: watchDirection === 'above' ? 'buy' : 'sell' }))
  const activeWatchKey = marketPriceKey({ itemId: selectedItem.id, region, city: historyCity, quality, priceType: watchDirection === 'above' ? 'buy' : 'sell' })
  const watchedPrice = activeWatch?.price_type === 'buy' ? highestBuy?.buy_price_max : cheapestSell?.sell_price_min
  const watchTriggered = activeWatch && (activeWatch.condition_met || alertConditionMet(activeWatch, watchedPrice))

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeWatch) {
        setWatchDirection(activeWatch.direction)
        setWatchTarget(String(activeWatch.target_price))
      } else {
        setWatchTarget('')
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [activeWatch, activeWatchKey])

  return (
    <section className="aopp-panel overflow-visible border-[#d8ad4a]/20" aria-labelledby="market-intelligence-title">
      <div className="relative overflow-hidden border-b border-white/8 p-5 sm:p-7 lg:p-8">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-amber-400/8 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-6 xl:flex-row xl:items-end">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-2 text-[9px] font-black uppercase tracking-[.24em] text-[#e5bb55]">
              <Sparkles className="h-3.5 w-3.5" /> Wywiad handlowy AOPP
            </div>
            <h2 id="market-intelligence-title" className="font-display text-2xl font-black text-[#fff8e8] sm:text-3xl">
              Sprawdź rynek, zanim wyruszysz z transportem.
            </h2>
            <p className="mt-3 max-w-2xl text-xs leading-6 text-[#9c968d] sm:text-sm">
              Porównaj zlecenia kupna i sprzedaży w królewskich miastach, prześledź historię ceny i policz realną marżę po opłatach.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-[.14em]">
            <span className="flex items-center gap-1.5 rounded-lg border border-emerald-400/20 bg-emerald-400/8 px-3 py-2 text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" /> Dane przez własne API</span>
            <span className="flex items-center gap-1.5 rounded-lg border border-sky-400/20 bg-sky-400/8 px-3 py-2 text-sky-300"><RefreshCw className="h-3.5 w-3.5" /> Cache 60 sekund</span>
          </div>
        </div>
      </div>

      <div className="grid gap-0 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-6 border-b border-white/8 p-5 sm:p-6 xl:border-b-0 xl:border-r">
          <div className="space-y-2">
            <label htmlFor="market-item-search" className="text-[9px] font-black uppercase tracking-[.18em] text-[#8f8a81]">Przedmiot</label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#918b82] pointer-events-none" />
              <input
                id="market-item-search"
                value={query}
                onChange={(event) => { setQuery(event.target.value); setSearchOpen(true) }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Nazwa lub ID, np. T4_BAG"
                className="input-with-icon w-full rounded-xl border border-white/10 bg-black/25 py-3 !pl-12 pr-10 text-xs text-[#fff8e8] outline-none transition focus:border-[#e5bb55]/60"
                autoComplete="off"
              />
              {query && <button type="button" aria-label="Wyczyść wyszukiwanie" onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#918b82] hover:text-white"><X className="h-4 w-4" /></button>}

              {searchOpen && query.trim().length >= 2 && (
                <div className="absolute inset-x-0 top-[calc(100%+.5rem)] z-30 max-h-80 overflow-y-auto rounded-2xl border border-[#d8ad4a]/20 bg-[#0b0807] p-2 shadow-2xl shadow-black/70">
                  {searchLoading ? (
                    <div className="flex items-center justify-center gap-2 px-3 py-8 text-xs text-[#8f8a81]"><LoaderCircle className="h-4 w-4 animate-spin" /> Przeszukuję katalog...</div>
                  ) : searchResults.length ? searchResults.map((item) => (
                    <button key={item.id} type="button" onClick={() => selectItem(item)} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-white/5">
                      <Image src={itemImageUrl(item.id)} alt="" width={40} height={40} unoptimized className="h-10 w-10 object-contain" />
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-bold text-[#eee7d9]">{item.name}</span>
                        <span className="block truncate font-mono text-[9px] text-[#918b82]">{item.id}</span>
                      </span>
                    </button>
                  )) : (
                    <button type="button" onClick={() => selectItem({ id: query.trim().toUpperCase(), name: query.trim().toUpperCase(), category: 'other' })} className="w-full rounded-xl border border-dashed border-white/10 px-3 py-5 text-center text-xs text-[#8f8a81] hover:border-[#e5bb55]/30 hover:text-[#e5bb55]">
                      Brak wyniku. Użyj „{query.trim().toUpperCase()}” jako ID przedmiotu.
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[#d8ad4a]/15 bg-[#d8ad4a]/5 p-3">
            <Image src={itemImageUrl(selectedItem.id, quality)} alt="" width={56} height={56} unoptimized className="h-14 w-14 object-contain drop-shadow-xl" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-[#fff8e8]">{selectedItem.name}</p>
              <p className="mt-1 truncate font-mono text-[9px] text-[#918b82]">{selectedItem.id}</p>
            </div>
            <button type="button" onClick={toggleFavorite} aria-label={isFavorite ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'} aria-pressed={isFavorite} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${isFavorite ? 'border-[#e5bb55]/40 bg-[#e5bb55]/10 text-[#e5bb55]' : 'border-white/10 text-[#918b82] hover:text-[#e5bb55]'}`}>
              <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>

          {favorites.length > 0 && (
            <div>
              <p className="mb-2 text-[9px] font-black uppercase tracking-[.18em] text-[#918b82]">Ulubione</p>
              <div className="flex flex-wrap gap-1.5">
                {favorites.map((item) => (
                  <button key={item.id} type="button" onClick={() => selectItem(item)} title={item.name} className="rounded-lg border border-white/8 bg-black/20 px-2.5 py-1.5 font-mono text-[9px] text-[#a9a49b] transition hover:border-[#e5bb55]/30 hover:text-[#e5bb55]">{item.id}</button>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-white/8 bg-black/15 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.16em] text-[#8f8a81]"><BellRing className="h-3.5 w-3.5 text-[#e5bb55]" /> Obserwowana cena · {historyCity}</p>
              {activeWatch && <span className="text-[8px] font-bold uppercase text-emerald-300">Zapisana</span>}
            </div>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-[130px_150px_1fr_auto] items-center">
              <div>
                <CustomSelect
                  value={watchDirection}
                  onChange={(val) => setWatchDirection(val)}
                  options={[
                    { value: 'below', label: 'Sprzedaż ≤' },
                    { value: 'above', label: 'Kupno ≥' },
                  ]}
                />
              </div>
              <div>
                <CustomSelect
                  value={historyCity}
                  onChange={(val) => setHistoryCity(val)}
                  options={CITIES.map((city) => ({ value: city, label: city }))}
                />
              </div>
              <label><span className="sr-only">Próg ceny w silver</span><input type="number" min="0" value={watchTarget} onChange={(event) => setWatchTarget(event.target.value)} placeholder="Cena" className="min-h-11 w-full min-w-0 rounded-lg border border-white/10 bg-[#080605] px-2 py-2 font-mono text-[10px] text-[#eee7d9] outline-none focus:border-[#e5bb55]/40" /></label>
              <div className="flex gap-1.5">
                <button type="button" onClick={savePriceWatch} disabled={watchSaving} className="min-h-11 rounded-lg border border-[#e5bb55]/20 bg-[#e5bb55]/8 px-3 text-[9px] font-black uppercase text-[#e5bb55] hover:bg-[#e5bb55]/12 disabled:opacity-50">{watchSaving ? 'Zapisuję' : 'Zapisz'}</button>
                {activeWatch && <button type="button" onClick={deletePriceWatch} disabled={watchSaving} className="min-h-11 rounded-lg border border-rose-400/20 bg-rose-400/8 px-3 text-[9px] font-black uppercase text-rose-300 hover:bg-rose-400/12 disabled:opacity-50">Usuń</button>}
              </div>
            </div>
            <p className="mt-2 text-[9px] leading-4 text-[#9b958b]">Alert jest zapisany na koncie dla wybranego miasta i jakości. Portal sprawdza go w tle i wysyła powiadomienie po przekroczeniu progu.</p>
            {watchMessage && <p className="mt-2 text-[9px] font-bold text-sky-300" role="status">{watchMessage}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <CustomSelect
                label="Region"
                value={region}
                onChange={(val) => setRegion(val)}
                options={REGION_OPTIONS}
              />
            </div>
            <div>
              <CustomSelect
                label="Jakość"
                value={quality}
                onChange={(val) => setQuality(Number(val))}
                options={QUALITY_OPTIONS}
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#918b82]">Porównywane miasta</p>
              <button type="button" onClick={() => setActiveCities(activeCities.length === CITIES.length ? [] : CITIES)} className="-my-2 inline-flex min-h-11 items-center rounded-lg px-2 text-[9px] font-bold text-sky-300 hover:text-sky-200">{activeCities.length === CITIES.length ? 'Wyczyść' : 'Wszystkie'}</button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {CITIES.map((city) => {
                const active = activeCities.includes(city)
                return (
                  <button key={city} type="button" onClick={() => toggleCity(city)} aria-pressed={active} className={`flex min-h-11 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[10px] transition ${active ? 'border-sky-400/25 bg-sky-400/8 text-sky-200' : 'border-white/8 bg-black/15 text-[#918b82]'}`}>
                    <span className={`flex h-3.5 w-3.5 items-center justify-center rounded border ${active ? 'border-sky-300 bg-sky-300 text-black' : 'border-white/15'}`}>{active && <Check className="h-2.5 w-2.5" />}</span>
                    <span className="truncate">{city}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] items-end">
            <div>
              <CustomSelect
                value={range}
                onChange={(val) => setRange(val)}
                options={[
                  { value: '24h', label: 'Historia: 24 godziny' },
                  { value: '7d', label: 'Historia: 7 dni' },
                  { value: '30d', label: 'Historia: 30 dni' },
                ]}
              />
            </div>
            <button type="button" onClick={analyzeMarket} disabled={loading} className="aopp-primary-button min-h-11 w-full justify-center disabled:cursor-wait disabled:opacity-60 sm:min-w-32">
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
              {loading ? 'Analizuję' : 'Analizuj'}
            </button>
          </div>

          {error && <div role="alert" className="flex gap-2 rounded-xl border border-rose-400/20 bg-rose-400/8 p-3 text-xs leading-5 text-rose-200"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}
        </aside>

        <div className="min-w-0 p-5 sm:p-6 lg:p-8">
          {!hasAnalyzed ? (
            <div className="flex min-h-[520px] flex-col justify-center">
              <div className="mx-auto max-w-xl text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#e5bb55]/20 bg-[#e5bb55]/8 text-[#e5bb55]"><TrendingUp className="h-7 w-7" /></div>
                <h3 className="font-display mt-5 text-2xl font-black text-[#fff8e8]">Twoja przewaga zaczyna się od danych.</h3>
                <p className="mx-auto mt-3 max-w-md text-xs leading-6 text-[#8f8a81]">Wybierz przedmiot, miasta i jakość. Jedno zapytanie przygotuje raport cen, trend oraz kalkulację potencjalnego transportu.</p>
              </div>
              <div className="mx-auto mt-8 grid w-full max-w-3xl gap-3 sm:grid-cols-3">
                {[
                  [MapPinned, '7 miast', 'Porównanie zleceń w jednym widoku'],
                  [Clock3, 'Świeżość', 'Widzisz wiek ostatniego skanu'],
                  [Calculator, 'Realna marża', 'Podatek, wystawienie i transport'],
                ].map(([Icon, title, description]) => (
                  <div key={title} className="rounded-2xl border border-white/8 bg-black/15 p-4 text-center">
                    <Icon className="mx-auto h-5 w-5 text-sky-300" />
                    <p className="mt-3 text-xs font-black text-[#d8d2c8]">{title}</p>
                    <p className="mt-1 text-[10px] leading-4 text-[#918b82]">{description}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-7">
              {watchTriggered && (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-400/8 p-4 text-emerald-200">
                  <div className="rounded-xl bg-emerald-400/10 p-2"><BellRing className="h-5 w-5" /></div>
                  <div><p className="text-xs font-black">Próg obserwowanej ceny został osiągnięty</p><p className="mt-1 text-[10px] text-emerald-200/70">Aktualny skan: {formatSilver(watchedPrice || activeWatch.last_observed_price)} · próg: {activeWatch.direction === 'above' ? 'co najmniej' : 'nie więcej niż'} {formatSilver(activeWatch.target_price)}</p></div>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Najtańsza sprzedaż" value={formatSilver(cheapestSell?.sell_price_min)} detail={cheapestSell?.city || 'Brak aktywnego zlecenia'} />
                <Metric label="Najwyższe kupno" value={formatSilver(highestBuy?.buy_price_max)} detail={highestBuy?.city || 'Brak aktywnego zlecenia'} tone="sky" />
                <Metric label="Spread brutto" value={cheapestSell && highestBuy ? formatSignedSilver(highestBuy.buy_price_max - cheapestSell.sell_price_min) : '—'} detail="Przed opłatami i transportem" tone={cheapestSell && highestBuy && highestBuy.buy_price_max >= cheapestSell.sell_price_min ? 'emerald' : 'rose'} />
                <Metric
                  label="Kurs złota"
                  value={formatSilver(currentGold)}
                  detail={goldDelta == null
                    ? (goldError || 'Brak dwóch notowań do obliczenia zmiany')
                    : `${goldDelta >= 0 ? '+' : ''}${goldDelta.toFixed(2)}% od poprzedniego odczytu`}
                />
              </div>

              <div>
                <div className="mb-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[.2em] text-sky-300">Królewskie rynki</p>
                    <h3 className="font-display mt-1 text-xl font-black text-[#fff8e8]">Porównanie zleceń</h3>
                  </div>
                  <p className="flex items-center gap-1.5 text-[10px] text-[#918b82]"><Clock3 className="h-3.5 w-3.5" /> API pobrane {meta?.fetchedAt ? new Date(meta.fetchedAt).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                </div>

                {priceRows.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-amber-400/20 bg-amber-400/5 px-5 py-10 text-center text-xs text-amber-200">Brak skanów dla tej kombinacji przedmiotu, jakości i miast.</div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-white/8">
                    <div className="hidden grid-cols-[1.2fr_1fr_1fr_.8fr] gap-3 border-b border-white/8 bg-white/[.025] px-4 py-3 text-[9px] font-black uppercase tracking-[.14em] text-[#918b82] md:grid">
                      <span>Miasto</span><span>Zlecenie sprzedaży</span><span>Zlecenie kupna</span><span>Ostatni skan</span>
                    </div>
                    {priceRows.map((row) => (
                      <div key={`${row.city}-${row.quality}`} className="grid gap-3 border-b border-white/6 bg-black/10 px-4 py-4 last:border-b-0 md:grid-cols-[1.2fr_1fr_1fr_.8fr] md:items-center">
                        <div className="flex items-center gap-2 font-bold text-[#eee7d9]"><MapPinned className="h-4 w-4 text-sky-300" />{row.city}</div>
                        <div><span className="mb-1 block text-[8px] font-black uppercase tracking-[.12em] text-[#918b82] md:hidden">Sprzedaż</span><span className="font-mono text-sm font-bold text-[#e5bb55]">{formatSilver(row.sell_price_min)}</span></div>
                        <div><span className="mb-1 block text-[8px] font-black uppercase tracking-[.12em] text-[#918b82] md:hidden">Kupno</span><span className="font-mono text-sm font-bold text-sky-300">{formatSilver(row.buy_price_max)}</span></div>
                        <div><span className={`inline-flex rounded-lg border px-2 py-1 text-[9px] font-bold ${freshnessClasses(row.freshness.tone)}`}>{row.freshness.label}</span></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-black/10 p-4 sm:p-5">
                  <div className="mb-4 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#e5bb55]">Średnia cena transakcji</p>
                      <h3 className="font-display mt-1 text-lg font-black text-[#fff8e8]">Historia przedmiotu</h3>
                    </div>
                    <div className="min-w-36">
                      <CustomSelect
                        value={historyCity}
                        onChange={(val) => setHistoryCity(val)}
                        options={CITIES.map((city) => ({ value: city, label: city }))}
                      />
                    </div>
                  </div>
                  <LineChart points={historyPoints} emptyText="Brak wystarczających transakcji w wybranym okresie." />
                </div>
                <div className="rounded-2xl border border-white/8 bg-black/10 p-4 sm:p-5">
                  <div className="mb-4">
                    <p className="text-[9px] font-black uppercase tracking-[.18em] text-sky-300">Srebro za 1 złoto</p>
                    <h3 className="font-display mt-1 text-lg font-black text-[#fff8e8]">Kurs złota — {range}</h3>
                    <p className={`mt-1 text-[9px] ${goldMeta?.freshness === 'stale' ? 'text-amber-300' : 'text-[#918b82]'}`}>
                      {goldError
                        ? `Niedostępne: ${goldError}`
                        : goldMeta?.latestAt
                          ? `Ostatnie notowanie: ${new Date(goldMeta.latestAt).toLocaleString('pl-PL')}${goldMeta.freshness === 'stale' ? ` · stare dane (${goldMeta.ageHours} h)` : ''}`
                          : 'Oczekiwanie na dane źródłowe'}
                    </p>
                  </div>
                  <LineChart points={goldPoints} tone="sky" emptyText={goldError || 'Brak danych o kursie złota dla tego regionu.'} />
                </div>
                <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[.025] p-4 sm:p-5 lg:col-span-2 2xl:col-span-1">
                  <div className="mb-4">
                    <p className="text-[9px] font-black uppercase tracking-[.18em] text-emerald-300">Historia portalu</p>
                    <h3 className="font-display mt-1 text-lg font-black text-[#fff8e8]">{watchDirection === 'above' ? 'Najwyższe kupno' : 'Najniższa sprzedaż'} — {historyCity}</h3>
                    <p className="mt-1 text-[9px] text-[#918b82]">Próbki zapisywane podczas analiz i kontroli alertów · retencja 90 dni</p>
                  </div>
                  <LineChart points={serverHistoryPoints} tone="sky" emptyText="Pierwsza próbka została zapisana. Trend pojawi się po kolejnym odczycie w innej godzinie." />
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-[#d8ad4a]/15 bg-[#d8ad4a]/[.035] p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-[#e5bb55]/20 bg-[#e5bb55]/8 p-2 text-[#e5bb55]"><Calculator className="h-4 w-4" /></div>
                    <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#e5bb55]">Kalkulator</p><h3 className="font-display text-lg font-black text-[#fff8e8]">Marża po opłatach</h3></div>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    {[
                      ['Koszt zakupu', buyCost, setBuyCost],
                      ['Cena sprzedaży', sellPrice, setSellPrice],
                      ['Podatek (%)', taxRate, setTaxRate],
                      ['Wystawienie (%)', setupFee, setSetupFee],
                    ].map(([label, value, setter]) => (
                      <label key={label} className="text-[9px] font-black uppercase tracking-[.12em] text-[#918b82]">{label}<input type="number" min="0" step="0.1" value={value} onChange={(event) => setter(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 font-mono text-xs normal-case text-[#eee7d9] outline-none focus:border-[#e5bb55]/40" /></label>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <Metric label="Opłaty" value={formatSilver(marginResult.fees, true)} />
                    <Metric label="Zysk netto" value={formatSignedSilver(marginResult.profit, true)} tone={marginResult.profit >= 0 ? 'emerald' : 'rose'} />
                    <Metric label="ROI" value={`${marginResult.roi >= 0 ? '+' : ''}${marginResult.roi.toFixed(1)}%`} tone={marginResult.roi >= 0 ? 'emerald' : 'rose'} />
                  </div>
                </div>

                <div className="rounded-2xl border border-sky-400/15 bg-sky-400/[.03] p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-sky-400/20 bg-sky-400/8 p-2 text-sky-300"><MapPinned className="h-4 w-4" /></div>
                    <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-sky-300">Szlak kupiecki</p><h3 className="font-display text-lg font-black text-[#fff8e8]">Arbitraż między miastami</h3></div>
                  </div>
                  {cheapestSell && highestBuy ? (
                    <>
                      <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/20 p-3">
                        <div><p className="text-[8px] font-black uppercase text-[#918b82]">Kup najtaniej</p><p className="mt-1 text-xs font-bold text-[#e5bb55]">{cheapestSell.city}</p><p className="font-mono text-[10px] text-[#8f8a81]">{formatSilver(cheapestSell.sell_price_min)}</p></div>
                        <ArrowRight className="h-5 w-5 text-sky-300" />
                        <div className="text-right"><p className="text-[8px] font-black uppercase text-[#918b82]">Sprzedaj do zlecenia</p><p className="mt-1 text-xs font-bold text-sky-300">{highestBuy.city}</p><p className="font-mono text-[10px] text-[#8f8a81]">{formatSilver(highestBuy.buy_price_max)}</p></div>
                      </div>
                      <label className="mt-3 block text-[9px] font-black uppercase tracking-[.12em] text-[#918b82]">Koszt transportu / ryzyka<input type="number" min="0" value={transportCost} onChange={(event) => setTransportCost(event.target.value)} className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 font-mono text-xs normal-case text-[#eee7d9] outline-none focus:border-sky-400/40" /></label>
                      {arbitrageResult ? (
                        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/8 bg-black/20 p-3"><span className="text-[10px] text-[#8f8a81]">Potencjalny wynik</span><span className={`font-display text-lg font-black ${arbitrageResult.profit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{formatSignedSilver(arbitrageResult.profit)} <small className="font-mono text-[9px]">({arbitrageResult.roi >= 0 ? '+' : ''}{arbitrageResult.roi.toFixed(1)}%)</small></span></div>
                      ) : <p className="mt-4 text-[10px] text-[#918b82]">Najlepsze zlecenia są w tym samym mieście — brak trasy arbitrażowej.</p>}
                    </>
                  ) : <p className="mt-6 rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-[#918b82]">Za mało zleceń, aby wyznaczyć trasę.</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/8 bg-black/15 px-5 py-4 text-[10px] leading-5 text-[#918b82] sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <p className="flex max-w-4xl items-start gap-2"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" /><span>Dane pochodzą ze społecznościowych skanów Albion Online Data Project. Nie są oficjalnym ani gwarantowanym podglądem rynku w czasie rzeczywistym — zawsze potwierdź cenę w grze.</span></p>
        <a href="https://www.albion-online-data.com/" target="_blank" rel="noreferrer" className="inline-flex min-h-6 shrink-0 items-center font-bold text-sky-300 hover:text-sky-200">O źródle danych</a>
      </div>
    </section>
  )
}
