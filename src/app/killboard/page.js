'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, Skull, Swords, Shield, Flame, UserCheck, Globe } from 'lucide-react'

export default function KillboardPage() {
  const [searchNick, setSearchNick] = useState('')
  const [region, setRegion] = useState('europe') // Domyślnie Europa
  const [loading, setLoading] = useState(false)
  const [playerData, setPlayerData] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!searchNick.trim()) return

    setLoading(true)
    setErrorMsg('')
    setPlayerData(null)

    try {
      const res = await fetch(`/api/albion/player?nick=${encodeURIComponent(searchNick.trim())}&region=${region}`)
      const data = await res.json()

      if (!res.ok) {
        setErrorMsg(data.error || 'Nie udało się pobrać danych gracza.')
      } else {
        setPlayerData(data)
      }
    } catch (err) {
      setErrorMsg('Błąd serwera. Spróbuj ponownie później.')
    } finally {
      setLoading(false)
    }
  }

  const pvpKillFame = playerData?.KillFame || 0
  const pvpDeathFame = playerData?.DeathFame || 1
  const kdRatio = (pvpKillFame / Math.max(1, pvpDeathFame)).toFixed(2)

  return (
    <main className="min-h-screen bg-[#050305] text-gray-300 p-4 sm:p-6 lg:p-8 relative font-sans select-none">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1d0b12] via-[#050305] to-[#020102] z-0 pointer-events-none"></div>

      <div className="max-w-5xl mx-auto space-y-6 relative z-10">
        
        {/* POWRÓT */}
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-[#f3ba2f] hover:text-[#fcd053] text-xs font-black tracking-widest uppercase transition group font-mono">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Powrót do Portalu</span>
          </Link>
        </div>

        {/* NAGŁÓWEK */}
        <header className="bg-[#0c0407] border border-[#2c1219] p-6 sm:p-8 rounded-3xl shadow-xl flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#1c0a10] border border-[#3d1823] flex items-center justify-center text-rose-500 shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
            <Skull className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider font-serif">
              Wyszukiwarka Graczy &amp; Killboard
            </h1>
            <p className="text-xs text-gray-400 font-mono mt-1">
              Sprawdzaj statystyki PvP, K/D Ratio oraz Fame graczy na serwerach Europa, Ameryka i Azja.
            </p>
          </div>
        </header>

        {/* FORMULARZ Z WYBOREM SERWERA */}
        <form onSubmit={handleSearch} className="bg-[#0c0407] border border-[#281017] p-4 rounded-3xl shadow-2xl space-y-3 sm:space-y-0 sm:flex sm:gap-3">
          
          {/* SELECT SERWERA */}
          <div className="sm:w-48 shrink-0">
            <select 
              value={region} 
              onChange={e => setRegion(e.target.value)}
              className="w-full bg-[#050204] border border-[#220e14] text-[#f3ba2f] font-mono text-xs font-bold rounded-2xl px-4 py-3 outline-none cursor-pointer focus:border-[#f3ba2f]"
            >
              <option value="europe">🌍 Europa (EU)</option>
              <option value="america">🌎 Ameryka (NA)</option>
              <option value="asia">🌏 Azja (Asia)</option>
            </select>
          </div>

          {/* INPUT NICKU */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-3.5 text-gray-500" />
            <input 
              type="text" 
              placeholder="Wpisz nick gracza..." 
              value={searchNick} 
              onChange={e => setSearchNick(e.target.value)} 
              className="w-full bg-[#050204] border border-[#220e14] rounded-2xl pl-11 pr-4 py-3 text-xs text-gray-100 focus:border-[#f3ba2f] outline-none font-mono"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || !searchNick.trim()}
            className="w-full sm:w-auto bg-gradient-to-r from-[#f3ba2f] to-[#d9981e] hover:from-[#fcd053] text-black font-extrabold px-8 py-3 rounded-2xl uppercase tracking-wider text-xs transition shadow-md disabled:opacity-40 cursor-pointer font-serif flex items-center justify-center gap-2"
          >
            {loading ? 'Szukanie...' : 'Szukaj'}
          </button>
        </form>

        {errorMsg && (
          <p className="text-center font-bold text-rose-400 bg-rose-950/40 border border-rose-900/60 p-4 rounded-2xl text-xs font-mono">
            {errorMsg}
          </p>
        )}

        {/* WYNIKI */}
        {playerData && (
          <div className="bg-[#0c0407] border border-[#281017] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            
            <div className="flex flex-col sm:flex-row items-center justify-between border-b border-[#200d13] pb-6 gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#1c0a10] border border-[#3d1823] flex items-center justify-center text-[#f3ba2f]">
                  <UserCheck className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white font-serif">{playerData.Name}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-1 font-mono text-[11px]">
                    <span className="text-gray-400">Gildia: <b className="text-gray-200">{playerData.GuildName || 'Bez Gildii'}</b></span>
                    {playerData.AllianceName && <span className="bg-[#1c0a10] border border-[#3d1823] text-amber-400 px-2 py-0.5 rounded uppercase font-bold">[{playerData.AllianceName}]</span>}
                    <span className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded uppercase font-bold flex items-center gap-1">
                      <Globe className="w-3 h-3" /> {region.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>

              <a 
                href={`https://albiononline.com/killboard/player/${playerData.Id}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-[#1c0a10] hover:bg-[#2c1219] border border-[#3d1823] text-[#f3ba2f] text-xs font-mono font-bold px-4 py-2 rounded-xl transition uppercase flex items-center gap-2"
              >
                Oficjalny Profil &rarr;
              </a>
            </div>

            {/* KARTY STATYSTYKI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
              
              <div className="bg-[#050204] border border-[#220e14] p-4 rounded-2xl space-y-1">
                <span className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1.5">
                  <Swords className="w-3.5 h-3.5 text-rose-400" /> PvP Kill Fame
                </span>
                <div className="text-xl font-black text-rose-400">
                  {(playerData.KillFame || 0).toLocaleString('pl-PL')}
                </div>
              </div>

              <div className="bg-[#050204] border border-[#220e14] p-4 rounded-2xl space-y-1">
                <span className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1.5">
                  <Skull className="w-3.5 h-3.5 text-gray-400" /> Death Fame
                </span>
                <div className="text-xl font-black text-gray-300">
                  {(playerData.DeathFame || 0).toLocaleString('pl-PL')}
                </div>
              </div>

              <div className="bg-[#050204] border border-[#220e14] p-4 rounded-2xl space-y-1">
                <span className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-400" /> K/D Fame Ratio
                </span>
                <div className="text-xl font-black text-amber-400">
                  {kdRatio}
                </div>
              </div>

              <div className="bg-[#050204] border border-[#220e14] p-4 rounded-2xl space-y-1">
                <span className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-purple-400" /> PvE Fame
                </span>
                <div className="text-xl font-black text-purple-300">
                  {(playerData.LifetimeStatistics?.PvE?.Total || 0).toLocaleString('pl-PL')}
                </div>
              </div>

            </div>

          </div>
        )}

      </div>
    </main>
  )
}