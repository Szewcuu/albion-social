'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AlertTriangle, Check, Download, Plus, RefreshCw, Share2, Trash2, Users } from 'lucide-react'
import { authenticatedFetch } from '@/lib/authenticatedFetch'
import { buildSquadShareUrl, normalizeSquadBuild, restoreSquadFromSearch } from '@/lib/buildPresentation'

const ROLE_COLORS = {
  Tank: 'border-sky-400/40 bg-sky-500/10 text-sky-300',
  Healer: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300',
  DPS: 'border-rose-400/40 bg-rose-500/10 text-rose-300',
  Support: 'border-purple-400/40 bg-purple-500/10 text-purple-300',
}

const PARTY_SLOTS = [
  { label: 'Tank / inicjator', role: 'Tank' },
  { label: 'DPS #1', role: 'DPS' },
  { label: 'DPS #2', role: 'DPS' },
  { label: 'Healer', role: 'Healer' },
  { label: 'Support / utility', role: 'Support' },
]
const FORMATION_PRESETS = [
  { size: 5, label: '5 osób', hint: 'Jedna grupa' },
  { size: 10, label: '10 osób', hint: 'Dwie grupy' },
  { size: 20, label: '20 osób', hint: 'Małe ZvZ' },
]

function getSlotDefinition(index) {
  const party = Math.floor(index / PARTY_SLOTS.length) + 1
  const slot = PARTY_SLOTS[index % PARTY_SLOTS.length]
  return { ...slot, party, label: `Grupa ${party} · ${slot.label}` }
}

