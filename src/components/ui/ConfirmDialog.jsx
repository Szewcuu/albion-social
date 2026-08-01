'use client'

import { useEffect, useId, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Potwierdź',
  cancelLabel = 'Anuluj',
  tone = 'danger',
  onConfirm,
  onOpenChange,
}) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef(null)
  const cancelRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const previousFocus = document.activeElement
    const animationFrame = window.requestAnimationFrame(() => cancelRef.current?.focus())

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onOpenChange(false)
        return
      }

      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll(FOCUSABLE)]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable.at(-1)

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.cancelAnimationFrame(animationFrame)
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus?.()
    }
  }, [onOpenChange, open])

  if (!open) return null

  const danger = tone === 'danger'

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <button type="button" aria-label="Zamknij okno potwierdzenia" className="absolute inset-0 cursor-default bg-black/75 backdrop-blur-sm" onClick={() => onOpenChange(false)} />
      <div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="aopp-panel relative w-full max-w-md rounded-[24px] border border-white/12 p-5 shadow-2xl sm:p-6">
        <button type="button" onClick={() => onOpenChange(false)} aria-label="Zamknij" className="absolute right-4 top-4 rounded-lg border border-white/8 p-2 text-[#918b82] transition hover:border-white/15 hover:text-[#eee7d9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e5bb55]"><X className="h-4 w-4" /></button>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl border ${danger ? 'border-rose-400/25 bg-rose-400/8 text-rose-300' : 'border-[#e5bb55]/25 bg-[#e5bb55]/8 text-[#e5bb55]'}`}><AlertTriangle className="h-5 w-5" /></div>
        <h2 id={titleId} className="font-display mt-4 pr-10 text-xl font-black text-[#fff8e8]">{title}</h2>
        <p id={descriptionId} className="mt-2 text-xs leading-6 text-[#9f9a91]">{description}</p>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <button ref={cancelRef} type="button" onClick={() => onOpenChange(false)} className="aopp-ghost-button min-h-11 justify-center px-4 text-[10px] font-black uppercase tracking-[.12em]">{cancelLabel}</button>
          <button type="button" onClick={onConfirm} className={`min-h-11 rounded-xl border px-4 text-[10px] font-black uppercase tracking-[.12em] transition focus-visible:outline-2 focus-visible:outline-offset-2 ${danger ? 'border-rose-400/30 bg-rose-400/10 text-rose-200 hover:bg-rose-400/16 focus-visible:outline-rose-300' : 'border-[#e5bb55]/30 bg-[#e5bb55]/10 text-[#f4cf76] hover:bg-[#e5bb55]/16 focus-visible:outline-[#e5bb55]'}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}
