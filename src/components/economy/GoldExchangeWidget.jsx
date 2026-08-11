'use client'

import { useState, useEffect } from 'react'
import { Coins, ArrowRightLeft, TrendingUp, RefreshCw } from 'lucide-react'

export default function GoldExchangeWidget() {
  const [goldPrice, setGoldPrice] = useState(3850)
  const [loading, setLoading] = useState(false)
  const [goldInput, setGoldInput] = useState(100)
  const [silverResult, setSilverResult] = useState(385000)

  const fetchGoldPrice = async () => {
    setLoading(true)
    try {
      const res = await fetch('https://europe.albion-online-data.com/api/v2/stats/gold.json?count=1')
      if (res.ok) {
        const data = await res.json()
        if (data && data.length > 0 && data[0].price) {
          setGoldPrice(data[0].price)
          setSilverResult(goldInput * data[0].price)
        }
      }
    } catch {
      // Keep default fallback
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGoldPrice()
  }, [])

  const handleGoldChange = (val) => {
    const num = Math.max(0, Number(val))
    setGoldInput(num)
    setSilverResult(num * goldPrice)
  }

  return (
    <div className="panel p-5 space-y-4 border-amber-400/30 bg-amber-500/5">
      <div className="flex items-center justify-between border-b border-white/8 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-400/30">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-display text-sm font-bold text-white">Kurs Złota & Srebra (Gold Live)</h4>
            <p className="text-[10px] text-gray-400 font-mono">Dane z Albion Online Data Project API</p>
          </div>
        </div>
        <button
          onClick={fetchGoldPrice}
          disabled={loading}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition cursor-pointer"
          title="Odśwież kurs Złota"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/8 space-y-1">
          <span className="text-[10px] text-amber-400 font-bold uppercase flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Aktualna Cena 1 Gold
          </span>
          <p className="text-lg font-black text-amber-300">{goldPrice.toLocaleString()} <span className="text-xs font-normal text-gray-400">Silver</span></p>
        </div>

        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/8 space-y-2">
          <span className="text-[10px] text-sky-400 font-bold uppercase flex items-center gap-1">
            <ArrowRightLeft className="w-3 h-3" /> Przelicznik Walut
          </span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={goldInput}
              onChange={(e) => handleGoldChange(e.target.value)}
              className="w-20 bg-black/60 border border-white/10 rounded-lg p-1.5 text-amber-300 font-bold text-xs text-center outline-none"
              placeholder="Gold"
            />
            <span className="text-gray-400">Gold =</span>
            <span className="font-bold text-emerald-300">{silverResult.toLocaleString()} Silver</span>
          </div>
        </div>
      </div>
    </div>
  )
}
