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
  Save,
  Search,
  ServerCog,
  ShieldCheck,
  Swords,
  Trash2,
  UserCog,
  XCircle,
} from 'lucide-react'

import { EmptyState, SkeletonBlock, StatusNotice } from '@/components/ui/FeedbackState'
import { useConfirmDialog } from '@/components/ui/ConfirmDialog'
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

const EVENT_TYPE_LABELS = {
  integration_status_changed: 'Zmiana stanu integracji',
  frontend_error: 'Błąd interfejsu',
  backend_error: 'Błąd serwera',
}

const ENTITY_TYPE_LABELS = {
  build_report: 'Zgłoszenie builda',
  profile_role: 'Rola użytkownika',
  chat_message: 'Wiadomość czatu',
  build: 'Build',
  market_item: 'Oferta rynkowa',
  guild: 'Gildia',
  expedition: 'Wyprawa',
  build_comment: 'Komentarz builda',
}

const ROLE_LABELS = {
  member: 'Użytkownik',
  moderator: 'Moderator',
  admin: 'Administrator',
}

export default function AdminPage() {
  const { requestConfirmation, confirmationDialog } = useConfirmDialog()
  const [dashboard, setDashboard] = useState({ stats: null, reports: [], role: 'member' })
  const [state, setState] = useState({ loading: true, error: '', forbidden: false })
  const [activeTab, setActiveTab] = useState('reports')
  const [reportFilter, setReportFilter] = useState('pending')
  const [contentType, setContentType] = useState('chat_message')
  const [contentStatus, setContentStatus] = useState('visible')
  const [contentItems, setContentItems] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [selectedReportIds, setSelectedReportIds] = useState([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsPagination, setReportsPagination] = useState({ hasMore: false, nextCursor: null })
  const [auditEntries, setAuditEntries] = useState([])
  const [roleUsers, setRoleUsers] = useState([])
  const [health, setHealth] = useState({ checks: [], events: [], generatedAt: null })
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

  const loadReports = useCallback(async ({ append = false, cursor = null } = {}) => {
    setReportsLoading(true)
    try {
      const cursorQuery = append && cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''
      const response = await authenticatedFetch(`/api/admin/reports?status=${reportFilter}${cursorQuery}`, { cache: 'no-store' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(payload.error || 'Nie udało się pobrać zgłoszeń.')
      setDashboard((current) => ({
        ...current,
        reports: append
          ? [...current.reports, ...(payload.reports || []).filter((report) => !current.reports.some((item) => item.id === report.id))]
          : payload.reports || [],
      }))
      setReportsPagination(payload.pagination || { hasMore: false, nextCursor: null })
      setNotice(null)
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
    } finally {
      setReportsLoading(false)
    }
  }, [reportFilter])

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
      setHealth({ checks: payload.checks || [], events: payload.events || [], generatedAt: payload.generatedAt || new Date().toISOString() })
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
      if (activeTab === 'reports') loadReports()
      if (activeTab === 'content') loadContent()
      if (activeTab === 'audit') loadAudit()
      if (activeTab === 'health') loadHealth()
      if (activeTab === 'roles' && dashboard.role === 'admin') loadRoles()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [activeTab, dashboard.role, loadAudit, loadContent, loadHealth, loadReports, loadRoles, state.forbidden, state.loading])

  const visibleReports = useMemo(() => (
    reportFilter === 'all' ? dashboard.reports : dashboard.reports.filter((report) => report.status === reportFilter)
  ), [dashboard.reports, reportFilter])

  async function moderateReport(report, action) {
    if (action === 'hide_comment') {
      const accepted = await requestConfirmation({
        title: 'Ukryć komentarz?',
        description: 'Komentarz zostanie ukryty, a powiązane zgłoszenie oznaczone jako obsłużone.',
        confirmLabel: 'Ukryj komentarz',
      })
      if (!accepted) return
    }
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
    if (action === 'remove') {
      const accepted = await requestConfirmation({
        title: `Usunąć ${ids.length} ${ids.length === 1 ? 'rekord' : 'rekordów'}?`,
        description: 'Wybrane treści otrzymają status usuniętych. Decyzja zostanie zapisana w dzienniku moderacji.',
        confirmLabel: 'Usuń treści',
      })
      if (!accepted) return
    }

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
    if (reason.trim().length < 3) {
      setNotice({ type: 'error', text: 'Przed zmianą roli podaj powód — minimum 3 znaki.' })
      return false
    }
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
      return true
    } catch (error) {
      setNotice({ type: 'error', text: error.message })
      return false
    } finally {
      setBusy(false)
    }
  }

  if (state.loading) return (
    <div className="page-content">
      <div className="subpage-header">
        <h1><ShieldCheck className="h-6 w-6 text-[var(--amber)]" /> Centrum moderacji</h1>
        <p>Jedna kolejka dla całego portalu, role personelu i nieusuwalny dziennik decyzji.</p>
      </div>
      <div className="space-y-4" role="status" aria-label="Ładowanie centrum moderacji">
        <SkeletonBlock className="h-28" />
        <SkeletonBlock className="h-72" />
      </div>
    </div>
  )
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
      {confirmationDialog}
      <div className="subpage-header">
        <h1><ShieldCheck className="h-6 w-6 text-[var(--amber)]" /> Centrum moderacji</h1>
        <p>Jedna kolejka dla całego portalu, role personelu i nieusuwalny dziennik decyzji.</p>
      </div>

      {state.error && <StatusNotice type="error" className="mb-5">{state.error}</StatusNotice>}
      {notice && <StatusNotice type={notice.type} className="mb-5">{notice.text}</StatusNotice>}

      {dashboard.stats && <section className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><AdminMetric icon={FileWarning} label="Oczekujące zgłoszenia" value={dashboard.stats.pendingReports} tone="rose" /><AdminMetric icon={MessageSquareText} label="Widoczne komentarze" value={dashboard.stats.visibleComments} tone="sky" /><AdminMetric icon={Swords} label="Publiczne buildy" value={dashboard.stats.builds} tone="gold" /><AdminMetric icon={ShieldCheck} label="Twoja rola" value={dashboard.role === 'admin' ? 'Admin' : 'Moderator'} tone="emerald" /></section>}

      <div className="panel mb-5 flex flex-wrap gap-2 p-3" role="tablist" aria-label="Sekcje centrum moderacji">
        {tabs.map(([value, label, Icon]) => <button key={value} id={`admin-tab-${value}`} type="button" role="tab" aria-selected={activeTab === value} aria-controls={`admin-panel-${value}`} onClick={() => { setActiveTab(value); setNotice(null) }} className={`chip ${activeTab === value ? 'active' : ''}`}><Icon className="h-3.5 w-3.5" /> {label}</button>)}
      </div>

      <div id={`admin-panel-${activeTab}`} role="tabpanel" aria-labelledby={`admin-tab-${activeTab}`}>
        {activeTab === 'reports' && <ReportsPanel reports={visibleReports} filter={reportFilter} setFilter={(value) => { setReportFilter(value); setSelectedReportIds([]) }} selectedIds={selectedReportIds} reason={reason} busy={busy} loading={reportsLoading} hasMore={reportsPagination.hasMore} onLoadMore={() => loadReports({ append: true, cursor: reportsPagination.nextCursor })} onSelect={setSelectedReportIds} onReason={setReason} onModerate={moderateReport} onModerateBatch={moderateReportsBatch} />}
        {activeTab === 'content' && <ContentPanel items={contentItems} type={contentType} status={contentStatus} selectedIds={selectedIds} reason={reason} busy={busy} onType={setContentType} onStatus={setContentStatus} onSelect={setSelectedIds} onReason={setReason} onModerate={moderateContent} onRefresh={loadContent} />}
        {activeTab === 'health' && <HealthPanel health={health} busy={busy} onRefresh={() => loadHealth(false)} onRun={() => loadHealth(true)} />}
        {activeTab === 'audit' && <AuditPanel entries={auditEntries} busy={busy} onRefresh={loadAudit} />}
        {activeTab === 'roles' && dashboard.role === 'admin' && <RolesPanel users={roleUsers} reason={reason} busy={busy} onReason={setReason} onChangeRole={changeRole} onRefresh={loadRoles} />}
      </div>
    </div>
  )
}

