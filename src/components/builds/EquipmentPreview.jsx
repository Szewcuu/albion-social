'use client'

import Image from 'next/image'

import { EQUIPMENT_LAYOUT, getItemTierLabel, itemImageUrl } from '@/lib/buildSlots'

export default function EquipmentPreview({ slots, size = 'md' }) {
  const safeSlots = slots && typeof slots === 'object' ? slots : {}
  const isCard = size === 'card'
  const iconSize = size === 'sm' ? 'h-8 w-8' : isCard ? 'h-14 w-14' : 'h-11 w-11'
  const cellSize = size === 'sm' ? 'min-h-10' : isCard ? 'min-h-16' : 'min-h-14'
  const layoutWidth = size === 'sm' ? 'max-w-40' : isCard ? 'max-w-64' : 'max-w-56'
  const imagePixels = size === 'sm' ? 32 : isCard ? 56 : 44

  return (
    <div className={`mx-auto grid w-full grid-cols-3 gap-2 ${layoutWidth}`}>
      {EQUIPMENT_LAYOUT.flatMap((row, rowIndex) => row.map((key, columnIndex) => {
        if (!key) return <div key={`empty-${rowIndex}-${columnIndex}`} aria-hidden="true" />
        const itemId = safeSlots[key]?.main
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
                onError={(event) => { event.currentTarget.style.display = 'none' }}
              />
            ) : <span className="h-1 w-1 rotate-45 bg-white/10" />}
            {itemId && getItemTierLabel(itemId) && (
              <span className={`absolute bottom-0.5 right-0.5 rounded bg-black/80 px-1 font-mono font-black text-amber-100 ${isCard ? 'text-[8px]' : 'text-[6px]'}`}>
                {getItemTierLabel(itemId)}
              </span>
            )}
          </div>
        )
      }))}
    </div>
  )
}
