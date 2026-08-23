'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Swords, Users, Shield, Star, Copy, Check, Plus, Trash2, Share2, Download } from 'lucide-react'
import EquipmentPreview from '@/components/builds/EquipmentPreview'
import { buildFromDbRow } from '@/lib/buildSlots'

const ROLE_COLORS = {
  Tank: 'border-sky-400/40 bg-sky-500/10 text-sky-300',
  Healer: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300',
  DPS: 'border-rose-400/40 bg-rose-500/10 text-rose-300',
  Support: 'border-purple-400/40 bg-purple-500/10 text-purple-300',
}

const SLOT_LABELS = [
  { label: 'Slot 1 — Tank / Initiator', role: 'Tank' },
  { label: 'Slot 2 — DPS #1', role: 'DPS' },
  { label: 'Slot 3 — DPS #2', role: 'DPS' },
  { label: 'Slot 4 — Healer', role: 'Healer' },
  { label: 'Slot 5 — Support / Utility', role: 'Support' },
]

export default function SquadCompBuilder() {
  const [builds, setBuilds] = useState([])
  const [squad, setSquad] = useState(Array(5).fill(null))
  const [squadName, setSquadName] = useState('Mój Skład Drużynowy')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeSlot, setActiveSlot] = useState(null)

  useEffect(() => {
    supabase
      .from('builds')
      .select('*, profiles!builds_user_id_fkey(username)')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setBuilds(data?.map(b => buildFromDbRow(b)) || [])
        setLoading(false)
      })
  }, [])

  const assignBuild = useCallback((slotIdx, build) => {
    setSquad(prev => {
      const next = [...prev]
      next[slotIdx] = build
      return next
    })
    setActiveSlot(null)
  }, [])

  const clearSlot = useCallback((slotIdx) => {
    setSquad(prev => {
      const next = [...prev]
      next[slotIdx] = null
      return next
    })
  }, [])

  const exportSquad = () => {
    const filled = squad.filter(Boolean)
    const text = [
      `=== ${squadName} ===`,
      '',
      ...squad.map((b, i) => {
        const label = SLOT_LABELS[i].label
        return b ? `${label}: ${b.name} (${b.role || 'Brak roli'})` : `${label}: — (pusty)`
      }),
      '',
      `Generowane przez Albion Polska Portal`,
    ].join('\n')

    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${squadName.replace(/\s+/g, '_')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const copySquadLink = () => {
    const ids = squad.map(b => b?.id || '').join(',')
    const url = `${window.location.origin}/buildy?squad=${encodeURIComponent(ids)}&name=${encodeURIComponent(squadName)}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const filteredBuilds = builds.filter(b =>
    search.trim() === '' ||
    (b.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.role || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="panel p-5 sm:p-6 space-y-5 border-violet-500/30 bg-violet-950/10">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/8 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-violet-500/10 border border-violet-400/30 text-violet-300">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="bg-violet-500/20 text-violet-300 border border-violet-400/30 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase">
              Planer Formacji
            </span>
            <h3 className="font-display text-lg font-black text-white mt-0.5">Kreator Składu Drużynowego</h3>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <button
            onClick={copySquadLink}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            {copied ? 'Skopiowano!' : 'Udostępnij link'}
          </button>
          <button
            onClick={exportSquad}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Eksportuj TXT
          </button>
        </div>
      </div>

      {/* SQUAD NAME */}
      <div>
        <label className="text-[10px] font-bold uppercase font-mono text-gray-400 mb-1 block">Nazwa Składu</label>
        <input
          value={squadName}
          onChange={e => setSquadName(e.target.value)}
          className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white font-bold text-sm outline-none focus:border-violet-400/60"
          placeholder="np. Nasza taktyka na ZvZ..."
        />
      </div>

      {/* 5 SLOTS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {SLOT_LABELS.map((slotDef, i) => {
          const build = squad[i]
          const roleColor = ROLE_COLORS[slotDef.role] || 'border-white/20 bg-white/5 text-gray-300'

          return (
            <div
              key={i}
              className={`rounded-2xl border-2 p-3 space-y-2 transition ${roleColor} ${activeSlot === i ? 'ring-2 ring-violet-400/60' : ''}`}
            >
              <p className="text-[9px] font-black uppercase tracking-wider font-mono opacity-70">{slotDef.label}</p>

              {build ? (
                <div className="space-y-2">
                  <EquipmentPreview slots={build.slots} size="sm" />
                  <p className="text-xs font-bold text-white truncate">{build.name}</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setActiveSlot(activeSlot === i ? null : i)}
                      className="flex-1 text-[9px] font-bold py-1.5 rounded-lg bg-black/30 hover:bg-black/50 transition cursor-pointer"
                    >
                      Zmień
                    </button>
                    <button
                      onClick={() => clearSlot(i)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setActiveSlot(activeSlot === i ? null : i)}
                  className="w-full h-20 rounded-xl border-2 border-dashed border-white/15 hover:border-violet-400/60 text-gray-500 hover:text-violet-300 transition flex items-center justify-center gap-2 cursor-pointer text-xs font-bold"
                >
                  <Plus className="w-4 h-4" /> Wybierz build
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* BUILD PICKER (shown when slot is active) */}
      {activeSlot !== null && (
        <div className="panel p-4 space-y-3 border-violet-400/30 !bg-violet-950/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-violet-300">
              Wybierz build dla: <strong>{SLOT_LABELS[activeSlot].label}</strong>
            </p>
            <button onClick={() => setActiveSlot(null)} className="text-gray-500 hover:text-white transition text-xs cursor-pointer">
              ✕ Zamknij
            </button>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Szukaj buildu po nazwie lub roli..."
            className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-white text-xs outline-none focus:border-violet-400/60"
          />
          {loading ? (
            <p className="text-xs text-gray-500 font-mono text-center py-4 animate-pulse">Pobieranie buildów...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
              {filteredBuilds.map(build => (
                <button
                  key={build.id}
                  onClick={() => assignBuild(activeSlot, build)}
                  className="text-left p-3 rounded-xl bg-black/30 hover:bg-violet-500/10 border border-white/5 hover:border-violet-400/40 transition cursor-pointer space-y-1"
                >
                  <p className="text-xs font-bold text-white truncate">{build.name}</p>
                  <p className="text-[10px] text-gray-400 font-mono truncate">{build.role || 'Brak roli'} · {build.profiles?.username?.replace(/#0$/, '') || 'Gracz'}</p>
                </button>
              ))}
              {filteredBuilds.length === 0 && (
                <p className="text-xs text-gray-500 font-mono col-span-full text-center py-4">Brak wyników</p>
              )}
            </div>
          )}
        </div>
      )}

      <p className="text-[10px] text-gray-500 font-mono text-center">
        Skład {squad.filter(Boolean).length}/5 slotów wypełniony
      </p>
    </div>
  )
}
