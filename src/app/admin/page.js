'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  EyeOff,
  FileWarning,
  MessageSquareText,
  RefreshCw,
  ShieldCheck,
  Swords,
  XCircle,
} from 'lucide-react'

import { EmptyState, SkeletonBlock, StatusNotice } from '@/components/ui/FeedbackState'
import { authenticatedFetch } from '@/lib/authenticatedFetch'

const REASONS = {
  spam: 'Spam',
  harassment: 'Nękanie lub obrażanie',
  inappropriate: 'Treść nieodpowiednia',
  misinformation: 'Wprowadzanie w błąd',
  other: 'Inny powód',
}

const STATUS_LABELS = {
  pending: 'Oczekuje',
  reviewed: 'Sprawdzone',
  dismissed: 'Odrzucone',
  actioned: 'Podjęto działanie',
}

export default function AdminPage() {
  const [dashboard, setDashboard] = useState({ stats: null, reports: [] })
  const [state, setState] = useState({ loading: true, error: '', forbidden: false })
  const [filter, setFilter] = useState('pending')
  const [busyId, setBusyId] = useState(null)
  const [notice, setNotice] = useState(null)

  const loadDashboard = useCallback(async () => {
    setState({ loading: true, error: '', forbidden: false })
    try {
      const response = await authenticatedFetch('/api/admin/overview', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (response.status === 401 || response.status === 403) {
        setState({ loading: false, error: '', forbidden: true })
        return
      }
      if (!response.ok) throw new Error(payload.error || 'Nie udało się pobrać panelu.')
      setDashboard(payload)
      setState({ loading: false, error: '', forbidden: false })
    } catch (error) {
      const message = error.message || 'Nie udało się pobrać panelu.'
      if (message.includes('Musisz być zalogowany')) {
        setState({ loading: false, error: '', forbidden: true })
      } else {
        setState({ loading: false, error: message, forbidden: false })
      }
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(loadDashboard, 0)
    return () => window.clearTimeout(timer)
  }, [loadDashboard])

  const visibleReports = useMemo(() => (
    filter === 'all'
      ? dashboard.reports
      : dashboard.reports.filter((report) => report.status === filter)
  ), [dashboard.reports, filter])

  async function moderate(report, action) {
    if (action === 'hide_comment' && !window.confirm('Ukryć ten komentarz i zamknąć zgłoszenie?')) return
    setBusyId(report.id)
    setNotice(null)
    try {
      const response = await authenticatedFetch(`/api/admin/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Akcja moderacyjna nie powiodła się.')

      setDashboard((current) => ({
        stats: {
          ...current.stats,
          pendingReports: Math.max(0, current.stats.pendingReports - (report.status === 'pending' ? 1 : 0)),
          visibleComments: Math.max(0, current.stats.visibleComments - (action === 'hide_comment' ? 1 : 0)),
        },
        reports: current.reports.map((item) => item.id === report.id
          ? {
              ...item,
              status: payload.report.status,
              comment: item.comment && payload.report.commentStatus
                ? { ...item.comment, status: payload.report.commentStatus }
                : item.comment,
            }
          : item),
      }))
      setNotice({ type: 'success', text: action === 'hide_comment' ? 'Komentarz ukryto, a zgłoszenie zamknięto.' : 'Status zgłoszenia został zaktualizowany.' })
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Akcja moderacyjna nie powiodła się.' })
    } finally {
      setBusyId(null)
    }
  }

  if (state.loading) {
    return <div className="page-content space-y-4"><SkeletonBlock className="h-36" /><div className="grid gap-4 md:grid-cols-4">{[1, 2, 3, 4].map((item) => <SkeletonBlock key={item} className="h-24" />)}</div><SkeletonBlock className="h-72" /></div>
  }

  if (state.forbidden) {
    return (
      <div className="page-content">
        <div className="panel mx-auto max-w-2xl p-8 text-center sm:p-12">
          <ShieldCheck className="mx-auto h-12 w-12 text-rose-300" />
          <h1 className="font-display mt-5 text-3xl font-black text-white">Dostęp tylko dla administratora</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">Ta część portalu jest chroniona. Konto musi mieć aktywną flagę administratora w Supabase.</p>
          <Link href="/" className="btn btn-primary mt-6 inline-flex px-5 py-3">Wróć do tawerny</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-content">
      <div className="subpage-header">
        <h1><ShieldCheck className="h-6 w-6 text-[var(--amber)]" /> Panel administratora</h1>
        <p>Centrum dowodzenia moderacją i szybki podgląd kondycji społeczności.</p>
      </div>

      {state.error && <StatusNotice type="error" className="mb-5">{state.error} <button type="button" onClick={loadDashboard} className="ml-2 underline">Spróbuj ponownie</button></StatusNotice>}
      {notice && <StatusNotice type={notice.type} className="mb-5">{notice.text}</StatusNotice>}

      {dashboard.stats && (
        <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Statystyki administracyjne">
          <AdminMetric icon={FileWarning} label="Oczekujące zgłoszenia" value={dashboard.stats.pendingReports} tone="rose" />
          <AdminMetric icon={MessageSquareText} label="Widoczne komentarze" value={dashboard.stats.visibleComments} tone="sky" />
          <AdminMetric icon={Swords} label="Publiczne buildy" value={dashboard.stats.builds} tone="gold" />
          <AdminMetric icon={ShieldCheck} label="Wszystkie zgłoszenia" value={dashboard.stats.allReports} tone="emerald" />
        </section>
      )}

      <section className="panel overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.2em] text-[var(--amber)]">Moderacja treści</p>
            <h2 className="font-display mt-1 text-2xl font-black text-white">Kolejka zgłoszeń</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              ['pending', 'Oczekujące'],
              ['actioned', 'Działanie'],
              ['reviewed', 'Sprawdzone'],
              ['dismissed', 'Odrzucone'],
              ['all', 'Wszystkie'],
            ].map(([value, label]) => <button key={value} type="button" onClick={() => setFilter(value)} className={`chip ${filter === value ? 'active' : ''}`}>{label}</button>)}
            <button type="button" onClick={loadDashboard} className="btn btn-ghost btn-sm" aria-label="Odśwież panel"><RefreshCw className="h-3.5 w-3.5" /> Odśwież</button>
          </div>
        </div>

        <div className="space-y-3 p-4 sm:p-5">
          {visibleReports.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Kolejka jest pusta" description="W tym widoku nie ma zgłoszeń wymagających uwagi." />
          ) : visibleReports.map((report) => (
            <article key={report.id} className="rounded-2xl border border-[var(--border)] bg-black/20 p-4 sm:p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`badge ${report.status === 'pending' ? 'badge-rose' : 'badge-amber'}`}>{STATUS_LABELS[report.status] || report.status}</span>
                    <span className="text-[9px] font-black uppercase tracking-[.12em] text-[var(--text-secondary)]">{REASONS[report.reason] || report.reason}</span>
                    <time className="text-[9px] text-[var(--text-muted)]">{new Date(report.createdAt).toLocaleString('pl-PL')}</time>
                  </div>
                  <Link href={`/buildy/${report.buildId}`} className="mt-3 block truncate text-base font-black text-white hover:text-[var(--amber)]">{report.buildTitle}</Link>
                  <p className="mt-1 text-[10px] text-[var(--text-secondary)]">{report.commentId ? 'Zgłoszenie komentarza' : 'Zgłoszenie buildu'}</p>
                  {report.comment && <blockquote className={`mt-3 rounded-xl border p-3 text-xs leading-5 ${report.comment.status === 'hidden' ? 'border-rose-400/15 bg-rose-400/5 text-rose-200/60 line-through' : 'border-white/8 bg-white/[.025] text-[var(--text-secondary)]'}`}>{report.comment.content}</blockquote>}
                  {report.details && <p className="mt-3 text-xs leading-5 text-[var(--text-primary)]"><span className="font-bold text-[var(--amber)]">Opis zgłaszającego:</span> {report.details}</p>}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-[330px] lg:justify-end">
                  {report.status === 'pending' && <>
                    <button type="button" disabled={busyId === report.id} onClick={() => moderate(report, 'review')} className="btn btn-ghost btn-sm"><CheckCircle2 className="h-3.5 w-3.5" /> Sprawdzone</button>
                    <button type="button" disabled={busyId === report.id} onClick={() => moderate(report, 'dismiss')} className="btn btn-ghost btn-sm text-[var(--text-secondary)]"><XCircle className="h-3.5 w-3.5" /> Odrzuć</button>
                    {report.comment && report.comment.status === 'visible' && <button type="button" disabled={busyId === report.id} onClick={() => moderate(report, 'hide_comment')} className="inline-flex items-center gap-2 rounded-lg border border-rose-400/25 bg-rose-400/8 px-3 py-2 text-[9px] font-black uppercase tracking-[.1em] text-rose-200 hover:bg-rose-400/12 disabled:opacity-40"><EyeOff className="h-3.5 w-3.5" /> Ukryj komentarz</button>}
                  </>}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function AdminMetric({ icon: Icon, label, value, tone }) {
  const tones = {
    rose: 'text-rose-300 border-rose-400/20 bg-rose-400/6',
    sky: 'text-sky-300 border-sky-400/20 bg-sky-400/6',
    emerald: 'text-emerald-300 border-emerald-400/20 bg-emerald-400/6',
    gold: 'text-[var(--amber)] border-[var(--amber)]/20 bg-[var(--amber)]/6',
  }
  return <div className={`rounded-2xl border p-4 ${tones[tone]}`}><div className="flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-[.13em] text-[var(--text-secondary)]">{label}</span><Icon className="h-4 w-4" /></div><strong className="font-display mt-3 block text-3xl font-black text-white">{value}</strong></div>
}
