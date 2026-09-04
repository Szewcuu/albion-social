/* eslint-disable @next/next/no-img-element */
import { EQUIPMENT_LAYOUT, EQUIPMENT_SLOTS, getItemTierLabel, itemImageUrl } from '@/lib/buildSlots'
import ItemTooltip from '@/components/ui/ItemTooltip'
import InventoryFrame, { EmptyEquipmentSlot } from './InventoryFrame'

export default function EquipmentPreview({ slots, itemNames = {}, size = 'md' }) {
  const safeSlots = slots && typeof slots === 'object' ? slots : {}
  const imagePixels = size === 'sm' ? 48 : size === 'catalog' ? 64 : size === 'card' ? 80 : 128

  return (
    <InventoryFrame size={size}>
      {EQUIPMENT_LAYOUT.flatMap((row, rowIndex) => row.map((key, columnIndex) => {
        if (!key) return <div key={`empty-${rowIndex}-${columnIndex}`} aria-hidden="true" />
        const itemId = safeSlots[key]?.main
        const label = EQUIPMENT_SLOTS.find(slot => slot.key === key).label
        return (
          <div key={key} className="inventory-tile">
            {size === 'detail' && <span className="inventory-label">{label}</span>}
            {itemId ? (
              <ItemTooltip label={safeSlots[key]?.name || itemNames[itemId] || itemId}>
                <img src={itemImageUrl(itemId, 1, imagePixels)} alt={safeSlots[key]?.name || itemNames[itemId] || label} width={imagePixels} height={imagePixels} loading="lazy" decoding="async" className="albion-item-image drop-shadow-md" />
              </ItemTooltip>
            ) : <EmptyEquipmentSlot slotKey={key} label={`${label}: pusty slot`} />}
            {itemId && getItemTierLabel(itemId) && (
              <span className="inventory-tier">
                {getItemTierLabel(itemId)}
              </span>
            )}
            {itemId && safeSlots[key]?.amount > 1 && <span className="inventory-amount">×{safeSlots[key].amount}</span>}
          </div>
        )
      }))}
    </InventoryFrame>
  )
}
