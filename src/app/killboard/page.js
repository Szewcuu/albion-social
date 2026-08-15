'use client'

import CustomSelect from '@/components/ui/CustomSelect'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  ChevronRight,
  Coins,
  ExternalLink,
  Fish,
  Flame,
  Globe2,
  Hammer,
  Pickaxe,
  RefreshCw,
  Search,
  Shield,
  Skull,
  Swords,
  Trophy,
  Users,
  Wheat,
} from 'lucide-react'
import CombatEventCard from '@/components/killboard/CombatEventCard'

const REGIONS = [
  { id: 'europe', label: 'Europa', short: 'EU' },
  { id: 'america', label: 'Ameryka', short: 'NA' },
  { id: 'asia', label: 'Azja', short: 'ASIA' },
]

const FAME_STATS = [
  { key: 'pve', label: 'PvE Fame', icon: Shield, tone: 'text-violet-300' },
  { key: 'gathering', label: 'Gathering', icon: Pickaxe, tone: 'text-emerald-300' },
  { key: 'crafting', label: 'Crafting', icon: Hammer, tone: 'text-orange-200' },
  { key: 'fishing', label: 'Fishing', icon: Fish, tone: 'text-sky-300' },
  { key: 'farming', label: 'Farming', icon: Wheat, tone: 'text-lime-300' },
]

function formatNumber(value) {
  return new Intl.NumberFormat('pl-PL', { notation: 'compact', maximumFractionDigits: 1 }).format(value || 0)
}

function getErrorMessage(payload, fallback) {
  return payload?.error?.message || payload?.error || fallback
}

