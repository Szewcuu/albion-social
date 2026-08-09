'use client'

import CustomSelect from '@/components/ui/CustomSelect'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  EyeOff,
  FileWarning,
  Layers3,
  MessageSquareText,
  RefreshCw,
  RotateCcw,
  ServerCog,
  ShieldCheck,
  Swords,
  Trash2,
  UserCog,
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

const CONTENT_TYPES = [
  ['chat_message', 'Czat'],
  ['build', 'Buildy'],
  ['market_item', 'Rynek'],
  ['guild', 'Gildie'],
  ['expedition', 'Wyprawy'],
  ['build_comment', 'Komentarze'],
]

const AUDIT_ACTIONS = {
  hide: 'Ukryto',
  restore: 'Przywrócono',
  remove: 'Usunięto',
  role_change: 'Zmieniono rolę',
  review_report: 'Sprawdzono zgłoszenie',
  dismiss_report: 'Odrzucono zgłoszenie',
}

const INTEGRATION_NAMES = {
  supabase: 'Supabase',
  discord: 'Discord',
  albion_api: 'Gameinfo Albion',
  market_api: 'Albion Data Project',
}

const INTEGRATION_STATUSES = {
  operational: 'Działa',
  degraded: 'Obniżona jakość',
  down: 'Awaria',
  not_configured: 'Brak konfiguracji',
}

