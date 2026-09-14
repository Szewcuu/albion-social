'use client'

import CustomSelect from '@/components/ui/CustomSelect'
import { useState } from 'react'
import { calculateBuildStats, QUALITY_OPTIONS } from '@/lib/statCalculator'
import {
  Shield, Heart, Zap, Swords, Award, Settings2 as Sliders,
  Crosshair, ShieldAlert, Sparkles, Activity, Layers, HeartPulse
} from 'lucide-react'

const SLOT_LABELS = {
  main_hand: 'Broń główna',
  off_hand: 'Off-hand',
  head: 'Hełm',
  armor: 'Zbroja',
  shoes: 'Buty',
  cape: 'Peleryna',
}

export default function BuildStatsCalculator({
  slots,
  quality = 1,
  specBonus = 0,
  onQualityChange,
  onSpecChange,
  readOnly = false,
}) {
  const [localQuality, setLocalQuality] = useState(quality)
  const [localSpec, setLocalSpec] = useState(specBonus)
  const [viewMode, setViewMode] = useState('overview') // 'overview' | 'advanced' | 'slots'

  const activeQuality = readOnly ? quality : localQuality
  const activeSpec = readOnly ? specBonus : localSpec

  const stats = calculateBuildStats(slots, activeQuality, activeSpec)

  const handleQualitySelect = (val) => {
    setLocalQuality(val)
    if (onQualityChange) onQualityChange(val)
  }

  const handleSpecSelect = (val) => {
    setLocalSpec(val)
    if (onSpecChange) onSpecChange(val)
  }

  return (
    <div className="rounded-[24px] border border-[var(--border-warm)] bg-[#0a0608] p-4 sm:p-6 shadow-xl space-y-5">
      {/* NAGŁÓWEK KALKULATORA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/8">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[var(--gold)] uppercase tracking-wider font-mono flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Kalkulator Statystyk & Parametrów Bojowych
            </h3>
            {stats.archetype && (
              <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-[9px] font-bold text-amber-300">
                {stats.archetype.label}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
            Szacowane parametry walki, absorpcja obrażeń oraz redukcja CC w zależności od tieru i jakości.
          </p>
        </div>

        {/* ODZNAKA ŚREDNIEGO IP */}
        <div className={`px-4 py-2 rounded-2xl border text-center font-mono ${stats.rank.color} shadow-lg shrink-0`}>
          <div className="text-[8px] uppercase tracking-widest opacity-80">Moc Zestawu</div>
          <div className="text-xl font-black">{stats.avgIp} <span className="text-xs font-bold">IP</span></div>
        </div>
      </div>

      {/* SUWAKI / WYBORY PARAMETRÓW (jeśli nie jest w trybie readOnly) */}
      {!readOnly && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/30 p-4 rounded-2xl border border-white/8">
          {/* JAKOŚĆ PRZEDMIOTU */}
          <div>
            <CustomSelect
              label="Jakość Ekwipunku:"
              value={activeQuality}
              onChange={(val) => handleQualitySelect(Number(val))}
              options={QUALITY_OPTIONS.map((q) => ({
                value: q.value,
                label: `${q.label} (+${q.bonusIp} IP)`,
              }))}
            />
          </div>

          {/* SPECJALIZACJA (MASTERY BONUS) */}
          <div className="flex flex-col justify-center">
            <div className="flex justify-between items-center mb-1.5">
              <label htmlFor="build-specialization" className="text-[10px] font-mono text-[var(--text-secondary)] uppercase font-bold">
                Specjalizacja (Mastery):
              </label>
              <span className="text-xs font-mono font-bold text-amber-300">+{activeSpec} IP</span>
            </div>
            <input
              id="build-specialization"
              type="range"
              min={0}
              max={240}
              step={10}
              value={activeSpec}
              onChange={(e) => handleSpecSelect(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-2 bg-black/50 rounded-lg"
            />
            <div className="flex justify-between text-[8px] font-mono text-[var(--text-muted)] mt-1">
              <span>0 IP (Podstawa)</span>
              <span>100 IP (Mistrz)</span>
              <span>240 IP (Maksimum 120/120)</span>
            </div>
          </div>
        </div>
      )}

      {/* PRZEŁĄCZNIK WIDOKÓW STATYSTYK */}
      <div className="flex items-center gap-2 border-b border-white/8 pb-2 text-[10px] font-mono uppercase tracking-wider">
        <button
          type="button"
          onClick={() => setViewMode('overview')}
          className={`px-3 py-1.5 rounded-lg border transition ${
            viewMode === 'overview'
              ? 'border-amber-400/50 bg-amber-400/15 text-amber-200 font-bold'
              : 'border-transparent text-[var(--text-secondary)] hover:text-white'
          }`}
        >
          Kluczowe Parametry
        </button>
        <button
          type="button"
          onClick={() => setViewMode('advanced')}
          className={`px-3 py-1.5 rounded-lg border transition ${
            viewMode === 'advanced'
              ? 'border-amber-400/50 bg-amber-400/15 text-amber-200 font-bold'
              : 'border-transparent text-[var(--text-secondary)] hover:text-white'
          }`}
        >
          Zaawansowane (CC & Aggro)
        </button>
        <button
          type="button"
          onClick={() => setViewMode('slots')}
          className={`px-3 py-1.5 rounded-lg border transition ${
            viewMode === 'slots'
              ? 'border-amber-400/50 bg-amber-400/15 text-amber-200 font-bold'
              : 'border-transparent text-[var(--text-secondary)] hover:text-white'
          }`}
        >
          Moc Slotów ({stats.activeSlotsCount}/6)
        </button>
      </div>

      {/* WIDOK 1: KLUCZOWE PARAMETRY */}
      {viewMode === 'overview' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* STAT 1: HP */}
          <div className="bg-black/30 border border-white/8 p-3.5 rounded-2xl">
            <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-mono uppercase mb-1">
              <Heart className="w-3.5 h-3.5" />
              Szacowane HP
            </div>
            <div className="text-base font-bold font-mono text-white">
              {stats.maxHp > 0 ? `${stats.maxHp.toLocaleString('pl-PL')} HP` : '—'}
            </div>
            <p className="mt-1 text-[9px] text-[var(--text-secondary)]">Skalowane z IP i zbroją</p>
          </div>

          {/* STAT 2: ENERGIA */}
          <div className="bg-black/30 border border-white/8 p-3.5 rounded-2xl">
            <div className="flex items-center gap-1.5 text-sky-400 text-[10px] font-mono uppercase mb-1">
              <Zap className="w-3.5 h-3.5" />
              Pula Energii
            </div>
            <div className="text-base font-bold font-mono text-white">
              {stats.maxEnergy > 0 ? `${stats.maxEnergy.toLocaleString('pl-PL')} MP` : '—'}
            </div>
            <p className="mt-1 text-[9px] text-[var(--text-secondary)]">Regen: ~{stats.energyRegenPerSec}/s</p>
          </div>

          {/* STAT 3: DAMAGE BONUS */}
          <div className="bg-black/30 border border-white/8 p-3.5 rounded-2xl">
            <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-mono uppercase mb-1">
              <Swords className="w-3.5 h-3.5" />
              Premia Obrażeń
            </div>
            <div className="text-base font-bold font-mono text-amber-300">
              {stats.damageBonusPercent > 0 ? `+${stats.damageBonusPercent}%` : '—'}
            </div>
            <p className="mt-1 text-[9px] text-[var(--text-secondary)]">Względem bazowego T4.0</p>
          </div>

          {/* STAT 4: DEFENSE & MITIGATION */}
          <div className="bg-black/30 border border-white/8 p-3.5 rounded-2xl">
            <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-mono uppercase mb-1">
              <Shield className="w-3.5 h-3.5" />
              Odporności ({stats.armorType})
            </div>
            <div className="text-xs font-mono text-gray-200 mt-1 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400">Fiz:</span>
                <span className="font-bold text-emerald-300">{stats.armorResist} <small className="font-normal text-emerald-400/80">({stats.physicalMitigation}%)</small></span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400">Mag:</span>
                <span className="font-bold text-sky-300">{stats.magicResist} <small className="font-normal text-sky-400/80">({stats.magicMitigation}%)</small></span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WIDOK 2: ZAAWANSOWANE STATYSTYKI BOJOWE */}
      {viewMode === 'advanced' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* CC RESISTANCE */}
          <div className="bg-black/30 border border-white/8 p-3.5 rounded-2xl">
            <div className="flex items-center gap-1.5 text-violet-400 text-[10px] font-mono uppercase mb-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              Odporność na CC
            </div>
            <div className="text-base font-bold font-mono text-violet-300">
              +{stats.ccResistance}
            </div>
            <p className="mt-1 text-[9px] text-[var(--text-secondary)]">
              -{stats.ccDurationReduction}% czasu stun/root
            </p>
          </div>

          {/* THREAT / AGGRO */}
          <div className="bg-black/30 border border-white/8 p-3.5 rounded-2xl">
            <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-mono uppercase mb-1">
              <Crosshair className="w-3.5 h-3.5" />
              Generowanie Aggro
            </div>
            <div className="text-base font-bold font-mono text-white">
              {stats.threatBonusPercent > 0 ? `+${stats.threatBonusPercent}%` : `${stats.threatBonusPercent}%`}
            </div>
            <p className="mt-1 text-[9px] text-[var(--text-secondary)]">
              {stats.armorType === 'Plate' ? 'Tank (utrzymanie aggro)' : 'Normalne skupianie mobów'}
            </p>
          </div>

          {/* HEALING BONUS */}
          <div className="bg-black/30 border border-white/8 p-3.5 rounded-2xl">
            <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-mono uppercase mb-1">
              <HeartPulse className="w-3.5 h-3.5" />
              Siła Leczenia
            </div>
            <div className="text-base font-bold font-mono text-emerald-300">
              {stats.healingBonusPercent > 0 ? `+${stats.healingBonusPercent}%` : '0%'}
            </div>
            <p className="mt-1 text-[9px] text-[var(--text-secondary)]">Bonus dla czarów leczniczych</p>
          </div>

          {/* HEALTH REGEN */}
          <div className="bg-black/30 border border-white/8 p-3.5 rounded-2xl">
            <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-mono uppercase mb-1">
              <Activity className="w-3.5 h-3.5" />
              Regeneracja HP
            </div>
            <div className="text-base font-bold font-mono text-white">
              ~{stats.outOfCombatHealthRegen} HP/s
            </div>
            <p className="mt-1 text-[9px] text-[var(--text-secondary)]">Regeneracja poza walką</p>
          </div>
        </div>
      )}

      {/* WIDOK 3: ROZBICIE MOCY SLOTÓW */}
      {viewMode === 'slots' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5">
          {Object.entries(stats.slotIps).map(([slotKey, ip]) => (
            <div key={slotKey} className="bg-black/30 border border-white/8 p-3 rounded-xl text-center">
              <span className="text-[8px] font-black uppercase tracking-wider text-[var(--text-secondary)] block">
                {SLOT_LABELS[slotKey] || slotKey}
              </span>
              <p className="mt-1 font-mono text-base font-bold text-amber-300">
                {ip > 0 ? `${ip} IP` : '—'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ETYKIETA I OPIS ARCHETYPU */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono bg-black/40 p-3 rounded-xl border border-white/5">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[var(--text-secondary)]">
            Ranga mocy: <strong className="text-white">{stats.rank.label}</strong>
          </span>
        </div>
        {stats.archetype && (
          <span className="text-[10px] text-amber-300/80">
            {stats.archetype.description}
          </span>
        )}
      </div>
    </div>
  )
}
