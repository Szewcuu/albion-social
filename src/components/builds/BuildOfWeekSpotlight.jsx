'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarDays, Check, Crown, ThumbsUp, Trophy } from 'lucide-react'

import EquipmentPreview from '@/components/builds/EquipmentPreview'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/FeedbackState'
import { authenticatedFetch } from '@/lib/authenticatedFetch'
import { buildFromDbRow } from '@/lib/buildSlots'
import { getBuildLabel } from '@/lib/buildPresentation'

async function readJson(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Nie udało się wykonać operacji.')
  return payload
}

function dateLabel(value) {
  return new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(value))
}

export default function BuildOfWeekSpotlight() {
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyBuildId, setBusyBuildId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setSnapshot(await readJson(await authenticatedFetch('/api/builds/weekly', { cache: 'no-store' })))
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load])

  const vote = async (buildId) => {
    if (busyBuildId) return
    const selected = snapshot?.userVoteBuildId === buildId
    setBusyBuildId(buildId)
    setError('')
    try {
      const response = await authenticatedFetch('/api/builds/weekly', selected ? {
        method: 'DELETE',
      } : {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildId }),
      })
      setSnapshot(await readJson(response))
    } catch (voteError) {
      setError(voteError.message)
    } finally {
      setBusyBuildId(null)
    }
  }

  if (loading) return <LoadingState compact label="Przygotowujemy głosowanie…" description="Liczymy głosy społeczności i wybieramy kandydatów." className="panel mb-6" />
  if (error && !snapshot) return <ErrorState compact title="Głosowanie jest chwilowo niedostępne" description={error} onRetry={load} className="panel mb-6" />
  if (!snapshot?.candidates?.length) {
    return <EmptyState compact icon={Trophy} title="Brak kandydatów do tytułu" description="Opublikuj pierwszy publiczny build — wtedy rozpocznie się głosowanie." actionLabel="Stwórz build" actionHref="/buildy/create" className="panel mb-6" />
  }

  return (
    <section className="panel mb-6 overflow-hidden" aria-labelledby="build-of-week-title">
      <div className="border-b border-[var(--border)] bg-gradient-to-r from-amber-400/[.11] via-transparent to-rose-400/[.05] px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-amber-300/30 bg-amber-300/10 text-amber-300">
              <Trophy className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.2em] text-amber-300">Głosowanie społeczności</p>
              <h2 id="build-of-week-title" className="font-display text-xl font-black text-white">Build tygodnia</h2>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[10px] text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-amber-300" /> {dateLabel(snapshot.week.startsAt)}–{dateLabel(new Date(Date.parse(snapshot.week.endsAt) - 1))}</span>
            <span>{snapshot.totalVotes} {snapshot.totalVotes === 1 ? 'głos' : 'głosów'}</span>
          </div>
        </div>
        <p className="mt-3 max-w-3xl text-[11px] leading-5 text-[var(--text-secondary)]">Wybierz jeden zestaw. Głos możesz zmienić do końca niedzieli; polubienia buildów pozostają niezależne.</p>
      </div>

      <div className="grid gap-3 p-4 lg:grid-cols-3">
        {snapshot.candidates.map((build, index) => {
          const parsed = buildFromDbRow(build)
          const selected = snapshot.userVoteBuildId === build.id
          const leader = snapshot.leaderId === build.id
          return (
            <article key={build.id} className={`relative flex min-w-0 flex-col rounded-xl border p-3 transition ${selected ? 'border-amber-300/55 bg-amber-300/[.075]' : 'border-white/8 bg-black/15 hover:border-amber-300/25'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-1.5">
                    {leader && <span className="badge badge-amber"><Crown className="h-3 w-3" /> Prowadzi</span>}
                    {!leader && <span className="badge">Kandydat {index + 1}</span>}
                    <span className="badge">{getBuildLabel(build.activity_type)}</span>
                  </div>
                  <Link href={`/buildy/${build.id}`} className="relative z-10 line-clamp-2 font-display text-base font-black leading-tight text-white hover:text-amber-200">{build.title}</Link>
                  <p className="mt-1 truncate font-mono text-[9px] text-[var(--text-muted)]">{build.profiles?.username || parsed.authorName || 'Gracz'}</p>
                </div>
                <span className="shrink-0 text-right font-mono">
                  <strong className="block text-base text-amber-300">{build.weekly_votes_count}</strong>
                  <span className="text-[8px] uppercase tracking-wider text-[var(--text-muted)]">głosów</span>
                </span>
              </div>

              <div className="mt-3 rounded-lg border border-white/7 bg-black/20 p-2">
                <EquipmentPreview slots={parsed.slots} itemNames={build.item_names || parsed.itemNames} size="list" />
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/7 pt-3">
                <span className="inline-flex items-center gap-1 font-mono text-[9px] text-[var(--text-muted)]"><ThumbsUp className="h-3 w-3" /> {build.likes_count} polubień</span>
                <button
                  type="button"
                  aria-pressed={selected}
                  disabled={Boolean(busyBuildId)}
                  onClick={() => vote(build.id)}
                  className={`btn btn-sm ${selected ? 'btn-primary' : 'btn-secondary'} disabled:cursor-wait disabled:opacity-60`}
                >
                  {selected ? <Check className="h-3.5 w-3.5" /> : <Trophy className="h-3.5 w-3.5" />}
                  {busyBuildId === build.id ? 'Zapisywanie…' : selected ? 'Twój głos' : 'Oddaj głos'}
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {error && <p role="alert" className="border-t border-rose-400/20 bg-rose-400/[.05] px-4 py-2 text-[10px] text-rose-200">{error}</p>}
    </section>
  )
}