export default function AdminPage() {
  const [dashboard, setDashboard] = useState({ stats: null, reports: [], role: 'member' })
  const [state, setState] = useState({ loading: true, error: '', forbidden: false })
  const [activeTab, setActiveTab] = useState('reports')
  const [reportFilter, setReportFilter] = useState('pending')
  const [contentType, setContentType] = useState('chat_message')
  const [contentStatus, setContentStatus] = useState('visible')
  const [contentItems, setContentItems] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [selectedReportIds, setSelectedReportIds] = useState([])
  const [auditEntries, setAuditEntries] = useState([])
  const [roleUsers, setRoleUsers] = useState([])
  const [health, setHealth] = useState({ checks: [], events: [] })
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
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
      setState({ loading: false, error: message, forbidden: message.includes('Musisz być zalogowany') })
    }
  }, [])

  const loadContent = useCallback(async () => {
    setBusy(true)
    try {
      const response = await authenticatedFetch(`/api/admin/content?type=${contentType}&status=${contentStatus}`, { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Nie udało się pobrać treści.')
      setContentItems(payload.items || [])
      setSelectedIds([])
      setNotice(null)
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    } finally {
      setBusy(false)
    }
  }, [contentStatus, contentType])

  const loadAudit = useCallback(async () => {
    setBusy(true)
    try {
      const response = await authenticatedFetch('/api/admin/audit', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Nie udało się pobrać dziennika.')
      setAuditEntries(payload.entries || [])
      setNotice(null)
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    } finally {
      setBusy(false)
    }
  }, [])

  const loadRoles = useCallback(async () => {
    setBusy(true)
    try {
      const response = await authenticatedFetch('/api/admin/roles', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Nie udało się pobrać ról.')
      setRoleUsers(payload.users || [])
      setNotice(null)
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    } finally {
      setBusy(false)
    }
  }, [])

  const loadHealth = useCallback(async (runChecks = false) => {
    setBusy(true)
    try {
      if (runChecks) {
        const checkResponse = await authenticatedFetch('/api/admin/health', { method: 'POST' })
        const checkPayload = await checkResponse.json().catch(() => ({}))
        if (!checkResponse.ok) throw new Error(checkPayload.error || 'Kontrola integracji nie powiodła się.')
      }
      const response = await authenticatedFetch('/api/admin/health', { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Nie udało się pobrać monitoringu.')
      setHealth({ checks: payload.checks || [], events: payload.events || [] })
      setNotice(runChecks ? { type: 'success', text: 'Kontrola integracji została zakończona.' } : null)
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(loadDashboard, 0)
    return () => window.clearTimeout(timer)
  }, [loadDashboard])

  useEffect(() => {
    if (state.loading || state.forbidden) return undefined
    const timer = window.setTimeout(() => {
      if (activeTab === 'content') loadContent()
      if (activeTab === 'audit') loadAudit()
      if (activeTab === 'health') loadHealth()
      if (activeTab === 'roles' && dashboard.role === 'admin') loadRoles()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [activeTab, dashboard.role, loadAudit, loadContent, loadHealth, loadRoles, state.forbidden, state.loading])

  const visibleReports = useMemo(() => (
    reportFilter === 'all' ? dashboard.reports : dashboard.reports.filter((report) => report.status === reportFilter)
  ), [dashboard.reports, reportFilter])

  async function moderateReport(report, action) {
    if (action === 'hide_comment' && !window.confirm('Ukryć ten komentarz i zamknąć zgłoszenie?')) return
    setBusy(true)
    setNotice(null)
    try {
      const response = await authenticatedFetch(`/api/admin/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: reason.trim() || `Obsługa zgłoszenia: ${REASONS[report.reason] || report.reason}` }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Akcja moderacyjna nie powiodła się.')
      setDashboard((current) => ({ ...current, reports: current.reports.map((item) => item.id === report.id ? { ...item, status: payload.report.status, comment: item.comment && payload.report.commentStatus ? { ...item.comment, status: payload.report.commentStatus } : item.comment } : item) }))
      setNotice({ type: 'success', text: 'Zgłoszenie zostało obsłużone.' })
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  async function moderateReportsBatch(action) {
    if (!selectedReportIds.length) return setNotice({ type: 'error', text: 'Wybierz co najmniej jedno zgłoszenie.' })
    if (reason.trim().length < 3) return setNotice({ type: 'error', text: 'Podaj powód decyzji — minimum 3 znaki.' })

    setBusy(true)
    setNotice(null)
    try {
      const response = await authenticatedFetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedReportIds, action, reason: reason.trim() }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Zbiorcza akcja nie powiodła się.')

      const nextStatus = action === 'review' ? 'reviewed' : 'dismissed'
      const changedIds = new Set(selectedReportIds)
      setDashboard((current) => ({
        ...current,
        stats: current.stats ? {
          ...current.stats,
          pendingReports: Math.max(0, current.stats.pendingReports - (Number(payload.affected) || 0)),
        } : current.stats,
        reports: current.reports.map((report) => changedIds.has(report.id)
          ? { ...report, status: nextStatus }
          : report),
      }))
      setSelectedReportIds([])
      setReason('')
      setNotice({ type: 'success', text: `Obsłużono ${payload.affected} zgłoszeń.` })
      await loadAudit()
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  async function moderateContent(action, ids = selectedIds) {
    if (!ids.length) return setNotice({ type: 'error', text: 'Wybierz co najmniej jeden rekord.' })
    if (reason.trim().length < 3) return setNotice({ type: 'error', text: 'Podaj powód moderacji — minimum 3 znaki.' })
    if (action === 'remove' && !window.confirm(`Oznaczyć ${ids.length} rekordów jako usunięte?`)) return

    setBusy(true)
    setNotice(null)
    try {
      const response = await authenticatedFetch('/api/admin/content', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: contentType, ids, action, reason: reason.trim() }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Akcja moderacyjna nie powiodła się.')
      setNotice({ type: 'success', text: `Zaktualizowano ${payload.affected} rekordów.` })
      setReason('')
      await loadContent()
      await loadAudit()
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  async function changeRole(userId, role) {
    if (reason.trim().length < 3) return setNotice({ type: 'error', text: 'Przed zmianą roli podaj powód — minimum 3 znaki.' })
    setBusy(true)
    try {
      const response = await authenticatedFetch('/api/admin/roles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role, reason: reason.trim() }),
      })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Nie udało się zmienić roli.')
      setRoleUsers((current) => current.map((user) => user.id === userId ? { ...user, role: payload.role } : user))
      setNotice({ type: 'success', text: 'Rola użytkownika została zmieniona i zapisana w dzienniku.' })
      setReason('')
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    } finally {
      setBusy(false)
    }
  }

  if (state.loading) return <div className="page-content space-y-4"><SkeletonBlock className="h-36" /><SkeletonBlock className="h-72" /></div>
  if (state.forbidden) return <AccessDenied />

  const tabs = [
    ['reports', 'Zgłoszenia', FileWarning],
    ['content', 'Treści', Layers3],
    ['health', 'Stan usług', ServerCog],
    ['audit', 'Dziennik', BookOpenCheck],
    ...(dashboard.role === 'admin' ? [['roles', 'Role', UserCog]] : []),
  ]

  return (
    <div className="page-content">
      <div className="subpage-header">
        <h1><ShieldCheck className="h-6 w-6 text-[var(--amber)]" /> Centrum moderacji</h1>
        <p>Jedna kolejka dla całego portalu, role personelu i nieusuwalny dziennik decyzji.</p>
      </div>

      {state.error && <StatusNotice type="error" className="mb-5">{state.error}</StatusNotice>}
      {notice && <StatusNotice type={notice.type} className="mb-5">{notice.text}</StatusNotice>}

      {dashboard.stats && <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><AdminMetric icon={FileWarning} label="Oczekujące zgłoszenia" value={dashboard.stats.pendingReports} tone="rose" /><AdminMetric icon={MessageSquareText} label="Widoczne komentarze" value={dashboard.stats.visibleComments} tone="sky" /><AdminMetric icon={Swords} label="Publiczne buildy" value={dashboard.stats.builds} tone="gold" /><AdminMetric icon={ShieldCheck} label="Twoja rola" value={dashboard.role === 'admin' ? 'Admin' : 'Moderator'} tone="emerald" /></section>}

      <div className="panel mb-5 flex flex-wrap gap-2 p-3" role="tablist" aria-label="Sekcje centrum moderacji">
        {tabs.map(([value, label, Icon]) => <button key={value} type="button" role="tab" aria-selected={activeTab === value} onClick={() => { setActiveTab(value); setNotice(null) }} className={`chip ${activeTab === value ? 'active' : ''}`}><Icon className="h-3.5 w-3.5" /> {label}</button>)}
      </div>

      {activeTab === 'reports' && <ReportsPanel reports={visibleReports} filter={reportFilter} setFilter={(value) => { setReportFilter(value); setSelectedReportIds([]) }} selectedIds={selectedReportIds} reason={reason} busy={busy} onSelect={setSelectedReportIds} onReason={setReason} onModerate={moderateReport} onModerateBatch={moderateReportsBatch} />}
      {activeTab === 'content' && <ContentPanel items={contentItems} type={contentType} status={contentStatus} selectedIds={selectedIds} reason={reason} busy={busy} onType={setContentType} onStatus={setContentStatus} onSelect={setSelectedIds} onReason={setReason} onModerate={moderateContent} onRefresh={loadContent} />}
      {activeTab === 'health' && <HealthPanel health={health} busy={busy} onRefresh={() => loadHealth(false)} onRun={() => loadHealth(true)} />}
      {activeTab === 'audit' && <AuditPanel entries={auditEntries} busy={busy} onRefresh={loadAudit} />}
      {activeTab === 'roles' && dashboard.role === 'admin' && <RolesPanel users={roleUsers} reason={reason} busy={busy} onReason={setReason} onChangeRole={changeRole} onRefresh={loadRoles} />}
    </div>
  )
}

function HealthPanel({ health, busy, onRefresh, onRun }) {
  return (
    <div className="space-y-5">
      <section className="panel overflow-hidden">
        <PanelHeading eyebrow="Monitoring zależności" title="Stan usług">
          <button type="button" onClick={onRefresh} disabled={busy} className="btn btn-ghost btn-sm"><RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} /> Odśwież</button>
          <button type="button" onClick={onRun} disabled={busy} className="btn btn-primary btn-sm"><Activity className="h-3.5 w-3.5" /> Sprawdź teraz</button>
        </PanelHeading>
        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
          {health.checks.length === 0 ? <EmptyState icon={ServerCog} title="Brak pomiarów" description="Uruchom pierwszą kontrolę integracji." className="sm:col-span-2 xl:col-span-4" /> : health.checks.map((check) => {
            const healthy = check.status === 'operational'
            const tone = healthy ? 'border-emerald-400/20 bg-emerald-400/6' : check.status === 'down' ? 'border-rose-400/25 bg-rose-400/7' : 'border-amber-400/20 bg-amber-400/6'
            return <article key={check.service} className={`rounded-2xl border p-4 ${tone}`}><div className="flex items-center justify-between gap-3"><strong className="text-sm text-white">{INTEGRATION_NAMES[check.service] || check.service}</strong><span className={`status-dot ${healthy ? 'online' : ''}`} /></div><p className="mt-3 text-[10px] font-black uppercase tracking-[.12em] text-[var(--text-secondary)]">{INTEGRATION_STATUSES[check.status] || check.status}</p><p className="mt-2 min-h-10 text-xs leading-5 text-[var(--text-secondary)]">{check.message}</p><div className="mt-3 flex items-center justify-between text-[9px] text-[var(--text-muted)]"><span>{check.latency_ms ?? '—'} ms</span><time>{new Date(check.checked_at).toLocaleString('pl-PL')}</time></div></article>
          })}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <PanelHeading eyebrow="Frontend i backend" title="Ostatnie błędy" />
        <div className="space-y-2 p-4">
          {health.events.length === 0 ? <EmptyState icon={CheckCircle2} title="Brak zarejestrowanych awarii" description="Nowe błędy aplikacji i integracji pojawią się tutaj." /> : health.events.map((event) => <article key={event.id} className="grid gap-3 rounded-xl border border-[var(--border)] bg-black/15 p-4 sm:grid-cols-[130px_1fr_auto]"><span className={`badge ${event.level === 'error' ? 'badge-rose' : 'badge-amber'} w-fit`}>{event.source}</span><div><strong className="text-xs text-white">{event.event_type}</strong><p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{event.message}</p></div><time className="flex items-center gap-1 text-[9px] text-[var(--text-muted)]"><Clock3 className="h-3 w-3" /> {new Date(event.created_at).toLocaleString('pl-PL')}</time></article>)}
        </div>
      </section>
    </div>
  )
}

function ReportsPanel({ reports, filter, setFilter, selectedIds, reason, busy, onSelect, onReason, onModerate, onModerateBatch }) {
  const pendingReports = reports.filter((report) => report.status === 'pending')
  const allSelected = pendingReports.length > 0 && pendingReports.every((report) => selectedIds.includes(report.id))

  return (
    <section className="panel overflow-hidden">
      <PanelHeading eyebrow="Zgłoszenia społeczności" title="Kolejka zgłoszeń">
        <FilterButtons values={[['pending', 'Oczekujące'], ['actioned', 'Działanie'], ['reviewed', 'Sprawdzone'], ['dismissed', 'Odrzucone'], ['all', 'Wszystkie']]} value={filter} onChange={setFilter} />
      </PanelHeading>
      {pendingReports.length > 0 && (
        <div className="grid gap-3 border-b border-[var(--border)] p-4 lg:grid-cols-[auto_1fr_auto] lg:items-end">
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onSelect(allSelected ? [] : pendingReports.map((report) => report.id))}>
            {allSelected ? 'Odznacz wszystkie' : 'Zaznacz oczekujące'}
          </button>
          <label className="form-label">Powód decyzji
            <input value={reason} onChange={(event) => onReason(event.target.value)} maxLength={500} placeholder="np. duplikaty lub zgłoszenia sprawdzone zbiorczo" className="mt-1.5 w-full rounded-xl border p-3 text-xs" />
          </label>
          <div className="flex flex-wrap gap-2">
            <button disabled={busy || !selectedIds.length} onClick={() => onModerateBatch('review')} className="btn btn-ghost btn-sm"><CheckCircle2 className="h-3.5 w-3.5" /> Sprawdzone ({selectedIds.length})</button>
            <button disabled={busy || !selectedIds.length} onClick={() => onModerateBatch('dismiss')} className="btn btn-ghost btn-sm"><XCircle className="h-3.5 w-3.5" /> Odrzuć</button>
          </div>
        </div>
      )}
      <div className="space-y-3 p-4 sm:p-5">
        {reports.length === 0 ? <EmptyState icon={CheckCircle2} title="Kolejka jest pusta" description="Brak zgłoszeń w wybranym widoku." /> : reports.map((report) => (
          <article key={report.id} className="rounded-2xl border border-[var(--border)] bg-black/20 p-4">
            <div className="flex flex-col justify-between gap-4 lg:flex-row">
              <div className="flex min-w-0 gap-3">
                {report.status === 'pending' && <input type="checkbox" aria-label={`Zaznacz zgłoszenie dotyczące ${report.buildTitle}`} checked={selectedIds.includes(report.id)} onChange={() => onSelect(selectedIds.includes(report.id) ? selectedIds.filter((id) => id !== report.id) : [...selectedIds, report.id])} className="mt-1" />}
                <div className="min-w-0"><div className="flex flex-wrap gap-2"><span className={`badge ${report.status === 'pending' ? 'badge-rose' : 'badge-amber'}`}>{STATUS_LABELS[report.status]}</span><span className="text-[9px] uppercase text-[var(--text-secondary)]">{REASONS[report.reason]}</span></div><Link href={`/buildy/${report.buildId}`} className="mt-3 block font-black text-white hover:text-[var(--amber)]">{report.buildTitle}</Link>{report.comment && <blockquote className="mt-3 rounded-xl border border-white/8 bg-white/[.025] p-3 text-xs text-[var(--text-secondary)]">{report.comment.content}</blockquote>}{report.details && <p className="mt-2 text-xs text-[var(--text-secondary)]">{report.details}</p>}</div>
              </div>
              {report.status === 'pending' && <div className="flex shrink-0 flex-wrap gap-2"><button disabled={busy} onClick={() => onModerate(report, 'review')} className="btn btn-ghost btn-sm"><CheckCircle2 className="h-3.5 w-3.5" /> Sprawdzone</button><button disabled={busy} onClick={() => onModerate(report, 'dismiss')} className="btn btn-ghost btn-sm"><XCircle className="h-3.5 w-3.5" /> Odrzuć</button>{report.comment && <button disabled={busy} onClick={() => onModerate(report, 'hide_comment')} className="btn btn-ghost btn-sm text-rose-200"><EyeOff className="h-3.5 w-3.5" /> Ukryj</button>}</div>}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function ContentPanel({ items, type, status, selectedIds, reason, busy, onType, onStatus, onSelect, onReason, onModerate, onRefresh }) {
  const allSelected = items.length > 0 && selectedIds.length === items.length
  return <section className="panel overflow-hidden"><PanelHeading eyebrow="Wszystkie moduły" title="Moderacja treści"><button type="button" onClick={onRefresh} className="btn btn-ghost btn-sm"><RefreshCw className="h-3.5 w-3.5" /> Odśwież</button></PanelHeading><div className="grid gap-3 border-b border-[var(--border)] p-4 lg:grid-cols-[220px_180px_1fr] items-end"><div><CustomSelect label="Typ treści" value={type} onChange={(val) => onType(val)} options={CONTENT_TYPES.map(([value, label]) => ({ value, label }))} /></div><div><CustomSelect label="Status" value={status} onChange={(val) => onStatus(val)} options={[{ value: 'visible', label: 'Widoczne' }, { value: 'hidden', label: 'Ukryte' }, { value: 'removed', label: 'Usunięte' }]} /></div><label className="form-label">Powód decyzji<input value={reason} onChange={(event) => onReason(event.target.value)} maxLength={500} placeholder="np. spam, naruszenie regulaminu, odwołanie zaakceptowane" className="mt-1.5 w-full rounded-xl border p-3 text-xs font-mono" /></label></div><div className="flex flex-wrap gap-2 border-b border-[var(--border)] p-4"><button type="button" className="btn btn-ghost btn-sm" onClick={() => onSelect(allSelected ? [] : items.map((item) => item.id))}>{allSelected ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}</button><button disabled={busy || !selectedIds.length} onClick={() => onModerate('hide')} className="btn btn-ghost btn-sm"><EyeOff className="h-3.5 w-3.5" /> Ukryj ({selectedIds.length})</button><button disabled={busy || !selectedIds.length} onClick={() => onModerate('restore')} className="btn btn-ghost btn-sm"><RotateCcw className="h-3.5 w-3.5" /> Przywróć</button><button disabled={busy || !selectedIds.length} onClick={() => onModerate('remove')} className="btn btn-ghost btn-sm text-rose-200"><Trash2 className="h-3.5 w-3.5" /> Usuń</button></div><div className="space-y-2 p-4">{busy && !items.length ? <SkeletonBlock className="h-32" /> : items.length === 0 ? <EmptyState icon={Layers3} title="Brak treści" description="Wybrana kolejka jest pusta." /> : items.map((item) => <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-black/15 p-4"><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => onSelect(selectedIds.includes(item.id) ? selectedIds.filter((id) => id !== item.id) : [...selectedIds, item.id])} className="mt-1" /><span className="min-w-0"><strong className="block truncate text-sm text-white">{item.title}</strong><span className="mt-1 line-clamp-3 block text-xs leading-5 text-[var(--text-secondary)]">{item.summary || 'Brak opisu'}</span><time className="mt-2 block text-[9px] text-[var(--text-muted)]">{new Date(item.createdAt).toLocaleString('pl-PL')}</time></span></label>)}</div></section>
}

function AuditPanel({ entries, busy, onRefresh }) {
  return <section className="panel overflow-hidden"><PanelHeading eyebrow="Odpowiedzialność personelu" title="Dziennik moderacji"><button onClick={onRefresh} className="btn btn-ghost btn-sm"><RefreshCw className="h-3.5 w-3.5" /> Odśwież</button></PanelHeading><div className="space-y-2 p-4">{busy && !entries.length ? <SkeletonBlock className="h-32" /> : entries.length === 0 ? <EmptyState icon={BookOpenCheck} title="Dziennik jest pusty" description="Pierwsze akcje moderacyjne pojawią się tutaj." /> : entries.map((entry) => <article key={entry.id} className="grid gap-2 rounded-xl border border-[var(--border)] bg-black/15 p-4 sm:grid-cols-[150px_1fr_auto]"><span className="badge badge-amber w-fit">{AUDIT_ACTIONS[entry.action] || entry.action}</span><div><p className="text-xs font-bold text-white">{entry.entityType} · {entry.entityId.slice(0, 8)}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{entry.reason}</p><p className="mt-1 text-[9px] text-[var(--text-muted)]">Rola: {entry.actorRole} · {entry.actorId.slice(0, 8)}</p></div><time className="text-[9px] text-[var(--text-muted)]">{new Date(entry.createdAt).toLocaleString('pl-PL')}</time></article>)}</div></section>
}

function RolesPanel({ users, reason, busy, onReason, onChangeRole, onRefresh }) {
  return <section className="panel overflow-hidden"><PanelHeading eyebrow="Tylko administrator" title="Role personelu"><button onClick={onRefresh} className="btn btn-ghost btn-sm"><RefreshCw className="h-3.5 w-3.5" /> Odśwież</button></PanelHeading><div className="border-b border-[var(--border)] p-4"><label className="form-label">Powód zmiany roli<input value={reason} onChange={(event) => onReason(event.target.value)} maxLength={500} placeholder="np. przyznanie uprawnień moderatora po rekrutacji" className="mt-1.5 w-full rounded-xl border p-3 text-xs font-mono" /></label></div><div className="divide-y divide-[var(--border)]">{users.map((user) => <div key={user.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><strong className="text-sm text-white">{user.username}</strong><p className="mt-1 font-mono text-[9px] text-[var(--text-muted)]">{user.id}</p></div><div className="min-w-44"><CustomSelect disabled={busy} value={user.role} onChange={(val) => onChangeRole(user.id, val)} options={[{ value: 'member', label: 'Użytkownik' }, { value: 'moderator', label: 'Moderator' }, { value: 'admin', label: 'Administrator' }]} /></div></div>)}</div></section>
}

function AccessDenied() {
  return <div className="page-content"><div className="panel mx-auto max-w-2xl p-8 text-center sm:p-12"><ShieldCheck className="mx-auto h-12 w-12 text-rose-300" /><h1 className="font-display mt-5 text-3xl font-black text-white">Dostęp dla personelu</h1><p className="mt-3 text-sm text-[var(--text-secondary)]">Konto musi mieć rolę moderatora lub administratora.</p><Link href="/" className="btn btn-primary mt-6 inline-flex px-5 py-3">Wróć do tawerny</Link></div></div>
}

function PanelHeading({ eyebrow, title, children }) {
  return <div className="flex flex-col gap-3 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[var(--amber)]">{eyebrow}</p><h2 className="font-display mt-1 text-2xl font-black text-white">{title}</h2></div><div className="flex flex-wrap gap-2">{children}</div></div>
}

function FilterButtons({ values, value, onChange }) {
  return values.map(([itemValue, label]) => <button key={itemValue} type="button" onClick={() => onChange(itemValue)} className={`chip ${value === itemValue ? 'active' : ''}`}>{label}</button>)
}

function AdminMetric({ icon: Icon, label, value, tone }) {
  const tones = { rose: 'text-rose-300 border-rose-400/20 bg-rose-400/6', sky: 'text-sky-300 border-sky-400/20 bg-sky-400/6', emerald: 'text-emerald-300 border-emerald-400/20 bg-emerald-400/6', gold: 'text-[var(--amber)] border-[var(--amber)]/20 bg-[var(--amber)]/6' }
  return <div className={`rounded-2xl border p-4 ${tones[tone]}`}><div className="flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-[.13em] text-[var(--text-secondary)]">{label}</span><Icon className="h-4 w-4" /></div><strong className="font-display mt-3 block text-3xl font-black text-white">{value}</strong></div>
}
