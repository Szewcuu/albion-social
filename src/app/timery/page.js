'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BellRing,
  CalendarClock,
  Castle,
  ChevronDown,
  Clock3,
  Compass,
  Globe2,
  Plus,
  Shield,
  Sparkles,
  TimerReset,
  Trash2,
  Zap,
} from 'lucide-react'
import { EmptyState, StatusNotice } from '@/components/ui/FeedbackState'

const CUSTOM_TIMERS_KEY = 'aopp-custom-timers-v2'

const SERVER_CONFIG = {
  Europa: {
    code: 'EU',
    timeZone: 'Europe/Warsaw',
    color: 'sky',
    windows: [
      { hour: 12, label: 'Wczesne okno strategiczne', type: 'Terytoria' },
      { hour: 15, label: 'Popołudniowe okno strategiczne', type: 'Gildie' },
      { hour: 18, label: 'Główne okno europejskie', type: 'ZvZ' },
      { hour: 21, label: 'Późne okno europejskie', type: 'Zamki' },
    ],
  },
  Ameryka: {
    code: 'AM',
    timeZone: 'America/New_York',
    color: 'violet',
    windows: [
      { hour: 0, label: 'Wczesne okno amerykańskie', type: 'Terytoria' },
      { hour: 3, label: 'Główne okno amerykańskie', type: 'ZvZ' },
      { hour: 5, label: 'Późne okno amerykańskie', type: 'Gildie' },
      { hour: 21, label: 'Okno międzyregionalne', type: 'Zamki' },
    ],
  },
  Azja: {
    code: 'AS',
    timeZone: 'Asia/Singapore',
    color: 'emerald',
    windows: [
      { hour: 9, label: 'Wczesne okno azjatyckie', type: 'Terytoria' },
      { hour: 12, label: 'Główne okno azjatyckie', type: 'ZvZ' },
      { hour: 15, label: 'Późne okno azjatyckie', type: 'Gildie' },
      { hour: 18, label: 'Okno międzyregionalne', type: 'Zamki' },
    ],
  },
}

function pad(value) {
  return String(value).padStart(2, '0')
}

function getCountdown(target, now) {
  const diff = Math.max(0, target.getTime() - now.getTime())
  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60
  return {
    totalSeconds,
    formatted: days > 0 ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
  }
}

function nextUtcHour(hour, now) {
  const target = new Date(now)
  target.setUTCHours(hour, 0, 0, 0)
  if (target <= now) target.setUTCDate(target.getUTCDate() + 1)
  return target
}

function nextCycle(hours, now) {
  const target = new Date(now)
  target.setUTCMinutes(0, 0, 0)
  const currentHour = target.getUTCHours()
  const nextHour = Math.floor(currentHour / hours) * hours + hours
  target.setUTCHours(nextHour)
  return target
}

