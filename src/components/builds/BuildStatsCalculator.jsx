'use client'

import CustomSelect from '@/components/ui/CustomSelect'

import { useState } from 'react'
import { calculateBuildStats, QUALITY_OPTIONS } from '@/lib/statCalculator'
import { Shield, Heart, Zap, Swords, Award, Sliders } from 'lucide-react'

export default function BuildStatsCalculator({ slots, quality = 1, specBonus = 0, onQualityChange, onSpecChange, readOnly = false }) {
  const [localQuality, setLocalQuality] = useState(quality)
  const [localSpec, setLocalSpec] = useState(specBonus)

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
    <div className="bg-[#070406] border border-[#2e131c] rounded-2xl p-4 sm:p-6 shadow-xl space-y-5">
      {/* NAGŁÓWEK KALKULATORA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#240e15]">
        <div>
          <h3 className="text-sm font-bold text-[#f3ba2f] uppercase tracking-wider font-mono flex items-center gap-2">
            <Sliders className="w-4 h-4 text-rose-400" />
            Kalkulator Statystyk & Item Power (IP)
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Szacowana moc bojowa zestawu w zależności od jakości i specjalizacji.
          </p>
        </div>

        {/* ODZNAKA ŚREDNIEGO IP */}
        <div className={`px-3.5 py-1.5 rounded-xl border text-center font-mono ${stats.rank.color}`}>
          <div className="text-[9px] uppercase tracking-widest opacity-80">Moc Zestawu</div>
          <div className="text-lg font-black">{stats.avgIp} <span className="text-xs font-bold">IP</span></div>
        </div>
      </div>

      {/* SUWAKI / WYBORY PARAMETRÓW (jeśli nie jest w trybie readOnly) */}
      {!readOnly && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#0a0508] p-3.5 rounded-xl border border-[#200d14]">
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
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-[10px] font-mono text-gray-400 uppercase">
                Specjalizacja (Mastery):
              </label>
              <span className="text-xs font-mono font-bold text-rose-400">+{activeSpec} IP</span>
            </div>
            <input
              type="range"
              min={0}
              max={240}
              step={10}
              value={activeSpec}
              onChange={(e) => handleSpecSelect(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer h-1.5 bg-[#1b0a0e] rounded-lg"
            />
          </div>
        </div>
      )}

      {/* KRATKA WYWICZONYCH STATYSTYK */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* STAT 1: HP */}
        <div className="bg-[#0d0609] border border-[#260e16] p-3 rounded-xl">
          <div className="flex items-center gap-1.5 text-rose-400 text-[10px] font-mono uppercase mb-1">
            <Heart className="w-3.5 h-3.5" />
            Szacowane HP
          </div>
          <div className="text-base font-bold font-mono text-gray-100">
            {stats.maxHp > 0 ? `${stats.maxHp} HP` : '—'}
          </div>
        </div>

        {/* STAT 2: ENERGIA */}
        <div className="bg-[#0d0609] border border-[#260e16] p-3 rounded-xl">
          <div className="flex items-center gap-1.5 text-sky-400 text-[10px] font-mono uppercase mb-1">
            <Zap className="w-3.5 h-3.5" />
            Energia (Mana)
          </div>
          <div className="text-base font-bold font-mono text-gray-100">
            {stats.maxEnergy > 0 ? `${stats.maxEnergy}` : '—'}
          </div>
        </div>

        {/* STAT 3: DAMAGE BONUS */}
        <div className="bg-[#0d0609] border border-[#260e16] p-3 rounded-xl">
          <div className="flex items-center gap-1.5 text-amber-400 text-[10px] font-mono uppercase mb-1">
            <Swords className="w-3.5 h-3.5" />
            Premia Obrażeń
          </div>
          <div className="text-base font-bold font-mono text-amber-300">
            {stats.damageBonusPercent > 0 ? `+${stats.damageBonusPercent}%` : '—'}
          </div>
        </div>

        {/* STAT 4: DEFENSE */}
        <div className="bg-[#0d0609] border border-[#260e16] p-3 rounded-xl">
          <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-mono uppercase mb-1">
            <Shield className="w-3.5 h-3.5" />
            Odporności ({stats.armorType})
          </div>
          <div className="text-xs font-mono text-gray-200 mt-0.5 space-y-0.5">
            <div>Fizyczna: <span className="font-bold text-emerald-300">{stats.armorResist}</span></div>
            <div>Magiczna: <span className="font-bold text-sky-300">{stats.magicResist}</span></div>
          </div>
        </div>
      </div>

      {/* ETYKIETA RANGA ZESTAWU */}
      <div className="flex items-center gap-2 text-[11px] font-mono text-gray-400 bg-[#090406] p-2.5 rounded-lg border border-[#1f0a12]">
        <Award className="w-4 h-4 text-amber-400 shrink-0" />
        <span>Klasyfikacja wyliczeniowa: <strong className="text-gray-200">{stats.rank.label}</strong></span>
      </div>
    </div>
  )
}
