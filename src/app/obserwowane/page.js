'use client'

import Link from 'next/link'
import { Activity, BellRing, BookOpen, Clock3, LoaderCircle, RefreshCw, Shield, ShoppingBag, Skull, Swords, UserRound } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import FollowButton, { FOLLOWS_CHANGED_EVENT } from '@/components/ui/FollowButton'
import { EmptyState, StatusNotice } from '@/components/ui/FeedbackState'
import { authenticatedFetch } from '@/lib/authenticatedFetch'

const META = {
  build: { label: 'Build', icon: BookOpen, tone: 'text-orange-200', href: (follow) => `/buildy/${follow.entity_id}` },
  guild: { label: 'Gildia', icon: Shield, tone: 'text-amber-200', href: (follow) => `/gildie/${follow.entity_id}` },
  market: { label: 'Oferta', icon: ShoppingBag, tone: 'text-sky-200', href: (follow) => `/rynek?offer=${follow.entity_id}` },
  player: { label: 'Profil portalu', icon: UserRound, tone: 'text-emerald-200', href: (follow) => `/profil/${follow.entity_id}` },
  albion_player: {
    label: 'Postać Albionu',
    icon: Swords,
    tone: 'text-rose-200',
    href: (follow) => `/killboard?nick=${encodeURIComponent(follow.label)}&region=${follow.region || 'europe'}`,
  },
}

const REGION_LABELS = {
  europe: 'Europa',
  america: 'Ameryka',
  asia: 'Azja',
}

const COMMUNITY_SECTIONS = [
  { type: 'build', label: 'Buildy', icon: BookOpen, href: '/buildy', empty: 'Obserwuj doktrynę w Kuźni Buildów, aby dostać sygnał o aktualizacji lub nowym komentarzu.' },
  { type: 'guild', label: 'Gildie', icon: Shield, href: '/gildie', empty: 'Obserwuj gildię, aby nie przegapić zmian rekrutacji i nowych wydarzeń.' },
  { type: 'market', label: 'Oferty', icon: ShoppingBag, href: '/rynek', empty: 'Obserwuj ofertę rynku, aby otrzymać wiadomość o zmianie ceny lub dostępności.' },
  { type: 'player', label: 'Profile', icon: UserRound, href: '/', empty: 'Otwórz publiczny profil gracza i dodaj go do obserwowanych.' },
]

async function readJson(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload?.error?.message || payload.error || 'Nie udało się pobrać obserwowanych.')
  return payload
}

function formatNumber(value) {
  return new Intl.NumberFormat('pl-PL', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0)
}

