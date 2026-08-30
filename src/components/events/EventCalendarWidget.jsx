'use client'

import { useEffect, useState } from 'react'
import { CalendarDays as CalendarIcon, Clock, Users, Swords, Shield, Sparkles, Search as Filter, ArrowLeft as ChevronLeft, ChevronRight, BellRing as BellCheck } from 'lucide-react'
import {
  getLocalPreference,
  PREFERENCES_SYNCED_EVENT,
  savePortalPreference,
} from '@/lib/preferenceSync'

const OFFICIAL_ALBION_EVENTS = [
  {
    id: 'maint-daily',
    title: 'Codzienna Konserwacja Serwera EU',
    category: 'Konserwacja',
    time: '10:00 UTC',
    location: 'Wszystkie Serwery',
    isOfficial: true,
    repeat: 'Codziennie',
    iconColor: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/30'
  },
  {
    id: 'bandit-assault',
    title: 'Bandit Assault (Atak Bandytów BZ)',
    category: 'Faction Warfare',
    time: '14:00 & 20:00 UTC',
    location: 'Czerwone Strefy (Red Zones)',
    isOfficial: true,
    repeat: 'Co 5-8 godzin',
    iconColor: 'text-rose-400',
    bgColor: 'bg-rose-500/10 border-rose-500/30'
  },
  {
    id: 'prime-time-18',
    title: 'Główne Prime Time Terytoriów (ZvZ CTA)',
    category: 'Gildyjne CTA',
    time: '18:00 & 20:00 UTC',
    location: 'Outlands (Black Zone)',
    isOfficial: true,
    repeat: 'Codziennie',
    iconColor: 'text-sky-400',
    bgColor: 'bg-sky-500/10 border-sky-500/30'
  },
  {
    id: 'castle-outpost',
    title: 'Otwarcia Zamków i Posterunków (Castles)',
    category: 'Gildyjne CTA',
    time: '12:00, 18:00, 00:00 UTC',
    location: 'Outlands',
    isOfficial: true,
    repeat: 'Co 6 godzin',
    iconColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/30'
  }
]

