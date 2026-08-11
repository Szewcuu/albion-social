'use client'

import { useState } from 'react'
import { Scale, ArrowRightLeft, Sparkles, Shield, Swords, Layers, ShoppingBag } from 'lucide-react'

const SLOT_KEYS = [
  { key: 'main_hand', dbKey: 'weapon', label: 'Broń główna', defaultBase: 45000 },
  { key: 'off_hand', dbKey: 'offhand', label: 'Broń pomocnicza', defaultBase: 25000 },
  { key: 'head', dbKey: 'head', label: 'Hełm', defaultBase: 22000 },
  { key: 'armor', dbKey: 'armor', label: 'Zbroja', defaultBase: 35000 },
  { key: 'shoes', dbKey: 'shoes', label: 'Buty', defaultBase: 22000 },
  { key: 'cape', dbKey: 'cape', label: 'Peleryna', defaultBase: 30000 },
  { key: 'bag', dbKey: 'bag', label: 'Torba', defaultBase: 15000 },
  { key: 'potion', dbKey: 'potion', label: 'Mikstura', defaultBase: 8000 },
  { key: 'food', dbKey: 'food', label: 'Jedzenie', defaultBase: 8000 },
  { key: 'mount', dbKey: 'mount', label: 'Wierzchowiec', defaultBase: 40000 },
]

function extractItemString(itemVal) {
  if (!itemVal) return ''
  if (typeof itemVal === 'string') return itemVal
  if (typeof itemVal === 'object') {
    return itemVal.main || itemVal.id || itemVal.type || itemVal.name || ''
  }
  return ''
}

function getItemSlotPrice(slotObj, defaultBasePrice) {
  const itemId = extractItemString(slotObj).trim().toUpperCase()
  if (!itemId) return 0
  
  const tierMatch = itemId.match(/^T(\d)/)
  const tier = tierMatch ? parseInt(tierMatch[1]) : 4
  
  const enchantMatch = itemId.match(/@(\d)$/)
  const enchant = enchantMatch ? parseInt(enchantMatch[1]) : 0

  let base = defaultBasePrice
  if (tier === 4) base *= 1
  else if (tier === 5) base *= 2.5
  else if (tier === 6) base *= 6
  else if (tier === 7) base *= 18
  else if (tier === 8) base *= 55

  const enchantMultiplier = 1 + (enchant * 1.25)
  return Math.round(base * enchantMultiplier)
}

function parseBuildEquippedSlots(build) {
  if (!build) return []
  const rawSlots = build.build_data?.slots || build.slots || {}
  
  const equipped = []
  for (const s of SLOT_KEYS) {
    const rawVal = rawSlots[s.key] || build[s.dbKey] || build[s.key]
    const itemId = extractItemString(rawVal)
    if (itemId) {
      const price = getItemSlotPrice(rawVal, s.defaultBase)
      equipped.push({
        slotLabel: s.label,
        itemId,
        price
      })
    }
  }
  return equipped
}

function formatSilver(amount) {
  if (!amount || amount <= 0) return '0 Silver'
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

  const itemsA = parseBuildEquippedSlots(buildA)
  const itemsB = parseBuildEquippedSlots(buildB)

  const costA = itemsA.reduce((sum, item) => sum + item.price, 0)
  const costB = itemsB.reduce((sum, item) => sum + item.price, 0)
  const costDiff = Math.abs(costA - costB)
  const cheaperBuild = costA < costB ? 'A' : costA > costB ? 'B' : 'equal'

  return (
    <div className="panel p-5 sm:p-7 space-y-6 mb-6 sm:mb-8">
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
                    <span>Build <strong>{buildA?.title}</strong> ({itemsA.length} przedmiotów) jest tańszy w zakupie o <strong className="text-emerald-300 font-mono">{formatSilver(costDiff)}</strong>.</span>
                  )}
                  {cheaperBuild === 'B' && (
                    <span>Build <strong>{buildB?.title}</strong> ({itemsB.length} przedmiotów) jest tańszy w zakupie o <strong className="text-emerald-300 font-mono">{formatSilver(costDiff)}</strong>.</span>
                  )}
                  {cheaperBuild === 'equal' && (
                    <span>Oba zestawy mają zbliżony szacowany koszt zakupu na rynku.</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0 font-mono text-xs font-bold">
              <span className="text-amber-300 bg-black/40 px-3 py-1.5 rounded-xl border border-amber-400/30">A ({itemsA.length} itemów): {formatSilver(costA)}</span>
              <span className="text-sky-300 bg-black/40 px-3 py-1.5 rounded-xl border border-sky-400/30">B ({itemsB.length} itemów): {formatSilver(costB)}</span>
            </div>
          </div>

          {/* PORÓWNANIE KART SIDE-BY-SIDE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* BUILD A CARD */}
            <div className="panel p-5 space-y-4 border-amber-400/30 bg-amber-500/5">
              <div className="border-b border-white/8 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-amber-400">Build A</span>
                  <h3 className="font-display text-lg font-black text-white mt-0.5">{buildA?.title}</h3>
                </div>
                <span className="text-[10px] font-mono text-amber-300 bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/30">
                  {itemsA.length} {itemsA.length === 1 ? 'przedmiot' : 'przedmiotów'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-mono bg-black/30 p-3 rounded-xl border border-white/8">
                <span className="text-gray-400">Łączny koszt:</span>
                <span className="text-amber-300 font-bold font-mono">{formatSilver(costA)}</span>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-mono uppercase text-gray-400 font-bold">Wykaz założonych slotów:</p>
                {itemsA.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">Brak założonych przedmiotów.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {itemsA.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-black/20 border border-white/5 font-mono">
                        <span className="text-gray-300 font-sans">{item.slotLabel}: <strong className="text-amber-200">{item.itemId}</strong></span>
                        <span className="text-amber-300/90 font-bold">{formatSilver(item.price)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* BUILD B CARD */}
            <div className="panel p-5 space-y-4 border-sky-400/30 bg-sky-500/5">
              <div className="border-b border-white/8 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider text-sky-400">Build B</span>
                  <h3 className="font-display text-lg font-black text-white mt-0.5">{buildB?.title}</h3>
                </div>
                <span className="text-[10px] font-mono text-sky-300 bg-sky-400/10 px-2.5 py-1 rounded-lg border border-sky-400/30">
                  {itemsB.length} {itemsB.length === 1 ? 'przedmiot' : 'przedmiotów'}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-mono bg-black/30 p-3 rounded-xl border border-white/8">
                <span className="text-gray-400">Łączny koszt:</span>
                <span className="text-sky-300 font-bold font-mono">{formatSilver(costB)}</span>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-mono uppercase text-gray-400 font-bold">Wykaz założonych slotów:</p>
                {itemsB.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">Brak założonych przedmiotów.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {itemsB.map((item, i) => (
                      <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-black/20 border border-white/5 font-mono">
                        <span className="text-gray-300 font-sans">{item.slotLabel}: <strong className="text-sky-200">{item.itemId}</strong></span>
                        <span className="text-sky-300/90 font-bold">{formatSilver(item.price)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
