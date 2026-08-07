'use client'

import { useState, useEffect, useCallback } from 'react'
import { Shield, Swords, Skull, Trophy, Users, X, LoaderCircle, AlertCircle, Globe2 } from 'lucide-react'

function getRegionFromServer(serverStr = '') {
  const s = (serverStr || '').toLowerCase()
  if (s.includes('ameryka') || s.includes('america') || s === 'na') return 'america'
  if (s.includes('azja') || s.includes('asia')) return 'asia'
  return 'europe'
}

export default function GuildZvZInspectorModal({ isOpen, onClose, guildName = '', server = 'Europa' }) {
  const region = getRegionFromServer(server)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [selectedGuild, setSelectedGuild] = useState(null)
  const [overview, setOverview] = useState(null)

  const handleInspectGuild = useCallback(async (guildCandidate) => {
    setSelectedGuild(guildCandidate)
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/albion/guild?mode=overview&id=${encodeURIComponent(guildCandidate.id)}&region=${region}`)
      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error?.message || 'Nie udało się pobrać danych ZvZ gildii.')
      }

      setOverview(data.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [region])

  const handleSearch = useCallback(async (searchQuery) => {
    setLoading(true)
    setError(null)
    setCandidates([])
    setSelectedGuild(null)
    setOverview(null)

    try {
      const res = await fetch(`/api/albion/guild?mode=search&query=${encodeURIComponent(searchQuery)}&region=${region}`)
      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error?.message || 'Nie znaleziono gildii w rejestrze API.')
      }

      const guildsList = data.data?.guilds || []
      if (guildsList.length === 0) {
        const regLabel = region === 'america' ? 'Ameryka (NWA)' : region === 'asia' ? 'Azja (SGP)' : 'Europa (AMS)'
        setError(`Nie znaleziono gildii „${searchQuery}” w rejestrze Gameinfo API dla serwera ${regLabel}.`)
      } else if (guildsList.length === 1) {
        await handleInspectGuild(guildsList[0])
      } else {
        setCandidates(guildsList)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [region, handleInspectGuild])

  useEffect(() => {
    if (isOpen && guildName.trim()) {
      const timer = setTimeout(() => {
        handleSearch(guildName.trim())
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [isOpen, guildName, handleSearch])

  if (!isOpen) return null

  const serverLabel = region === 'america' ? 'Ameryka (NWA)' : region === 'asia' ? 'Azja (SGP)' : 'Europa (AMS)'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[#d8ad4a]/30 bg-[#0a0508] p-6 shadow-2xl space-y-5 text-gray-200 font-sans">
        {/* NAGŁÓWEK */}
        <div className="flex items-center justify-between border-b border-[#240e15] pb-4">
          <div className="flex items-center gap-2.5 text-[#f3ba2f] font-mono text-sm font-bold uppercase tracking-wider">
            <Swords className="w-5 h-5 text-rose-400" />
            Analiza Starć ZvZ & Statystyki Gildii API
          </div>
          <button
            onClick={onClose}
            aria-label="Zamknij podgląd gildii"
            className="text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-white/5 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PODSUMOWANIE GILDII I AUTOMATYCZNEGO SERWERA */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#050204] p-3.5 rounded-2xl border border-[#200d14]">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="text-[10px] font-mono text-gray-400 uppercase">Gildia:</span>
            <span className="text-xs font-bold text-amber-200">{guildName}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#0e070c] border border-[#2e131d] px-3 py-1.5 rounded-xl text-xs font-mono text-amber-300 font-bold">
            <Globe2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Serwer: {serverLabel}</span>
          </div>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="py-12 text-center space-y-3 font-mono text-xs text-amber-400">
            <LoaderCircle className="w-8 h-8 animate-spin mx-auto text-amber-400" />
            <div>Pobieranie rejestru bitew ZvZ i statystyk gildii z oficjalnego API Albionu...</div>
          </div>
        )}

        {/* ERROR STATE */}
        {error && !loading && (
          <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-800/50 p-4 rounded-2xl text-rose-300 text-xs font-mono">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* SELEKCJA KANDYDATÓW */}
        {candidates.length > 1 && !selectedGuild && !loading && (
          <div className="space-y-2">
            <div className="text-[10px] font-mono text-gray-400 uppercase">
              Wybierz gildie z wyników wyszukiwania ({candidates.length}):
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {candidates.map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleInspectGuild(g)}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[#070305] border border-[#220e14] hover:border-amber-500/50 hover:bg-[#12070c] transition text-left cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-amber-200">{g.name}</div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      {g.allianceTag ? `Sojusz: [${g.allianceTag}]` : 'Brak sojuszu'}
                    </div>
                  </div>
                  <div className="text-right font-mono text-[10px] text-rose-400 font-bold">
                    PvP Fame: {Number(g.killFame || 0).toLocaleString('pl-PL')}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* KARTA SZCZEGÓŁÓW ZvZ GILDII */}
        {overview?.guild && !loading && (
          <div className="space-y-5 animate-fadeIn">
            {/* META HEADER */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
              <div className="bg-[#0c0609] p-3.5 rounded-2xl border border-[#240e16]">
                <div className="text-[9px] text-gray-400 uppercase">Gildia & Sojusz</div>
                <div className="text-sm font-bold text-amber-200 truncate">{overview.guild.name}</div>
                <div className="text-[10px] text-amber-400/80">{overview.guild.allianceTag ? `[${overview.guild.allianceTag}]` : 'Brak sojuszu'}</div>
              </div>

              <div className="bg-[#0c0609] p-3.5 rounded-2xl border border-[#240e16]">
                <div className="text-[9px] text-gray-400 uppercase flex items-center gap-1">
                  <Swords className="w-3 h-3 text-rose-400" /> Kill Fame (ZvZ)
                </div>
                <div className="text-xs font-bold text-rose-300">
                  {Number(overview.guild.killFame || 0).toLocaleString('pl-PL')}
                </div>
                <div className="text-[9px] text-gray-400">Wynik PvP gildii</div>
              </div>

              <div className="bg-[#0c0609] p-3.5 rounded-2xl border border-[#240e16]">
                <div className="text-[9px] text-gray-400 uppercase flex items-center gap-1">
                  <Skull className="w-3 h-3 text-gray-400" /> Death Fame
                </div>
                <div className="text-xs font-bold text-gray-300">
                  {Number(overview.guild.deathFame || 0).toLocaleString('pl-PL')}
                </div>
                <div className="text-[9px] text-gray-400">Ratio K/D: {(overview.guild.fameRatio || 0).toFixed(2)}</div>
              </div>

              <div className="bg-[#0c0609] p-3.5 rounded-2xl border border-[#240e16]">
                <div className="text-[9px] text-gray-400 uppercase flex items-center gap-1">
                  <Users className="w-3 h-3 text-emerald-400" /> Aktywni Członkowie
                </div>
                <div className="text-sm font-bold text-emerald-300">{overview.membersCount || overview.guild.memberCount || 0} graczy</div>
                <div className="text-[9px] text-emerald-400/80">W rejestrze API</div>
              </div>
            </div>

            {/* OSTATNIE BITEWKI / KILLS GILDII */}
            <div className="space-y-3">
              <div className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Trophy className="w-4 h-4 text-amber-400" /> Ostatnie Starcia & Fragi Gildii w ZvZ:
              </div>

              {overview.battles.length === 0 ? (
                <div className="p-4 bg-[#050204] border border-[#200d14] rounded-2xl text-xs font-mono text-gray-400 text-center">
                  Brak zarejestrowanych ostatnich dużych starć ZvZ w rejestrze API.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {overview.battles.map((b) => (
                    <div key={b.id} className="p-3 rounded-2xl bg-[#070305] border border-[#200d15] flex items-center justify-between text-xs font-mono">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-400">{b.killer?.name}</span>
                          <span className="text-gray-400">zabił</span>
                          <span className="font-bold text-rose-400">{b.victim?.name}</span>
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {b.victim?.guildName ? `Gildia ofiary: ${b.victim.guildName}` : 'Brak gildii'} • IP Ofiary: {b.victim?.equipment?.averageItemPower || 'B/D'}
                        </div>
                      </div>
                      <div className="text-right font-mono text-[10px] text-amber-300 font-bold">
                        +{Number(b.fame ?? b.totalFame ?? 0).toLocaleString('pl-PL')} Fame
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
