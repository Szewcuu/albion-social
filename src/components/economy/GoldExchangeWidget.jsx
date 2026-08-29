'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Coins, ArrowRightLeft, TrendingUp, TrendingDown, RefreshCw, ShieldCheck } from 'lucide-react'
import CustomSelect from '@/components/ui/CustomSelect'

const RANGES = [
  { id: '24h', label: '24h' },
  { id: '7d', label: '7 Dni' },
  { id: '30d', label: '30 Dni' },
]

export default function GoldExchangeWidget() {
  const [region, setRegion] = useState('europe')
  const [range, setRange] = useState('7d')
  const [goldData, setGoldData] = useState([])
  const [meta, setMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [goldInput, setGoldInput] = useState(100)
  const [hoveredPoint, setHoveredPoint] = useState(null)

  const fetchGoldHistory = useCallback(async () => {
    try {
      setError('')
      const res = await fetch(`/api/prices?mode=gold&region=${region}&range=${range}`)
      const result = await res.json()
      if (!res.ok) throw new Error(result?.error?.message || `HTTP ${res.status}`)
      const rawPoints = Array.isArray(result.data) ? result.data : []
      const formattedPoints = rawPoints
        .filter(p => p && p.price > 0)
        .map(p => ({
          price: Number(p.price),
          timestamp: p.timestamp,
        }))
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      if (!formattedPoints.length) throw new Error('Brak punktów kursu')

      setGoldData(formattedPoints)
      setMeta(result.meta || null)
    } catch (requestError) {
      setGoldData([])
      setMeta(null)
      setError(`${requestError.message || 'Aktualny kurs złota jest chwilowo niedostępny.'} Kalkulator został wyłączony, aby nie pokazywać zmyślonej ceny.`)
    } finally {
      setLoading(false)
    }
  }, [range, region])

  useEffect(() => {
    void Promise.resolve().then(fetchGoldHistory)
  }, [fetchGoldHistory])

  const latestPrice = useMemo(() => {
    if (!goldData.length) return null
    return goldData[goldData.length - 1].price
  }, [goldData])

  const silverResult = useMemo(() => {
    if (!latestPrice) return null
    return Math.round(goldInput * latestPrice)
  }, [goldInput, latestPrice])

  const stats = useMemo(() => {
    if (!goldData.length) return null
    const prices = goldData.map(d => d.price)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const avg = Math.round(prices.reduce((sum, p) => sum + p, 0) / prices.length)
    const first = prices[0]
    const last = prices[prices.length - 1]
    const change = last - first
    const changePercent = first > 0 ? Number(((change / first) * 100).toFixed(2)) : 0

    return { min, max, avg, first, last, change, changePercent }
  }, [goldData])

  const chartSvg = useMemo(() => {
    if (!goldData.length || goldData.length < 2) return null

    const width = 600
    const height = 130
    const padding = 15

    const prices = goldData.map(d => d.price)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const rangeVal = max - min || 1

    const points = goldData.map((pt, i) => {
      const x = padding + (i / (goldData.length - 1)) * (width - padding * 2)
      const y = height - padding - ((pt.price - min) / rangeVal) * (height - padding * 2)
      return { x, y, pt }
    })

    const pathD = points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '')
    const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${height - padding} L ${points[0].x.toFixed(1)} ${height - padding} Z`

    return { width, height, points, pathD, areaD }
  }, [goldData])

  return (
    <div className="panel p-5 space-y-4 border-amber-400/30 bg-amber-950/10 rounded-3xl animate-fade-in">
      {/* HEADER & REGION / RANGE SWITCHER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/8 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-300 border border-amber-400/30 shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="badge badge-amber font-mono text-[9px] uppercase font-bold">Gold Live Exchange</span>
              <span className="text-[10px] text-gray-400 font-mono">Albion Data API</span>
            </div>
            <h3 className="font-display text-base font-bold text-white mt-0.5">Wykres Kursu Złota i Kalkulator Giełdowy</h3>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          {/* Region selector */}
          <CustomSelect
            label="Region rynku złota"
            value={region}
            onChange={(nextRegion) => {
              setLoading(true)
              setRegion(nextRegion)
            }}
            options={[
              { value: 'europe', label: 'Europa (AMS)' },
              { value: 'america', label: 'Ameryka (NWA)' },
              { value: 'asia', label: 'Azja (SGP)' },
            ]}
            className="min-w-40"
          />

          {/* Range selector */}
          <div className="flex items-center rounded-xl border border-white/10 bg-black/50 p-1">
            {RANGES.map(r => (
              <button
                key={r.id}
                onClick={() => {
                  setLoading(true)
                  setRange(r.id)
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  range === r.id ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40' : 'text-gray-400 hover:text-white'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setLoading(true)
              fetchGoldHistory()
            }}
            disabled={loading}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
            title="Odśwież dane"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/8 space-y-1">
          <span className="text-[9px] text-gray-400 uppercase block">Aktualny Kurs (1 Gold)</span>
          <p className="text-xl font-black text-amber-300">{latestPrice ? latestPrice.toLocaleString() : '—'} <span className="text-xs font-normal text-gray-400">Silver</span></p>
        </div>

        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/8 space-y-1">
          <span className="text-[9px] text-gray-400 uppercase block">Najniższy / Najwyższy</span>
          <p className="text-sm font-bold text-gray-200">
            <span className="text-emerald-400">{stats?.min?.toLocaleString() || '-'}</span>
            <span className="text-gray-500 mx-1">/</span>
            <span className="text-rose-400">{stats?.max?.toLocaleString() || '-'}</span>
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/8 space-y-1">
          <span className="text-[9px] text-gray-400 uppercase block">Średni Kurs ({range})</span>
          <p className="text-sm font-bold text-amber-200">{stats?.avg?.toLocaleString() || '-'} Silver</p>
        </div>

        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/8 space-y-1">
          <span className="text-[9px] text-gray-400 uppercase block">Zmiana Kursu ({range})</span>
          <p className={`text-sm font-bold flex items-center gap-1 ${stats && stats.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {stats && stats.changePercent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            {stats ? `${stats.changePercent >= 0 ? '+' : ''}${stats.changePercent}%` : '-'}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-400/25 bg-rose-400/8 px-4 py-3 text-xs leading-5 text-rose-200" role="status">
          {error}
        </div>
      )}

      {!error && meta?.freshness === 'stale' && (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/8 px-4 py-3 text-xs leading-5 text-amber-100" role="status">
          Ostatnie prawdziwe notowanie ma {meta.ageHours} h. Wynik może być nieaktualny — sprawdź kurs w grze przed transakcją.
        </div>
      )}

      {/* HISTORICAL CHART CANVAS */}
      <div className="relative w-full overflow-hidden rounded-2xl bg-black/50 border border-white/8 p-3">
        {loading ? (
          <div className="h-28 flex items-center justify-center text-xs text-gray-500 font-mono gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
            <span>Pobieranie wykresu historii kursu złota...</span>
          </div>
        ) : chartSvg ? (
          <div className="relative">
            <svg viewBox={`0 0 ${chartSvg.width} ${chartSvg.height}`} className="w-full h-auto overflow-visible">
              <defs>
                <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              <path d={chartSvg.areaD} fill="url(#goldGradient)" />
              <path d={chartSvg.pathD} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              {chartSvg.points.map((ptNode, idx) => (
                <circle
                  key={idx}
                  cx={ptNode.x}
                  cy={ptNode.y}
                  r="3.5"
                  className="fill-amber-400 hover:r-6 hover:fill-amber-300 transition-all cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(ptNode)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}
            </svg>

            {/* HOVER TOOLTIP */}
            {hoveredPoint && (
              <div
                className="absolute z-20 pointer-events-none bg-black/90 border border-amber-400/50 p-2 rounded-xl text-[10px] font-mono text-white shadow-xl -translate-x-1/2 -translate-y-full mb-2"
                style={{ left: `${(hoveredPoint.x / chartSvg.width) * 100}%`, top: `${(hoveredPoint.y / chartSvg.height) * 100}%` }}
              >
                <div className="text-amber-300 font-bold">{hoveredPoint.pt.price.toLocaleString()} Silver</div>
                <div className="text-gray-400 text-[9px]">{new Date(hoveredPoint.pt.timestamp).toLocaleString('pl-PL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-24 flex items-center justify-center text-xs text-gray-500 font-mono">
            Brak wpisów historii kursu Złota.
          </div>
        )}
      </div>

      {/* CURRENCY CONVERTER & PREMIUM CALCULATOR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs pt-1 border-t border-white/8">
        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/8 space-y-2">
          <span className="text-[10px] text-sky-400 font-bold uppercase flex items-center gap-1">
            <ArrowRightLeft className="w-3.5 h-3.5" /> Kalkulator Wymiany (Gold ⇄ Silver)
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              aria-label="Ilość złota do przeliczenia"
              min={1}
              max={1000000}
              value={goldInput}
              onChange={e => setGoldInput(Math.max(1, Number(e.target.value) || 1))}
              disabled={!latestPrice}
              className="w-24 bg-black/70 border border-white/15 rounded-xl p-2 text-amber-300 font-bold text-xs text-center outline-none focus:border-amber-400"
              placeholder="Gold"
            />
            <span className="text-gray-400">Gold =</span>
            <span className="font-bold text-emerald-300 text-sm">{silverResult ? `${silverResult.toLocaleString()} Silver` : 'Brak kursu'}</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/8 space-y-1.5 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-3 text-[10px]">
            <span className="text-amber-400 font-bold uppercase flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Wartość wybranej ilości
            </span>
            <span className="text-gray-400">{goldInput.toLocaleString('pl-PL')} Gold</span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-gray-300">Wymagane Srebro:</span>
            <span className="text-base font-black text-amber-300 font-mono">
              {silverResult ? `${silverResult.toLocaleString('pl-PL')} Silver` : 'Brak kursu'}
            </span>
          </div>
          <p className="text-[9px] text-gray-500">
            {meta?.latestAt ? `Ostatnie notowanie: ${new Date(meta.latestAt).toLocaleString('pl-PL')}` : 'Źródło: Albion Online Data Project'}
          </p>
        </div>
      </div>
    </div>
  )
}
