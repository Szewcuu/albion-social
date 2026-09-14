'use client'

import { useState } from 'react'
import {
  Zap, Plus, Trash2, RotateCcw, Sparkles, ChevronDown, Check,
  Swords, Shield, Heart, ArrowRight, CornerDownRight
} from 'lucide-react'

export const COMBO_TEMPLATES = [
  {
    name: 'Burst DPS Opener',
    category: 'DPS',
    icon: Swords,
    description: 'F (Sprint) → R (Damage Buff) → W (Stun/Root) → E (Nuke) → Q (Finish)',
    hint: 'Maksymalny natychmiastowy burst po wejściu w zasięg wroga.',
  },
  {
    name: 'Inicjacja Tanka (CC Chain)',
    category: 'Tank',
    icon: Shield,
    description: 'F (Dojście) → E (Inicjacja CC) → W (Ściągnięcie) → D (Purge) → Q (Aggro)',
    hint: 'Zablokowanie wroga i przerwanie jego umiejętności obronnych.',
  },
  {
    name: 'Ratunek Sojusznika (Emergency Save)',
    category: 'Healer',
    icon: Heart,
    description: 'D (Hełm Tarcza) → R (Zbroja Leczenia) → E (Burst Heal) → Q (Sustain)',
    hint: 'Błyskawiczne wyciągnięcie sojusznika z krytycznego poziomu HP.',
  },
  {
    name: 'Ucieczka / Reset Walki (Disengage)',
    category: 'Survival',
    icon: Sparkles,
    description: 'D (Cleanse) → F (Niewidzialność/Sprint) → W (Odskok) → Mikstura (Invis)',
    hint: 'Zrzucenie efektów kontroli tłumu i bezpieczne oddalenie się z walki.',
  },
  {
    name: 'Cień Skrytobójcy (One-Shot)',
    category: 'DPS',
    icon: Swords,
    description: 'R (Niewidzialność) → F (Dojście) → W (Shadow Edge) → E (Slit Throat) → Mikstura (Trucizna)',
    hint: 'Klasyczny gank i eliminacja samotnego celu z zaskoczenia.',
  },
  {
    name: 'Kiting Maga (Poke & Zone)',
    category: 'Mage',
    icon: Zap,
    description: 'Q (Poke) → W (Spowolnienie) → R (Moc Zaklęć) → E (Obszarowy Nuke) → F (Odskok)',
    hint: 'Utrzymanie bezpiecznego dystansu przy jednoczesnej presji obszarowej.',
  },
]

