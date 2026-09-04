import { Backpack, Crown, FlaskConical, Footprints, Shirt, Shield, Swords, Utensils, Flag, PawPrint } from 'lucide-react'
import styles from './InventoryFrame.module.css'

const EMPTY_ICONS = { bag: Backpack, head: Crown, cape: Flag, main_hand: Swords, armor: Shirt, off_hand: Shield, potion: FlaskConical, shoes: Footprints, food: Utensils, mount: PawPrint }

export function EmptyEquipmentSlot({ slotKey, label }) {
  const Icon = EMPTY_ICONS[slotKey] || Shield
  return <span className={styles.empty} aria-label={label}><Icon aria-hidden="true" /></span>
}

export default function InventoryFrame({ children, size = 'detail', title = 'Ekwipunek', subtitle = 'Zestaw poszukiwacza przygód' }) {
  return (
    <div className={`${styles.paper} ${styles[size] || ''}`} data-inventory-size={size}>
      <div className={styles.heading}>
        <span className={styles.seal} aria-hidden="true"><Swords /></span>
        <div><p>{subtitle}</p><strong>{title}</strong></div>
        <span className={styles.ornament} aria-hidden="true">✦</span>
      </div>
      <div className={styles.board}>
        <svg className={styles.silhouette} viewBox="0 0 240 350" aria-hidden="true">
          <path d="M108 18 132 18 141 31 138 57 130 68 132 78 157 85 177 104 191 137 212 165 224 196 219 211 210 204 202 181 177 159 157 126 148 121 147 170 154 207 142 221 137 273 132 314 143 331 140 339 116 338 111 322 116 278 115 235 108 235 107 277 101 320 99 338 75 339 72 331 85 314 87 272 86 222 77 207 88 171 89 123 79 128 62 157 39 183 30 205 21 211 17 198 27 165 49 137 61 105 81 86 107 78 110 68 102 57 99 32Z" />
        </svg>
        <div className={styles.slots}>{children}</div>
      </div>
      <div className={styles.footer}><span aria-hidden="true">◆</span> Przygotuj się na kolejną przygodę <span aria-hidden="true">◆</span></div>
    </div>
  )
}
