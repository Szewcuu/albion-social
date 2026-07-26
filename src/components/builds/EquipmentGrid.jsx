'use client'
import ItemPicker from './ItemPicker'
import { EQUIPMENT_SLOTS, isTwoHandedWeapon, itemImageUrl } from '@/lib/buildSlots'
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
          value={slotData?.amount || 10}
          onChange={(e) => onChange({ ...slotData, amount: parseInt(e.target.value) || 1 })}
          className="w-12 bg-[#050204] border border-[#260f16] rounded-lg text-center text-[10px] font-mono text-gray-300 py-0.5"
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
      <div className="text-[10px] font-mono text-gray-500 text-center uppercase tracking-wider mb-4">
        Ekwipunek — kliknij slot aby wybrać przedmiot
      </div>

      {/* Layout inspirowany albiononlinebuilds.com */}
      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 max-w-sm mx-auto items-center">
        {/* Row 1: Bag | Head | Cape */}
        <SlotCell slot={getSlot('bag')} slotData={slots.bag} onChange={(d) => onSlotChange('bag', d)} offHandBlocked={offHandBlocked} />
        <SlotCell slot={getSlot('head')} slotData={slots.head} onChange={(d) => onSlotChange('head', d)} offHandBlocked={offHandBlocked} />
        <SlotCell slot={getSlot('cape')} slotData={slots.cape} onChange={(d) => onSlotChange('cape', d)} offHandBlocked={offHandBlocked} />

        {/* Row 2: Main | Armor | Off */}
        <SlotCell slot={getSlot('main_hand')} slotData={slots.main_hand} onChange={(d) => onSlotChange('main_hand', d)} offHandBlocked={offHandBlocked} />
        <SlotCell slot={getSlot('armor')} slotData={slots.armor} onChange={(d) => onSlotChange('armor', d)} offHandBlocked={offHandBlocked} />
        <SlotCell slot={getSlot('off_hand')} slotData={slots.off_hand} onChange={(d) => onSlotChange('off_hand', d)} offHandBlocked={offHandBlocked} />

        {/* Row 3: Potion | Shoes | Food */}
        <SlotCell slot={getSlot('potion')} slotData={slots.potion} onChange={(d) => onSlotChange('potion', d)} offHandBlocked={offHandBlocked} />
        <SlotCell slot={getSlot('shoes')} slotData={slots.shoes} onChange={(d) => onSlotChange('shoes', d)} offHandBlocked={offHandBlocked} />
        <SlotCell slot={getSlot('food')} slotData={slots.food} onChange={(d) => onSlotChange('food', d)} offHandBlocked={offHandBlocked} />

        {/* Row 4: Mount centered */}
        <div />
        <SlotCell slot={getSlot('mount')} slotData={slots.mount} onChange={(d) => onSlotChange('mount', d)} offHandBlocked={offHandBlocked} />
        <div />
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
  const iconSize = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
  const previewSlots = ['main_hand', 'head', 'armor', 'shoes', 'cape', 'off_hand', 'bag', 'mount', 'potion', 'food']

  return (
    <div className="flex flex-wrap gap-1.5 justify-center">
      {previewSlots.map((key) => {
        const itemId = slots[key]?.main
        if (!itemId) return null
        return (
          <img
            key={key}
            src={itemImageUrl(itemId)}
            alt={key}
            title={key}
            className={`${iconSize} object-contain drop-shadow-md`}
            onError={(e) => { e.target.style.display = 'none' }}
          />
        )
      })}
    </div>
  )
}