const QUICK_KEYS = [
  { label: 'Q', detail: 'Broń Q', color: 'border-amber-400/40 bg-amber-400/10 text-amber-300' },
  { label: 'W', detail: 'Broń W', color: 'border-orange-400/40 bg-orange-400/10 text-orange-300' },
  { label: 'E', detail: 'Broń E (Główny)', color: 'border-rose-400/50 bg-rose-400/15 text-rose-300 font-black' },
  { label: 'D', detail: 'Hełm', color: 'border-sky-400/40 bg-sky-400/10 text-sky-300' },
  { label: 'R', detail: 'Zbroja', color: 'border-purple-400/40 bg-purple-400/10 text-purple-300' },
  { label: 'F', detail: 'Buty', color: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' },
  { label: 'Pot', detail: 'Mikstura', color: 'border-teal-400/40 bg-teal-400/10 text-teal-300' },
  { label: 'AA', detail: 'Auto-Atak', color: 'border-gray-400/40 bg-gray-400/10 text-gray-300' },
]

/**
 * Rozbija opis kombo na pojedyncze kroki sekwencji
 */
export function parseComboSteps(description = '') {
  if (!description) return []
  return description
    .split(/→|->/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/**
 * Kolorowanie plakietki kroku kombo na podstawie zawartego klawisza
 */
export function getStepBadgeStyle(step = '') {
  const upper = step.toUpperCase()
  if (upper.startsWith('Q')) return 'border-amber-400/40 bg-amber-400/15 text-amber-200'
  if (upper.startsWith('W')) return 'border-orange-400/40 bg-orange-400/15 text-orange-200'
  if (upper.startsWith('E')) return 'border-rose-400/50 bg-rose-500/20 text-rose-200 font-black shadow-[0_0_12px_rgba(244,63,94,0.2)]'
  if (upper.startsWith('D')) return 'border-sky-400/40 bg-sky-400/15 text-sky-200'
  if (upper.startsWith('R')) return 'border-purple-400/40 bg-purple-400/15 text-purple-200'
  if (upper.startsWith('F')) return 'border-emerald-400/40 bg-emerald-400/15 text-emerald-200'
  if (upper.includes('POT') || upper.includes('MIKSTURA')) return 'border-teal-400/40 bg-teal-400/15 text-teal-200'
  return 'border-white/15 bg-black/40 text-gray-200'
}

export default function SkillComboBuilder({
  skillCombos = [],
  onChange,
  max = 5,
}) {
  const [showTemplates, setShowTemplates] = useState(false)

  const handleAddCombo = () => {
    if (skillCombos.length < max) {
      onChange([...skillCombos, { name: '', description: '' }])
    }
  }

  const handleApplyTemplate = (template) => {
    if (skillCombos.length < max) {
      onChange([...skillCombos, { name: template.name, description: template.description }])
      setShowTemplates(false)
    }
  }

  const handleUpdateName = (idx, name) => {
    const next = [...skillCombos]
    next[idx] = { ...next[idx], name }
    onChange(next)
  }

  const handleUpdateDescription = (idx, description) => {
    const next = [...skillCombos]
    next[idx] = { ...next[idx], description }
    onChange(next)
  }

  const handleAppendKey = (idx, keyLabel) => {
    const currentDesc = (skillCombos[idx]?.description || '').trim()
    const separator = currentDesc.length > 0 ? ' → ' : ''
    handleUpdateDescription(idx, `${currentDesc}${separator}${keyLabel}`)
  }

  const handleUndoStep = (idx) => {
    const steps = parseComboSteps(skillCombos[idx]?.description || '')
    if (steps.length > 0) {
      steps.pop()
      handleUpdateDescription(idx, steps.join(' → '))
    }
  }

  const handleClearSteps = (idx) => {
    handleUpdateDescription(idx, '')
  }

  const handleRemoveCombo = (idx) => {
    onChange(skillCombos.filter((_, i) => i !== idx))
  }

  return (
    <section className="panel space-y-4 p-5 sm:p-6 border-[var(--border-warm)] rounded-[24px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/8 pb-4">
        <div>
          <h2 className="text-sm font-mono font-bold text-[var(--gold)] uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            Sekwencje Kombo & Rotacja Skilli ({skillCombos.length}/{max})
          </h2>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            Zdefiniuj kolejność użycia czarów lub wybierz gotowy szablon taktyczny.
          </p>
        </div>

        {/* PRZYCISK SZABLONÓW */}
        {skillCombos.length < max && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTemplates((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-mono font-bold text-amber-200 hover:bg-amber-400/20 transition cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Szablony Kombo</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
            </button>

            {showTemplates && (
              <div className="absolute right-0 top-full mt-2 z-30 w-80 rounded-2xl border border-[var(--border-warm)] bg-[#120b0c] p-3 shadow-2xl space-y-1.5">
                <p className="px-2 py-1 text-[9px] font-black uppercase tracking-wider text-[var(--amber)]">
                  Wybierz szablon kombo
                </p>
                <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
                  {COMBO_TEMPLATES.map((tmpl) => {
                    const Icon = tmpl.icon
                    return (
                      <button
                        key={tmpl.name}
                        type="button"
                        onClick={() => handleApplyTemplate(tmpl)}
                        className="w-full text-left p-2.5 rounded-xl border border-white/5 bg-black/30 hover:border-amber-400/40 hover:bg-amber-400/10 transition cursor-pointer"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-amber-400" /> {tmpl.name}
                          </span>
                          <span className="text-[8px] font-mono uppercase bg-white/10 px-1.5 py-0.5 rounded text-gray-300">
                            {tmpl.category}
                          </span>
                        </div>
                        <p className="mt-1 text-[10px] text-amber-200/80 font-mono truncate">
                          {tmpl.description}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* LISTA AKTYWNYCH KOMBO */}
      {skillCombos.length > 0 ? (
        <div className="space-y-4">
          {skillCombos.map((combo, idx) => {
            const steps = parseComboSteps(combo.description)
            return (
              <div
                key={idx}
                className="rounded-2xl border border-white/10 bg-black/25 p-4 space-y-3 shadow-md"
              >
                {/* WIERSZ 1: NAZWA KOMBO I USUNIĘCIE */}
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-amber-400/30 bg-amber-400/10 text-xs font-mono font-bold text-amber-300">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    maxLength={100}
                    aria-label={`Nazwa combo ${idx + 1}`}
                    placeholder="Nazwa sekwencji (np. Burst Opener, Inicjacja, Ucieczka)"
                    value={combo.name}
                    onChange={(e) => handleUpdateName(idx, e.target.value)}
                    className="flex-1 rounded-xl border border-[var(--border-warm)] bg-[var(--bg-elevated)] px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/30 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveCombo(idx)}
                    aria-label={`Usuń combo ${idx + 1}`}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-rose-400 hover:bg-rose-500/20 hover:text-white transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* KLAWIATURA SZYBKIEGO WSTAWIANIA KROKÓW */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[9px] font-mono text-[var(--text-secondary)] uppercase mr-1">
                    Wstaw:
                  </span>
                  {QUICK_KEYS.map((qk) => (
                    <button
                      key={qk.label}
                      type="button"
                      onClick={() => handleAppendKey(idx, qk.label)}
                      title={`Dodaj ${qk.detail}`}
                      className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-mono font-bold transition hover:scale-105 cursor-pointer ${qk.color}`}
                    >
                      <span>{qk.label}</span>
                    </button>
                  ))}

                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleUndoStep(idx)}
                      disabled={steps.length === 0}
                      title="Cofnij ostatni krok"
                      className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-mono text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClearSteps(idx)}
                      disabled={steps.length === 0}
                      title="Wyczyść całą sekwencję"
                      className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[10px] font-mono text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"
                    >
                      Wyczyść
                    </button>
                  </div>
                </div>

                {/* PODGLĄD WIZUALNY SEKWENCJI */}
                {steps.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 bg-black/40 p-3">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-muted)] mr-1">
                      Podgląd:
                    </span>
                    {steps.map((step, stepIdx) => (
                      <div key={stepIdx} className="flex items-center gap-2">
                        <span
                          className={`rounded-lg border px-2.5 py-1 text-xs font-mono font-bold shadow-sm ${getStepBadgeStyle(step)}`}
                        >
                          {step}
                        </span>
                        {stepIdx < steps.length - 1 && (
                          <ArrowRight className="w-3.5 h-3.5 text-amber-400/60 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] font-mono text-gray-500 italic pl-1">
                    Kliknij przyciski powyżej (np. Q, W, E), aby ułożyć sekwencję kroków.
                  </p>
                )}

                {/* RĘCZNY INPUT OPISU/UWAG */}
                <div>
                  <input
                    type="text"
                    maxLength={500}
                    aria-label={`Sekwencja combo ${idx + 1}`}
                    placeholder="Wpisz lub edytuj pełną sekwencję (np. Q → W → E → R)"
                    value={combo.description}
                    onChange={(e) => handleUpdateDescription(idx, e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/30 p-2.5 text-xs text-white placeholder-white/30 outline-none focus:border-amber-400/50 font-mono"
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-black/20 p-6 text-center">
          <Zap className="mx-auto h-7 w-7 text-amber-400/40" />
          <p className="mt-2 text-xs font-bold text-white">Brak zdefiniowanych kombo</p>
          <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
            Dodaj sekwencje umiejętności, aby inni gracze wiedzieli jak poprawnie prowadzić rotację w walce.
          </p>
        </div>
      )}

      {/* PRZYCISK DODAJ KOMBO */}
      {skillCombos.length < max && (
        <button
          type="button"
          onClick={handleAddCombo}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-mono font-bold text-amber-200 hover:bg-amber-400/20 transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Dodaj sekwencję kombo ({skillCombos.length}/{max})</span>
        </button>
      )}
    </section>
  )
}
