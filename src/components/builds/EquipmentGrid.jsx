'use client'
import ItemPicker from './ItemPicker'
import { EQUIPMENT_LAYOUT, EQUIPMENT_SLOTS, isTwoHandedWeapon } from '@/lib/buildSlots'
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
  const safeSlots = slots && typeof slots === 'object' ? slots : {}
  const offHandBlocked = isTwoHandedWeapon(safeSlots.main_hand?.main)

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
              slotData={safeSlots[key]}
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
