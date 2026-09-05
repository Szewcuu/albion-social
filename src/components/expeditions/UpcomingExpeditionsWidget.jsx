'use client'

import { ArrowRight, Clock, Compass, Users } from 'lucide-react'
import { EmptyState, SkeletonBlock } from '@/components/ui/FeedbackState'

function formatActivity(activityType) {
  return activityType === 'Statyk T8' ? 'Statyk' : activityType || 'Wyprawa'
}

function formatStart(value, fallback) {
  if (!value) return fallback || 'Termin nieznany'
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

export default function UpcomingExpeditionsWidget({ expeditions = [], loading = false }) {
  const upcoming = expeditions?.slice(0, 4) || []

  return (
    <section className="panel mb-6 overflow-hidden rounded-3xl border-purple-500/20 bg-purple-950/10 p-5 sm:p-6" aria-label="Nadchodzące wyprawy graczy" aria-busy={loading}>
      <div className="flex items-center gap-3 border-b border-white/8 pb-4">
        <div className="shrink-0 rounded-2xl border border-purple-400/30 bg-purple-500/10 p-2.5 text-purple-300"><Compass className="h-5 w-5" /></div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-purple-400/30 bg-purple-500/20 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-purple-300">Zbiórki drużynowe</span>
            <span className="font-mono text-[10px] text-gray-400">Dołącz przed wymarszem</span>
          </div>
          <h2 className="font-display mt-0.5 text-base font-black text-white sm:text-lg">Nadchodzące Wyprawy Graczy</h2>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 grid grid-flow-col auto-cols-[minmax(16rem,85%)] gap-3 overflow-x-auto pb-1 md:grid-flow-row md:grid-cols-2 md:auto-cols-auto md:overflow-visible md:pb-0 xl:grid-cols-4" role="status" aria-label="Ładowanie nadchodzących wypraw">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonBlock key={index} className="min-h-40 p-4">
              <div className="h-4 w-24 rounded bg-white/8" /><div className="mt-4 h-5 w-2/3 rounded bg-white/8" /><div className="mt-3 h-3 w-20 rounded bg-white/5" />
            </SkeletonBlock>
          ))}
        </div>
      ) : upcoming.length === 0 ? (
        <EmptyState icon={Compass} title="Brak aktywnych wypraw" description="Zwołaj pierwszą drużynę poniżej i rozpocznij mobilizację." compact className="mt-4" />
      ) : (
        <div className="mt-4 grid grid-flow-col auto-cols-[minmax(16rem,85%)] gap-3 overflow-x-auto pb-1 md:grid-flow-row md:grid-cols-2 md:auto-cols-auto md:overflow-visible md:pb-0 xl:grid-cols-4">
          {upcoming.map((exp) => {
            const signups = exp.expedition_signups || []
            const maxPlayers = Number(exp.max_tanks || 1) + Number(exp.max_healers || 1) + Number(exp.max_dps || 3) + Number(exp.max_supports || 1)
            const isFull = signups.length >= maxPlayers

            return (
              <a key={exp.id} href={`#expedition-${exp.id}`} aria-label={`Przejdź do wyprawy ${exp.title}`} className="group flex min-h-40 flex-col justify-between rounded-2xl border border-white/8 bg-black/40 p-4 transition hover:-translate-y-0.5 hover:border-purple-400/40 hover:bg-purple-950/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-300">
                <div className="min-w-0">
                  <div className="flex items-start justify-between gap-2 font-mono text-[9px]">
                    <span className="max-w-[55%] truncate rounded-full border border-purple-400/30 bg-purple-500/20 px-2 py-0.5 font-bold uppercase text-purple-300">{formatActivity(exp.activity_type)}</span>
                    <span className="flex shrink-0 items-center gap-1 font-bold text-amber-300"><Clock className="h-3 w-3" /> {formatStart(exp.starts_at, exp.start_time)}</span>
                  </div>
                  <h3 className="mt-3 line-clamp-2 text-base font-bold leading-tight text-white">{exp.title}</h3>
                  <p className="mt-1 font-mono text-[10px] text-gray-400">Min. IP: <span className="font-bold text-amber-300">{exp.min_ip}+</span></p>
                </div>
                <div className="mt-4 border-t border-white/7 pt-3 font-mono">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`flex items-center gap-1 text-[10px] font-bold ${isFull ? 'text-rose-400' : 'text-emerald-400'}`}><Users className="h-3.5 w-3.5" /> {signups.length}/{maxPlayers} {isFull ? 'Pełna' : 'Wolne miejsca'}</span>
                    <ArrowRight className="h-4 w-4 text-purple-300 transition-transform group-hover:translate-x-0.5" />
                  </div>
                  <p className="mt-1.5 text-[9px] text-gray-500">{exp.server || 'Serwer nieznany'}</p>
                </div>
              </a>
            )
          })}
        </div>
      )}
    </section>
  )
}
