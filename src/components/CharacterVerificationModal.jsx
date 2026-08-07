'use client'

import { useState } from 'react'
import { Search, ShieldCheck, CheckCircle2, AlertCircle, LoaderCircle, X, Trophy, Swords, UserCheck, Globe2 } from 'lucide-react'

function getInitialRegion(server) {
  const s = (server || '').toLowerCase()
  if (s.includes('ameryka') || s.includes('america') || s === 'na') return 'america'
  if (s.includes('azja') || s.includes('asia')) return 'asia'
  return 'europe'
}

export default function CharacterVerificationModal({ isOpen, onClose, defaultNick = '', defaultServer = 'Europa', onVerifySuccess }) {
  const [nick, setNick] = useState(defaultNick)
  const [region, setRegion] = useState(() => getInitialRegion(defaultServer))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [infoMsg, setInfoMsg] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [overview, setOverview] = useState(null)
  const [verifying, setVerifying] = useState(false)

  if (!isOpen) return null

  const handleSearch = async (e) => {
    if (e) e.preventDefault()
    const query = nick.trim()
    if (!query || loading) return

    setLoading(true)
    setError(null)
    setInfoMsg(null)
    setCandidates([])
    setSelectedCandidate(null)
    setOverview(null)

    try {
      // 1. Próba w wybranym regionie
      let res = await fetch(`/api/albion/player?mode=search&query=${encodeURIComponent(query)}&region=${region}`)
      let data = await res.json()
      let playersList = data.data?.players || []

      let activeRegion = region

      // 2. Jeśli nie znaleziono w wybranym regionie, sprawdzamy automatycznie pozostałe serwery
      if (playersList.length === 0) {
        const otherRegions = ['europe', 'america', 'asia'].filter((r) => r !== region)

        for (const otherReg of otherRegions) {
          try {
            const fallbackRes = await fetch(`/api/albion/player?mode=search&query=${encodeURIComponent(query)}&region=${otherReg}`)
            const fallbackData = await fallbackRes.json()
            const found = fallbackData.data?.players || []

            if (found.length > 0) {
              playersList = found
              activeRegion = otherReg
              const regLabel = otherReg === 'america' ? 'Ameryka (NWA)' : otherReg === 'asia' ? 'Azja (SGP)' : 'Europa (AMS)'
              setRegion(otherReg)
              setInfoMsg(`Znaleziono gracza na serwerze ${regLabel}! Przełączono region.`)
              break
            }
          } catch {
            // Ignorujemy błędy fallbacku
          }
        }
      }

      if (playersList.length === 0) {
        setError(`Nie znaleziono gracza „${query}” na żadnym serwerze (Europa, Ameryka, Azja). Sprawdź pisownię.`)
      } else if (playersList.length === 1) {
        handleSelectCandidate(playersList[0], activeRegion)
      } else {
        setCandidates(playersList)
      }
    } catch (err) {
      setError(err.message || 'Błąd połączenia z API Albionu.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCandidate = async (candidate, targetRegion = region) => {
    setSelectedCandidate(candidate)
    setLoading(true)
    setError(null)

    try {
      const playerId = candidate.id || candidate.Id
      const res = await fetch(`/api/albion/player?mode=overview&id=${encodeURIComponent(playerId)}&region=${targetRegion}`)
      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error?.message || 'Nie udało się pobrać szczegółowych statystyk gracza.')
      }

      setOverview(data.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmVerification = () => {
    if (!selectedCandidate || !overview) return

    setVerifying(true)
    const player = overview.player || {}

    const verificationData = {
      ingame_nick: player.name || selectedCandidate.name || selectedCandidate.Name,
      guild_name: player.guildName || selectedCandidate.guildName || selectedCandidate.GuildName || '',
      verified_player_id: player.id || selectedCandidate.id || selectedCandidate.Id,
      verified_server: region === 'america' ? 'Ameryka' : region === 'asia' ? 'Azja' : 'Europa',
      pvp_fame: player.killFame || selectedCandidate.killFame || 0,
      pve_fame: player.fame?.pve || 0,
      is_verified: true,
      verified_at: new Date().toISOString(),
    }

    if (onVerifySuccess) onVerifySuccess(verificationData)
    setVerifying(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[#d8ad4a]/30 bg-[#0a0508] p-6 shadow-2xl space-y-5">
        {/* NAGŁÓWEK */}
        <div className="flex items-center justify-between border-b border-[#240e15] pb-4">
          <div className="flex items-center gap-2 text-[#f3ba2f] font-mono text-sm font-bold uppercase">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Weryfikacja Konta Albion Online
          </div>
          <button
            onClick={onClose}
            aria-label="Zamknij okno weryfikacji"
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* WSKAZÓWKA */}
        <p className="text-xs text-gray-300 leading-relaxed">
          Wyszukaj swoją postać w oficjalnym rejestrze Albion Online API. Po potwierdzeniu Twój profil otrzyma status <strong className="text-emerald-400 font-bold">Oficjalnie Zweryfikowany</strong> ze statystykami PvP/PvE.
        </p>

        {/* FORMULARZ WYSZUKIWANIA */}
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <label className="block text-[9px] font-mono text-gray-400 uppercase mb-1">
                Nick postaci w grze:
              </label>
              <input
                type="text"
                value={nick}
                onChange={(e) => setNick(e.target.value)}
                placeholder="np. GandalfRudowlosy"
                className="w-full bg-[#050204] border border-[#331520] text-gray-100 text-xs rounded-xl p-3 outline-none focus:border-[#f3ba2f]"
              />
            </div>

            <div>
              <label className="block text-[9px] font-mono text-gray-400 uppercase mb-1">
                Region / Serwer:
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full bg-[#050204] border border-[#331520] text-amber-200 text-xs rounded-xl p-3 outline-none focus:border-[#f3ba2f] font-mono cursor-pointer"
              >
                <option value="europe">Europa (AMS)</option>
                <option value="america">Ameryka (NWA)</option>
                <option value="asia">Azja (SGP)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !nick.trim()}
            className="w-full aopp-primary-button flex items-center justify-center gap-2 py-3 text-xs font-mono font-bold uppercase tracking-wider disabled:opacity-50 cursor-pointer"
          >
            {loading ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {loading ? 'Wyszukiwanie w Gameinfo API...' : 'Szukaj postaci w API'}
          </button>
        </form>

        {/* POWIADOMIENIE INFO (np. przełączenie serwera) */}
        {infoMsg && (
          <div className="flex items-center gap-2 bg-amber-950/40 border border-amber-500/40 p-3 rounded-xl text-amber-300 text-xs font-mono">
            <Globe2 className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{infoMsg}</span>
          </div>
        )}

        {/* KOMUNIKAT BŁĘDU */}
        {error && (
          <div className="flex items-center gap-2 bg-rose-950/40 border border-rose-800/50 p-3 rounded-xl text-rose-300 text-xs font-mono">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* LISTA KANDYDATÓW (jeśli znaleziono kilku graczy o podobnym nicku) */}
        {candidates.length > 1 && !selectedCandidate && (
          <div className="space-y-2">
            <div className="text-[10px] font-mono text-gray-400 uppercase">
              Wybierz swoją dokładną postać ({candidates.length} wyników):
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {candidates.map((c) => (
                <button
                  key={c.id || c.Id}
                  onClick={() => handleSelectCandidate(c)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-[#070305] border border-[#220e14] hover:border-amber-500/50 hover:bg-[#12070c] transition text-left cursor-pointer"
                >
                  <div>
                    <div className="text-xs font-bold text-gray-200">{c.name || c.Name}</div>
                    <div className="text-[10px] text-gray-400 font-mono">
                      {c.guildName || c.GuildName ? `Gildia: ${c.guildName || c.GuildName}` : 'Brak gildii'}
                    </div>
                  </div>
                  <div className="text-right font-mono text-[10px] text-amber-400">
                    <div>PvP Fame: {Number(c.killFame || c.KillFame || 0).toLocaleString('pl-PL')}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* PODGLĄD WYBRANEJ POSTACI DO POTWIERDZENIA */}
        {selectedCandidate && overview && (
          <div className="bg-[#050204] border border-emerald-500/30 p-4 rounded-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold uppercase">
              <CheckCircle2 className="w-4 h-4" />
              Znaleziono zweryfikowany profil Albionu
            </div>

            <div className="grid grid-cols-2 gap-3 text-left font-mono">
              <div className="bg-[#0d0609] p-3 rounded-xl border border-[#200d14]">
                <div className="text-[9px] text-gray-400 uppercase">Nick postaci</div>
                <div className="text-sm font-bold text-amber-200">{overview.player?.name || selectedCandidate.name}</div>
              </div>

              <div className="bg-[#0d0609] p-3 rounded-xl border border-[#200d14]">
                <div className="text-[9px] text-gray-400 uppercase">Gildia</div>
                <div className="text-xs font-bold text-gray-200">{overview.player?.guildName || selectedCandidate.guildName || 'Brak'}</div>
              </div>

              <div className="bg-[#0d0609] p-3 rounded-xl border border-[#200d14]">
                <div className="text-[9px] text-gray-400 uppercase flex items-center gap-1">
                  <Swords className="w-3 h-3 text-rose-400" /> PvP Fame
                </div>
                <div className="text-xs font-bold text-rose-300">
                  {Number(overview.player?.killFame || 0).toLocaleString('pl-PL')}
                </div>
              </div>

              <div className="bg-[#0d0609] p-3 rounded-xl border border-[#200d14]">
                <div className="text-[9px] text-gray-400 uppercase flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-400" /> PvE Fame
                </div>
                <div className="text-xs font-bold text-amber-300">
                  {Number(overview.player?.fame?.pve || 0).toLocaleString('pl-PL')}
                </div>
              </div>
            </div>

            <button
              onClick={handleConfirmVerification}
              disabled={verifying}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              Potwierdź i Przypisz Postać do Profilu
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
