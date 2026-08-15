'use client'

import Image from 'next/image'
import { AlertTriangle, Clock3, Coins, MapPin, Skull, Swords, Users } from 'lucide-react'
import { VALUATION_EQUIPMENT_ORDER } from '@/lib/marketValuation'

function itemImageUrl(item) {
  if (!item?.type) return null
  return `https://render.albiononline.com/v1/item/${encodeURIComponent(item.type)}.png?quality=${item.quality || 1}&size=80`
}

function formatSilverValue(amount) {
  const value = Number(amount)
  if (!Number.isFinite(value) || value <= 0) return 'Brak wyceny'
  return `${new Intl.NumberFormat('pl-PL', {
    notation: value >= 1_000_000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 1_000_000 ? 2 : 0,
  }).format(value)} Silver`
}

function formatDate(value) {
  if (!value) return 'Brak daty'
  return new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function freshnessPresentation(valuation) {
  if (!valuation || valuation.freshness === 'missing') {
    return { label: 'Brak skanów', classes: 'border-rose-400/25 bg-rose-400/8 text-rose-200' }
  }
  if (valuation.freshness === 'fresh') {
    const age = valuation.maxAgeHours == null ? '≤12 h' : valuation.maxAgeHours < 1 ? '<1 h' : `${Math.ceil(valuation.maxAgeHours)} h`
    return { label: `Świeże · ${age}`, classes: 'border-emerald-400/25 bg-emerald-400/8 text-emerald-200' }
  }
  if (valuation.freshness === 'aging') {
    return { label: `Starsze · ${Math.ceil(valuation.maxAgeHours || 0)} h`, classes: 'border-amber-400/25 bg-amber-400/8 text-amber-200' }
  }
  return { label: `Nieaktualne · ${Math.max(2, Math.ceil((valuation.maxAgeHours || 48) / 24))} d`, classes: 'border-rose-400/25 bg-rose-400/8 text-rose-200' }
}

function EquipmentStrip({ equipment }) {
  return (
    <div className="grid grid-cols-5 gap-1.5 sm:flex sm:flex-wrap">
      {VALUATION_EQUIPMENT_ORDER.map((key) => {
        const item = equipment?.[key]
        return (
          <div key={key} className="relative flex h-11 w-11 items-center justify-center rounded-lg border border-white/8 bg-black/35 sm:h-10 sm:w-10">
            {item?.type ? (
              <Image src={itemImageUrl(item)} alt="" title={`${item.type} · jakość ${item.quality || 1}`} width={40} height={40} unoptimized className="h-10 w-10 object-contain sm:h-9 sm:w-9" />
            ) : (
              <span className="text-[9px] text-[#3e3b36]">—</span>
            )}
            {item?.count > 1 && <span className="absolute bottom-0 right-0 rounded-tl bg-black/85 px-1 text-[8px] text-[#d6d0c5]">{item.count}</span>}
          </div>
        )
      })}
    </div>
  )
}

function LossValuation({ valuation }) {
  const freshness = freshnessPresentation(valuation)
  const hasValue = Number(valuation?.estimatedValue) > 0
  const bestQuote = valuation?.items?.filter((item) => item.quote).sort((a, b) => b.total - a.total)[0]?.quote

  return (
    <div className={`mt-3 rounded-xl border p-3 ${hasValue ? 'border-amber-300/20 bg-amber-300/[.055]' : 'border-white/8 bg-black/20'}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[.15em] text-amber-300"><Coins className="h-3.5 w-3.5" /> Wartość utraconego zestawu</p>
          <p className={`font-display mt-1 text-lg font-black ${hasValue ? 'text-[#f4d47c]' : 'text-[#8f8980]'}`}>{formatSilverValue(valuation?.estimatedValue)}</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[8px] font-black uppercase tracking-[.08em] ${freshness.classes}`}>
          <Clock3 className="h-3 w-3" /> {freshness.label}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[8px] text-[#8f8980]">
        <span>Pokrycie cen: <strong className="text-[#d5cec2]">{valuation?.pricedItems || 0}/{valuation?.totalItems || 0}</strong></span>
        {bestQuote?.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> Największa pozycja: {bestQuote.city}</span>}
        {valuation?.fallbackItems > 0 && <span className="inline-flex items-center gap-1 text-amber-200/75"><AlertTriangle className="h-3 w-3" /> {valuation.fallbackItems}× fallback ceny kupna</span>}
      </div>
    </div>
  )
}

function EquipmentPanel({ combatant, victim, valuation }) {
  return (
    <div className={`rounded-2xl border p-3.5 ${victim ? 'border-rose-400/15 bg-rose-950/[.08]' : 'border-white/8 bg-black/10'}`}>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[9px] font-black uppercase tracking-[.14em] text-[#918b82]">{victim ? 'Utracony zestaw' : 'Zestaw zwycięzcy'} · {combatant?.name}</p>
        <span className="text-[8px] text-[#625f59]">Średnie IP: <strong className="text-[#aaa39a]">{combatant?.averageItemPower || '—'}</strong></span>
      </div>
      <EquipmentStrip equipment={combatant?.equipment} />
      {victim && <LossValuation valuation={valuation} />}
    </div>
  )
}

export default function CombatEventCard({ event }) {
  const isKill = event.perspective === 'kill'
  const opponent = isKill ? event.victim : event.killer
  const ownSide = isKill ? event.killer : event.victim
  const ownSideIsVictim = !isKill

  return (
    <article className="aopp-list-card space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex gap-3">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${isKill ? 'border-emerald-400/20 bg-emerald-400/8 text-emerald-300' : 'border-rose-400/20 bg-rose-400/8 text-rose-300'}`}>
            {isKill ? <Swords className="h-5 w-5" /> : <Skull className="h-5 w-5" />}
          </div>
          <div>
            <p className={`text-[9px] font-black uppercase tracking-[.18em] ${isKill ? 'text-emerald-300' : 'text-rose-300'}`}>
              {isKill ? 'Zwycięstwo' : 'Porażka'} • {event.killArea?.replaceAll('_', ' ') || 'Albion'}
            </p>
            <h3 className="font-display mt-1 text-lg font-black text-[#fff8e8]">
              {ownSide?.name} <span className="px-1 text-[#615d56]">vs</span> {opponent?.name}
            </h3>
            <p className="mt-1 text-[10px] text-[#918b82]">{formatDate(event.timestamp)}</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[9px] font-black uppercase tracking-[.14em] text-[#918b82]">Fame wydarzenia</p>
          <p className="font-display text-xl font-black text-[#e5bb55]">{(event.fame || 0).toLocaleString('pl-PL')}</p>
          <p className="mt-1 flex items-center justify-end gap-1 text-[9px] text-[#918b82]"><Users className="h-3 w-3" /> {event.participantCount} uczestników</p>
        </div>
      </div>

      <div className="grid gap-3 border-t border-white/8 pt-4 lg:grid-cols-2">
        <EquipmentPanel combatant={ownSide} victim={ownSideIsVictim} valuation={event.lossValuation} />
        <EquipmentPanel combatant={opponent} victim={!ownSideIsVictim} valuation={event.lossValuation} />
      </div>
    </article>
  )
}
