'use client'

import { useCallback, useEffect, useState } from 'react'
import { Megaphone, Plus, Trash2 } from 'lucide-react'
import { authenticatedFetch } from '@/lib/authenticatedFetch'
import CustomSelect from '@/components/ui/CustomSelect'

const KIND_META = {
  info: { label: 'Wieść', tone: 'border-sky-400/25 bg-sky-400/[0.05] text-sky-200' },
  event: { label: 'Wydarzenie', tone: 'border-amber-300/25 bg-amber-300/[0.05] text-amber-100' },
  maintenance: { label: 'Techniczne', tone: 'border-rose-400/25 bg-rose-400/[0.05] text-rose-100' },
}

const KIND_OPTIONS = [
  { value: 'info', label: 'Wieść społeczności' },
  { value: 'event', label: 'Wydarzenie' },
  { value: 'maintenance', label: 'Komunikat techniczny' },
]

const EXPIRY_OPTIONS = [
  { value: '1', label: '1 dzień' },
  { value: '3', label: '3 dni' },
  { value: '7', label: '7 dni' },
  { value: '14', label: '14 dni' },
  { value: '30', label: '30 dni' },
]

function authorName(announcement) {
  const profile = Array.isArray(announcement.profiles) ? announcement.profiles[0] : announcement.profiles
  return profile?.username?.replace(/#0$/, '') || 'Personel portalu'
}

function formatExpiry(value) {
  if (!value) return 'bez terminu'
  return `do ${new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short' }).format(new Date(value))}`
}

export default function TavernAnnouncements({ isStaff = false }) {
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pendingArchiveId, setPendingArchiveId] = useState(null)
  const [form, setForm] = useState({ title: '', body: '', kind: 'info', expiresInDays: '7' })

  const loadAnnouncements = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await authenticatedFetch('/api/tavern/announcements')
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error)
      setAnnouncements(result.announcements || [])
    } catch {
      setError('Nie udało się odczytać tablicy.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const requestId = window.setTimeout(() => void loadAnnouncements(), 0)
    return () => window.clearTimeout(requestId)
  }, [loadAnnouncements])

  const publish = async (event) => {
    event.preventDefault()
    if (saving) return
    setSaving(true)
    setError('')
    try {
      const response = await authenticatedFetch('/api/tavern/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, expiresInDays: Number(form.expiresInDays) }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Nie udało się opublikować ogłoszenia.')
      setAnnouncements((current) => [result.announcement, ...current].slice(0, 3))
      setForm({ title: '', body: '', kind: 'info', expiresInDays: '7' })
      setEditorOpen(false)
    } catch (publishError) {
      setError(publishError.message)
    } finally {
      setSaving(false)
    }
  }

  const archive = async (id) => {
    if (pendingArchiveId !== id) {
      setPendingArchiveId(id)
      return
    }
    setError('')
    try {
      const response = await authenticatedFetch('/api/tavern/announcements', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Nie udało się zdjąć ogłoszenia.')
      setAnnouncements((current) => current.filter((announcement) => announcement.id !== id))
      setPendingArchiveId(null)
    } catch (archiveError) {
      setError(archiveError.message)
    }
  }

  return (
    <section className="mt-2.5 overflow-hidden rounded-xl border border-[var(--border-warm)] bg-[linear-gradient(120deg,rgba(54,36,24,.9),rgba(20,14,10,.96))]" aria-labelledby="herald-board-title">
      <header className="flex min-h-11 items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <Megaphone aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--gold)]" />
          <div className="min-w-0">
            <h2 id="herald-board-title" className="font-heading text-sm font-bold text-[var(--text-bright)]">Tablica heroldów</h2>
            <p className="truncate font-mono text-[9px] uppercase tracking-wider text-[var(--text-muted)]">Krótkie ogłoszenia personelu</p>
          </div>
        </div>
        {isStaff && announcements.length < 3 && (
          <button type="button" className="btn btn-ghost btn-sm" aria-expanded={editorOpen} onClick={() => setEditorOpen((open) => !open)}>
            {!editorOpen && <Plus aria-hidden="true" />} {editorOpen ? 'Zamknij' : 'Dodaj'}
          </button>
        )}
      </header>

      {editorOpen && isStaff && (
        <form onSubmit={publish} className="grid gap-2 border-b border-white/[0.06] bg-black/15 p-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="sm:col-span-2 xl:col-span-1">
            <span className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Tytuł</span>
            <input required minLength={3} maxLength={80} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="h-[42px] w-full rounded-xl border border-[var(--border-warm)] bg-[var(--bg-stone)] px-3 text-xs text-[var(--text-bright)] outline-none focus:border-[var(--gold)]" />
          </label>
          <label className="sm:col-span-2 xl:col-span-1">
            <span className="mb-1 block font-mono text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Treść</span>
            <input required minLength={3} maxLength={280} value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} className="h-[42px] w-full rounded-xl border border-[var(--border-warm)] bg-[var(--bg-stone)] px-3 text-xs text-[var(--text-bright)] outline-none focus:border-[var(--gold)]" />
          </label>
          <CustomSelect label="Rodzaj" value={form.kind} onChange={(kind) => setForm((current) => ({ ...current, kind }))} options={KIND_OPTIONS} />
          <div className="flex items-end gap-2">
            <CustomSelect label="Widoczne przez" value={form.expiresInDays} onChange={(expiresInDays) => setForm((current) => ({ ...current, expiresInDays }))} options={EXPIRY_OPTIONS} />
            <button type="submit" className="btn btn-primary mb-0 h-[42px] shrink-0" disabled={saving}>{saving ? '...' : 'Publikuj'}</button>
          </div>
        </form>
      )}

      <div className="p-2.5">
        {loading ? (
          <div className="grid gap-2 sm:grid-cols-3" aria-label="Ładowanie ogłoszeń">
            {[0, 1, 2].map((item) => <span key={item} className="h-16 animate-pulse rounded-lg border border-white/[0.05] bg-white/[0.03]" />)}
          </div>
        ) : announcements.length === 0 ? (
          <p className="flex min-h-12 items-center justify-center gap-2 text-center text-xs text-[var(--text-muted)]"><Megaphone aria-hidden="true" className="h-4 w-4" /> Heroldzi nie zostawili nowych ogłoszeń.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            {announcements.map((announcement) => {
              const meta = KIND_META[announcement.kind] || KIND_META.info
              return (
                <article key={announcement.id} className={`relative min-w-0 rounded-lg border px-3 py-2.5 ${meta.tone}`}>
                  <div className="mb-1 flex items-center gap-1.5 font-mono text-[8px] font-bold uppercase tracking-wider opacity-80"><Megaphone aria-hidden="true" className="h-3 w-3" />{meta.label}</div>
                  <h3 className="truncate font-heading text-sm font-bold text-[var(--text-bright)]">{announcement.title}</h3>
                  <p className="line-clamp-2 text-[10px] leading-4 text-[var(--text-primary)]">{announcement.body}</p>
                  <footer className="mt-1.5 flex items-center justify-between gap-2 font-mono text-[8px] uppercase tracking-wide opacity-70"><span className="truncate">{authorName(announcement)}</span><span className="shrink-0">{formatExpiry(announcement.expires_at)}</span></footer>
                  {isStaff && (
                    <button type="button" title="Zdejmij ogłoszenie" aria-label={pendingArchiveId === announcement.id ? `Potwierdź zdjęcie ogłoszenia ${announcement.title}` : `Zdejmij ogłoszenie ${announcement.title}`} onClick={() => archive(announcement.id)} className={`absolute right-1.5 top-1.5 grid h-7 place-items-center rounded-md px-1.5 text-[9px] font-bold uppercase transition-colors ${pendingArchiveId === announcement.id ? 'bg-rose-500 text-white' : 'bg-black/35 text-current hover:bg-black/60'}`}>
                      {pendingArchiveId === announcement.id ? 'Potwierdź' : <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />}
                    </button>
                  )}
                </article>
              )
            })}
          </div>
        )}
        {error && <p role="alert" className="mt-2 text-[10px] text-rose-300">{error}</p>}
      </div>
    </section>
  )
}