export default function SquadCompBuilder() {
  const [builds, setBuilds] = useState([])
  const [squad, setSquad] = useState(Array(5).fill(null))
  const [formationSize, setFormationSize] = useState(5)
  const [squadName, setSquadName] = useState('Mój Skład Drużynowy')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [message, setMessage] = useState('')
  const [search, setSearch] = useState('')
  const [activeSlot, setActiveSlot] = useState(null)
  const restoredRef = useRef(false)

  const loadBuilds = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const response = await authenticatedFetch('/api/builds?category=all&limit=12', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Nie udało się pobrać buildów.')
      setBuilds((payload.builds || []).map(normalizeSquadBuild))
    } catch (error) {
      setBuilds([])
      setLoadError(error.message || 'Nie udało się pobrać buildów.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void Promise.resolve().then(loadBuilds) }, [loadBuilds])

  useEffect(() => {
    if (loading || restoredRef.current || typeof window === 'undefined') return
    let active = true
    void Promise.resolve().then(() => {
      if (!active || restoredRef.current) return
      restoredRef.current = true
      const restored = restoreSquadFromSearch(window.location.search, builds)
      if (restored.name) setSquadName(restored.name)
      setFormationSize(restored.slotCount)
      if (restored.squad.some(Boolean)) {
        setSquad(restored.squad)
        setMessage('Przywrócono udostępniony skład.')
      }
    })
    return () => { active = false }
  }, [builds, loading])

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
    const text = [
      `=== ${squadName} ===`,
      '',
      ...squad.map((b, i) => {
        const label = getSlotDefinition(i).label
        return b ? `${label}: ${b.title} (${b.role || 'Brak roli'})` : `${label}: — (pusty)`
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

  const copySquadLink = async () => {
    try {
      await navigator.clipboard.writeText(buildSquadShareUrl(window.location.origin, squad, squadName, formationSize))
      setCopied(true)
      setMessage('Link do składu skopiowany.')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      setMessage('Nie udało się skopiować linku. Sprawdź uprawnienia przeglądarki.')
    }
  }

  const filteredBuilds = builds.filter(b =>
    search.trim() === '' ||
    (b.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.role || '').toLowerCase().includes(search.toLowerCase())
  )

  const changeFormationSize = (nextSize) => {
    setFormationSize(nextSize)
    setSquad((current) => Array.from({ length: nextSize }, (_, index) => current[index] || null))
    setActiveSlot(null)
    setMessage(`Ustawiono formację dla ${nextSize} osób.`)
  }

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

      <div className="grid gap-2 sm:grid-cols-3" aria-label="Rozmiar formacji">
        {FORMATION_PRESETS.map((preset) => (
          <button key={preset.size} type="button" aria-pressed={formationSize === preset.size} onClick={() => changeFormationSize(preset.size)} className={`rounded-xl border p-3 text-left transition ${formationSize === preset.size ? 'border-violet-300/55 bg-violet-400/15 text-violet-100' : 'border-white/10 bg-black/20 text-gray-400 hover:border-violet-300/30'}`}>
            <strong className="block text-xs">{preset.label}</strong>
            <span className="mt-1 block font-mono text-[9px]">{preset.hint}</span>
          </button>
        ))}
      </div>

      {/* FORMATION SLOTS */}
      <div className={formationSize === 5 ? 'grid grid-cols-1 gap-3 md:grid-cols-5' : 'grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4'}>
        {Array.from({ length: formationSize / 5 }, (_, partyIndex) => (
          <section key={partyIndex} className={formationSize === 5 ? 'contents' : 'rounded-2xl border border-white/10 bg-black/20 p-3'}>
            {formationSize > 5 && <h4 className="mb-3 flex items-center justify-between border-b border-white/8 pb-2 text-[10px] font-black uppercase tracking-[.14em] text-violet-200"><span>Grupa {partyIndex + 1}</span><span className="font-mono text-[8px] text-gray-500">5 miejsc</span></h4>}
            <div className={formationSize === 5 ? 'contents' : 'grid gap-2'}>
        {PARTY_SLOTS.map((partySlot, partySlotIndex) => {
          const i = partyIndex * 5 + partySlotIndex
          const slotDef = getSlotDefinition(i)
          const build = squad[i]
          const roleColor = ROLE_COLORS[slotDef.role] || 'border-white/20 bg-white/5 text-gray-300'

          return (
            <div
              key={i}
              className={`rounded-2xl border-2 p-3 space-y-2 transition ${roleColor} ${activeSlot === i ? 'ring-2 ring-violet-400/60' : ''}`}
            >
              <p className="text-[9px] font-black uppercase tracking-wider font-mono opacity-70">{formationSize === 5 ? slotDef.label : partySlot.label}</p>

              {build ? (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-white truncate">{build.title}</p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setActiveSlot(activeSlot === i ? null : i)}
                      className="flex-1 text-[9px] font-bold py-1.5 rounded-lg bg-black/30 hover:bg-black/50 transition cursor-pointer"
                    >
                      Zmień
                    </button>
                    <button
                      onClick={() => clearSlot(i)}
                      aria-label={`Wyczyść ${slotDef.label}`}
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
          </section>
        ))}
      </div>

      {/* BUILD PICKER (shown when slot is active) */}
      {activeSlot !== null && (
        <div className="panel p-4 space-y-3 border-violet-400/30 !bg-violet-950/20">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-violet-300">
              Wybierz build dla: <strong>{getSlotDefinition(activeSlot).label}</strong>
            </p>
            <button type="button" onClick={() => setActiveSlot(null)} aria-label="Zamknij wybór buildu" className="text-gray-500 hover:text-white transition text-xs cursor-pointer">
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
          ) : loadError ? (
            <div className="rounded-xl border border-rose-400/25 bg-rose-500/8 p-4 text-center" role="alert">
              <AlertTriangle className="mx-auto h-5 w-5 text-rose-300" aria-hidden="true" />
              <p className="mt-2 text-xs text-rose-100">{loadError}</p>
              <button type="button" onClick={loadBuilds} className="btn btn-ghost btn-sm mt-3 inline-flex">
                <RefreshCw className="h-3.5 w-3.5" /> Spróbuj ponownie
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto pr-1">
              {filteredBuilds.map(build => (
                <button
                  key={build.id}
                  onClick={() => assignBuild(activeSlot, build)}
                  className="text-left p-3 rounded-xl bg-black/30 hover:bg-violet-500/10 border border-white/5 hover:border-violet-400/40 transition cursor-pointer space-y-1"
                >
                  <p className="text-xs font-bold text-white truncate">{build.title}</p>
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
        Skład {squad.filter(Boolean).length}/{formationSize} miejsc wypełniony · {formationSize / 5} {formationSize === 5 ? 'grupa' : 'grupy'} bojowe
      </p>
      {message && <p role="status" aria-live="polite" className="text-center text-[10px] font-mono text-violet-200">{message}</p>}
    </div>
  )
}