function HealthPanel({ health, busy, onRefresh, onRun }) {
  const historicalAfterMs = 24 * 60 * 60 * 1000
  const generatedAtMs = health.generatedAt ? new Date(health.generatedAt).getTime() : 0

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
            const regions = Array.isArray(check.metadata?.regions) ? check.metadata.regions : []
            return <article key={check.service} className={`rounded-2xl border p-4 ${tone}`}><div className="flex items-center justify-between gap-3"><strong className="text-sm text-white">{INTEGRATION_NAMES[check.service] || check.service}</strong><span className={`status-dot ${healthy ? 'online' : ''}`} /></div><p className="mt-3 text-[10px] font-black uppercase tracking-[.12em] text-[var(--text-secondary)]">{INTEGRATION_STATUSES[check.status] || check.status}</p><p className="mt-2 min-h-10 text-xs leading-5 text-[var(--text-secondary)]">{check.message}</p>{regions.length > 0 && <div className="mt-3 space-y-1 border-t border-white/8 pt-3">{regions.map((region) => <div key={region.region} className="flex items-center justify-between gap-2 text-[9px]"><span className={region.status === 'operational' ? 'text-emerald-300' : region.status === 'degraded' ? 'text-amber-300' : 'text-rose-300'}>{region.region}</span><span className="text-[var(--text-muted)]">{region.latencyMs ?? '—'} ms{region.httpStatus ? ` · HTTP ${region.httpStatus}` : ''}</span></div>)}</div>}<div className="mt-3 flex items-center justify-between text-[9px] text-[var(--text-muted)]"><span>Łącznie {check.latency_ms ?? '—'} ms</span><time>{new Date(check.checked_at).toLocaleString('pl-PL')}</time></div></article>
          })}
        </div>
      </section>

      <section className="panel overflow-hidden">
        <PanelHeading eyebrow="Frontend i backend" title="Ostatnie błędy" />
        <div className="space-y-2 p-4">
          {health.events.length > 0 && <p className="pb-1 text-[10px] leading-4 text-[var(--text-muted)]">To dziennik zdarzeń, nie lista aktywnych awarii. Wpis bez nawrotu przez ponad 24 godziny oznaczamy jako historyczny.</p>}
          {health.events.length === 0 ? <EmptyState icon={CheckCircle2} title="Brak zarejestrowanych awarii" description="Nowe błędy aplikacji i integracji pojawią się tutaj." /> : health.events.map((event) => {
            const historical = generatedAtMs - new Date(event.created_at).getTime() > historicalAfterMs
            return <article key={event.id} className={`grid gap-3 rounded-xl border p-4 sm:grid-cols-[150px_1fr_auto] ${historical ? 'border-[var(--border)] bg-black/10 opacity-70' : 'border-rose-400/20 bg-rose-400/[.035]'}`}><div className="flex flex-wrap gap-1"><span className={`badge ${event.level === 'error' ? 'badge-rose' : 'badge-amber'} w-fit`}>{INTEGRATION_NAMES[event.source] || event.source}</span>{event.occurrence_count > 1 && <span className="badge w-fit">×{event.occurrence_count}</span>}{historical && <span className="badge w-fit">Historyczny</span>}</div><div><strong className="text-xs text-white">{EVENT_TYPE_LABELS[event.event_type] || event.event_type}</strong><p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{event.message}</p>{historical && <p className="mt-1 text-[9px] text-emerald-300/70">Brak zarejestrowanego nawrotu w ciągu ostatnich 24 godzin.</p>}</div><time className="flex items-center gap-1 text-[9px] text-[var(--text-muted)]"><Clock3 className="h-3 w-3" /> {new Date(event.created_at).toLocaleString('pl-PL')}</time></article>
          })}
        </div>
      </section>
    </div>
  )
}

