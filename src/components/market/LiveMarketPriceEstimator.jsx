'use client'

import { useState, useEffect } from 'react'
import { TrendingDown, TrendingUp, Sparkles, LoaderCircle, AlertCircle, Coins, CheckCircle2 } from 'lucide-react'

export default function LiveMarketPriceEstimator({ itemId = '', userPrice = 0, server = 'Europa' }) {
  const [loading, setLoading] = useState(false)
  const [marketData, setMarketData] = useState(null)
  const [error, setError] = useState(null)

  const region = server.toLowerCase().includes('ameryka') ? 'america' : server.toLowerCase().includes('azja') ? 'asia' : 'europe'

  useEffect(() => {
    let isMounted = true

    if (!itemId || itemId.length < 3) {
      return () => {
        isMounted = false
      }
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)

      try {
        const formattedId = itemId.trim().toUpperCase().replace(/\s+/g, '_')
        const allCities = 'Caerleon,Bridgewatch,Fort Sterling,Lymhurst,Martlock,Thetford,Brecilien'
        const res = await fetch(`/api/prices?mode=prices&items=${encodeURIComponent(formattedId)}&cities=${encodeURIComponent(allCities)}&region=${region}`)
        const text = await res.text()
        let data = {}
        try {
          data = text ? JSON.parse(text) : {}
        } catch {
          data = {}
        }

        if (!res.ok || data.error) {
          throw new Error(typeof data.error === 'string' ? data.error : data.error?.message || 'Brak danych rynkowych dla tego przedmiotu.')
        }

        const prices = data.data || []
        const validPrices = prices.filter(p => p.sell_price_min > 0)

        if (validPrices.length === 0) {
          if (isMounted) setError('Brak aktywnych ofert w miastach królewskich dla podanego ID.')
        } else {
          validPrices.sort((a, b) => a.sell_price_min - b.sell_price_min)
          const cheapest = validPrices[0]
          const highest = validPrices[validPrices.length - 1]
          const avgPrice = Math.round(validPrices.reduce((acc, p) => acc + p.sell_price_min, 0) / validPrices.length)

          if (isMounted) {
            setMarketData({
              cheapestCity: cheapest.city,
              minPrice: cheapest.sell_price_min,
              highestPrice: highest.sell_price_min,
              avgPrice,
              pricesCount: validPrices.length,
            })
          }
        }
      } catch (err) {
        if (isMounted) setError(err.message)
      } finally {
        if (isMounted) setLoading(false)
      }
    }, 400)

    return () => {
      isMounted = false
      clearTimeout(timer)
    }
  }, [itemId, region])

  if (!itemId || itemId.length < 3) return null

  const parsedUserPrice = Number(userPrice) || 0
  const priceDiffPct = marketData?.minPrice && parsedUserPrice > 0
    ? Math.round(((parsedUserPrice - marketData.minPrice) / marketData.minPrice) * 100)
    : null

  return (
    <div className="bg-[#090407] border border-[#d8ad4a]/25 p-4 rounded-2xl space-y-3 font-mono text-xs text-gray-200">
      <div className="flex items-center justify-between border-b border-[#220e14] pb-2">
        <div className="flex items-center gap-2 text-amber-400 font-bold uppercase text-[11px]">
          <Coins className="w-4 h-4 text-amber-400" />
          Live Wycena Rynkowa (Albion Data API)
        </div>
        <span className="text-[9px] text-gray-400 uppercase">Serwer: {region.toUpperCase()}</span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-amber-300/80 py-1">
          <LoaderCircle className="w-4 h-4 animate-spin text-amber-400" />
          <span>Odpytywanie bazy cen z miast królewskich...</span>
        </div>
      )}

      {error && !loading && (
        <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span>{error} (Możesz ręcznie ustalić swoją cenę)</span>
        </div>
      )}

      {marketData && !loading && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
            <div className="bg-[#050204] p-2 rounded-xl border border-[#200d14]">
              <div className="text-gray-400">Najtaniej rynkowo:</div>
              <div className="font-bold text-emerald-300 text-xs">{marketData.minPrice.toLocaleString('pl-PL')} Silver</div>
              <div className="text-gray-400 text-[9px]">{marketData.cheapestCity}</div>
            </div>

            <div className="bg-[#050204] p-2 rounded-xl border border-[#200d14]">
              <div className="text-gray-400">Średnia w miastach:</div>
              <div className="font-bold text-amber-200 text-xs">{marketData.avgPrice.toLocaleString('pl-PL')} Silver</div>
              <div className="text-gray-400 text-[9px]">{marketData.pricesCount} rynków</div>
            </div>

            <div className="bg-[#050204] p-2 rounded-xl border border-[#200d14] col-span-2 sm:col-span-1">
              <div className="text-gray-400">Najdrożej rynkowo:</div>
              <div className="font-bold text-rose-300 text-xs">{marketData.highestPrice.toLocaleString('pl-PL')} Silver</div>
              <div className="text-gray-400 text-[9px]">Górny pułap</div>
            </div>
          </div>

          {priceDiffPct !== null && (
            <div className={`p-2.5 rounded-xl border flex items-center justify-between ${
              priceDiffPct < 0
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : priceDiffPct > 20
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
            }`}>
              <div className="flex items-center gap-1.5 font-bold text-[11px]">
                {priceDiffPct < 0 ? (
                  <>
                    <TrendingDown className="w-4 h-4 text-emerald-400" />
                    <span>🔥 Oferta Okazja P2P ({Math.abs(priceDiffPct)}% poniżej rynku!)</span>
                  </>
                ) : priceDiffPct > 20 ? (
                  <>
                    <TrendingUp className="w-4 h-4 text-rose-400" />
                    <span>Cena o {priceDiffPct}% wyższa niż najtańsza oferta na rynku</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-amber-400" />
                    <span>Cena zgodna ze średnią rynkową</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