function formatClock(date, timeZone = 'UTC') {
  return date.toLocaleTimeString('pl-PL', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatTimerDate(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Nieprawidłowa data'
  return date.toLocaleString('pl-PL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function TimeryPage() {
  const [now, setNow] = useState(() => new Date())
  const [selectedServer, setSelectedServer] = useState('Europa')
  const [customTimers, setCustomTimers] = useState([])
  const [timerName, setTimerName] = useState('')
  const [timerDate, setTimerDate] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    const hydrationTimer = setTimeout(() => {
      try {
        const stored = JSON.parse(localStorage.getItem(CUSTOM_TIMERS_KEY) || '[]')
        if (Array.isArray(stored)) setCustomTimers(stored.filter((entry) => entry?.id && entry?.name && entry?.date).slice(0, 20))
      } catch {
        localStorage.removeItem(CUSTOM_TIMERS_KEY)
      }
    }, 0)

    return () => {
      clearInterval(timer)
      clearTimeout(hydrationTimer)
    }
  }, [])

  const server = SERVER_CONFIG[selectedServer]
  const strategicWindows = useMemo(() => server.windows
    .map((window) => {
      const target = nextUtcHour(window.hour, now)
      return { ...window, target, countdown: getCountdown(target, now) }
    })
    .sort((a, b) => a.target - b.target), [now, server.windows])

  const activeCustomTimers = useMemo(() => customTimers
    .map((timer) => ({ ...timer, target: new Date(timer.date), countdown: getCountdown(new Date(timer.date), now) }))
    .filter((timer) => !Number.isNaN(timer.target.getTime()))
    .sort((a, b) => a.target - b.target), [customTimers, now])

  const nextWindow = strategicWindows[0]
  const hourlyTarget = nextCycle(1, now)
  const sixHourTarget = nextCycle(6, now)

  function saveCustomTimers(next) {
    setCustomTimers(next)
    localStorage.setItem(CUSTOM_TIMERS_KEY, JSON.stringify(next))
  }

  function addTimer(event) {
    event.preventDefault()
    const target = new Date(timerDate)
    if (!timerName.trim() || Number.isNaN(target.getTime()) || target <= now) {
      setNotice('Podaj nazwę i przyszłą datę wydarzenia.')
      return
    }
    const next = [...customTimers, { id: crypto.randomUUID(), name: timerName.trim().slice(0, 80), date: target.toISOString() }].slice(-20)
    saveCustomTimers(next)
    setTimerName('')
    setTimerDate('')
    setNotice('Timer został zapisany na tym urządzeniu.')
  }

  function removeTimer(id) {
    saveCustomTimers(customTimers.filter((timer) => timer.id !== id))
  }

  return (
    <div className="page-content">
      <div className="subpage-header">
        <h1>Timery Świata</h1>
        <p>Zegary UTC, okna terytoriów, zamków i ZvZ.</p>
      </div>

<div className="relative z-10 mx-auto w-full max-w-[1380px] space-y-7 p-4 sm:p-6 lg:p-8">
<section className="panel overflow-hidden rounded-[28px]">
          <div className="grid lg:grid-cols-[1.15fr_.85fr]">
            <div className="border-b border-white/8 p-5 sm:p-7 lg:border-b-0 lg:border-r">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.22em] text-violet-300">Synchronizacja czasu</p>
                  <h2 className="font-display mt-1 text-2xl font-black text-[#fff]">Zegary dowódcy</h2>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">Czas aktualizowany co sekundę na podstawie zegara urządzenia.</p>
                </div>
                <label className="relative min-w-44 text-[9px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)]">Region
                  <select value={selectedServer} onChange={(event) => setSelectedServer(event.target.value)} className="mt-1.5 min-h-11 w-full appearance-none rounded-xl border px-3 text-xs normal-case tracking-normal text-[var(--text-primary)] outline-none">
                    {Object.keys(SERVER_CONFIG).map((name) => <option key={name}>{name}</option>)}
                  </select>
                  <ChevronDown className="pointer-events-none absolute bottom-3 right-3 h-3.5 w-3.5" />
                </label>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <ClockMetric label="UTC" value={formatClock(now)} icon={Globe2} />
                <ClockMetric label="Twój czas" value={formatClock(now, Intl.DateTimeFormat().resolvedOptions().timeZone)} icon={Clock3} tone="sky" />
                <ClockMetric label={`Strefa ${server.code}`} value={formatClock(now, server.timeZone)} icon={Compass} tone="violet" />
              </div>
            </div>

            <div className="relative flex flex-col justify-center bg-[radial-gradient(circle_at_100%_0%,rgba(167,139,250,.12),transparent_60%)] p-6 sm:p-8">
              <p className="text-[9px] font-black uppercase tracking-[.22em] text-violet-300">Najbliższy punkt zbiórki</p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div><p className="font-display text-xl font-black text-[#fff]">{nextWindow.label}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{pad(nextWindow.hour)}:00 UTC · {nextWindow.type}</p></div>
                <BellRing className="h-6 w-6 shrink-0 text-violet-300" />
              </div>
              <p className="mt-5 font-mono text-3xl font-black tracking-[.06em] text-[var(--amber)] sm:text-4xl" suppressHydrationWarning>{nextWindow.countdown.formatted}</p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/35"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-[var(--amber)]" style={{ width: `${Math.max(2, 100 - (nextWindow.countdown.totalSeconds / 86_400) * 100)}%` }} /></div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-3">
          <CycleCard icon={Zap} eyebrow="Cykl godzinowy" title="Następna pełna godzina" target={hourlyTarget} countdown={getCountdown(hourlyTarget, now)} tone="amber" description="Uniwersalny punkt odniesienia dla cyklicznych aktywności i zbiórek." />
          <CycleCard icon={Castle} eyebrow="Cykl sześciogodzinny" title="Następny blok 6h" target={sixHourTarget} countdown={getCountdown(sixHourTarget, now)} tone="violet" description="Pomocnicze odliczanie dla aktywności rozliczanych w większych blokach." />
          <CycleCard icon={Shield} eyebrow={`Strategia ${server.code}`} title={nextWindow.type} target={nextWindow.target} countdown={nextWindow.countdown} tone="rose" description="Najbliższe orientacyjne okno strategiczne wybranego regionu." />
        </div>

        <section className="panel rounded-[28px] p-5 sm:p-7">
          <div className="flex flex-col justify-between gap-3 border-b border-white/8 pb-5 sm:flex-row sm:items-end">
            <div><p className="text-[9px] font-black uppercase tracking-[.22em] text-sky-300">Mapa operacyjna</p><h2 className="font-display mt-1 text-2xl font-black text-[#fff]">Okna strategiczne · {selectedServer}</h2><p className="mt-2 text-xs text-[var(--text-secondary)]">Najbliższe wystąpienie każdego orientacyjnego bloku czasu.</p></div>
            <span className="w-fit rounded-lg border border-sky-400/20 bg-sky-400/8 px-3 py-2 text-[9px] font-black uppercase tracking-[.14em] text-sky-300">Godziny UTC</span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {strategicWindows.map((window, index) => {
              const urgent = window.countdown.totalSeconds <= 3_600
              return (
                <article key={`${selectedServer}-${window.hour}`} className={`relative overflow-hidden rounded-2xl border p-4 ${urgent ? 'border-rose-400/30 bg-rose-400/8' : index === 0 ? 'border-[var(--amber)]/30 bg-[var(--amber)]/[.055]' : 'border-white/8 bg-black/15'}`}>
                  <div className="flex items-start justify-between gap-3"><div><p className="font-display text-2xl font-black text-[#fff]">{pad(window.hour)}:00</p><p className="text-[8px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)]">UTC</p></div>{urgent ? <span className="rounded-md border border-rose-400/25 bg-rose-400/10 px-2 py-1 text-[8px] font-black uppercase text-rose-300">Blisko</span> : index === 0 ? <Sparkles className="h-4 w-4 text-[var(--amber)]" /> : null}</div>
                  <h3 className="mt-5 text-xs font-bold text-[var(--text-primary)]">{window.label}</h3>
                  <p className="mt-1 text-[9px] text-[var(--text-secondary)]">{window.type}</p>
                  <div className="mt-4 border-t border-white/8 pt-3"><p className="text-[8px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)]">Do rozpoczęcia</p><p className={`mt-1 font-mono text-sm font-bold ${urgent ? 'text-rose-300' : 'text-[var(--amber)]'}`} suppressHydrationWarning>{window.countdown.formatted}</p></div>
                </article>
              )
            })}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
          <section className="panel rounded-[28px] p-5 sm:p-6">
            <div className="border-b border-white/8 pb-4"><p className="text-[9px] font-black uppercase tracking-[.2em] text-[var(--amber)]">Własny alarm</p><h2 className="font-display mt-1 text-xl font-black text-[#fff]">Dodaj wydarzenie</h2><p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">Timer zapisze się lokalnie na tym urządzeniu.</p></div>
            <form onSubmit={addTimer} className="mt-5 space-y-4">
              <label className="block text-[9px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)]">Nazwa wydarzenia<input type="text" maxLength={80} value={timerName} onChange={(event) => setTimerName(event.target.value)} placeholder="np. Zbiórka pod hideoutem" className="mt-1.5 w-full rounded-xl border px-3 py-3 text-xs normal-case tracking-normal text-[var(--text-primary)] outline-none" /></label>
              <label className="block text-[9px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)]">Data i godzina<input type="datetime-local" value={timerDate} onChange={(event) => setTimerDate(event.target.value)} className="mt-1.5 w-full rounded-xl border px-3 py-3 text-xs normal-case tracking-normal text-[var(--text-primary)] outline-none" /></label>
              <button type="submit" className="btn btn-primary flex w-full items-center justify-center gap-2 px-4 py-3 text-xs font-black uppercase tracking-[.12em]"><Plus className="h-4 w-4" /> Dodaj timer</button>
            </form>
            {notice && <StatusNotice type="success" className="mt-3">{notice}</StatusNotice>}
          </section>

          <section className="panel rounded-[28px] p-5 sm:p-6">
            <div className="flex items-end justify-between gap-3 border-b border-white/8 pb-4"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-violet-300">Osobisty harmonogram</p><h2 className="font-display mt-1 text-xl font-black text-[#fff]">Twoje wydarzenia</h2></div><span className="rounded-lg border border-white/8 bg-black/20 px-2.5 py-1.5 text-[9px] font-bold text-[var(--text-secondary)]">{activeCustomTimers.length}/20</span></div>
            <div className="mt-4 space-y-2">
              {activeCustomTimers.length === 0 ? (
                <EmptyState icon={TimerReset} title="Brak własnych timerów" description="Dodaj datę zbiórki, CTA lub transportu." />
              ) : activeCustomTimers.map((timer) => {
                const expired = timer.target <= now
                return (
                  <article key={timer.id} className={`flex flex-col gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between ${expired ? 'border-white/6 bg-black/10 opacity-55' : 'border-white/8 bg-black/20'}`}>
                    <div className="min-w-0"><p className="truncate text-xs font-bold text-[var(--text-primary)]">{timer.name}</p><p className="mt-1 text-[9px] text-[var(--text-secondary)]">{formatTimerDate(timer.date)}</p></div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end"><span className={`font-mono text-xs font-bold ${expired ? 'text-[var(--text-secondary)]' : 'text-[var(--amber)]'}`} suppressHydrationWarning>{expired ? 'Zakończony' : timer.countdown.formatted}</span><button type="button" onClick={() => removeTimer(timer.id)} aria-label={`Usuń timer ${timer.name}`} className="rounded-lg border border-rose-400/15 bg-rose-400/5 p-2 text-rose-300 hover:bg-rose-400/10"><Trash2 className="h-3.5 w-3.5" /></button></div>
                  </article>
                )
              })}
            </div>
          </section>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/7 p-4 text-[10px] leading-5 text-amber-100/75"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><p>Okna strategiczne są planerem orientacyjnym, nie oficjalnym harmonogramem gry. Rzeczywiste godziny zależą od regionu, strefy, sezonu i aktualnych zasad Albion Online — przed CTA potwierdź je na mapie oraz w interfejsie gry.</p></div>
      </div>
    </div>
  )
}

function ClockMetric({ label, value, icon: Icon, tone = 'gold' }) {
  const color = tone === 'sky' ? 'text-sky-300' : tone === 'violet' ? 'text-violet-300' : 'text-[var(--amber)]'
  return <div className="rounded-2xl border border-white/8 bg-black/20 p-4"><div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-[.16em] text-[var(--text-secondary)]"><Icon className={`h-3.5 w-3.5 ${color}`} />{label}</div><p className={`mt-2 font-mono text-lg font-black ${color}`} suppressHydrationWarning>{value}</p></div>
}

function CycleCard({ icon: Icon, eyebrow, title, target, countdown, tone, description }) {
  const toneClasses = tone === 'violet' ? 'text-violet-300 border-violet-400/20 bg-violet-400/7' : tone === 'rose' ? 'text-rose-300 border-rose-400/20 bg-rose-400/7' : 'text-amber-300 border-amber-400/20 bg-amber-400/7'
  return (
    <article className="panel rounded-[24px] p-5">
      <div className="flex items-start justify-between gap-3"><div><p className="text-[8px] font-black uppercase tracking-[.18em] text-[var(--text-secondary)]">{eyebrow}</p><h2 className="font-display mt-1 text-lg font-black text-[#fff]">{title}</h2></div><span className={`rounded-xl border p-2 ${toneClasses}`}><Icon className="h-4 w-4" /></span></div>
      <p className="mt-3 text-[10px] leading-5 text-[var(--text-secondary)]">{description}</p>
      <div className="mt-4 rounded-xl border border-white/8 bg-black/20 p-3"><p className="text-[8px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)]">{target.toLocaleString('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC</p><p className="mt-1 font-mono text-xl font-black text-[var(--amber)]" suppressHydrationWarning>{countdown.formatted}</p></div>
    </article>
  )
}
