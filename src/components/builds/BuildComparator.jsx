'use client'

import { useState } from 'react'
import { Swords, Scale, ArrowRightLeft, Sparkles, Coins, Check, AlertCircle } from 'lucide-react'

function estimateItemSlotPrice(itemKey, itemObj) {
  if (!itemObj || (!itemObj.id && !itemObj.type && !itemObj.name)) return 0
  const itemId = (itemObj.id || itemObj.type || itemObj.name || '').toUpperCase()
  
  const tierMatch = itemId.match(/^T(\d)/)
  const tier = tierMatch ? parseInt(tierMatch[1]) : 6
  
  const enchantMatch = itemId.match(/@(\d)$/)
  const enchant = enchantMatch ? parseInt(enchantMatch[1]) : 0

  let basePrice = 45000
  if (itemKey === 'mainhand' || itemKey === 'weapon') basePrice = 180000
  else if (itemKey === 'offhand') basePrice = 65000
  else if (itemKey === 'armor' || itemKey === 'head' || itemKey === 'shoes') basePrice = 85000
  else if (itemKey === 'cape') basePrice = 120000
  else if (itemKey === 'potion' || itemKey === 'food') basePrice = 15000

  if (tier === 4) basePrice *= 0.25
  else if (tier === 5) basePrice *= 0.5
  else if (tier === 7) basePrice *= 2.8
  else if (tier === 8) basePrice *= 7.5

  const enchantMultiplier = 1 + (enchant * 1.3)
  return Math.round(basePrice * enchantMultiplier)
}

function calculateBuildTotalCost(build) {
  if (!build) return 0
  const equipment = build.equipment || build.items || {}
  let total = 0
  for (const slotKey in equipment) {
    total += estimateItemSlotPrice(slotKey, equipment[slotKey])
  }
  return total || 350000 // Fallback estimate
}

function formatSilver(amount) {
  if (!amount || amount <= 0) return '— Silver'
  if (amount >= 1_000_000) return `~${(amount / 1_000_000).toFixed(2)}M Silver`
  if (amount >= 1_000) return `~${(amount / 1_000).toFixed(0)}k Silver`
  return `${amount.toLocaleString('pl-PL')} Silver`
}

export default function BuildComparator({ builds = [] }) {
  const [buildAId, setBuildAId] = useState(builds[0]?.id || '')
  const [buildBId, setBuildBId] = useState(builds[1]?.id || builds[0]?.id || '')
  const [isOpen, setIsOpen] = useState(false)

  const buildA = builds.find(b => b.id === buildAId) || builds[0]
  const buildB = builds.find(b => b.id === buildBId) || builds[1] || builds[0]

  if (!builds || builds.length < 2) return null

  const costA = calculateBuildTotalCost(buildA)
  const costB = calculateBuildTotalCost(buildB)
  const costDiff = Math.abs(costA - costB)
  const cheaperBuild = costA < costB ? 'A' : costA > costB ? 'B' : 'equal'

  return (
    <div className="panel p-5 sm:p-7 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/8 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-300">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                Porównywarka Zestawów
              </span>
              <span className="text-[10px] text-gray-400 font-mono">Porównanie Kosztu i Ekwipunku</span>
            </div>
            <h2 className="font-display text-xl font-black text-white mt-0.5">Zestaw A vs Zestaw B</h2>
          </div>
        </div>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="btn btn-secondary btn-sm flex items-center gap-2 self-start sm:self-auto"
        >
          <ArrowRightLeft className="w-4 h-4 text-amber-400" />
          <span>{isOpen ? 'Zwiń porównywarkę' : 'Otwórz porównywarkę buildów'}</span>
        </button>
      </div>

      {isOpen && (
        <div className="space-y-6 animate-fade-in">
          {/* SELECTORY BUILDÓW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono font-bold uppercase text-amber-400">Wybierz Build A</label>
              <select
                value={buildAId}
                onChange={e => setBuildAId(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl p-3 text-xs text-white outline-none focus:border-amber-400"
              >
                {builds.map(b => (
                  <option key={b.id} value={b.id}>{b.title} ({b.category || 'Ogólny'})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono font-bold uppercase text-sky-400">Wybierz Build B</label>
              <select
                value={buildBId}
                onChange={e => setBuildBId(e.target.value)}
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl p-3 text-xs text-white outline-none focus:border-sky-400"
              >
                {builds.map(b => (
                  <option key={b.id} value={b.id}>{b.title} ({b.category || 'Ogólny'})</option>
                ))}
              </select>
            </div>
          </div>

          {/* PODSUMOWANIE RÓŻNICY KOSZTÓW */}
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-400/30 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="font-bold text-amber-200">Podsumowanie Kosztów Rynkowych</p>
                <p className="text-[11px] text-gray-300 mt-0.5">
                  {cheaperBuild === 'A' && (
                    <span>Build <strong>{buildA?.title}</strong> jest tańszy w zakupie o <strong className="text-emerald-300 font-mono">{formatSilver(costDiff)}</strong>.</span>
                  )}
                  {cheaperBuild === 'B' && (
                    <span>Build <strong>{buildB?.title}</strong> jest tańszy w zakupie o <strong className="text-emerald-300 font-mono">{formatSilver(costDiff)}</strong>.</span>
                  )}
                  {cheaperBuild === 'equal' && (
                    <span>Oba zestawy mają zbliżony szacowany koszt zakupu na rynku.</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 font-mono text-xs font-bold">
              <span className="text-amber-300 bg-black/40 px-3 py-1.5 rounded-xl border border-amber-400/30">A: {formatSilver(costA)}</span>
              <span className="text-sky-300 bg-black/40 px-3 py-1.5 rounded-xl border border-sky-400/30">B: {formatSilver(costB)}</span>
            </div>
          </div>

          {/* PORÓWNANIE KART SIDE-BY-SIDE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BUILD A CARD */}
            <div className="panel p-5 space-y-4 border-amber-400/30 bg-amber-500/5">
              <div className="border-b border-white/8 pb-3">
                <span className="text-[9px] font-black uppercase tracking-wider text-amber-400">Build A</span>
                <h3 className="font-display text-lg font-black text-white mt-1">{buildA?.title}</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">Kategoria: {buildA?.category || 'Ogólna'}</p>
              </div>

              <div className="flex items-center justify-between text-xs font-mono bg-black/30 p-3 rounded-xl border border-white/8">
                <span className="text-gray-400">Szacowany koszt rynkowy:</span>
                <span className="text-amber-300 font-bold font-mono">{formatSilver(costA)}</span>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed italic">{buildA?.description || 'Brak opisu zestawu.'}</p>
            </div>

            {/* BUILD B CARD */}
            <div className="panel p-5 space-y-4 border-sky-400/30 bg-sky-500/5">
              <div className="border-b border-white/8 pb-3">
                <span className="text-[9px] font-black uppercase tracking-wider text-sky-400">Build B</span>
                <h3 className="font-display text-lg font-black text-white mt-1">{buildB?.title}</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">Kategoria: {buildB?.category || 'Ogólna'}</p>
              </div>

              <div className="flex items-center justify-between text-xs font-mono bg-black/30 p-3 rounded-xl border border-white/8">
                <span className="text-gray-400">Szacowany koszt rynkowy:</span>
                <span className="text-sky-300 font-bold font-mono">{formatSilver(costB)}</span>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed italic">{buildB?.description || 'Brak opisu zestawu.'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
