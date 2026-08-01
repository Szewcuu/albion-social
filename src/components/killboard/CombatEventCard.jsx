'use client'
/* eslint-disable @next/next/no-img-element */

import { Skull, Swords, Users } from 'lucide-react'

const EQUIPMENT_ORDER = ['MainHand', 'OffHand', 'Head', 'Armor', 'Shoes', 'Cape', 'Potion', 'Food']

function itemImageUrl(item) {
  if (!item?.type) return null
  return `https://render.albiononline.com/v1/item/${encodeURIComponent(item.type)}.png?quality=${item.quality || 1}&size=80`
}

function EquipmentStrip({ equipment }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {EQUIPMENT_ORDER.map(key => {
        const item = equipment?.[key]
        return (
          <div key={key} className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-white/8 bg-black/35">
            {item?.type ? (
              <img src={itemImageUrl(item)} alt="" title={item.type} className="h-9 w-9 object-contain" loading="lazy" />
            ) : (
              <span className="text-[9px] text-[#3e3b36]">—</span>
            )}
            {item?.count > 1 && <span className="absolute bottom-0 right-0 rounded-tl bg-black/80 px-1 text-[8px] text-[#d6d0c5]">{item.count}</span>}
          </div>
        )
      })}
    </div>
  )
}

function formatDate(value) {
  if (!value) return 'Brak daty'
  return new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function CombatEventCard({ event }) {
  const isKill = event.perspective === 'kill'
  const opponent = isKill ? event.victim : event.killer
  const ownSide = isKill ? event.killer : event.victim

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
            <p className="mt-1 text-[10px] text-[#77736c]">{formatDate(event.timestamp)}</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-[9px] font-black uppercase tracking-[.14em] text-[#77736c]">Fame wydarzenia</p>
          <p className="font-display text-xl font-black text-[#e5bb55]">{(event.fame || 0).toLocaleString('pl-PL')}</p>
          <p className="mt-1 flex items-center justify-end gap-1 text-[9px] text-[#77736c]"><Users className="h-3 w-3" /> {event.participantCount} uczestników</p>
        </div>
      </div>

      <div className="grid gap-3 border-t border-white/8 pt-4 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-[9px] font-black uppercase tracking-[.14em] text-[#77736c]">Zestaw {ownSide?.name}</p>
          <EquipmentStrip equipment={ownSide?.equipment} />
          <p className="mt-2 text-[9px] text-[#625f59]">Średnie IP: <span className="text-[#aaa39a]">{ownSide?.averageItemPower || '—'}</span></p>
        </div>
        <div>
          <p className="mb-2 text-[9px] font-black uppercase tracking-[.14em] text-[#77736c]">Zestaw {opponent?.name}</p>
          <EquipmentStrip equipment={opponent?.equipment} />
          <p className="mt-2 text-[9px] text-[#625f59]">Średnie IP: <span className="text-[#aaa39a]">{opponent?.averageItemPower || '—'}</span></p>
        </div>
      </div>
    </article>
  )
}
