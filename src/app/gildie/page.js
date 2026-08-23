'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, Globe, HelpCircle, MapPin, Plus, RotateCcw, Search, Shield, Swords, X } from 'lucide-react'

import GuildApplyModal from '@/components/GuildApplyModal'
import GuildZvZInspectorModal from '@/components/guilds/GuildZvZInspectorModal'
import CustomSelect from '@/components/ui/CustomSelect'
import { usePortalSession } from '@/contexts/PortalSessionContext'
import { authenticatedFetch } from '@/lib/authenticatedFetch'
import { scheduleIdleTask } from '@/lib/clientIdle'

const SERVERS = ['Europa', 'Ameryka', 'Azja']
const CITIES = ['Martlock', 'Lymhurst', 'Bridgewatch', 'Fort Sterling', 'Thetford', 'Caerleon', 'Brecilien']
const ACTIVITY_OPTIONS = [
  { value: 'PvP', label: 'PvP / Ganking' },
  { value: 'PvE / HCE', label: 'PvE / HCE' },
  { value: 'ZvZ / Wojny', label: 'ZvZ / Wojny' },
  { value: 'Casual / Wszystko', label: 'Mieszana (Casual)' },
]
const EMPTY_FORM = { name: '', description: '', activityType: 'PvP', mainCity: 'Martlock', server: 'Europa', discordLink: '', webhookUrl: '' }

function ManifestModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return undefined
    const closeOnEscape = (event) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose, open])

  if (!open) return null
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const response = await authenticatedFetch('/api/guilds', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Nie udało się opublikować manifestu.')
      setForm(EMPTY_FORM)
      onCreated(body.guild)
      onClose()
    } catch (error) {
      setMessage(error.message)
    } finally {
      setBusy(false)
    }
  }

  return createPortal((
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/85 p-3 backdrop-blur-sm sm:p-6" role="dialog" aria-modal="true" aria-labelledby="manifest-title">
      <div className="mx-auto my-3 w-full max-w-2xl rounded-[26px] border border-[var(--gold)]/35 bg-[#120d0a] shadow-[0_24px_90px_rgba(0,0,0,.75)] sm:my-8">
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border-warm)] p-5 sm:p-6">
          <div><p className="text-[9px] font-black uppercase tracking-[.22em] text-[var(--gold)]">Dla liderów</p><h2 id="manifest-title" className="font-display mt-1 text-2xl font-black text-[var(--text-bright)]">Opublikuj manifest gildii</h2><p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">Utwórz publiczny profil formacji i skonfiguruj rekrutację.</p></div>
          <button type="button" onClick={onClose} className="aopp-ghost-button shrink-0 p-2.5" aria-label="Zamknij formularz"><X className="h-5 w-5" /></button>
        </header>
        <form onSubmit={submit} className="space-y-4 p-5 sm:p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Nazwa gildii *<input required minLength={2} maxLength={30} value={form.name} onChange={(e) => update('name', e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--border-warm)] bg-[var(--bg-elevated)] p-3 text-sm normal-case text-white outline-none focus:border-[var(--gold)]" placeholder="np. Husaria Polska" /></label>
            <CustomSelect label="Serwer *" value={form.server} onChange={(value) => update('server', value)} options={SERVERS} />
            <CustomSelect label="Główne miasto *" value={form.mainCity} onChange={(value) => update('mainCity', value)} options={CITIES} />
            <CustomSelect label="Profil / doktryna *" value={form.activityType} onChange={(value) => update('activityType', value)} options={ACTIVITY_OPTIONS} />
          </div>
          <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Zaproszenie Discord *<input required type="url" value={form.discordLink} onChange={(e) => update('discordLink', e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--border-warm)] bg-[var(--bg-elevated)] p-3 text-sm normal-case text-white outline-none focus:border-[var(--gold)]" placeholder="https://discord.gg/..." /></label>
          <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Webhook rekrutacji <span className="normal-case font-normal">(opcjonalnie)</span><input type="url" value={form.webhookUrl} onChange={(e) => update('webhookUrl', e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--border-warm)] bg-[var(--bg-elevated)] p-3 text-sm normal-case text-white outline-none focus:border-[var(--gold)]" placeholder="https://discord.com/api/webhooks/..." /></label>
          <details className="rounded-xl border border-sky-300/15 bg-sky-300/[.04] p-3 text-xs leading-5 text-[var(--text-secondary)]">
            <summary className="cursor-pointer font-bold text-sky-200">Jak utworzyć webhook na Discordzie?</summary>
            <p className="mt-2">Webhook przekazuje podania rekrutacyjne na wybrany kanał. Jego adres pozostaje prywatny i nie jest pokazywany w katalogu.</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Otwórz ustawienia kanału rekrutacyjnego na swoim serwerze Discord.</li>
              <li>Wejdź w <b className="text-gray-200">Integracje → Webhooki → Nowy webhook</b>.</li>
              <li>Wybierz kanał i kliknij <b className="text-gray-200">Kopiuj adres URL webhooka</b>.</li>
              <li>Wklej skopiowany adres w polu powyżej. Nie udostępniaj go innym osobom.</li>
            </ol>
          </details>
          <label className="block text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]"><span className="flex justify-between"><span>Opis i wymagania *</span><span>{form.description.length}/600</span></span><textarea required minLength={10} maxLength={600} rows={5} value={form.description} onChange={(e) => update('description', e.target.value)} className="mt-1.5 w-full resize-none rounded-xl border border-[var(--border-warm)] bg-[var(--bg-elevated)] p-3 text-sm normal-case leading-6 text-white outline-none focus:border-[var(--gold)]" placeholder="Opisz godziny aktywności, wymagania i styl gry..." /></label>
          {message && <p role="alert" className="rounded-xl border border-rose-300/25 bg-rose-300/[.07] p-3 text-xs font-bold text-rose-200">{message}</p>}
          <div className="flex flex-col-reverse gap-2 border-t border-white/[.07] pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={onClose} className="aopp-ghost-button px-5 py-3 text-xs font-black uppercase">Anuluj</button><button type="submit" disabled={busy} className="btn btn-primary min-h-11 px-6 text-xs font-black uppercase disabled:opacity-50">{busy ? 'Publikowanie…' : 'Opublikuj manifest'}</button></div>
        </form>
      </div>
    </div>
  ), document.body)
}