function ReportsPanel({ reports, filter, setFilter, selectedIds, reason, busy, loading, hasMore, onLoadMore, onSelect, onReason, onModerate, onModerateBatch }) {
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
        {loading && reports.length === 0 ? <SkeletonBlock className="h-32" /> : reports.length === 0 ? <EmptyState icon={CheckCircle2} title="Kolejka jest pusta" description="Brak zgłoszeń w wybranym widoku." /> : reports.map((report) => (
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
        {hasMore && <div className="flex justify-center pt-2"><button type="button" className="btn btn-ghost btn-sm" disabled={loading} onClick={onLoadMore}>{loading ? 'Wczytywanie…' : 'Wczytaj kolejne zgłoszenia'}</button></div>}
      </div>
    </section>
  )
}

function ContentPanel({ items, type, status, selectedIds, reason, busy, onType, onStatus, onSelect, onReason, onModerate, onRefresh }) {
  const allSelected = items.length > 0 && selectedIds.length === items.length
  return <section className="panel overflow-hidden"><PanelHeading eyebrow="Wszystkie moduły" title="Moderacja treści"><button type="button" disabled={busy} onClick={onRefresh} className="btn btn-ghost btn-sm"><RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} /> Odśwież</button></PanelHeading><div className="grid gap-3 border-b border-[var(--border)] p-4 lg:grid-cols-[220px_180px_1fr] items-end"><div><CustomSelect label="Typ treści" value={type} onChange={(val) => onType(val)} options={CONTENT_TYPES.map(([value, label]) => ({ value, label }))} /></div><div><CustomSelect label="Status" value={status} onChange={(val) => onStatus(val)} options={[{ value: 'visible', label: 'Widoczne' }, { value: 'hidden', label: 'Ukryte' }, { value: 'removed', label: 'Usunięte' }]} /></div><label className="form-label">Powód decyzji<input value={reason} onChange={(event) => onReason(event.target.value)} maxLength={500} placeholder="np. spam, naruszenie regulaminu, odwołanie zaakceptowane" className="mt-1.5 w-full rounded-xl border p-3 text-xs font-mono" /></label></div><div className="flex flex-wrap gap-2 border-b border-[var(--border)] p-4"><button type="button" disabled={busy || !items.length} className="btn btn-ghost btn-sm" onClick={() => onSelect(allSelected ? [] : items.map((item) => item.id))}>{allSelected ? 'Odznacz wszystkie' : 'Zaznacz wszystkie'}</button><button disabled={busy || !selectedIds.length} onClick={() => onModerate('hide')} className="btn btn-ghost btn-sm"><EyeOff className="h-3.5 w-3.5" /> Ukryj ({selectedIds.length})</button><button disabled={busy || !selectedIds.length} onClick={() => onModerate('restore')} className="btn btn-ghost btn-sm"><RotateCcw className="h-3.5 w-3.5" /> Przywróć</button><button disabled={busy || !selectedIds.length} onClick={() => onModerate('remove')} className="btn btn-ghost btn-sm text-rose-200"><Trash2 className="h-3.5 w-3.5" /> Usuń</button></div><div className="space-y-2 p-4">{busy && !items.length ? <SkeletonBlock className="h-32" /> : items.length === 0 ? <EmptyState icon={Layers3} title="Brak treści" description="Wybrana kolejka jest pusta." /> : items.map((item) => <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border)] bg-black/15 p-4"><input type="checkbox" aria-label={`Zaznacz ${item.title}`} checked={selectedIds.includes(item.id)} onChange={() => onSelect(selectedIds.includes(item.id) ? selectedIds.filter((id) => id !== item.id) : [...selectedIds, item.id])} className="mt-1" /><span className="min-w-0"><strong className="block truncate text-sm text-white">{item.title}</strong><span className="mt-1 line-clamp-3 block text-xs leading-5 text-[var(--text-secondary)]">{item.summary || 'Brak opisu'}</span><time className="mt-2 block text-[9px] text-[var(--text-muted)]">{new Date(item.createdAt).toLocaleString('pl-PL')}</time></span></label>)}</div></section>
}

function AuditPanel({ entries, busy, onRefresh }) {
  return <section className="panel overflow-hidden"><PanelHeading eyebrow="Odpowiedzialność personelu" title="Dziennik moderacji"><button disabled={busy} onClick={onRefresh} className="btn btn-ghost btn-sm"><RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} /> Odśwież</button></PanelHeading><div className="space-y-2 p-4">{busy && !entries.length ? <SkeletonBlock className="h-32" /> : entries.length === 0 ? <EmptyState icon={BookOpenCheck} title="Dziennik jest pusty" description="Pierwsze akcje moderacyjne pojawią się tutaj." /> : entries.map((entry) => <article key={entry.id} className="grid gap-2 rounded-xl border border-[var(--border)] bg-black/15 p-4 sm:grid-cols-[150px_1fr_auto]"><span className="badge badge-amber w-fit">{AUDIT_ACTIONS[entry.action] || entry.action}</span><div><p className="text-xs font-bold text-white">{ENTITY_TYPE_LABELS[entry.entityType] || entry.entityType} · {entry.entityId.slice(0, 8)}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{entry.reason}</p><p className="mt-1 text-[9px] text-[var(--text-muted)]">{entry.actorName} · {ROLE_LABELS[entry.actorRole] || entry.actorRole}</p></div><time className="text-[9px] text-[var(--text-muted)]">{new Date(entry.createdAt).toLocaleString('pl-PL')}</time></article>)}</div></section>
}

