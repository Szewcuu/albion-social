'use client'
import ItemPicker from './ItemPicker'
import Image from 'next/image'
import { EQUIPMENT_LAYOUT, EQUIPMENT_SLOTS, getItemTierLabel, isTwoHandedWeapon, itemImageUrl } from '@/lib/buildSlots'
import { Lock } from 'lucide-react'

function SlotCell({ slot, slotData, onChange, offHandBlocked }) {
  const disabled = slot.twoHandBlocked && offHandBlocked

  return (
    <div className="flex flex-col items-center gap-1">
      <ItemPicker
        label={slot.label}
        category={slot.category}
        value={slotData?.main || ''}
        onChange={(id) => onChange({ ...slotData, main: id })}
        disabled={disabled}
        compact
      />
      {slot.hasAmount && (
        <input
          type="number"
          min={1}
          max={999}
          aria-label={`Liczba sztuk: ${slot.label}`}
          value={slotData?.amount || 10}
          onChange={(e) => onChange({ ...slotData, amount: parseInt(e.target.value) || 1 })}
          className="min-h-8 w-12 rounded-lg border border-[#260f16] bg-[#050204] text-center font-mono text-[10px] text-gray-300"
        />
      )}
      {disabled && (
        <Lock className="w-3 h-3 text-gray-600" />
      )}
    </div>
  )
}

export default function EquipmentGrid({ slots, onSlotChange }) {
  const offHandBlocked = isTwoHandedWeapon(slots.main_hand?.main)

  const getSlot = (key) => EQUIPMENT_SLOTS.find(s => s.key === key)

  return (
    <div className="bg-[#050204] border border-[#260f16] rounded-2xl p-4 sm:p-6">
      <div className="text-[10px] font-mono text-gray-400 text-center uppercase tracking-wider mb-4">
        Ekwipunek — kliknij slot aby wybrać przedmiot
      </div>

      <div className="mx-auto grid max-w-sm grid-cols-3 items-center gap-3">
        {EQUIPMENT_LAYOUT.flatMap((row, rowIndex) => row.map((key, columnIndex) => (
          key ? (
            <SlotCell
              key={key}
              slot={getSlot(key)}
              slotData={slots[key]}
              onChange={(data) => onSlotChange(key, data)}
              offHandBlocked={offHandBlocked}
            />
          ) : <div key={`empty-${rowIndex}-${columnIndex}`} aria-hidden="true" />
        )))}
      </div>

      {offHandBlocked && (
        <p className="text-[10px] text-amber-500/70 font-mono text-center mt-3">
          Broń dwuręczna zajmuje slot off-hand
        </p>
      )}
    </div>
  )
}

export function EquipmentPreview({ slots, size = 'md' }) {
  const isCard = size === 'card'
  const iconSize = size === 'sm' ? 'h-8 w-8' : isCard ? 'h-14 w-14' : 'h-11 w-11'
  const cellSize = size === 'sm' ? 'min-h-10' : isCard ? 'min-h-16' : 'min-h-14'
  const layoutWidth = size === 'sm' ? 'max-w-40' : isCard ? 'max-w-64' : 'max-w-56'
  const imagePixels = size === 'sm' ? 32 : isCard ? 56 : 44

  return (
    <div className={`mx-auto grid w-full grid-cols-3 gap-2 ${layoutWidth}`}>
      {EQUIPMENT_LAYOUT.flatMap((row, rowIndex) => row.map((key, columnIndex) => {
        if (!key) return <div key={`empty-${rowIndex}-${columnIndex}`} aria-hidden="true" />
        const itemId = slots[key]?.main
        return (
          <div key={key} className={`relative grid ${cellSize} place-items-center rounded-md border border-white/8 bg-black/20`}>
            {itemId ? (
              <Image
                src={itemImageUrl(itemId)}
                alt={`Przedmiot w slocie ${key}`}
                title={itemId}
                width={imagePixels}
                height={imagePixels}
                unoptimized
                className={`${iconSize} object-contain drop-shadow-md`}
                onError={(e) => { e.target.style.display = 'none' }}
              />
            ) : <span className="h-1 w-1 rotate-45 bg-white/10" />}
            {itemId && getItemTierLabel(itemId) && <span className={`absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 font-mono font-black text-amber-100 ${isCard ? 'text-[8px]' : 'text-[6px]'}`}>{getItemTierLabel(itemId)}</span>}
          </div>
        )
      }))}
    </div>
  )
}