function KillboardContent() {
  const searchParams = useSearchParams()
  const initialNick = searchParams?.get('nick')
  const initialRegion = searchParams?.get('region')

  const [searchNick, setSearchNick] = useState(initialNick || '')
  const [region, setRegion] = useState(initialRegion || 'europe')
  const [searching, setSearching] = useState(Boolean(initialNick))
  const [loadingPlayer, setLoadingPlayer] = useState(false)
  const [searchResults, setSearchResults] = useState([])
  const [overview, setOverview] = useState(null)
  const [meta, setMeta] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [activeHistory, setActiveHistory] = useState('kills')

  useEffect(() => {
    if (initialNick) {
      const targetRegion = initialRegion || 'europe'
      fetch(`/api/albion/player?mode=search&query=${encodeURIComponent(initialNick)}&region=${targetRegion}`)
        .then((res) => res.json())
        .then((payload) => {
          const players = payload.data?.players || []
          setSearchResults(players)
          setMeta(payload.meta)
        })
        .catch((err) => setErrorMsg(err.message || 'Nie udało się pobrać danych.'))
        .finally(() => setSearching(false))
    }
  }, [initialNick, initialRegion])

  const resetResults = () => {
    setSearchResults([])
    setOverview(null)
    setMeta(null)
    setErrorMsg('')
  }

  const handleRegionChange = (value) => {
    setRegion(value)
    resetResults()
  }

  const handleSearch = async (event) => {
    event.preventDefault()
    const query = searchNick.trim()
    if (query.length < 2) return

    setSearching(true)
    setErrorMsg('')
    setOverview(null)
    setMeta(null)

    try {
      const response = await fetch(`/api/albion/player?mode=search&query=${encodeURIComponent(query)}&region=${region}`)
      const payload = await response.json()

      if (!response.ok) throw new Error(getErrorMessage(payload, 'Nie udało się wyszukać gracza.'))

      const players = payload.data?.players || []
      const sorted = [...players].sort((a, b) => {
        const exactA = a.name.toLowerCase() === query.toLowerCase() ? 1 : 0
        const exactB = b.name.toLowerCase() === query.toLowerCase() ? 1 : 0
        return exactB - exactA || b.killFame - a.killFame
      })
      setSearchResults(sorted)
      setMeta(payload.meta)
    } catch (error) {
      setSearchResults([])
      setErrorMsg(error.message || 'Błąd połączenia. Spróbuj ponownie później.')
    } finally {
      setSearching(false)
    }
  }

  const loadPlayer = async (player) => {
    setLoadingPlayer(true)
    setErrorMsg('')
    setActiveHistory('kills')
    const playerRegion = player.region || region

    try {
      const response = await fetch(`/api/albion/player?mode=overview&id=${encodeURIComponent(player.id)}&region=${playerRegion}&limit=6`)
      const payload = await response.json()
      if (!response.ok) throw new Error(getErrorMessage(payload, 'Nie udało się pobrać profilu gracza.'))

      setRegion(playerRegion)
      setOverview(payload.data)
      setMeta(payload.meta)
      setSearchResults([])
    } catch (error) {
      setOverview(null)
      setErrorMsg(error.message || 'Błąd połączenia. Spróbuj ponownie później.')
    } finally {
      setLoadingPlayer(false)
    }
  }

  const player = overview?.player
  const currentRegion = REGIONS.find(item => item.id === region)
  const history = activeHistory === 'kills' ? overview?.kills || [] : overview?.deaths || []
  const historyLossValue = history.reduce((sum, event) => sum + (Number(event.lossValuation?.estimatedValue) || 0), 0)
  const valuedHistoryCount = history.filter((event) => event.lossValuation?.pricedItems > 0).length
  const calculatedRatio = player ? player.killFame / Math.max(1, player.deathFame) : 0

  return (
    <div className="page-content">
      <div className="subpage-header">
        <h1>Kroniki Walk</h1>
        <p>Inspekcja graczy — fame, ekwipunek, ostatnie zabójstwa i gildyjni towarzysze.</p>
      </div>

<div className="relative z-10 mx-auto flex w-full max-w-[1480px] flex-col gap-7 p-4 sm:p-6 lg:p-8">
<section className="panel p-4 sm:p-5 relative z-30 !overflow-visible">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.22em] text-rose-300">Archiwum wojowników</p>
              <h2 className="font-display mt-1 text-xl font-black text-[#fff]">Znajdź gracza po nicku</h2>
            </div>
            <p className="text-[10px] text-[var(--text-secondary)]">Wybierz region, w którym znajduje się postać.</p>
          </div>

          <form onSubmit={handleSearch} className="grid gap-3 sm:grid-cols-[220px_1fr_auto] items-center">
            <div>
              <CustomSelect
                value={region}
                onChange={(val) => handleRegionChange(val)}
                options={REGIONS.map((item) => ({
                  value: item.id,
                  label: `${item.label} (${item.short})`,
                }))}
              />
            </div>

            <label className="relative" htmlFor="killboard-player">
              <span className="sr-only">Nick gracza</span>
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#666159] pointer-events-none" />
              <input
                id="killboard-player"
                type="search"
                minLength={2}
                maxLength={30}
                autoComplete="off"
                placeholder="Wpisz nick gracza..."
                value={searchNick}
                onChange={event => setSearchNick(event.target.value)}
                className="input-with-icon !pl-12 w-full rounded-xl border border-white/10 bg-black/35 py-3 pr-4 text-xs text-[#f2ede3] outline-none placeholder:text-[#5f5a53] focus:border-rose-300/45"
              />
            </label>

            <button type="submit" disabled={searching || searchNick.trim().length < 2} className="btn btn-primary inline-flex items-center justify-center gap-2 px-7 py-3 text-[10px] font-black uppercase tracking-[.12em] disabled:cursor-not-allowed disabled:opacity-40">
              {searching ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {searching ? 'Przeszukuję' : 'Szukaj'}
            </button>
          </form>
        </section>

        <div aria-live="polite">
          {errorMsg && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-400/25 bg-rose-950/25 p-4 text-xs text-rose-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div><p className="font-bold">Nie udało się otworzyć kroniki.</p><p className="mt-1 text-rose-200/65">{errorMsg}</p></div>
            </div>
          )}

          {loadingPlayer && (
            <div className="panel flex items-center justify-center gap-3 py-16 text-xs text-[#8e8980]">
              <RefreshCw className="h-5 w-5 animate-spin text-[var(--amber)]" /> Pobieram profil, historię starć i dane gildii...
            </div>
          )}
        </div>

        {!loadingPlayer && searchResults.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[.2em] text-[var(--amber)]">Wyniki wyszukiwania</p>
                <h2 className="font-display mt-1 text-xl font-black text-[#fff]">Wybierz właściwego wojownika</h2>
              </div>
              <span className="text-[10px] text-[#6f6b64]">{searchResults.length} wyników • {currentRegion?.label}</span>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {searchResults.map(result => (
                <button key={result.id} type="button" onClick={() => loadPlayer(result)} className="panel panel-interactive group flex items-center justify-between gap-4 p-4 text-left sm:p-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-400/8 text-rose-300"><Skull className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <p className="font-display truncate text-lg font-black text-[#fff]">{result.name}</p>
                      <p className="truncate text-[10px] text-[var(--text-secondary)]">{result.guildName || 'Bez gildii'}{result.allianceName ? ` • ${result.allianceName}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right"><p className="text-[8px] font-black uppercase tracking-[.12em] text-[#625e57]">Kill Fame</p><p className="text-xs font-bold text-rose-200">{formatNumber(result.killFame)}</p></div>
                    <ChevronRight className="h-4 w-4 text-[#5d5952] transition group-hover:translate-x-1 group-hover:text-[var(--amber)]" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {!loadingPlayer && player && (
          <div className="space-y-6">
            {overview.warnings?.length > 0 && (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-950/15 p-4 text-[10px] text-amber-200/75">
                {overview.warnings.join(' ')} Pozostałe dane profilu są nadal dostępne.
              </div>
            )}

            <section className="panel overflow-hidden">
              <div className="flex flex-col gap-5 border-b border-white/8 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-rose-400/20 bg-[radial-gradient(circle,rgba(244,63,94,.14),rgba(0,0,0,.3))] text-rose-300"><Trophy className="h-7 w-7" /></div>
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[.2em] text-rose-300">Profil wojownika • {currentRegion?.short}</p>
                    <h2 className="font-display mt-1 text-3xl font-black text-[#fff]">{player.name}</h2>
                    <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-[#8e8980]">
                      <span>{player.guildName || 'Bez gildii'}</span>
                      {player.allianceTag && <span className="rounded border border-[var(--amber)]/20 bg-[var(--amber)]/8 px-1.5 text-[var(--amber)]">[{player.allianceTag}]</span>}
                      <span className="flex items-center gap-1"><Globe2 className="h-3 w-3" /> {currentRegion?.label}</span>
                    </div>
                  </div>
                </div>
                <a href={`https://albiononline.com/killboard/player/${player.id}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[9px] font-black uppercase tracking-[.12em]">
                  Oficjalna kronika <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>

              <div className="grid gap-px bg-white/8 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  { label: 'PvP Kill Fame', value: formatNumber(player.killFame), icon: Swords, tone: 'text-rose-300' },
                  { label: 'Death Fame', value: formatNumber(player.deathFame), icon: Skull, tone: 'text-[#b6b0a7]' },
                  { label: 'Fame Ratio', value: calculatedRatio.toFixed(2), icon: Flame, tone: 'text-orange-200' },
                  { label: 'Średnie IP', value: player.averageItemPower || '—', icon: Shield, tone: 'text-sky-300' },
                ].map(stat => {
                  const Icon = stat.icon
                  return <div key={stat.label} className="bg-[#0c0e0c]/95 p-5"><p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[.14em] text-[#6f6b64]"><Icon className={`h-3.5 w-3.5 ${stat.tone}`} /> {stat.label}</p><p className={`font-display mt-2 text-2xl font-black ${stat.tone}`}>{stat.value}</p></div>
                })}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <div className="space-y-4">
                <div className="panel flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setActiveHistory('kills')} className={`rounded-xl px-4 py-2.5 text-[9px] font-black uppercase tracking-[.14em] transition ${activeHistory === 'kills' ? 'border border-emerald-300/30 bg-emerald-300/10 text-emerald-200' : 'border border-white/8 bg-black/20 text-[var(--text-secondary)]'}`}>Zabójstwa ({overview.kills.length})</button>
                    <button type="button" onClick={() => setActiveHistory('deaths')} className={`rounded-xl px-4 py-2.5 text-[9px] font-black uppercase tracking-[.14em] transition ${activeHistory === 'deaths' ? 'border border-rose-300/30 bg-rose-300/10 text-rose-200' : 'border border-white/8 bg-black/20 text-[var(--text-secondary)]'}`}>Zgony ({overview.deaths.length})</button>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 text-[9px]">
                    {historyLossValue > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/20 bg-amber-300/[.06] px-2.5 py-1.5 font-black uppercase tracking-[.08em] text-amber-200">
                        <Coins className="h-3.5 w-3.5" /> {activeHistory === 'kills' ? 'Straty przeciwników' : 'Własne straty'}: {formatNumber(historyLossValue)} Silver
                      </span>
                    )}
                    <span className="text-[#625e57]">Wyceniono {valuedHistoryCount}/{history.length} · {currentRegion?.short}</span>
                  </div>
                </div>

                {history.length > 0 ? history.map(event => <CombatEventCard key={`${event.perspective}-${event.id}`} event={event} />) : (
                  <div className="panel py-14 text-center"><Skull className="mx-auto mb-3 h-7 w-7 text-[#625e57]" /><p className="font-display text-lg font-bold text-[#bcb5aa]">Brak zapisanych zdarzeń.</p><p className="mt-1 text-[10px] text-[#666159]">Źródło nie zwróciło historii dla tej postaci.</p></div>
                )}
              </div>

              <aside className="space-y-4">
                <section className="panel p-5">
                  <p className="text-[9px] font-black uppercase tracking-[.18em] text-violet-300">Sława profesji</p>
                  <div className="mt-4 space-y-3">
                    {FAME_STATS.map(stat => {
                      const Icon = stat.icon
                      return <div key={stat.key} className="flex items-center justify-between rounded-xl border border-white/8 bg-black/20 p-3"><p className="flex items-center gap-2 text-[10px] font-bold text-[#918c83]"><Icon className={`h-4 w-4 ${stat.tone}`} /> {stat.label}</p><p className={`font-display font-black ${stat.tone}`}>{formatNumber(player.fame?.[stat.key])}</p></div>
                    })}
                  </div>
                </section>

                {overview.guild && (
                  <section className="panel p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[var(--amber)]">Gildia wojownika</p><h3 className="font-display mt-1 text-xl font-black text-[#fff]">{overview.guild.name}</h3></div>
                      <Users className="h-5 w-5 text-[var(--amber)]" />
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                      <div className="rounded-xl border border-white/8 bg-black/20 p-3"><p className="text-[8px] uppercase tracking-[.12em] text-[#625e57]">Członkowie</p><p className="font-display mt-1 font-black text-[#e2ddd3]">{overview.guild.memberCount}</p></div>
                      <div className="rounded-xl border border-white/8 bg-black/20 p-3"><p className="text-[8px] uppercase tracking-[.12em] text-[#625e57]">Kill Fame</p><p className="font-display mt-1 font-black text-rose-200">{formatNumber(overview.guild.killFame)}</p></div>
                    </div>
                    {overview.guild.topMembers.length > 0 && <div className="mt-4 space-y-1.5"><p className="mb-2 text-[8px] font-black uppercase tracking-[.14em] text-[#625e57]">Najaktywniejsi PvP</p>{overview.guild.topMembers.slice(0, 6).map(member => <button type="button" key={member.id} onClick={() => loadPlayer(member)} className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-[10px] text-[#9c968d] transition hover:bg-white/5 hover:text-[#fff]"><span className="truncate">{member.name}</span><span className="shrink-0 text-rose-200/70">{formatNumber(member.killFame)}</span></button>)}</div>}
                  </section>
                )}

                {meta && <p className="px-2 text-[8px] leading-4 text-[#514e49]">Walki: {meta.source}. Wycena: {overview.marketPricing?.source || 'niedostępna'} ({currentRegion?.short}). Dane cenowe pochodzą ze społecznościowych skanów; świeże do 12 h, ostrzegane po 48 h. Pobrano {new Date(meta.fetchedAt).toLocaleString('pl-PL')}.</p>}
              </aside>
            </section>
          </div>
        )}

        {!searching && !loadingPlayer && searchResults.length === 0 && !player && !errorMsg && (
          <section className="panel grid gap-4 p-6 md:grid-cols-3">
            {[
              { icon: Search, title: 'Precyzyjne wyszukiwanie', text: 'Wybierasz właściwy profil spośród graczy o podobnych nazwach.' },
              { icon: Swords, title: 'Historia starć', text: 'Ostatnie zabójstwa i zgony pokazują przeciwników, fame oraz pełne zestawy.' },
              { icon: Users, title: 'Kontekst gildii', text: 'Profil łączy wojownika z jego gildią i najaktywniejszymi członkami.' },
            ].map(item => {
              const Icon = item.icon
              return <div key={item.title} className="aopp-role-card p-5"><Icon className="h-5 w-5 text-rose-300" /><h3 className="font-display mt-4 text-lg font-black text-[#fff]">{item.title}</h3><p className="mt-2 text-xs leading-5 text-[#817c73]">{item.text}</p></div>
            })}
          </section>
        )}
      </div>
    </div>
  )
}

export default function KillboardPage() {
  return (
    <Suspense fallback={<div className="page-content py-12 text-center text-xs font-mono text-gray-400">Ładowanie Kronik Walk...</div>}>
      <KillboardContent />
    </Suspense>
  )
}
