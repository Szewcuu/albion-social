import { EQUIPMENT_SLOTS, getItemTierLabel, itemImageUrl } from './buildSlots.js'
import { getBuildLabel, getBudgetLabel } from './buildPresentation.js'

const SLOT_EMOJIS = {
  main_hand: '🗡️',
  off_hand: '🛡️',
  head: '🪖',
  armor: '🥋',
  shoes: '🥾',
  cape: '🧣',
  bag: '🎒',
  potion: '🧪',
  food: '🥩',
  mount: '🐎',
}

/**
 * Formatuje build do czytelnego formatu Discord Markdown
 */
export function formatBuildDiscordText(build = {}, { url = '', author = '' } = {}) {
  const title = String(build.title || 'Doktryna bojowa').trim()
  const rawActivity = build.activity_type || build.tags?.activities?.[0] || 'PvP'
  const activity = getBuildLabel(rawActivity)
  const authorName = author || build.authorName || build.profiles?.username || 'Gracz Albion Social'
  const budget = build.budget ? getBudgetLabel(build.budget) : null

  const lines = [
    `⚔️ **${title}** — ${activity}`,
    `👤 Autor: **${authorName}**${budget ? ` | 💰 Budżet: **${budget}**` : ''}`,
    '',
    '📦 **EKWIPUNEK:**',
  ]

  const slots = build.slots || {}
  const itemNames = build.itemNames || {}

  let hasEquip = false
  for (const slot of EQUIPMENT_SLOTS) {
    const itemData = slots[slot.key]
    const itemId = itemData?.main
    if (!itemId) continue

    hasEquip = true
    const emoji = SLOT_EMOJIS[slot.key] || '🔹'
    const name = itemNames[itemId] || itemId
    const tier = getItemTierLabel(itemId)
    const tierStr = tier ? ` [${tier}]` : ''
    const amountStr = itemData.amount && itemData.amount > 1 ? ` ×${itemData.amount}` : ''
    lines.push(`• ${emoji} **${slot.label}:** ${name}${tierStr}${amountStr}`)
  }

  if (!hasEquip) {
    lines.push('• *(Brak przypisanego ekwipunku)*')
  }

  if (Array.isArray(build.skillCombos) && build.skillCombos.length > 0) {
    const combos = build.skillCombos.filter((c) => c?.name || c?.description)
    if (combos.length > 0) {
      lines.push('')
      lines.push('⚡ **KOMBO / TAKTYKA:**')
      combos.slice(0, 3).forEach((combo, idx) => {
        const comboName = combo.name || `Sekwencja ${idx + 1}`
        const desc = combo.description ? `: ${combo.description}` : ''
        lines.push(`• **${comboName}**${desc}`)
      })
    }
  }

  if (url) {
    lines.push('')
    lines.push('🔗 Zobacz pełny zestaw i statystyki w portalu:')
    lines.push(url)
  }

  return lines.join('\n')
}

