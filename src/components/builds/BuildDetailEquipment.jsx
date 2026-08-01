import Image from 'next/image'

import { EQUIPMENT_SLOTS, itemImageUrl } from '@/lib/buildSlots'

function ItemTile({ itemId, label, amount, muted = false }) {
  return (
    <div className={`relative flex min-h-28 flex-col items-center justify-center overflow-hidden rounded-2xl border p-3 text-center ${muted
      ? 'border-white/8 bg-black/20'
      : 'border-orange-200/15 bg-[radial-gradient(circle_at_50%_35%,rgba(210,112,39,.16),rgba(0,0,0,.35)_72%)] shadow-inner'
    }`}>
      <span className="absolute left-2.5 top-2 text-[8px] font-black uppercase tracking-[.14em] text-[#918b82]">{label}</span>
      {itemId ? (
        <>
          <Image
            src={itemImageUrl(itemId)}
            alt={`${label}: ${itemId}`}
            width={72}
            height={72}
            unoptimized
            className="mt-2 h-16 w-16 object-contain drop-shadow-[0_7px_10px_rgba(0,0,0,.8)] sm:h-[72px] sm:w-[72px]"
          />
          {amount > 1 && (
            <span className="absolute bottom-2 right-2 rounded-md border border-white/10 bg-black/70 px-1.5 py-0.5 font-mono text-[9px] text-orange-100">×{amount}</span>
          )}
        </>
      ) : (
        <span className="mt-4 font-mono text-[10px] text-[#6f6a63]">Pusty slot</span>
      )}
    </div>
  )
}

export default function BuildDetailEquipment({ slots }) {
  return (
    <section className="aopp-panel p-4 sm:p-6" aria-labelledby="build-equipment-title">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[.22em] text-orange-200/60">Zbrojownia</p>
          <h2 id="build-equipment-title" className="font-display mt-1 text-2xl font-black text-[#fff8e8]">Ekwipunek zestawu</h2>
        </div>
        <span className="hidden font-mono text-[9px] uppercase text-[#918b82] sm:block">10 slotów doktryny</span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {EQUIPMENT_SLOTS.map((slot) => (
          <ItemTile
            key={slot.key}
            itemId={slots[slot.key]?.main}
            label={slot.label}
            amount={slots[slot.key]?.amount}
          />
        ))}
      </div>

      {EQUIPMENT_SLOTS.some((slot) => slots[slot.key]?.alternatives?.some(Boolean)) && (
        <div className="mt-6 border-t border-white/8 pt-5">
          <h3 className="mb-3 text-[10px] font-black uppercase tracking-[.18em] text-[#b8b1a7]">Warianty zapasowe</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {EQUIPMENT_SLOTS.flatMap((slot) => (
              (slots[slot.key]?.alternatives || []).filter(Boolean).map((itemId, index) => (
                <ItemTile key={`${slot.key}-${itemId}-${index}`} itemId={itemId} label={`${slot.label} • alt ${index + 1}`} muted />
              ))
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