function RolesPanel({ users, reason, busy, onReason, onChangeRole, onRefresh }) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLocaleLowerCase('pl-PL')
  const visibleUsers = users.filter((user) => !normalizedQuery || user.username.toLocaleLowerCase('pl-PL').includes(normalizedQuery))
  const staffCount = users.filter((user) => user.role === 'moderator' || user.role === 'admin').length

  return <section className="panel overflow-hidden"><PanelHeading eyebrow="Tylko administrator" title="Role personelu"><span className="badge badge-amber">{staffCount} w personelu</span><button disabled={busy} onClick={onRefresh} className="btn btn-ghost btn-sm"><RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} /> Odśwież</button></PanelHeading><div className="grid gap-3 border-b border-[var(--border)] p-4 lg:grid-cols-[minmax(220px,.7fr)_1fr]"><label className="form-label">Znajdź użytkownika<span className="relative mt-1.5 block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nick użytkownika" className="w-full rounded-xl border py-3 pl-10 pr-3 text-xs" /></span></label><label className="form-label">Powód zmiany roli<input value={reason} onChange={(event) => onReason(event.target.value)} maxLength={500} placeholder="np. przyznanie uprawnień moderatora po rekrutacji" className="mt-1.5 w-full rounded-xl border p-3 text-xs" /></label></div><div className="divide-y divide-[var(--border)]">{visibleUsers.length === 0 ? <EmptyState icon={UserCog} title="Nie znaleziono użytkownika" description="Zmień wpisany nick i spróbuj ponownie." className="m-4" /> : visibleUsers.map((user) => <RoleRow key={`${user.id}:${user.role}`} user={user} busy={busy} onChangeRole={onChangeRole} />)}</div></section>
}

