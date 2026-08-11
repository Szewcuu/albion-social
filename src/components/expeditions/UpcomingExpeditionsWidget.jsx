'use client'

import { Compass, Users, Shield, Clock, ArrowRight, Sparkles } from 'lucide-react'

export default function UpcomingExpeditionsWidget({ expeditions = [] }) {
  if (!expeditions || expeditions.length === 0) {
    return (
      <div className="panel p-5 rounded-3xl mb-6 bg-purple-950/10 border-purple-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-400/30 text-purple-300">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-white">Nadchodzące Wyprawy Graczy</h3>
            <p className="text-xs text-gray-400">Brak aktywnych wypraw w najbliższym czasie. Zwołaj pierwszą drużynę poniżej!</p>
          </div>
        </div>
      </div>
    )
  }

  // Filter upcoming expeditions
  const upcoming = expeditions.slice(0, 4)

  return (
    <div className="panel p-5 sm:p-6 rounded-3xl mb-6 border-purple-500/30 bg-purple-950/10 space-y-4">
      <div className="flex items-center justify-between border-b border-white/8 pb-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-400/30 text-purple-300">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-purple-500/20 text-purple-300 border border-purple-400/30 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase">
                Zbiórki Drużynowe
              </span>
              <span className="text-[10px] text-gray-400 font-mono">Dołącz przed wymarszem</span>
            </div>
            <h3 className="font-display text-lg font-black text-white mt-0.5">Nadchodzące Wyprawy Graczy</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {upcoming.map((exp) => {
          const signups = exp.expedition_signups || []
          const maxPlayers = (exp.max_tanks || 1) + (exp.max_healers || 1) + (exp.max_dps || 3) + (exp.max_supports || 1)
          const isFull = signups.length >= maxPlayers

          return (
            <div key={exp.id} className="p-4 rounded-2xl bg-black/40 border border-white/8 space-y-2.5 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between font-mono text-[10px]">
                  <span className="bg-purple-500/20 text-purple-300 border border-purple-400/30 px-2 py-0.5 rounded-full font-bold uppercase">
                    {exp.activity_type || 'Wyprawa'}
                  </span>
                  <span className="text-amber-300 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {exp.start_time || exp.event_time ? new Date(exp.event_time || exp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Dziś'}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-white line-clamp-1">{exp.title}</h4>
                <p className="text-[11px] text-gray-400 font-mono">Min. IP: <span className="text-amber-300 font-bold">{exp.min_ip}+</span></p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs font-mono">
                <span className={`flex items-center gap-1 text-[11px] font-bold ${isFull ? 'text-rose-400' : 'text-emerald-400'}`}>
                  <Users className="w-3.5 h-3.5" /> {signups.length}/{maxPlayers} {isFull ? '(Pełna)' : '(Wolne)'}
                </span>
                <span className="text-[10px] text-gray-400">{exp.server || 'Europa'}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