export default function EventCalendarWidget({ expeditions = [] }) {
  const [activeTab, setActiveTab] = useState('agenda') // 'agenda' | 'calendar'
  const [selectedCategory, setSelectedCategory] = useState('ALL')
  const [reminderSetIds, setReminderSetIds] = useState({})

  useEffect(() => {
    const loadReminders = (event) => {
      setReminderSetIds(event?.detail?.reminders || getLocalPreference('reminders'))
    }
    const timeoutId = window.setTimeout(loadReminders, 0)
    window.addEventListener(PREFERENCES_SYNCED_EVENT, loadReminders)
    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener(PREFERENCES_SYNCED_EVENT, loadReminders)
    }
  }, [])

  const toggleReminder = (id) => {
    setReminderSetIds(prev => {
      const next = { ...prev }
      if (next[id]) delete next[id]
      else next[id] = true
      void savePortalPreference('reminders', next)
      return next
    })
  }

  // Combine official Albion events with user expeditions
  const userExpeditionEvents = expeditions.map(exp => ({
    id: `exp-${exp.id}`,
    title: exp.title,
    category: exp.activity_type === 'Statyk T8' ? 'Statyk' : exp.activity_type || 'Wyprawa',
    time: exp.start_time || '19:00 UTC',
    location: exp.city || 'Outlands',
    isOfficial: false,
    organizer: exp.profiles?.username || 'Gracz',
    minIp: exp.min_ip,
    signupsCount: exp.expedition_signups?.length || 0,
    iconColor: 'text-amber-300',
    bgColor: 'bg-amber-500/10 border-amber-400/40'
  }))

  const allEvents = [...OFFICIAL_ALBION_EVENTS, ...userExpeditionEvents]

  const filteredEvents = allEvents.filter(e => {
    if (selectedCategory === 'ALL') return true
    if (selectedCategory === 'Gildyjne CTA') return e.category === 'Gildyjne CTA' || e.category === 'ZvZ'
    if (selectedCategory === 'Wyprawy') return !e.isOfficial
    if (selectedCategory === 'Konserwacja') return e.isOfficial
    return e.category === selectedCategory
  })

  // Calendar dates generation (Current week)
  const daysOfWeek = [
    { name: 'Poniedziałek', short: 'Pon', day: 11 },
    { name: 'Wtorek', short: 'Wt', day: 12, isToday: true },
    { name: 'Środa', short: 'Śr', day: 13 },
    { name: 'Czwartek', short: 'Czw', day: 14 },
    { name: 'Piątek', short: 'Pt', day: 15 },
    { name: 'Sobota', short: 'Sob', day: 16 },
    { name: 'Niedziela', short: 'Ndz', day: 17 },
  ]

  return (
    <div className="panel p-5 sm:p-7 space-y-6">
      {/* NAGŁÓWEK KALENDARZA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/8 pb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-amber-300">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-sky-500/10 border border-sky-500/30 text-sky-400 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
                Kalendarz Wydarzeń
              </span>
              <span className="text-[10px] text-gray-400 font-mono">Sierpień 2026</span>
            </div>
            <h2 className="font-display text-xl font-black text-white mt-0.5">Harmonogram ZvZ, Wypraw & Serwera</h2>
          </div>
        </div>

        {/* PRZEŁĄCZNIK WIDOKÓW */}
        <div className="flex items-center gap-2 bg-[#090a0f] p-1 rounded-xl border border-white/10 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('agenda')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'agenda' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            Lista Wydarzeń
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${activeTab === 'calendar' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-400 hover:text-white'}`}
          >
            Siatka Tygodniowa
          </button>
        </div>
      </div>

      {/* PASEK FILTRÓW KATEGORII */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <Filter className="w-3.5 h-3.5 text-gray-400 mr-1" />
          {['ALL', 'Gildyjne CTA', 'Wyprawy', 'Faction Warfare', 'Konserwacja'].map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-xl text-xs font-bold border transition ${
                selectedCategory === cat
                  ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {cat === 'ALL' ? 'Wszystkie Wydarzenia' : cat}
            </button>
          ))}
        </div>

        <span className="text-[10px] font-mono text-gray-400">
          Łącznie: <strong className="text-amber-300 font-bold">{filteredEvents.length}</strong> wydarzeń
        </span>
      </div>

      {/* WIDOK 1: LISTA / AGENDA */}
      {activeTab === 'agenda' && (
        <div className="space-y-3">
          {filteredEvents.map(event => {
            const isReminderSet = Boolean(reminderSetIds[event.id])

            return (
              <div
                key={event.id}
                className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition ${event.bgColor}`}
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 shrink-0 text-amber-400">
                    {event.isOfficial ? <Clock className="w-5 h-5" /> : <Swords className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${event.isOfficial ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'}`}>
                        {event.category}
                      </span>
                      {event.isOfficial ? (
                        <span className="text-[9px] font-mono text-gray-400">Oficjalny Cykl Albionu</span>
                      ) : (
                        <span className="text-[9px] font-mono text-amber-300/80">Wyprawa Gracza: {event.organizer}</span>
                      )}
                    </div>

                    <h4 className="font-display font-bold text-base text-white">{event.title}</h4>

                    <div className="flex items-center gap-4 text-xs font-mono text-gray-300 flex-wrap">
                      <span className="flex items-center gap-1 text-amber-300 font-bold">
                        <Clock className="w-3.5 h-3.5 text-amber-400" /> {event.time}
                      </span>
                      <span className="flex items-center gap-1 text-gray-400">
                        Miejsce: <strong className="text-gray-200">{event.location}</strong>
                      </span>
                      {event.minIp && (
                        <span className="text-emerald-400">Min IP: {event.minIp}</span>
                      )}
                      {event.signupsCount > 0 && (
                        <span className="flex items-center gap-1 text-sky-300">
                          <Users className="w-3 h-3" /> {event.signupsCount} Zapisanych
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => toggleReminder(event.id)}
                    className={`btn btn-sm flex items-center gap-1.5 text-xs font-bold ${
                      isReminderSet
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                        : 'btn-secondary'
                    }`}
                  >
                    <BellCheck className={`w-3.5 h-3.5 ${isReminderSet ? 'text-emerald-400' : 'text-gray-400'}`} />
                    <span>{isReminderSet ? 'Przypomnienie Włączone' : 'Przypomnij'}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* WIDOK 2: SIATKA TYGODNIOWA */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
            {daysOfWeek.map(d => (
              <div
                key={d.day}
                className={`p-3 rounded-2xl border text-center space-y-2 ${
                  d.isToday
                    ? 'bg-amber-500/15 border-amber-400/60 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                    : 'bg-[#0e0f17] border-white/8'
                }`}
              >
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-wider ${d.isToday ? 'text-amber-300' : 'text-gray-400'}`}>
                    {d.short}
                  </p>
                  <p className={`font-display text-lg font-black ${d.isToday ? 'text-white' : 'text-gray-300'}`}>
                    {d.day}
                  </p>
                </div>

                <div className="space-y-1.5 pt-1 border-t border-white/8 text-left">
                  <div className="bg-sky-500/15 border border-sky-500/30 p-1.5 rounded-lg text-[9px] text-sky-200 font-mono font-bold">
                    10:00 Maintenance
                  </div>
                  <div className="bg-rose-500/15 border border-rose-500/30 p-1.5 rounded-lg text-[9px] text-rose-200 font-mono font-bold">
                    18:00 CTA ZvZ
                  </div>
                  {d.isToday && (
                    <div className="bg-amber-400/20 border border-amber-400/50 p-1.5 rounded-lg text-[9px] text-amber-200 font-mono font-bold">
                      19:00 Statyk Group
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-center text-gray-400 font-mono">
            💡 Godziny podane w formacie czasu serwera Albionu (UTC). Kliknij &quot;Przypomnij&quot; w widoku listy, aby włączyć alerty.
          </p>
        </div>
      )}
    </div>
  )
}
