'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarPlus, Check, LoaderCircle, Save, ShieldCheck, UserCog, UserMinus, X } from 'lucide-react'

import CustomSelect from '@/components/ui/CustomSelect'
import { StatusNotice } from '@/components/ui/FeedbackState'
import { authenticatedFetch } from '@/lib/authenticatedFetch'

const EMPTY_EVENT = {
  title: '',
  description: '',
  eventType: 'ZvZ',
  startsAt: '',
  server: 'Europa',
  location: '',
  audience: 'public',
  capacity: 20,
}

async function readJson(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Nie udało się wykonać operacji.')
  return data
}

export default function GuildCommandPanel({ guild, onChanged }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState(null)
  const [recruitment, setRecruitment] = useState({
    open: Boolean(guild.recruitment_open),
    headline: guild.recruitment_headline || '',
  })
  const [eventForm, setEventForm] = useState(() => ({ ...EMPTY_EVENT, server: guild.server || 'Europa' }))
  const [memberDrafts, setMemberDrafts] = useState({})

  const loadPanel = useCallback(async () => {
    setLoading(true)
    try {
      const payload = await readJson(await authenticatedFetch(`/api/guilds/${guild.id}/manage`))
      setData(payload)
      setMemberDrafts(Object.fromEntries(payload.members.map((member) => [member.id, {
        role: member.role,
        title: member.title || '',
      }])))
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }, [guild.id])

  useEffect(() => { void Promise.resolve().then(loadPanel) }, [loadPanel])

  async function runAction(action, successMessage) {
    if (busy) return null
    setBusy(action.action)
    setNotice(null)
    try {
      const payload = await readJson(await authenticatedFetch(`/api/guilds/${guild.id}/manage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action),
      }))
      setNotice({ type: 'success', text: successMessage })
      await loadPanel()
      onChanged?.()
      return payload
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
      return null
    } finally {
      setBusy('')
    }
  }

  async function saveRecruitment(event) {
    event.preventDefault()
    await runAction({ action: 'update_recruitment', ...recruitment }, 'Ustawienia rekrutacji zostały zapisane.')
  }

  async function createEvent(event) {
    event.preventDefault()
    const result = await runAction({ action: 'create_event', ...eventForm }, 'Wydarzenie zostało dodane do planu gildii.')
    if (result) setEventForm({ ...EMPTY_EVENT, server: guild.server || 'Europa' })
  }

  if (loading) return <div className="panel flex min-h-48 items-center justify-center rounded-[24px]"><LoaderCircle className="h-6 w-6 animate-spin text-amber-300" /></div>
  if (!data) return <StatusNotice type="error">Nie udało się otworzyć panelu dowodzenia.</StatusNotice>

  const pending = data.applications.filter((application) => application.status === 'pending')

  return (
    <div className="space-y-5">
      {notice && <StatusNotice type={notice.type}>{notice.text}</StatusNotice>}

      <div className="grid gap-5 xl:grid-cols-2">
        <form onSubmit={saveRecruitment} className="panel rounded-[24px] p-5 sm:p-6">
          <p className="text-[8px] font-black uppercase tracking-[.2em] text-amber-300">Stan rekrutacji</p>
          <h3 className="font-display mt-1 text-xl font-black text-white">Brama gildii</h3>
          <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-xl border border-white/8 bg-black/20 p-3">
            <input type="checkbox" checked={recruitment.open} onChange={(event) => setRecruitment((current) => ({ ...current, open: event.target.checked }))} className="h-4 w-4 accent-amber-400" />
            <span className="text-xs font-bold text-[var(--text-primary)]">Rekrutacja otwarta</span>
          </label>
          <label className="mt-4 block text-[9px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)]">Krótki komunikat
            <textarea rows={3} maxLength={160} value={recruitment.headline} onChange={(event) => setRecruitment((current) => ({ ...current, headline: event.target.value }))} className="mt-1.5 w-full resize-y rounded-xl border px-3 py-3 text-sm font-normal normal-case leading-6 tracking-normal text-[var(--text-primary)] outline-none" placeholder="Kogo szukacie i kiedy gracie?" />
          </label>
          <button type="submit" disabled={Boolean(busy)} className="btn btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 py-3 text-xs font-black"><Save className="h-4 w-4" /> Zapisz rekrutację</button>
        </form>

        <form onSubmit={createEvent} className="panel rounded-[24px] p-5 sm:p-6">
          <p className="text-[8px] font-black uppercase tracking-[.2em] text-violet-300">Plan operacyjny</p>
          <h3 className="font-display mt-1 text-xl font-black text-white">Nowe wydarzenie</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2 text-[9px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)]">Nazwa
              <input required minLength={3} maxLength={80} value={eventForm.title} onChange={(event) => setEventForm((current) => ({ ...current, title: event.target.value }))} className="mt-1.5 w-full rounded-xl border px-3 py-3 text-xs normal-case tracking-normal text-[var(--text-primary)] outline-none" />
            </label>
            <CustomSelect label="Typ" value={eventForm.eventType} onChange={(value) => setEventForm((current) => ({ ...current, eventType: value }))} options={['ZvZ', 'PvP', 'PvE', 'Avalon', 'Ekonomia', 'Spotkanie', 'Inne']} />
            <CustomSelect label="Serwer" value={eventForm.server} onChange={(value) => setEventForm((current) => ({ ...current, server: value }))} options={['Europa', 'Ameryka', 'Azja']} />
            <CustomSelect label="Dostęp" value={eventForm.audience} onChange={(value) => setEventForm((current) => ({ ...current, audience: value }))} options={[{ value: 'public', label: 'Cała społeczność' }, { value: 'guild', label: 'Tylko członkowie gildii' }]} />
            <label className="text-[9px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)]">Limit miejsc
              <input type="number" min="2" max="200" required value={eventForm.capacity} onChange={(event) => setEventForm((current) => ({ ...current, capacity: Number(event.target.value) }))} className="mt-1.5 w-full rounded-xl border px-3 py-3 text-xs normal-case tracking-normal text-[var(--text-primary)] outline-none" />
            </label>
            <label className="sm:col-span-2 text-[9px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)]">Termin
              <input type="datetime-local" required value={eventForm.startsAt} onChange={(event) => setEventForm((current) => ({ ...current, startsAt: event.target.value }))} className="mt-1.5 w-full rounded-xl border px-3 py-3 text-xs normal-case tracking-normal text-[var(--text-primary)] outline-none" />
            </label>
            <label className="sm:col-span-2 text-[9px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)]">Miejsce zbiórki
              <input maxLength={120} value={eventForm.location} onChange={(event) => setEventForm((current) => ({ ...current, location: event.target.value }))} className="mt-1.5 w-full rounded-xl border px-3 py-3 text-xs normal-case tracking-normal text-[var(--text-primary)] outline-none" placeholder="np. Fort Sterling, hideout, kanał Discord" />
            </label>
            <label className="sm:col-span-2 text-[9px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)]">Opis
              <textarea rows={3} maxLength={600} value={eventForm.description} onChange={(event) => setEventForm((current) => ({ ...current, description: event.target.value }))} className="mt-1.5 w-full resize-y rounded-xl border px-3 py-3 text-sm font-normal normal-case leading-6 tracking-normal text-[var(--text-primary)] outline-none" />
            </label>
          </div>
          <button type="submit" disabled={Boolean(busy)} className="btn btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 py-3 text-xs font-black"><CalendarPlus className="h-4 w-4" /> Dodaj wydarzenie</button>
        </form>
      </div>

      <section className="panel rounded-[24px] p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><p className="text-[8px] font-black uppercase tracking-[.2em] text-emerald-300">Skrzynka rekrutacyjna</p><h3 className="font-display mt-1 text-xl font-black text-white">Oczekujące podania</h3></div><span className="rounded-full border border-emerald-300/20 bg-emerald-300/8 px-3 py-1 text-[9px] font-black text-emerald-200">{pending.length}</span></div>
        {pending.length ? <div className="mt-5 grid gap-3 lg:grid-cols-2">{pending.map((application) => <article key={application.id} className="rounded-2xl border border-white/8 bg-black/20 p-4"><div className="flex items-start justify-between gap-3"><div><h4 className="text-sm font-black text-white">{application.ingame_nick}</h4><p className="mt-1 text-[10px] text-[var(--text-secondary)]">{application.main_role} · Fame {application.total_fame}</p></div><span className="text-[8px] font-black uppercase text-amber-300">oczekuje</span></div>{application.message && <p className="mt-3 line-clamp-3 text-xs leading-5 text-[var(--text-secondary)]">{application.message}</p>}<div className="mt-4 flex gap-2"><button type="button" disabled={Boolean(busy)} onClick={() => runAction({ action: 'review_application', applicationId: application.id, decision: 'accepted' }, `${application.ingame_nick} został dodany do składu.`)} className="btn btn-primary inline-flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[10px]"><Check className="h-3.5 w-3.5" /> Przyjmij</button><button type="button" disabled={Boolean(busy)} onClick={() => runAction({ action: 'review_application', applicationId: application.id, decision: 'rejected' }, 'Podanie zostało odrzucone.')} className="aopp-ghost-button inline-flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[10px] text-rose-200"><X className="h-3.5 w-3.5" /> Odrzuć</button></div></article>)}</div> : <p className="mt-5 rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-[var(--text-secondary)]">Brak podań oczekujących na decyzję.</p>}
      </section>

      <section className="panel rounded-[24px] p-5 sm:p-6">
        <p className="text-[8px] font-black uppercase tracking-[.2em] text-sky-300">Struktura dowodzenia</p><h3 className="font-display mt-1 text-xl font-black text-white">Role i skład</h3>
        <div className="mt-5 space-y-3">{data.members.filter((member) => member.status === 'active').map((member) => {
          const draft = memberDrafts[member.id] || { role: member.role, title: member.title || '' }
          const name = member.profiles?.ingame_nick || member.profiles?.username || 'Gracz'
          const leader = member.role === 'leader'
          return <div key={member.id} className="grid gap-3 rounded-2xl border border-white/8 bg-black/20 p-4 md:grid-cols-[1fr_170px_1fr_auto] md:items-end"><div><p className="text-sm font-black text-white">{name}</p><p className="mt-1 text-[9px] uppercase tracking-[.12em] text-[var(--text-secondary)]">{leader ? 'Lider gildii' : member.role}</p></div>{leader ? <div className="md:col-span-2 flex items-center gap-2 text-xs text-amber-200"><ShieldCheck className="h-4 w-4" /> Rola chroniona</div> : <><CustomSelect label="Rola" value={draft.role} onChange={(value) => setMemberDrafts((current) => ({ ...current, [member.id]: { ...draft, role: value } }))} options={[{ value: 'officer', label: 'Oficer' }, { value: 'member', label: 'Członek' }, { value: 'recruit', label: 'Rekrut' }]} /><label className="text-[9px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)]">Tytuł<input maxLength={50} value={draft.title} onChange={(event) => setMemberDrafts((current) => ({ ...current, [member.id]: { ...draft, title: event.target.value } }))} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-xs normal-case tracking-normal text-[var(--text-primary)] outline-none" /></label></>}<div className="flex gap-2">{!leader && <><button type="button" title="Zapisz rolę" disabled={Boolean(busy)} onClick={() => runAction({ action: 'update_member', memberId: member.id, role: draft.role, title: draft.title, status: 'active' }, `Zaktualizowano rolę: ${name}.`)} className="aopp-ghost-button inline-flex h-10 w-10 items-center justify-center text-emerald-200"><UserCog className="h-4 w-4" /></button><button type="button" title="Usuń ze składu" disabled={Boolean(busy)} onClick={() => { if (window.confirm(`Usunąć ${name} z aktywnego składu gildii?`)) void runAction({ action: 'update_member', memberId: member.id, role: draft.role, title: draft.title, status: 'left' }, `${name} został usunięty ze składu.`) }} className="aopp-ghost-button inline-flex h-10 w-10 items-center justify-center text-rose-200"><UserMinus className="h-4 w-4" /></button></>}</div></div>
        })}</div>
      </section>

      {data.events.some((event) => event.status === 'scheduled') && <section className="panel rounded-[24px] p-5 sm:p-6"><p className="text-[8px] font-black uppercase tracking-[.2em] text-violet-300">Zarządzanie planem</p><div className="mt-4 space-y-2">{data.events.filter((event) => event.status === 'scheduled').map((event) => <div key={event.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/20 p-3"><div className="min-w-0"><p className="truncate text-xs font-bold text-white">{event.title}</p><p className="mt-1 text-[9px] text-[var(--text-secondary)]">{new Date(event.starts_at).toLocaleString('pl-PL')}</p></div><button type="button" disabled={Boolean(busy)} onClick={() => { if (window.confirm(`Odwołać wydarzenie „${event.title}”?`)) void runAction({ action: 'cancel_event', eventId: event.id }, 'Wydarzenie zostało odwołane.') }} className="aopp-ghost-button shrink-0 px-3 py-2 text-[9px] font-black text-rose-200">Odwołaj</button></div>)}</div></section>}
    </div>
  )
}
