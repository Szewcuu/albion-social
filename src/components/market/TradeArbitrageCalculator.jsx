'use client'

import { useState } from 'react'
import { TrendingUp } from 'lucide-react'
import CustomSelect from '@/components/ui/CustomSelect'

const CITIES = ['Caerleon', 'Martlock', 'Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Thetford', 'Brecilien']

export default function TradeArbitrageCalculator() {
  const [buyCity, setBuyCity] = useState('Lymhurst')
  const [sellCity, setSellCity] = useState('Caerleon')
  const [buyPrice, setBuyPrice] = useState(0)
  const [sellPrice, setSellPrice] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [hasPremium, setHasPremium] = useState(true)

  const taxRate = hasPremium ? 0.04 : 0.08
  const setupFeeRate = 0.025
  const totalFeeRate = taxRate + setupFeeRate

  const totalBuyCost = buyPrice * quantity
  const grossRevenue = sellPrice * quantity
  const totalFees = Math.round(grossRevenue * totalFeeRate)
  const hasScenario = buyPrice > 0 && sellPrice > 0 && quantity > 0
  const netProfit = hasScenario ? grossRevenue - totalBuyCost - totalFees : 0
  const marginPercent = totalBuyCost > 0 ? ((netProfit / totalBuyCost) * 100).toFixed(1) : 0

  return (
    <div className="panel p-5 sm:p-7 space-y-5 border-emerald-500/30 bg-emerald-950/10">
      <div className="flex items-center justify-between border-b border-white/8 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-300">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase">
                Scenariusz ręczny
              </span>
              <span className="text-[10px] text-gray-400 font-mono">bez automatycznych cen i kosztu transportu</span>
            </div>
            <h3 className="font-display text-lg font-black text-white mt-0.5">Ręczny scenariusz transportu</h3>
          </div>
        </div>
        <button type="button"
          onClick={() => setHasPremium(!hasPremium)}
          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition cursor-pointer ${
            hasPremium ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-white/5 border-white/10 text-gray-400'
          }`}
        >
          {hasPremium ? '⚡ Premium (4% Podatek)' : 'Bez Premium (8% Podatek)'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
        {/* BUY CITY */}
        <div className="space-y-1.5">
          <CustomSelect label="Miasto zakupu" value={buyCity} onChange={setBuyCity} options={CITIES} />
          <input
            type="number"
            min="0"
            value={buyPrice || ''}
            onChange={(e) => setBuyPrice(Math.max(0, Number(e.target.value) || 0))}
            className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-amber-300 font-bold outline-none"
            placeholder="Cena zakupu (Silver)"
          />
        </div>

        {/* SELL CITY */}
        <div className="space-y-1.5">
          <CustomSelect label="Miasto sprzedaży" value={sellCity} onChange={setSellCity} options={CITIES} />
          <input
            type="number"
            min="0"
            value={sellPrice || ''}
            onChange={(e) => setSellPrice(Math.max(0, Number(e.target.value) || 0))}
            className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-emerald-300 font-bold outline-none"
            placeholder="Cena sprzedaży (Silver)"
          />
        </div>

        {/* QUANTITY */}
        <div className="space-y-1.5">
          <label className="text-gray-400 uppercase font-bold text-[10px]">Ilość Sztuk</label>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.min(10000, Math.max(1, Number(e.target.value) || 1)))}
            className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white font-bold outline-none"
          />
          <p className="text-[10px] text-gray-400">Koszt zakupu: {(totalBuyCost).toLocaleString()} Silver</p>
        </div>

        {/* NET PROFIT RESULT */}
        <div className={`p-4 rounded-2xl border space-y-1 ${netProfit > 0 ? 'bg-emerald-500/10 border-emerald-400/40' : 'bg-rose-500/10 border-rose-400/40'}`}>
          <span className="text-[10px] uppercase font-bold text-gray-300">{hasScenario ? 'Wynik scenariusza' : 'Wpisz obie ceny'}</span>
          <p className={`text-xl font-black ${netProfit > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
            {netProfit > 0 ? '+' : ''}{netProfit.toLocaleString()} Silver
          </p>
          <p className="text-[10px] text-gray-400 font-mono">
            Zwrot z inwestycji (ROI): <strong className={netProfit > 0 ? 'text-emerald-400' : 'text-rose-400'}>{marginPercent}%</strong>
          </p>
        </div>
      </div>
      <p className="font-mono text-[10px] leading-relaxed text-gray-400">To notatnik do ręcznego porównania trasy, a nie skan rynku. Wynik obejmuje podatek i opłatę wystawienia, ale nie obejmuje czasu, ryzyka ani kosztu transportu.</p>
    </div>
  )
}
