'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export default function CustomSelect({ value, onChange, options = [], placeholder = 'Wybierz…', label, className = '', disabled = false }) {
  const controlId = useId()
  const buttonId = `${controlId}-button`
  const listboxId = `${controlId}-listbox`
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef(null)

  const normalizedOptions = useMemo(() => options.map((option) => {
    if (typeof option === 'object' && option !== null) return { value: String(option.value), label: String(option.label) }
    return { value: String(option), label: String(option) }
  }), [options])

  const selectedIndex = normalizedOptions.findIndex((option) => option.value === String(value))
  const selectedOption = normalizedOptions[selectedIndex]

  useEffect(() => {
    function handlePointerDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  function selectIndex(index) {
    const option = normalizedOptions[index]
    if (!option) return
    onChange(option.value)
    setActiveIndex(index)
    setIsOpen(false)
  }

  function moveActive(direction) {
    if (!normalizedOptions.length) return
    setActiveIndex((current) => {
      const start = current >= 0 ? current : selectedIndex >= 0 ? selectedIndex : 0
      return (start + direction + normalizedOptions.length) % normalizedOptions.length
    })
  }

  function openListbox() {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0)
    setIsOpen(true)
  }

  function handleKeyDown(event) {
    if (disabled) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!isOpen) {
        setIsOpen(true)
        setActiveIndex(selectedIndex >= 0 ? selectedIndex : event.key === 'ArrowDown' ? 0 : normalizedOptions.length - 1)
      } else moveActive(event.key === 'ArrowDown' ? 1 : -1)
      return
    }
    if (event.key === 'Home' || event.key === 'End') {
      if (!isOpen || !normalizedOptions.length) return
      event.preventDefault()
      setActiveIndex(event.key === 'Home' ? 0 : normalizedOptions.length - 1)
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (isOpen) selectIndex(activeIndex)
      else openListbox()
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setIsOpen(false)
      return
    }
    if (event.key === 'Tab') setIsOpen(false)
  }

  return (
    <div className={`relative w-full ${isOpen ? 'z-[100]' : 'z-10'} ${className}`} ref={containerRef}>
      {label && <label htmlFor={buttonId} className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">{label}</label>}
      <button
        id={buttonId}
        type="button"
        role="combobox"
        disabled={disabled}
        onClick={() => {
          if (disabled) return
          if (isOpen) setIsOpen(false)
          else openListbox()
        }}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={isOpen && activeIndex >= 0 ? `${controlId}-option-${activeIndex}` : undefined}
        className={`flex min-h-[42px] w-full cursor-pointer items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-bold outline-none transition-all ${disabled ? 'cursor-not-allowed border-[var(--border)] bg-[var(--bg-panel)] text-[var(--text-faded)] opacity-50' : isOpen ? 'border-[var(--gold)] bg-[var(--bg-stone)] text-[var(--gold-bright)] shadow-[0_0_12px_rgba(200,168,78,0.15)] ring-1 ring-[var(--gold)]/30' : 'border-[var(--border-warm)] bg-[var(--bg-stone)] text-[var(--text-bright)] hover:border-[var(--gold-dim)] hover:bg-[var(--bg-hover)]'}`}
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <ChevronDown aria-hidden="true" className={`h-4 w-4 shrink-0 text-[var(--gold)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div id={listboxId} role="listbox" aria-label={label || placeholder} className="absolute left-0 right-0 top-[calc(100%+6px)] z-[9999] max-h-60 overflow-y-auto rounded-xl border border-[var(--border-warm)] bg-[#120d0a] p-1.5 font-mono text-xs shadow-2xl shadow-black/95 animate-fade-in">
          {normalizedOptions.length === 0 ? <div className="px-3 py-2 text-center italic text-[var(--text-muted)]">Brak opcji</div> : normalizedOptions.map((option, index) => {
            const isSelected = option.value === String(value)
            const isActive = activeIndex === index
            return (
              <div
                id={`${controlId}-option-${index}`}
                key={`${option.value}-${index}`}
                role="option"
                aria-selected={isSelected}
                onPointerMove={() => setActiveIndex(index)}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => selectIndex(index)}
                className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2.5 transition-colors ${isSelected ? 'border-[var(--border-warm)] bg-[var(--gold-glow)] font-bold text-[var(--gold-bright)]' : isActive ? 'border-white/8 bg-[var(--bg-hover)] text-[var(--text-bright)]' : 'border-transparent text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-bright)]'}`}
              >
                <span className="truncate">{option.label}</span>
                {isSelected && <Check aria-hidden="true" className="ml-2 h-3.5 w-3.5 shrink-0 text-[var(--gold)]" />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