function RoleRow({ user, busy, onChangeRole }) {
  const [selectedRole, setSelectedRole] = useState(user.role)

  return <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--amber)]/8 font-display font-black text-[var(--amber)]">{user.username.slice(0, 1).toUpperCase()}</span><div className="min-w-0"><strong className="block truncate text-sm text-white">{user.username}</strong><p className="mt-1 text-[10px] text-[var(--text-muted)]">{ROLE_LABELS[user.role] || user.role}{user.isCurrentUser ? ' · To Twoje konto' : ''}</p></div></div><div className="flex flex-col gap-2 sm:flex-row sm:items-end"><div className="min-w-44"><CustomSelect label={`Rola ${user.username}`} disabled={busy} value={selectedRole} onChange={setSelectedRole} options={[{ value: 'member', label: 'Użytkownik' }, { value: 'moderator', label: 'Moderator' }, { value: 'admin', label: 'Administrator' }]} /></div><button type="button" disabled={busy || selectedRole === user.role} onClick={() => onChangeRole(user.id, selectedRole)} className="btn btn-primary btn-sm sm:mb-px"><Save className="h-3.5 w-3.5" /> Zapisz</button></div></div>
}

function AccessDenied() {
  return <div className="page-content"><div className="panel mx-auto max-w-2xl p-8 text-center sm:p-12"><ShieldCheck className="mx-auto h-12 w-12 text-rose-300" /><h1 className="font-display mt-5 text-3xl font-black text-white">Dostęp dla personelu</h1><p className="mt-3 text-sm text-[var(--text-secondary)]">Konto musi mieć rolę moderatora lub administratora.</p><Link href="/" className="btn btn-primary mt-6 inline-flex px-5 py-3">Wróć do tawerny</Link></div></div>
}

function PanelHeading({ eyebrow, title, children }) {
  return <div className="flex flex-col gap-3 border-b border-[var(--border)] p-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-[var(--amber)]">{eyebrow}</p><h2 className="font-display mt-1 text-2xl font-black text-white">{title}</h2></div><div className="flex flex-wrap gap-2">{children}</div></div>
}

function FilterButtons({ values, value, onChange }) {
  return values.map(([itemValue, label]) => <button key={itemValue} type="button" aria-pressed={value === itemValue} onClick={() => onChange(itemValue)} className={`chip ${value === itemValue ? 'active' : ''}`}>{label}</button>)
}

function AdminMetric({ icon: Icon, label, value, tone }) {
  const tones = { rose: 'text-rose-300 border-rose-400/20 bg-rose-400/6', sky: 'text-sky-300 border-sky-400/20 bg-sky-400/6', emerald: 'text-emerald-300 border-emerald-400/20 bg-emerald-400/6', gold: 'text-[var(--amber)] border-[var(--amber)]/20 bg-[var(--amber)]/6' }
  return <div className={`rounded-2xl border p-4 ${tones[tone]}`}><div className="flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-[.13em] text-[var(--text-secondary)]">{label}</span><Icon className="h-4 w-4" /></div><strong className="font-display mt-3 block text-3xl font-black text-white">{value}</strong></div>
}
