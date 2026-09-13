'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Coins, ArrowRightLeft, TrendingUp, TrendingDown, RefreshCw, ShieldCheck } from 'lucide-react'
import CustomSelect from '@/components/ui/CustomSelect'
import { LoadingState } from '@/components/ui/FeedbackState'

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

    const width = 680
    const height = 190
    const padTop = 20
    const padBottom = 28
    const padLeft = 62
    const padRight = 20

    const prices = goldData.map(d => d.price)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const rangeVal = max - min || 1

    const chartWidth = width - padLeft - padRight
    const chartHeight = height - padTop - padBottom

    const points = goldData.map((pt, i) => {
      const x = padLeft + (i / (goldData.length - 1)) * chartWidth
      const y = padTop + (1 - (pt.price - min) / rangeVal) * chartHeight
      return { x, y, pt }
    })

    const pathD = points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '')
    const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${padTop + chartHeight} L ${points[0].x.toFixed(1)} ${padTop + chartHeight} Z`

    const gridLevels = [0, 0.33, 0.66, 1].map(ratio => ({
      y: padTop + ratio * chartHeight,
      price: Math.round(max - ratio * rangeVal),
    }))

    const firstDate = new Date(goldData[0].timestamp).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
    const midDate = new Date(goldData[Math.floor(goldData.length / 2)].timestamp).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
    const lastDate = new Date(goldData[goldData.length - 1].timestamp).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })

    return {
      width,
      height,
      padLeft,
      padRight,
      padTop,
      padBottom,
      chartWidth,
      chartHeight,
      points,
      pathD,
      areaD,
      gridLevels,
      firstDate,
      midDate,
      lastDate,
      min,
      max,
    }
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
      <div className="relative w-full overflow-hidden rounded-2xl border border-amber-500/25 bg-gradient-to-b from-[#180f0a] via-[#100a06] to-[#080504] p-3.5 sm:p-4 shadow-2xl shadow-black/80">
        <div className="mb-2 flex items-center justify-between text-[9px] font-mono uppercase tracking-wider text-amber-200/60 border-b border-white/[0.05] pb-2">
          <span className="flex items-center gap-1.5 font-bold text-amber-300">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            Notowania giełdowe złota (Srebro za 1 Złoto)
          </span>
          <span className="text-[#8e8579]">
            Zakres: {chartSvg?.firstDate} — {chartSvg?.lastDate}
          </span>
        </div>

        {loading ? (
          <LoadingState label="Pobieranie wykresu kursu złota…" compact className="min-h-36 border-0 bg-transparent" />
        ) : chartSvg ? (
          <div className="relative">
            <svg viewBox={`0 0 ${chartSvg.width} ${chartSvg.height}`} className="w-full h-auto overflow-visible select-none">
              <defs>
                <linearGradient id="goldAreaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.32" />
                  <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="goldLineGradient" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="50%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#fef08a" />
                </linearGradient>
                <filter id="goldGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#f59e0b" floodOpacity="0.75" />
                </filter>
              </defs>

              {/* Poziome linie siatki i etykiety cenowe po lewej stronie */}
              {chartSvg.gridLevels.map((lvl, idx) => (
                <g key={idx}>
                  <line
                    x1={chartSvg.padLeft}
                    y1={lvl.y}
                    x2={chartSvg.width - chartSvg.padRight}
                    y2={lvl.y}
                    stroke="rgba(218, 184, 105, 0.09)"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={chartSvg.padLeft - 8}
                    y={lvl.y + 3.5}
                    textAnchor="end"
                    className="text-[9px] font-mono fill-amber-200/50"
                  >
                    {lvl.price.toLocaleString()}
                  </text>
                </g>
              ))}

              {/* Znaczniki dat na osi X */}
              <text x={chartSvg.padLeft} y={chartSvg.height - 6} textAnchor="start" className="text-[9px] font-mono fill-[#938b80]">
                {chartSvg.firstDate}
              </text>
              <text x={chartSvg.padLeft + chartSvg.chartWidth / 2} y={chartSvg.height - 6} textAnchor="middle" className="text-[9px] font-mono fill-[#938b80]">
                {chartSvg.midDate}
              </text>
              <text x={chartSvg.width - chartSvg.padRight} y={chartSvg.height - 6} textAnchor="end" className="text-[9px] font-mono fill-[#938b80]">
                {chartSvg.lastDate}
              </text>

              {/* Wypełnienie i złota linia z poświatą */}
              <path d={chartSvg.areaD} fill="url(#goldAreaGradient)" />
              <path
                d={chartSvg.pathD}
                fill="none"
                stroke="url(#goldLineGradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#goldGlowFilter)"
              />

              {/* Pionowa linia crosshair przy hover */}
              {hoveredPoint && (
                <line
                  x1={hoveredPoint.x}
                  y1={chartSvg.padTop}
                  x2={hoveredPoint.x}
                  y2={chartSvg.padTop + chartSvg.chartHeight}
                  stroke="rgba(251, 191, 36, 0.45)"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
              )}

              {/* Punkty danych na wykresie */}
              {chartSvg.points.map((ptNode, idx) => (
                <circle
                  key={idx}
                  cx={ptNode.x}
                  cy={ptNode.y}
                  r="3.5"
                  className="fill-amber-400 hover:r-[6px] hover:fill-amber-200 transition-all cursor-pointer drop-shadow-[0_0_4px_rgba(245,158,11,0.8)]"
                  onMouseEnter={() => setHoveredPoint(ptNode)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}

              {/* Aktywny pierścień wokół zaznaczonego punktu */}
              {hoveredPoint && (
                <circle
                  cx={hoveredPoint.x}
                  cy={hoveredPoint.y}
                  r="6.5"
                  className="fill-amber-200 stroke-[#180f0a] stroke-2 pointer-events-none"
                />
              )}
            </svg>

            {/* Pływający Tooltip z dokładnymi danymi */}
            {hoveredPoint && (
              <div
                className="absolute z-30 pointer-events-none rounded-xl border border-amber-400/50 bg-[#140c08]/95 px-3 py-2 text-[10px] font-mono text-white shadow-2xl backdrop-blur-md -translate-x-1/2 -translate-y-full mb-3 ring-1 ring-amber-400/20"
                style={{
                  left: `${(hoveredPoint.x / chartSvg.width) * 100}%`,
                  top: `${(hoveredPoint.y / chartSvg.height) * 100}%`,
                }}
              >
                <div className="text-[9px] uppercase tracking-wider text-amber-300/70">Cena notowania</div>
                <div className="text-sm font-bold text-amber-300 leading-tight">
                  {hoveredPoint.pt.price.toLocaleString()} <span className="text-[10px] font-normal text-gray-300">Silver</span>
                </div>
                <div className="text-gray-400 text-[9px] mt-1 border-t border-white/[0.08] pt-1">
                  {new Date(hoveredPoint.pt.timestamp).toLocaleString('pl-PL', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-32 flex items-center justify-center text-xs text-gray-400 font-mono">
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