function loadImageSafe(src) {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !src) {
      resolve(null)
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

/**
 * Renderuje wizualną kartę doktryny na elemencie Canvas (1200x630 px)
 */
export async function renderBuildCardToCanvas(canvas, build = {}, { author = '', url = 'https://albion-social.vercel.app' } = {}) {
  if (!canvas) return false
  const ctx = canvas.getContext('2d')
  if (!ctx) return false

  const W = 1200
  const H = 630
  canvas.width = W
  canvas.height = H

  // 1. Tło fantasy
  ctx.fillStyle = '#0d0806'
  ctx.fillRect(0, 0, W, H)

  // Radial gradient top-right
  const grad1 = ctx.createRadialGradient(W * 0.85, H * 0.15, 20, W * 0.85, H * 0.15, 500)
  grad1.addColorStop(0, 'rgba(217, 170, 61, 0.14)')
  grad1.addColorStop(1, 'transparent')
  ctx.fillStyle = grad1
  ctx.fillRect(0, 0, W, H)

  // Radial gradient bottom-left
  const grad2 = ctx.createRadialGradient(W * 0.15, H * 0.85, 20, W * 0.15, H * 0.85, 450)
  grad2.addColorStop(0, 'rgba(180, 65, 20, 0.12)')
  grad2.addColorStop(1, 'transparent')
  ctx.fillStyle = grad2
  ctx.fillRect(0, 0, W, H)

  // Zewnętrzna ramka
  ctx.strokeStyle = 'rgba(217, 170, 61, 0.25)'
  ctx.lineWidth = 2
  roundRect(ctx, 24, 24, W - 48, H - 48, 20)
  ctx.stroke()

  // Wewnętrzny subtelny obrys
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
  ctx.lineWidth = 1
  roundRect(ctx, 30, 30, W - 60, H - 60, 16)
  ctx.stroke()

  // 2. Nagłówek karty
  ctx.font = 'bold 11px system-ui, sans-serif'
  ctx.fillStyle = '#d9ad42'
  ctx.fillText('ALBION SOCIAL • DOKTRYNA BOJOWA', 56, 68)

  // Tytuł buildu
  const title = String(build.title || 'Doktryna bojowa').trim()
  ctx.font = 'bold 34px system-ui, serif'
  ctx.fillStyle = '#fff9eb'
  const displayTitle = title.length > 36 ? `${title.slice(0, 34)}…` : title
  ctx.fillText(displayTitle, 56, 112)

  // Meta: autor, aktywność, budżet
  const authorName = author || build.authorName || build.profiles?.username || 'Społeczność'
  const activity = getBuildLabel(build.activity_type || build.tags?.activities?.[0] || 'PvP')
  const budget = build.budget ? getBudgetLabel(build.budget) : null

  let metaX = 56
  const drawChip = (label, color = '#d9ad42', bg = 'rgba(217, 170, 61, 0.12)') => {
    ctx.font = 'bold 11px system-ui, sans-serif'
    const tw = ctx.measureText(label).width
    const chipW = tw + 20
    const chipH = 26
    ctx.fillStyle = bg
    roundRect(ctx, metaX, 126, chipW, chipH, 8)
    ctx.fill()
    ctx.strokeStyle = 'rgba(217, 170, 61, 0.3)'
    ctx.lineWidth = 1
    roundRect(ctx, metaX, 126, chipW, chipH, 8)
    ctx.stroke()

    ctx.fillStyle = color
    ctx.fillText(label, metaX + 10, 143)
    metaX += chipW + 12
  }

  drawChip(`AKTYWNOŚĆ: ${activity.toUpperCase()}`)
  if (budget) drawChip(`BUDŻET: ${budget.toUpperCase()}`, '#e8d2a0')
  drawChip(`AUTOR: ${authorName.toUpperCase()}`, '#b3c7d6', 'rgba(120, 160, 200, 0.1)')

  // 3. Sloty ekwipunku (2 rzędy po 5 slotów)
  const slotList = [
    { key: 'head', label: 'Głowa' },
    { key: 'armor', label: 'Klatka' },
    { key: 'shoes', label: 'Buty' },
    { key: 'cape', label: 'Peleryna' },
    { key: 'bag', label: 'Torba' },
    { key: 'main_hand', label: 'Broń główna' },
    { key: 'off_hand', label: 'Druga ręka' },
    { key: 'potion', label: 'Mikstura' },
    { key: 'food', label: 'Jedzenie' },
    { key: 'mount', label: 'Wierzchowiec' },
  ]

  const slots = build.slots || {}
  const itemNames = build.itemNames || {}

  // Przygotuj ładowanie obrazów
  const imagePromises = slotList.map((slot) => {
    const itemData = slots[slot.key]
    const itemId = itemData?.main
    if (!itemId) return Promise.resolve(null)
    const url = itemImageUrl(itemId, 1, 96)
    return loadImageSafe(url)
  })

  const loadedImages = await Promise.all(imagePromises)

  const startY = 176
  const slotW = 196
  const slotH = 155
  const gapX = 22
  const gapY = 16

  slotList.forEach((slot, index) => {
    const col = index % 5
    const row = Math.floor(index / 5)
    const x = 56 + col * (slotW + gapX)
    const y = startY + row * (slotH + gapY)

    const itemData = slots[slot.key]
    const itemId = itemData?.main
    const img = loadedImages[index]

    // Tło slotu
    ctx.fillStyle = 'rgba(21, 14, 10, 0.75)'
    roundRect(ctx, x, y, slotW, slotH, 14)
    ctx.fill()

    ctx.strokeStyle = itemId ? 'rgba(217, 170, 61, 0.28)' : 'rgba(255, 255, 255, 0.07)'
    ctx.lineWidth = 1.2
    roundRect(ctx, x, y, slotW, slotH, 14)
    ctx.stroke()

    // Etykieta slotu
    ctx.font = 'bold 9px system-ui, sans-serif'
    ctx.fillStyle = '#8f887c'
    ctx.fillText(slot.label.toUpperCase(), x + 10, y + 18)

    if (itemId) {
      // Rysuj obrazek przedmiotu
      if (img) {
        ctx.drawImage(img, x + (slotW - 74) / 2, y + 26, 74, 74)
      } else {
        // Fallback placeholder
        ctx.fillStyle = 'rgba(217, 170, 61, 0.08)'
        roundRect(ctx, x + (slotW - 64) / 2, y + 30, 64, 64, 10)
        ctx.fill()
        ctx.font = 'bold 10px system-ui, sans-serif'
        ctx.fillStyle = '#d9ad42'
        ctx.fillText('IKONA', x + slotW / 2 - 16, y + 66)
      }

      // Badge Tieru
      const tier = getItemTierLabel(itemId)
      if (tier) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
        roundRect(ctx, x + 8, y + 84, 34, 18, 5)
        ctx.fill()
        ctx.strokeStyle = 'rgba(217, 170, 61, 0.4)'
        ctx.lineWidth = 1
        roundRect(ctx, x + 8, y + 84, 34, 18, 5)
        ctx.stroke()
        ctx.font = 'bold 10px monospace'
        ctx.fillStyle = '#f0cf77'
        ctx.fillText(tier, x + 12, y + 97)
      }

      // Ilość (np. x10 dla mikstur/jedzenia)
      if (itemData.amount && itemData.amount > 1) {
        const amtStr = `×${itemData.amount}`
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)'
        roundRect(ctx, x + slotW - 36, y + 84, 28, 18, 5)
        ctx.fill()
        ctx.font = 'bold 10px monospace'
        ctx.fillStyle = '#fff'
        ctx.fillText(amtStr, x + slotW - 32, y + 97)
      }

      // Nazwa przedmiotu pod slotem
      const name = itemNames[itemId] || itemId
      ctx.font = 'bold 11px system-ui, sans-serif'
      ctx.fillStyle = '#e8e2d5'
      const truncatedName = name.length > 22 ? `${name.slice(0, 20)}…` : name
      const nameW = ctx.measureText(truncatedName).width
      ctx.fillText(truncatedName, x + (slotW - nameW) / 2, y + 134)
    } else {
      ctx.font = 'italic 11px system-ui, sans-serif'
      ctx.fillStyle = '#544e45'
      const emptyLabel = 'Pusty slot'
      const emptyW = ctx.measureText(emptyLabel).width
      ctx.fillText(emptyLabel, x + (slotW - emptyW) / 2, y + 80)
    }
  })

  // 4. Dolna belka / Stopka
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(56, H - 76)
  ctx.lineTo(W - 56, H - 76)
  ctx.stroke()

  ctx.font = 'bold 12px system-ui, sans-serif'
  ctx.fillStyle = '#d9ad42'
  ctx.fillText('albion-social.vercel.app', 56, H - 48)

  ctx.font = '11px system-ui, sans-serif'
  ctx.fillStyle = '#8f887c'
  ctx.fillText('Ogólnopolski portal i zbrojownia graczy Albion Online', 240, H - 48)

  const rightText = 'Karta wygenerowana automatycznie'
  const rw = ctx.measureText(rightText).width
  ctx.fillText(rightText, W - 56 - rw, H - 48)

  return true
}
