'use client'

import { Compass, Users, Clock } from 'lucide-react'

export default function UpcomingExpeditionsWidget({ expeditions = [], loading = false }) {
  const upcoming = expeditions?.slice(0, 4) || []

  return (
    <section
      className="panel relative mb-6 h-[220px] overflow-hidden rounded-3xl border-purple-500/20 bg-purple-950/10"
      aria-label="Nadchodzące wyprawy graczy"
      aria-busy={loading}
    >
      {loading ? (
        <div className="absolute inset-0 flex animate-pulse items-center p-5 sm:p-6">
          <div className="flex w-full items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-2xl bg-white/8" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-52 max-w-[75%] rounded bg-white/8" />
              <div className="mt-3 h-3 w-96 max-w-full rounded bg-white/5" />
            </div>
          </div>
        </div>
      ) : upcoming.length === 0 ? (
        <div className="absolute inset-0 flex items-center p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="shrink-0 rounded-2xl border border-purple-400/30 bg-purple-500/10 p-2.5 text-purple-300">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-white">Nadchodzące Wyprawy Graczy</h2>
              <p className="text-xs text-gray-400">Brak aktywnych wypraw w najbliższym czasie. Zwołaj pierwszą drużynę poniżej!</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col p-5 sm:p-6">
          <div className="flex shrink-0 items-center justify-between border-b border-white/8 pb-3">
            <div className="flex items-center gap-3">
              <div className="shrink-0 rounded-2xl border border-purple-400/30 bg-purple-500/10 p-2.5 text-purple-300">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-purple-400/30 bg-purple-500/20 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-purple-300">Zbiórki Drużynowe</span>
                  <span className="hidden font-mono text-[10px] text-gray-400 sm:inline">Dołącz przed wymarszem</span>
                </div>
                <h2 className="font-display mt-0.5 text-base font-black text-white sm:text-lg">Nadchodzące Wyprawy Graczy</h2>
              </div>
            </div>
          </div>

          <div className="mt-3 flex min-h-0 flex-1 snap-x gap-3 overflow-x-auto pb-1">
            {upcoming.map((exp) => {
              const signups = exp.expedition_signups || []
              const maxPlayers = (exp.max_tanks || 1) + (exp.max_healers || 1) + (exp.max_dps || 3) + (exp.max_supports || 1)
              const isFull = signups.length >= maxPlayers

              return (
                <article key={exp.id} className="flex min-w-[235px] flex-1 snap-start flex-col justify-between rounded-2xl border border-white/8 bg-black/40 p-3 lg:min-w-0">
                  <div className="min-w-0">
                    <div className="flex items-center justify-between gap-2 font-mono text-[9px]">
                      <span className="truncate rounded-full border border-purple-400/30 bg-purple-500/20 px-2 py-0.5 font-bold uppercase text-purple-300">{exp.activity_type || 'Wyprawa'}</span>
                      <span className="flex shrink-0 items-center gap-1 font-bold text-amber-300">
                        <Clock className="h-3 w-3" /> {exp.start_time || exp.event_time ? new Date(exp.event_time || exp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Dziś'}
                      </span>
                    </div>
                    <h3 className="mt-1 truncate text-sm font-bold text-white">{exp.title}</h3>
                    <p className="font-mono text-[10px] text-gray-400">Min. IP: <span className="font-bold text-amber-300">{exp.min_ip}+</span></p>
                  </div>
                  <div className="flex items-center justify-between border-t border-white/5 pt-1.5 font-mono">
                    <span className={`flex items-center gap-1 text-[10px] font-bold ${isFull ? 'text-rose-400' : 'text-emerald-400'}`}>
                      <Users className="h-3.5 w-3.5" /> {signups.length}/{maxPlayers} {isFull ? '(Pełna)' : '(Wolne)'}
                    </span>
                    <span className="text-[9px] text-gray-400">{exp.server || 'Europa'}</span>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
