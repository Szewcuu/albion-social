'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BellRing, CalendarCheck2, CalendarDays, Clock3, LoaderCircle, MapPin, Shield, Sparkles, Users } from 'lucide-react'

import CustomSelect from '@/components/ui/CustomSelect'
import { EmptyState, StatusNotice } from '@/components/ui/FeedbackState'
import { authenticatedFetch } from '@/lib/authenticatedFetch'

const SERVER_OPTIONS = ['Wszystkie serwery', 'Europa', 'Ameryka', 'Azja']
const TYPE_OPTIONS = ['Wszystkie typy', 'Wyprawy graczy', 'ZvZ', 'PvP', 'PvE', 'Avalon', 'Ekonomia', 'Spotkanie', 'Inne']
const ROLE_OPTIONS = [
  { value: 'tank', label: 'Tank' }, { value: 'healer', label: 'Healer' },
  { value: 'dps', label: 'DPS' }, { value: 'support', label: 'Support' }, { value: 'flex', label: 'Dowolna rola' },
]
const REMINDER_OPTIONS = [
  { value: '', label: 'Bez przypomnienia' }, { value: '15', label: '15 minut wcześniej' },
  { value: '30', label: '30 minut wcześniej' }, { value: '60', label: '1 godzinę wcześniej' },
  { value: '120', label: '2 godziny wcześniej' }, { value: '1440', label: '1 dzień wcześniej' },
]
const ROLE_LABELS = Object.fromEntries(ROLE_OPTIONS.map((option) => [option.value, option.label]))

function dateKey(value) {
  const date = new Date(value)
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
}

function formatDate(value, options = {}) {
  return new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: 'short', ...options }).format(new Date(value))
}

async function readJson(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Nie udało się wykonać operacji.')
  return payload
}

