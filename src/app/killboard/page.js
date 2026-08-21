'use client'

import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { startTransition, Suspense, useEffect, useState } from 'react'
import { AlertTriangle, ExternalLink, RefreshCw, Search, Swords, Users } from 'lucide-react'

import CustomSelect from '@/components/ui/CustomSelect'

const KillboardResults = dynamic(() => import('@/components/killboard/KillboardResults'), {
  ssr: false,
  loading: () => <div className="panel min-h-56 animate-pulse" aria-label="Ładowanie kroniki wojownika" />,
})

const REGIONS = [
  { id: 'europe', label: 'Europa', short: 'EU' },
  { id: 'america', label: 'Ameryka', short: 'NA' },
  { id: 'asia', label: 'Azja', short: 'ASIA' },
]

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
  const [recoveryUrl, setRecoveryUrl] = useState('')
  const [activeHistory, setActiveHistory] = useState('kills')

  useEffect(() => {
    if (!initialNick) return undefined

    let active = true
    const targetRegion = initialRegion || 'europe'
    fetch(`/api/albion/player?mode=search&query=${encodeURIComponent(initialNick)}&region=${targetRegion}`)
      .then(async (response) => ({ response, payload: await response.json() }))
      .then(({ response, payload }) => {
        if (!response.ok) {
          setRecoveryUrl(payload?.error?.details?.archiveUrl || '')
          throw new Error(getErrorMessage(payload, 'Nie udało się wyszukać gracza.'))
        }
        if (!active) return
        startTransition(() => {
          setSearchResults(payload.data?.players || [])
          setMeta(payload.meta)
          setSearching(false)
        })
      })
      .catch((error) => {
        if (!active) return
        setErrorMsg(error.message || 'Nie udało się pobrać danych.')
        setSearching(false)
      })

    return () => { active = false }
  }, [initialNick, initialRegion])

  const resetResults = () => {
    setSearchResults([])
    setOverview(null)
    setMeta(null)
    setErrorMsg('')
    setRecoveryUrl('')
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
    setRecoveryUrl('')
    setOverview(null)
    setMeta(null)

    try {
      const response = await fetch(`/api/albion/player?mode=search&query=${encodeURIComponent(query)}&region=${region}`)
      const payload = await response.json()
      if (!response.ok) {
        setRecoveryUrl(payload?.error?.details?.archiveUrl || '')
        throw new Error(getErrorMessage(payload, 'Nie udało się wyszukać gracza.'))
      }

      const players = payload.data?.players || []
      const sorted = [...players].sort((a, b) => {
        const exactA = a.name.toLowerCase() === query.toLowerCase() ? 1 : 0
        const exactB = b.name.toLowerCase() === query.toLowerCase() ? 1 : 0
        return exactB - exactA || b.killFame - a.killFame
      })
      startTransition(() => {
        setSearchResults(sorted)
        setMeta(payload.meta)
        setSearching(false)
      })
    } catch (error) {
      setSearchResults([])
      setErrorMsg(error.message || 'Błąd połączenia. Spróbuj ponownie później.')
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

      startTransition(() => {
        setRegion(playerRegion)
        setOverview(payload.data)
        setMeta(payload.meta)
        setSearchResults([])
        setLoadingPlayer(false)
      })
    } catch (error) {
      setOverview(null)
      setErrorMsg(error.message || 'Błąd połączenia. Spróbuj ponownie później.')
      setLoadingPlayer(false)
    }
  }

  const player = overview?.player
  const currentRegion = REGIONS.find((item) => item.id === region)
  const hasResults = searchResults.length > 0 || Boolean(player)

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
            <CustomSelect
              value={region}
              onChange={handleRegionChange}
              options={REGIONS.map((item) => ({ value: item.id, label: `${item.label} (${item.short})` }))}
            />
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
                onChange={(event) => setSearchNick(event.target.value)}
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
              <div>
                <p className="font-bold">Nie udało się otworzyć kroniki.</p>
                <p className="mt-1 text-rose-200/65">{errorMsg}</p>
                {recoveryUrl && <a href={recoveryUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-rose-200/20 bg-black/20 px-3 py-2 text-[9px] font-black uppercase tracking-[.1em] text-rose-100 transition hover:border-rose-200/40 hover:bg-black/35">Sprawdź w archiwum społecznościowym <ExternalLink className="h-3.5 w-3.5" /></a>}
              </div>
            </div>
          )}
          {loadingPlayer && <div className="panel flex items-center justify-center gap-3 py-16 text-xs text-[#8e8980]"><RefreshCw className="h-5 w-5 animate-spin text-[var(--amber)]" /> Pobieram profil, historię starć i dane gildii...</div>}
        </div>

        {!loadingPlayer && hasResults && (
          <KillboardResults
            searchResults={searchResults}
            overview={overview}
            meta={meta}
            currentRegion={currentRegion}
            region={region}
            activeHistory={activeHistory}
            onHistoryChange={setActiveHistory}
            onLoadPlayer={loadPlayer}
          />
        )}

        {!searching && !loadingPlayer && !hasResults && !errorMsg && (
          <section className="panel grid gap-4 p-6 md:grid-cols-3">
            {[
              { icon: Search, title: 'Precyzyjne wyszukiwanie', text: 'Wybierasz właściwy profil spośród graczy o podobnych nazwach.' },
              { icon: Swords, title: 'Historia starć', text: 'Ostatnie zabójstwa i zgony pokazują przeciwników, fame oraz pełne zestawy.' },
              { icon: Users, title: 'Kontekst gildii', text: 'Profil łączy wojownika z jego gildią i najaktywniejszymi członkami.' },
            ].map((item) => {
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