function GuildCard({ guild, onInspect, onApply }) {
  return (
    <article className="panel panel-interactive group relative flex min-h-[310px] flex-col overflow-hidden rounded-[24px] p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-3 -top-8 font-display text-[9rem] font-black text-[var(--gold)]/[.035]">{guild.name.charAt(0)}</div>
      <div className="relative flex items-start gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--gold)]/25 bg-[var(--gold)]/10 text-xl font-black text-[var(--gold)]">{guild.name.charAt(0)}</div><div className="min-w-0"><p className="text-[8px] font-black uppercase tracking-[.2em] text-[var(--text-muted)]">Chorągiew gildyjna</p><h3 className="font-display mt-1 truncate text-2xl font-black text-white transition group-hover:text-[var(--gold)]"><Link href={`/gildie/${guild.id}`}>{guild.name}</Link></h3><p className="mt-1 text-xs text-[var(--text-secondary)]">Lider: <Link href={`/profil/${guild.user_id}`} className="font-bold text-[var(--text-bright)] hover:underline">{(guild.profiles?.username || 'Gracz').replace(/#0$/, '')}</Link></p></div></div>
      <div className="relative mt-4 flex flex-wrap gap-2 text-[9px] font-black uppercase"><span className="flex items-center gap-1 rounded-full border border-violet-300/25 bg-violet-300/[.07] px-2.5 py-1 text-violet-200"><Globe className="h-3 w-3" />{guild.server || 'Nieustalony'}</span><span className="flex items-center gap-1 rounded-full border border-amber-300/25 bg-amber-300/[.07] px-2.5 py-1 text-amber-200"><MapPin className="h-3 w-3" />{guild.main_city}</span><span className="flex items-center gap-1 rounded-full border border-sky-300/25 bg-sky-300/[.07] px-2.5 py-1 text-sky-200"><Shield className="h-3 w-3" />{guild.activity_type}</span></div>
      <p className="relative mt-4 line-clamp-3 flex-1 text-sm leading-6 text-[var(--text-secondary)]">{guild.description}</p>
      <div className="relative mt-5 flex items-center justify-between gap-3 border-t border-white/[.07] pt-4"><span className={`text-[9px] font-black uppercase ${guild.recruitment_open ? 'text-emerald-300' : 'text-rose-300'}`}>{guild.recruitment_open ? '● Rekrutacja otwarta' : '● Rekrutacja zamknięta'}</span><Link href={`/gildie/${guild.id}`} className="aopp-ghost-button px-4 py-2.5 text-[10px] font-black uppercase">Otwórz profil</Link></div>
      <div className="relative mt-2 grid grid-cols-3 gap-2"><button type="button" onClick={onInspect} className="aopp-ghost-button flex min-h-11 items-center justify-center gap-1 text-[9px] font-black uppercase"><Swords className="h-3.5 w-3.5" /> Statystyki</button><button type="button" disabled={!guild.recruitment_open} onClick={onApply} className="aopp-ghost-button min-h-11 text-[9px] font-black uppercase disabled:cursor-not-allowed disabled:opacity-40">{guild.recruitment_open ? 'Aplikuj' : 'Zamknięta'}</button><a href={guild.discord_link} target="_blank" rel="noopener noreferrer" className="aopp-ghost-button flex min-h-11 items-center justify-center gap-1 text-[9px] font-black uppercase"><ExternalLink className="h-3.5 w-3.5" /> Discord</a></div>
    </article>
  )
}

export default function Gildie() {
  const { user } = usePortalSession()
  const [guilds, setGuilds] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [manifestOpen, setManifestOpen] = useState(false)
  const [selectedGuildForApply, setSelectedGuildForApply] = useState(null)
  const [inspectedGuild, setInspectedGuild] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCity, setFilterCity] = useState('ALL')
  const [filterActivity, setFilterActivity] = useState('ALL')
  const [filterServer, setFilterServer] = useState('ALL')

  const fetchGuilds = useCallback(async () => {
    setLoading(true); setLoadError('')
    try {
      const response = await authenticatedFetch('/api/guilds')
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || 'Nie udało się pobrać gildii.')
      setGuilds(body.guilds || [])
    } catch (error) { setLoadError(error.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => scheduleIdleTask(fetchGuilds), [fetchGuilds])

  const filteredGuilds = useMemo(() => guilds.filter((guild) => {
    const query = searchTerm.trim().toLocaleLowerCase('pl')
    return (!query || guild.name.toLocaleLowerCase('pl').includes(query) || guild.description?.toLocaleLowerCase('pl').includes(query)) && (filterCity === 'ALL' || guild.main_city === filterCity) && (filterActivity === 'ALL' || guild.activity_type === filterActivity) && (filterServer === 'ALL' || guild.server === filterServer)
  }), [filterActivity, filterCity, filterServer, guilds, searchTerm])

  const resetFilters = () => { setSearchTerm(''); setFilterCity('ALL'); setFilterActivity('ALL'); setFilterServer('ALL') }
  const hasFilters = Boolean(searchTerm) || [filterCity, filterActivity, filterServer].some((value) => value !== 'ALL')

  return (
    <div className="page-content">
      <div className="subpage-header"><h1>Rejestr Gildii</h1><p>Znajdź formację na swoim serwerze, sprawdź doktrynę i dołącz do wspólnej kampanii.</p></div>
      <main className="relative z-10 mx-auto mt-2 w-full max-w-[1400px] space-y-5 p-4 sm:p-6 lg:p-8">
        <section className="panel relative overflow-hidden rounded-[28px] p-5 sm:p-6"><div className="pointer-events-none absolute right-2 top-[-42px] font-display text-[11rem] font-black text-[var(--gold)]/[.025]">G</div><div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div className="max-w-2xl"><p className="text-[9px] font-black uppercase tracking-[.22em] text-[var(--gold)]">Archiwum chorągwi</p><h2 className="font-display mt-1 text-2xl font-black text-white sm:text-3xl">Wybierz swoich towarzyszy</h2><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Katalog prowadzony przez liderów społeczności. Statystyki bojowe pobieramy dopiero na żądanie z API Albionu.</p></div><button type="button" onClick={() => setManifestOpen(true)} className="btn btn-primary flex min-h-11 shrink-0 items-center justify-center gap-2 px-5 text-xs font-black uppercase"><Plus className="h-4 w-4" /> Dodaj swoją gildię</button></div></section>

        <section className="panel relative z-30 space-y-4 overflow-visible rounded-[24px] p-4 sm:p-5" aria-label="Filtry gildii"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[var(--text-secondary)]">Katalog formacji</p><h2 className="font-display text-xl font-bold text-white">{loading ? 'Otwieranie rejestru…' : `${filteredGuilds.length} ${filteredGuilds.length === 1 ? 'gildia' : 'gildii'}`}</h2></div>{hasFilters && <button type="button" onClick={resetFilters} className="aopp-ghost-button flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase"><RotateCcw className="h-3.5 w-3.5" /> Wyczyść filtry</button>}</div><div className="relative"><label htmlFor="guild-search" className="sr-only">Szukaj gildii</label><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" /><input id="guild-search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input-with-icon !pl-12 min-h-12 w-full rounded-xl border border-[var(--border-warm)] bg-[var(--bg-elevated)] pr-4 text-sm text-white outline-none focus:border-[var(--gold)]" placeholder="Nazwa gildii lub słowo z opisu…" /></div><div className="grid gap-3 sm:grid-cols-3"><CustomSelect label="Serwer" value={filterServer} onChange={setFilterServer} options={[{ value: 'ALL', label: 'Wszystkie serwery' }, ...SERVERS]} /><CustomSelect label="Miasto" value={filterCity} onChange={setFilterCity} options={[{ value: 'ALL', label: 'Wszystkie miasta' }, ...CITIES]} /><CustomSelect label="Doktryna" value={filterActivity} onChange={setFilterActivity} options={[{ value: 'ALL', label: 'Wszystkie doktryny' }, ...ACTIVITY_OPTIONS]} /></div></section>

        {loadError ? <section className="panel rounded-[24px] border-rose-300/20 p-8 text-center"><Shield className="mx-auto h-8 w-8 text-rose-300" /><h2 className="font-display mt-3 text-xl font-bold text-white">Rejestr jest chwilowo niedostępny</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">{loadError}</p><button type="button" onClick={fetchGuilds} className="btn btn-primary mt-5 px-5 py-3 text-xs font-black uppercase">Spróbuj ponownie</button></section> : loading ? <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((item) => <div key={item} className="panel h-72 animate-pulse rounded-[24px] bg-white/[.025]" />)}</div> : filteredGuilds.length === 0 ? <section className="panel rounded-[24px] p-10 text-center"><Swords className="mx-auto h-8 w-8 text-[var(--gold)]" /><h2 className="font-display mt-3 text-xl font-bold text-white">Brak pasujących chorągwi</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Zmień kryteria albo wyczyść wszystkie filtry.</p>{hasFilters && <button type="button" onClick={resetFilters} className="aopp-ghost-button mt-5 px-5 py-3 text-xs font-black uppercase">Pokaż wszystkie gildie</button>}</section> : <section className="grid gap-4 md:grid-cols-2">{filteredGuilds.map((guild) => <GuildCard key={guild.id} guild={guild} onInspect={() => setInspectedGuild({ name: guild.name, server: guild.server || 'Europa' })} onApply={() => setSelectedGuildForApply(guild)} />)}</section>}

        <aside className="flex items-start gap-3 rounded-2xl border border-sky-300/15 bg-sky-300/[.035] p-4 text-xs leading-5 text-[var(--text-secondary)]"><HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" /><p>Dane bojowe pochodzą z Gameinfo API i mogą pojawić się z opóźnieniem. Profile, opisy i rekrutację prowadzą bezpośrednio liderzy gildii.</p></aside>
      </main>
      <ManifestModal open={manifestOpen} onClose={() => setManifestOpen(false)} onCreated={(guild) => setGuilds((current) => [guild, ...current])} />
      <GuildApplyModal isOpen={!!selectedGuildForApply} onClose={() => setSelectedGuildForApply(null)} guild={selectedGuildForApply} currentUser={user} />
      <GuildZvZInspectorModal key={inspectedGuild ? `guild-${inspectedGuild.name}-${inspectedGuild.server}` : 'closed'} isOpen={!!inspectedGuild} onClose={() => setInspectedGuild(null)} guildName={inspectedGuild?.name || ''} server={inspectedGuild?.server || 'Europa'} />
    </div>
  )
}
