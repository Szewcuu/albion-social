'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

/**
 * Medieval-styled Custom Select Component replacing browser default <select>
 *
 * Props:
 * - value: string | number
 * - onChange: (value: string) => void
 * - options: Array<{ value: string | number, label: string }> or Array<string>
 * - placeholder?: string
 * - label?: string
 * - className?: string
 * - disabled?: boolean
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Wybierz...',
  label,
  className = '',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  // Normalize options array: [{ value, label }]
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return { value: String(opt.value), label: String(opt.label) }
    }
    return { value: String(opt), label: String(opt) }
  })

  const selectedOption = normalizedOptions.find((opt) => opt.value === String(value))
  const displayLabel = selectedOption ? selectedOption.label : placeholder

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (optionValue) => {
    onChange(optionValue)
    setIsOpen(false)
  }

  const handleKeyDown = (e) => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsOpen(!isOpen)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1 font-mono">
          {label}
        </label>
      )}

      {/* Select Button Header */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full min-h-[42px] px-3.5 py-2.5 rounded-xl border text-xs font-mono font-bold flex items-center justify-between gap-2 cursor-pointer transition-all outline-none ${
          disabled
            ? 'opacity-50 cursor-not-allowed border-[var(--border)] bg-[var(--bg-panel)] text-[var(--text-faded)]'
            : isOpen
            ? 'border-[var(--gold)] bg-[var(--bg-stone)] text-[var(--gold-bright)] shadow-[0_0_12px_rgba(200,168,78,0.15)]'
            : 'border-[var(--border-warm)] bg-[var(--bg-stone)] text-[var(--text-bright)] hover:border-[var(--gold-dim)] hover:bg-[var(--bg-hover)]'
        }`}
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown
          className={`w-4 h-4 text-[var(--gold)] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Floating Options Dropdown */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-60 overflow-y-auto rounded-xl border border-[var(--border-warm)] bg-[var(--bg-stone)] p-1.5 shadow-2xl shadow-black/80 animate-fade-in font-mono text-xs"
          style={{ background: 'var(--bg-stone)' }}
        >
          {normalizedOptions.length === 0 ? (
            <div className="px-3 py-2 text-[var(--text-muted)] italic text-center">Brak opcji</div>
          ) : (
            normalizedOptions.map((opt) => {
              const isSelected = opt.value === String(value)
              return (
                <div
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(opt.value)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[var(--gold-glow)] text-[var(--gold-bright)] font-bold border border-[var(--border-warm)]'
                      : 'text-[var(--text-primary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-bright)]'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[var(--gold)] shrink-0 ml-2" />}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