function formatCheckedAt(value) {
  if (!value) return 'Oczekuje na pierwszą kontrolę'
  return new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function PlayerWatchCard({ follow }) {
  const summary = follow.last_summary && Object.keys(follow.last_summary).length ? follow.last_summary : null
  return (
    <article className="panel panel-interactive overflow-hidden rounded-[22px] border-rose-300/15">
      <div className="flex items-start gap-4 p-4 sm:p-5">
        <Link href={META.albion_player.href(follow)} className="flex min-w-0 flex-1 items-start gap-4">
          <span className="rounded-xl border border-rose-300/15 bg-rose-400/8 p-3 text-rose-200"><Swords className="h-5 w-5" /></span>
          <span className="min-w-0">
            <span className="block text-[8px] font-black uppercase tracking-[.15em] text-rose-300">Postać Albionu · {REGION_LABELS[follow.region] || 'Europa'}</span>
            <strong className="mt-1 block truncate font-display text-lg text-white">{follow.label}</strong>
            <span className="mt-1 flex items-center gap-1.5 text-[9px] text-[var(--text-muted)]"><Clock3 className="h-3 w-3" /> {formatCheckedAt(follow.last_checked_at)}</span>
          </span>
        </Link>
        <FollowButton id={follow.entity_id} name={follow.label} type="albion_player" region={follow.region} compact />
      </div>

      {follow.last_error && <div className="mx-4 mb-3 rounded-xl border border-amber-400/20 bg-amber-400/7 px-3 py-2 text-[9px] leading-4 text-amber-100">{follow.last_error}</div>}

      <div className="grid grid-cols-2 gap-px border-t border-white/8 bg-white/8 sm:grid-cols-4">
        {[
          [Swords, 'Nowe zabójstwa', summary?.kills || 0, 'text-emerald-300'],
          [Skull, 'Nowe zgony', summary?.deaths || 0, 'text-rose-300'],
          [Activity, 'Zdobyte Fame', formatNumber(summary?.killFame), 'text-amber-200'],
          [Activity, 'Stracone Fame', formatNumber(summary?.deathFame), 'text-sky-200'],
        ].map(([Icon, label, value, tone]) => (
          <div key={label} className="bg-[var(--bg-panel)] p-3 text-center">
            <Icon className={`mx-auto h-3.5 w-3.5 ${tone}`} />
            <strong className="mt-1.5 block font-mono text-sm text-white">{value}</strong>
            <span className="mt-0.5 block text-[7px] font-black uppercase tracking-[.1em] text-[var(--text-muted)]">{label}</span>
          </div>
        ))}
      </div>
    </article>
  )
}

function EntityCard({ follow }) {
  const meta = META[follow.entity_type] || META.player
  const Icon = meta.icon
  return (
    <article className="panel panel-interactive flex items-center gap-4 rounded-[22px] p-4">
      <Link href={meta.href(follow)} className="flex min-w-0 flex-1 items-center gap-4">
        <span className={`rounded-xl border border-white/8 bg-black/20 p-3 ${meta.tone}`}><Icon className="h-5 w-5" /></span>
        <span className="min-w-0"><span className="block text-[8px] font-black uppercase tracking-[.15em] text-[var(--text-secondary)]">{meta.label}</span><strong className="mt-1 block truncate text-sm text-white">{follow.label || 'Obserwowany element'}</strong></span>
      </Link>
      <FollowButton id={follow.entity_id} name={follow.label || meta.label} type={follow.entity_type} compact />
    </article>
  )
}

export default function FollowedEntitiesPage() {
  const [follows, setFollows] = useState([])
  const [catalogCounts, setCatalogCounts] = useState({})
  const [savedCounts, setSavedCounts] = useState({})
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    try {
      const payload = await readJson(await authenticatedFetch('/api/follows'))
      setFollows(payload.follows || [])
      setCatalogCounts(payload.catalogCounts || {})
      setSavedCounts(payload.savedCounts || {})
      setError('')
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(load)
    const refresh = () => void load()
    window.addEventListener(FOLLOWS_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(FOLLOWS_CHANGED_EVENT, refresh)
  }, [load])

  const playerWatches = useMemo(() => follows.filter((follow) => follow.entity_type === 'albion_player'), [follows])
  const otherFollows = useMemo(() => follows.filter((follow) => follow.entity_type !== 'albion_player'), [follows])
  const counts = useMemo(() => Object.fromEntries(
    Object.keys(META).map((type) => [type, follows.filter((follow) => follow.entity_type === type).length]),
  ), [follows])
  const summaryStats = [
    ['albion_player', Swords, 'Postacie Albionu', counts.albion_player || 0, 'Obserwowane'],
    ['build', BookOpen, 'Buildy', savedCounts.build || 0, 'Zapisane'],
    ['guild', Shield, 'Gildie', catalogCounts.guild || 0, 'W katalogu'],
    ['market', ShoppingBag, 'Oferty', catalogCounts.market || 0, 'Aktywne'],
    ['player', UserRound, 'Profile', catalogCounts.player || 0, 'W portalu'],
  ]

  async function syncPlayers() {
    setSyncing(true)
    setError('')
    setMessage('')
    try {
      const payload = await readJson(await authenticatedFetch('/api/follows', { method: 'POST' }))
      const result = payload.result || {}
      setMessage(result.newEvents > 0
        ? `Znaleziono ${result.newEvents} nowych walk. Zbiorcze powiadomienie czeka w gołębniku.`
        : 'Wartownicy sprawdzili kroniki — nie ma nowych walk.')
      await load()
    } catch (syncError) {
      setError(syncError.message)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="page-content space-y-6">
      <header className="panel relative overflow-hidden rounded-[30px] border-amber-300/20 p-6 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_8%,rgba(245,158,11,.16),transparent_42%),radial-gradient(circle_at_5%_100%,rgba(244,63,94,.11),transparent_38%)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[9px] font-black uppercase tracking-[.24em] text-amber-300">Wartownia</p><h1 className="font-display mt-2 text-3xl font-black text-white sm:text-5xl">Obserwowane</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">Postacie Albionu, buildy, gildie i oferty. Wartownicy sprawdzają nowe walki automatycznie i dostarczają jedno czytelne podsumowanie.</p></div>
          <button type="button" onClick={syncPlayers} disabled={syncing || playerWatches.length === 0} className="btn btn-primary inline-flex min-h-11 shrink-0 items-center justify-center gap-2 px-4 text-[9px] font-black uppercase tracking-[.1em] disabled:cursor-not-allowed disabled:opacity-45">
            {syncing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} {syncing ? 'Sprawdzam kroniki' : 'Sprawdź nowe walki'}
          </button>
        </div>
      </header>

      {error && <StatusNotice type="error">{error}</StatusNotice>}
      {message && <StatusNotice type="success">{message}</StatusNotice>}

      {!loading && (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Podsumowanie wartowni i katalogu portalu">
          {summaryStats.map(([type, Icon, label, value, context]) => (
            <div key={type} className="panel rounded-[18px] p-4">
              <Icon className="h-4 w-4 text-amber-300" />
              <strong className="font-display mt-3 block text-2xl text-white">{value}</strong>
              <span className="mt-1 block text-[8px] font-black uppercase tracking-[.13em] text-[var(--text-muted)]">{label}</span>
              <span className="mt-1 block text-[7px] uppercase tracking-[.1em] text-[var(--text-faded)]">{context}</span>
            </div>
          ))}
        </section>
      )}

      {loading ? (
        <div className="panel flex min-h-56 items-center justify-center rounded-[24px]"><LoaderCircle className="h-7 w-7 animate-spin text-amber-300" /></div>
      ) : follows.length === 0 ? (
        <EmptyState icon={BellRing} title="Wartownia jest pusta" description="Otwórz postać w Kronikach Walk i użyj przycisku Obserwuj. Możesz również obserwować buildy, gildie, oferty oraz profile portalu." />
      ) : (
        <div className="space-y-7">
          {playerWatches.length > 0 && <section><div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-[8px] font-black uppercase tracking-[.18em] text-rose-300">Patrol Killboardu</p><h2 className="font-display mt-1 text-2xl font-black text-white">Obserwowane postacie</h2></div><span className="font-mono text-[9px] text-[var(--text-muted)]">{playerWatches.length} postaci</span></div><div className="grid gap-4 xl:grid-cols-2">{playerWatches.map((follow) => <PlayerWatchCard key={`${follow.region}-${follow.entity_id}`} follow={follow} />)}</div></section>}
          <section>
            <div className="mb-3"><p className="text-[8px] font-black uppercase tracking-[.18em] text-amber-300">Sygnały społeczności</p><h2 className="font-display mt-1 text-2xl font-black text-white">Buildy, gildie, oferty i profile</h2></div>
            {otherFollows.length > 0 && <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{otherFollows.map((follow) => <EntityCard key={`${follow.entity_type}-${follow.entity_id}`} follow={follow} />)}</div>}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {COMMUNITY_SECTIONS.map(({ type, label, icon: Icon, href, empty }) => (
                <Link key={type} href={href} className="panel panel-interactive rounded-[20px] p-4">
                  <div className="flex items-center justify-between"><span className="rounded-xl border border-white/8 bg-black/20 p-2.5 text-amber-200"><Icon className="h-4 w-4" /></span><span className="text-right"><strong className="font-display block text-xl text-white">{catalogCounts[type] || 0}</strong><small className="text-[7px] uppercase tracking-[.1em] text-[var(--text-faded)]">dostępne</small></span></div>
                  <h3 className="mt-3 text-xs font-black text-white">{label}</h3>
                  <p className="mt-1.5 text-[9px] leading-4 text-[var(--text-secondary)]">{counts[type] ? 'Otwórz moduł, aby znaleźć kolejne elementy warte obserwowania.' : empty}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
