'use client'

import { useState, useEffect, useMemo } from 'react'
import { TrendingUp, TrendingDown, Clock, MapPin, RefreshCw, BarChart2, AlertCircle } from 'lucide-react'
import CustomSelect from '@/components/ui/CustomSelect'

const CITIES = ['Caerleon', 'Bridgewatch', 'Fort Sterling', 'Lymhurst', 'Martlock', 'Thetford', 'Brecilien']
const RANGES = [
  { id: '24h', label: '24 Godziny' },
  { id: '7d', label: '7 Dni' },
  { id: '30d', label: '30 Dni' },
]
const MAX_RENDERED_POINTS = 48

function sampleChartPoints(points) {
  if (points.length <= MAX_RENDERED_POINTS) return points

  return Array.from({ length: MAX_RENDERED_POINTS }, (_, index) => {
    const sourceIndex = Math.round((index / (MAX_RENDERED_POINTS - 1)) * (points.length - 1))
    return points[sourceIndex]
  })
}

function formatPriceShort(price) {
  if (!price || price <= 0) return '0'
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(2)}M`
  if (price >= 1_000) return `${(price / 1_000).toFixed(0)}k`
  return price.toLocaleString('pl-PL')
}

function formatDateLabel(isoString, range) {
  if (!isoString) return ''
  const date = new Date(isoString)
  if (range === '24h') {
    return date.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
  }
  return date.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short' })
}

export default function ItemPriceHistoryChart({ itemId, defaultCity = 'Caerleon', compact = false }) {
  const [city, setCity] = useState(defaultCity)
  const [range, setRange] = useState('7d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [hoveredPoint, setHoveredPoint] = useState(null)

  const [allLocationsData, setAllLocationsData] = useState([])

  useEffect(() => {
    if (!itemId) return

    let isMounted = true

    // Query history without city filter so all cities are fetched at once
    fetch(`/api/prices?mode=history&item=${encodeURIComponent(itemId)}&range=${range}`)
      .then(res => res.json())
      .then(resData => {
        if (!isMounted) return
        if (resData.error) {
          setError(resData.error.message || 'Brak danych historycznych dla tego przedmiotu.')
          setAllLocationsData([])
        } else {
          const list = Array.isArray(resData.data) ? resData.data : [resData.data]
          setAllLocationsData(list)
        }
      })
      .catch(() => {
        if (isMounted) {
          setError('Nie udało się połączyć z API historii cen.')
          setAllLocationsData([])
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [itemId, range])

  // Extract history data from the selected city without duplicating derived state.
  const historyData = useMemo(() => {
    if (!allLocationsData || !allLocationsData.length) return []

    const cityClean = city.replace(/\s+/g, '').toLowerCase()
    const match = allLocationsData.find(d => {
      const loc = (d?.location || d?.location_name || d?.Location || '').replace(/\s+/g, '').toLowerCase()
      return loc === cityClean
    })

    const points = match?.data || match?.location_data || []
    const validPoints = points
      .filter(p => p && (p.avg_price > 0 || p.price > 0))
      .map(p => ({
        price: p.avg_price || p.price || 0,
        volume: p.item_count || p.count || 0,
        timestamp: p.timestamp,
      }))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))

    return validPoints
  }, [city, allLocationsData])

  // Identify available cities with scanned data
  const availableCities = useMemo(() => {
    if (!allLocationsData.length) return []
    return allLocationsData
      .filter(d => d && Array.isArray(d.data || d.location_data) && (d.data || d.location_data).some(p => p.avg_price > 0 || p.price > 0))
      .map(d => d.location || d.location_name || d.Location)
      .filter(Boolean)
  }, [allLocationsData])

  const stats = useMemo(() => {
    if (!historyData.length) return null

    const prices = historyData.map(p => p.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)

    const firstPrice = prices[0]
    const lastPrice = prices[prices.length - 1]
    const changePercent = firstPrice > 0 ? (((lastPrice - firstPrice) / firstPrice) * 100).toFixed(1) : 0

    return { minPrice, maxPrice, avgPrice, changePercent: Number(changePercent), firstPrice, lastPrice }
  }, [historyData])

  // SVG Chart Geometry Calculation
  const chartSvg = useMemo(() => {
    if (!historyData || historyData.length < 2) return null

    const renderedData = sampleChartPoints(historyData)

    const width = 500
    const height = compact ? 120 : 160
    const padding = 20

    const prices = renderedData.map(p => p.price)
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const rangeVal = max - min || 1

    const points = renderedData.map((pt, i) => {
      const x = padding + (i / (renderedData.length - 1)) * (width - padding * 2)
      const y = height - padding - ((pt.price - min) / rangeVal) * (height - padding * 2)
      return { x, y, pt }
    })

    const pathD = points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`, '')
    
    // Gradient fill area path
    const areaD = `${pathD} L ${points[points.length - 1].x.toFixed(1)} ${height - padding} L ${points[0].x.toFixed(1)} ${height - padding} Z`

    return { width, height, points, pathD, areaD }
  }, [historyData, compact])

  if (!itemId) return null

  return (
    <div className="panel p-4 space-y-3 border-amber-500/20 bg-amber-950/10">
      {/* HEADER & FILTERS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/8 pb-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold text-white uppercase font-mono">Historia Cen Rynkowych</span>
          <span className="text-[10px] text-amber-300/80 font-mono">({itemId})</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          {/* City selector */}
          <CustomSelect label="Miasto historii cen" value={city} onChange={setCity} options={CITIES} className="min-w-40" />

          {/* Range selector */}
          <div className="flex items-center rounded-lg border border-white/10 bg-black/50 p-0.5">
            {RANGES.map(r => (
              <button
                key={r.id}
                onClick={() => {
                  setLoading(true)
                  setError(null)
                  setRange(r.id)
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${range === r.id ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40' : 'text-gray-400 hover:text-white'}`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      {stats && (
        <div className="grid grid-cols-4 gap-2 font-mono text-[10px]">
          <div className="p-2 rounded-xl bg-black/30 border border-white/5">
            <span className="text-gray-400 block uppercase text-[8px]">Najniższa</span>
            <span className="text-emerald-400 font-bold text-xs">{formatPriceShort(stats.minPrice)}</span>
          </div>
          <div className="p-2 rounded-xl bg-black/30 border border-white/5">
            <span className="text-gray-400 block uppercase text-[8px]">Średnia</span>
            <span className="text-amber-300 font-bold text-xs">{formatPriceShort(stats.avgPrice)}</span>
          </div>
          <div className="p-2 rounded-xl bg-black/30 border border-white/5">
            <span className="text-gray-400 block uppercase text-[8px]">Najwyższa</span>
            <span className="text-rose-300 font-bold text-xs">{formatPriceShort(stats.maxPrice)}</span>
          </div>
          <div className="p-2 rounded-xl bg-black/30 border border-white/5">
            <span className="text-gray-400 block uppercase text-[8px]">Trend</span>
            <span className={`font-bold text-xs flex items-center gap-0.5 ${stats.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stats.changePercent >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {stats.changePercent > 0 ? `+${stats.changePercent}%` : `${stats.changePercent}%`}
            </span>
          </div>
        </div>
      )}

      {/* CHART CANVAS */}
      <div className="relative w-full overflow-hidden rounded-xl bg-black/40 border border-white/5 p-2">
        {loading ? (
          <div className="h-32 flex items-center justify-center text-xs text-gray-500 font-mono gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
            <span>Pobieranie historii transakcji...</span>
          </div>
        ) : error || !historyData.length ? (
          <div className="min-h-32 flex flex-col items-center justify-center text-xs text-gray-400 font-mono gap-1.5 text-center p-4">
            <AlertCircle className="w-5 h-5 text-amber-400/80 mb-0.5" />
            <p className="font-bold text-gray-200">
              {error || `Brak skanów w miasteczku ${city} (${range})`}
            </p>
            <p className="text-[10px] text-gray-400 max-w-sm">
              Gracze z klientem Albion Data Project nie skanowali tego rynku w wybranym okresie. Zmień zakres na 30 Dni lub przełącz miasto.
            </p>
            {availableCities.length > 0 && (
              <div className="pt-2 flex flex-wrap items-center justify-center gap-1.5 text-[10px]">
                <span className="text-gray-400 text-[9px]">Skanowane rynki:</span>
                {availableCities.map(availCity => (
                  <button
                    key={availCity}
                    onClick={() => setCity(availCity)}
                    className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition cursor-pointer font-bold"
                  >
                    {availCity}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : chartSvg && (
          <div className="relative">
            <svg
              viewBox={`0 0 ${chartSvg.width} ${chartSvg.height}`}
              className="w-full h-auto overflow-visible"
            >
              <defs>
                <linearGradient id={`priceGradient-${itemId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Area fill */}
              <path d={chartSvg.areaD} fill={`url(#priceGradient-${itemId})`} />

              {/* Line */}
              <path
                d={chartSvg.pathD}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points & Interactive Nodes */}
              {chartSvg.points.map((ptNode, idx) => (
                <circle
                  key={idx}
                  cx={ptNode.x}
                  cy={ptNode.y}
                  r={hoveredPoint === ptNode.pt ? 5 : 2.5}
                  fill={hoveredPoint === ptNode.pt ? '#ffffff' : '#f59e0b'}
                  stroke="#101118"
                  strokeWidth="1.5"
                  className="transition-all cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(ptNode.pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              ))}
            </svg>

            {/* Hovered Point Tooltip */}
            {hoveredPoint && (
              <div className="absolute top-2 right-2 bg-black/90 border border-amber-400/40 rounded-lg px-2.5 py-1.5 font-mono text-[10px] text-white shadow-xl pointer-events-none space-y-0.5 animate-fade-in">
                <p className="text-amber-300 font-bold">{hoveredPoint.price.toLocaleString('pl-PL')} Silver</p>
                <p className="text-gray-400 text-[9px]">{formatDateLabel(hoveredPoint.timestamp, range)}</p>
                {hoveredPoint.volume > 0 && (
                  <p className="text-gray-500 text-[9px]">Wolumen: {hoveredPoint.volume} szt.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[9px] text-gray-500 font-mono">
        <span>Źródło: Albion Online Data Project</span>
        <span>Lokalizacja: {city}</span>
      </div>
    </div>
  )
}