export default function EventCalendarPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState(null)
  const [server, setServer] = useState('Wszystkie serwery')
  const [type, setType] = useState('Wszystkie typy')
  const [onlyMine, setOnlyMine] = useState(false)
  const [drafts, setDrafts] = useState({})

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const payload = await readJson(await authenticatedFetch('/api/events'))
      setEvents(payload.events || [])
      setDrafts(Object.fromEntries((payload.events || []).map((event) => [event.id, {
        role: event.mySignup?.role || 'flex',
        reminderMinutes: event.mySignup?.reminder_minutes == null ? '' : String(event.mySignup.reminder_minutes),
      }])))
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void Promise.resolve().then(loadEvents) }, [loadEvents])

  useEffect(() => {
    if (loading) return
    const eventId = new URLSearchParams(window.location.search).get('event')
    if (!eventId) return
    window.requestAnimationFrame(() => document.getElementById(`event-${eventId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }, [loading])

  const filtered = useMemo(() => events.filter((event) => {
    if (server !== 'Wszystkie serwery' && event.server !== server) return false
    if (type === 'Wyprawy graczy' && event.source !== 'expedition') return false
    if (type !== 'Wszystkie typy' && type !== 'Wyprawy graczy' && event.event_type !== type) return false
    return !onlyMine || Boolean(event.mySignup)
  }), [events, onlyMine, server, type])

  const grouped = useMemo(() => Object.entries(filtered.reduce((groups, event) => {
    const key = dateKey(event.starts_at)
    groups[key] ||= []
    groups[key].push(event)
    return groups
  }, {})), [filtered])

  async function updateSignup(event, action) {
    if (busy) return
    setBusy(event.id)
    setNotice(null)
    const draft = drafts[event.id] || { role: 'flex', reminderMinutes: '' }
    try {
      await readJson(await authenticatedFetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id, action, role: draft.role, reminderMinutes: draft.reminderMinutes || null }),
      }))
      setNotice({ type: 'success', text: action === 'cancel' ? 'Zapis został anulowany.' : 'Twój zapis i przypomnienie zostały zapisane.' })
      await loadEvents()
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    } finally {
      setBusy('')
    }
  }

  const confirmedTotal = events.reduce((sum, event) => sum + event.signups.filter((signup) => signup.status === 'confirmed').length, 0)
  const myTotal = events.filter((event) => event.mySignup).length

  return (
    <div className="page-content space-y-6">
      <header className="panel relative overflow-hidden rounded-[30px] border-amber-300/20 p-6 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_10%,rgba(139,92,246,.2),transparent_38%),radial-gradient(circle_at_10%_100%,rgba(217,165,52,.13),transparent_42%)]" />
        <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div><p className="text-[9px] font-black uppercase tracking-[.24em] text-violet-300">Kalendarz mobilizacji</p><h1 className="font-display mt-2 text-3xl font-black text-white sm:text-5xl">Rozkład wypraw i operacji</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">Jedno miejsce dla wydarzeń gildii i wypraw graczy ze wszystkich serwerów. Zapisuj się na operacje, ustawiaj przypomnienia i przechodź prosto do otwartych drużyn.</p></div>
          <div className="grid grid-cols-2 gap-3"><Stat icon={CalendarCheck2} label="Nadchodzące" value={events.length} /><Stat icon={Users} label="Zapisy" value={confirmedTotal} /></div>
        </div>
      </header>

      {notice && <StatusNotice type={notice.type}>{notice.text}</StatusNotice>}

      <section className="panel rounded-[24px] p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <CustomSelect label="Serwer" value={server} onChange={setServer} options={SERVER_OPTIONS} />
          <CustomSelect label="Typ wydarzenia" value={type} onChange={setType} options={TYPE_OPTIONS} />
          <button type="button" onClick={() => setOnlyMine((value) => !value)} className={`chip min-h-[42px] justify-center ${onlyMine ? 'active' : ''}`}><CalendarCheck2 className="h-4 w-4" /> Moje zapisy ({myTotal})</button>
        </div>
      </section>

      {loading ? <div className="panel flex min-h-64 items-center justify-center rounded-[24px]"><LoaderCircle className="h-7 w-7 animate-spin text-amber-300" /></div> : grouped.length === 0 ? <EmptyState icon={CalendarDays} title="Brak wydarzeń dla tych filtrów" description="Zmień serwer lub typ wydarzenia. Nowe mobilizacje dodaje dowództwo gildii." /> : (
        <div className="space-y-7">
          {grouped.map(([day, dayEvents]) => <section key={day} className="grid gap-4 lg:grid-cols-[180px_1fr]"><div className="lg:sticky lg:top-24 lg:self-start"><p className="text-[9px] font-black uppercase tracking-[.2em] text-violet-300">Dzień operacyjny</p><h2 className="font-display mt-1 text-2xl font-black text-white">{formatDate(dayEvents[0].starts_at, { weekday: 'long', year: 'numeric' })}</h2><p className="mt-2 text-[10px] text-[var(--text-secondary)]">{dayEvents.length} {dayEvents.length === 1 ? 'wydarzenie' : 'wydarzenia'}</p></div><div className="space-y-4">{dayEvents.map((event) => <EventCard key={event.id} event={event} draft={drafts[event.id] || { role: 'flex', reminderMinutes: '' }} setDraft={(patch) => setDrafts((current) => ({ ...current, [event.id]: { ...current[event.id], ...patch } }))} busy={busy === event.id} onJoin={() => updateSignup(event, 'join')} onCancel={() => updateSignup(event, 'cancel')} />)}</div></section>)}
        </div>
      )}
    </div>
  )
}

function Stat({ icon: Icon, label, value }) {
  return <div className="min-w-[120px] rounded-2xl border border-white/8 bg-black/20 p-4"><Icon className="h-4 w-4 text-amber-300" /><p className="font-display mt-2 text-2xl font-black text-white">{value}</p><p className="text-[8px] font-black uppercase tracking-[.13em] text-[var(--text-secondary)]">{label}</p></div>
}

function EventCard({ event, draft, setDraft, busy, onJoin, onCancel }) {
  const confirmed = event.signups.filter((signup) => signup.status === 'confirmed')
  const waitlist = event.signups.filter((signup) => signup.status === 'waitlist')
  const joined = Boolean(event.mySignup)
  const isWaitlist = event.mySignup?.status === 'waitlist'

  return <article id={`event-${event.id}`} className="panel overflow-hidden rounded-[24px] border-violet-300/15">
    <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-[1fr_300px]">
      <div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.13em] text-violet-200">{event.event_type}</span><span className="rounded-full border border-sky-300/20 bg-sky-300/8 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.13em] text-sky-200">{event.server}</span>{event.source === 'expedition' && <span className="rounded-full border border-emerald-300/20 bg-emerald-300/8 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.13em] text-emerald-200">Wyprawa gracza</span>}{event.audience === 'guild' && <span className="rounded-full border border-amber-300/20 bg-amber-300/8 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.13em] text-amber-200"><Shield className="mr-1 inline h-3 w-3" /> Tylko gildia</span>}</div><h3 className="font-display mt-4 text-2xl font-black text-white">{event.title}</h3>{event.source === 'expedition' ? <p className="mt-1 text-[10px] font-bold text-amber-200">Lider: {event.organizer}</p> : <Link href={`/gildie/${event.guild_id}`} className="mt-1 inline-flex text-[10px] font-bold text-amber-200 hover:underline">{event.guilds?.name || 'Gildia'}</Link>}{event.description && <p className="mt-3 max-w-2xl text-xs leading-6 text-[var(--text-secondary)]">{event.description}</p>}<div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[10px] font-bold text-[var(--text-primary)]"><span className="flex items-center gap-1.5"><Clock3 className="h-4 w-4 text-amber-300" /> {formatDate(event.starts_at, { year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>{event.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-emerald-300" /> {event.location}</span>}<span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-sky-300" /> {confirmed.length}/{event.capacity}{waitlist.length ? ` · rezerwa ${waitlist.length}` : ''}</span></div></div>
      {event.source === 'expedition' ? <div className="flex flex-col justify-between rounded-2xl border border-emerald-300/15 bg-emerald-300/5 p-4"><div><p className="text-[8px] font-black uppercase tracking-[.18em] text-emerald-300">Otwarta drużyna</p><p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">Wybór roli i zapis znajdziesz na tablicy wypraw.</p></div><Link href={`/wyprawy?expedition=${event.id}`} className="btn btn-primary mt-4 inline-flex min-h-10 items-center justify-center gap-2 text-[10px] font-black"><Sparkles className="h-4 w-4" /> Otwórz wyprawę</Link></div> : <div className="rounded-2xl border border-white/8 bg-black/20 p-4"><p className="text-[8px] font-black uppercase tracking-[.18em] text-violet-300">{joined ? 'Twój zapis' : 'Dołącz do składu'}</p><div className="mt-3 grid gap-3"><CustomSelect label="Rola" value={draft.role} onChange={(value) => setDraft({ role: value })} options={ROLE_OPTIONS} /><CustomSelect label="Przypomnienie" value={draft.reminderMinutes} onChange={(value) => setDraft({ reminderMinutes: value })} options={REMINDER_OPTIONS} /></div>{joined && <p className={`mt-3 rounded-xl border px-3 py-2 text-[9px] font-black ${isWaitlist ? 'border-amber-300/20 bg-amber-300/8 text-amber-200' : 'border-emerald-300/20 bg-emerald-300/8 text-emerald-200'}`}>{isWaitlist ? 'Lista rezerwowa' : `Potwierdzono · ${ROLE_LABELS[event.mySignup.role]}`}</p>}<div className="mt-3 flex gap-2"><button type="button" disabled={busy || !event.signup_open} onClick={onJoin} className="btn btn-primary inline-flex min-h-10 flex-1 items-center justify-center gap-2 text-[10px] font-black disabled:opacity-45">{busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : joined ? <BellRing className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}{joined ? 'Zapisz zmiany' : confirmed.length >= event.capacity ? 'Dołącz do rezerwy' : 'Zapisz się'}</button>{joined && <button type="button" disabled={busy} onClick={onCancel} className="aopp-ghost-button min-h-10 px-3 text-[9px] font-black text-rose-200">Anuluj</button>}</div></div>}
    </div>
    {confirmed.length > 0 && <div className="flex flex-wrap items-center gap-2 border-t border-white/8 bg-black/10 px-5 py-3 sm:px-6"><span className="mr-1 text-[8px] font-black uppercase tracking-[.13em] text-[var(--text-secondary)]">Skład</span>{confirmed.slice(0, 12).map((signup) => <span key={signup.id} title={ROLE_LABELS[signup.role]} className="rounded-full border border-white/8 bg-black/25 px-2.5 py-1 text-[9px] text-[var(--text-primary)]">{signup.displayName || signup.profiles?.ingame_nick || signup.profiles?.username || 'Gracz'} · {ROLE_LABELS[signup.role] || signup.role}</span>)}{confirmed.length > 12 && <span className="text-[9px] text-[var(--text-secondary)]">+{confirmed.length - 12}</span>}</div>}
  </article>
}
