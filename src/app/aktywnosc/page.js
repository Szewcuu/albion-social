'use client'

import Link from 'next/link'
import { BellRing, BookOpen, Check, CheckCheck, ChevronRight, Compass, Heart, LoaderCircle, MessageSquareText, RefreshCw, ShoppingBag } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { EmptyState, StatusNotice } from '@/components/ui/FeedbackState'
import { ACTIVITY_CATEGORIES, ACTIVITY_CATEGORY_IDS, categoryForNotification } from '@/lib/activityCenter'
import { authenticatedFetch } from '@/lib/authenticatedFetch'

const CATEGORY_META = {
  all: { icon: BellRing, tone: 'text-amber-200 bg-amber-300/8 border-amber-300/20' },
  replies: { icon: MessageSquareText, tone: 'text-sky-200 bg-sky-300/8 border-sky-300/20' },
  likes: { icon: Heart, tone: 'text-rose-200 bg-rose-300/8 border-rose-300/20' },
  expeditions: { icon: Compass, tone: 'text-violet-200 bg-violet-300/8 border-violet-300/20' },
  market: { icon: ShoppingBag, tone: 'text-emerald-200 bg-emerald-300/8 border-emerald-300/20' },
  other: { icon: BookOpen, tone: 'text-amber-200 bg-amber-300/8 border-amber-300/20' },
}

function formatDate(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

async function readJson(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Nie udało się pobrać aktywności.')
  return payload
}

export default function ActivityCenterPage() {
  const [category, setCategory] = useState('all')
  const [notifications, setNotifications] = useState([])
  const [counts, setCounts] = useState({ all: 0, replies: 0, likes: 0, expeditions: 0, market: 0, unread: 0 })
  const [pagination, setPagination] = useState({ hasMore: false, nextCursor: null })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const requestControllerRef = useRef(null)

  const load = useCallback(async ({ append = false, cursor = null } = {}) => {
    requestControllerRef.current?.abort()
    const controller = new AbortController()
    requestControllerRef.current = controller
    append ? setLoadingMore(true) : setLoading(true)
    try {
      const query = new URLSearchParams({ view: 'activity', category, limit: '24' })
      if (cursor) query.set('cursor', cursor)
      const payload = await readJson(await authenticatedFetch(`/api/notifications?${query}`, { cache: 'no-store', signal: controller.signal }))
      if (controller.signal.aborted) return
      setNotifications((current) => append ? [...current, ...(payload.notifications || [])] : (payload.notifications || []))
      setCounts(payload.counts || {})
      setPagination(payload.pagination || { hasMore: false, nextCursor: null })
      setError('')
    } catch (loadError) {
      if (loadError.name === 'AbortError') return
      setError(loadError.message)
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [category])

  useEffect(() => {
    void Promise.resolve().then(() => load())
    return () => requestControllerRef.current?.abort()
  }, [load])

  function announceChange() {
    window.dispatchEvent(new CustomEvent('portal:notifications-changed'))
  }

  async function markOne(notificationId) {
    const item = notifications.find((notification) => notification.id === notificationId)
    if (!item || item.is_read) return
    setNotifications((current) => current.map((notification) => notification.id === notificationId ? { ...notification, is_read: true } : notification))
    setCounts((current) => ({ ...current, unread: Math.max(0, Number(current.unread || 0) - 1) }))
    try {
      await readJson(await authenticatedFetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notificationId }) }))
      announceChange()
    } catch {
      void load()
    }
  }

  async function markAll() {
    setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })))
    setCounts((current) => ({ ...current, unread: 0 }))
    try {
      await readJson(await authenticatedFetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: '{}' }))
      announceChange()
    } catch {
      void load()
    }
  }

  return (
    <div className="page-content space-y-6">
      <header className="panel relative overflow-hidden rounded-[30px] border-amber-300/20 p-6 sm:p-8 lg:p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_8%,rgba(245,158,11,.16),transparent_42%),radial-gradient(circle_at_5%_100%,rgba(139,92,246,.12),transparent_38%)]" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div><p className="text-[9px] font-black uppercase tracking-[.24em] text-amber-300">Gołębnik kompanii</p><h1 className="font-display mt-2 text-3xl font-black text-white sm:text-5xl">Centrum aktywności</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">Odpowiedzi, polubienia, wyprawy i handel tworzą teraz jeden uporządkowany dziennik.</p></div>
          <div className="flex gap-2"><button type="button" onClick={() => load()} disabled={loading} className="btn btn-ghost btn-sm"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Odśwież</button>{counts.unread > 0 && <button type="button" onClick={markAll} className="btn btn-primary btn-sm"><CheckCheck className="h-4 w-4" /> Przeczytaj wszystkie</button>}</div>
        </div>
      </header>

      {error && <StatusNotice type="error">{error}</StatusNotice>}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" role="tablist" aria-label="Kategorie aktywności">
        {ACTIVITY_CATEGORY_IDS.map((id) => {
          const meta = CATEGORY_META[id]
          const Icon = meta.icon
          return <button key={id} type="button" role="tab" aria-selected={category === id} onClick={() => setCategory(id)} className={`panel panel-interactive rounded-[18px] p-4 text-left transition ${category === id ? 'border-amber-300/45 ring-1 ring-amber-300/20' : ''}`}><div className="flex items-center justify-between"><span className={`rounded-xl border p-2 ${meta.tone}`}><Icon className="h-4 w-4" /></span><strong className="font-display text-2xl text-white">{counts[id] || 0}</strong></div><span className="mt-3 block text-[9px] font-black uppercase tracking-[.13em] text-[var(--text-primary)]">{ACTIVITY_CATEGORIES[id].label}</span><span className="mt-1 hidden text-[8px] leading-4 text-[var(--text-muted)] sm:block">{ACTIVITY_CATEGORIES[id].description}</span></button>
        })}
      </section>

      <section className="panel overflow-hidden rounded-[26px]" aria-live="polite">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4"><div><p className="text-[8px] font-black uppercase tracking-[.16em] text-amber-300">{ACTIVITY_CATEGORIES[category].label}</p><h2 className="font-display mt-1 text-xl font-black text-white">Najnowsze sygnały</h2></div><span className="rounded-full border border-white/8 bg-black/20 px-3 py-1.5 font-mono text-[9px] text-[var(--text-secondary)]">{counts.unread || 0} nieprzeczytanych</span></div>
        {loading ? <div className="flex min-h-72 items-center justify-center"><LoaderCircle className="h-7 w-7 animate-spin text-amber-300" /></div> : notifications.length ? <div>{notifications.map((notification, index) => {
          const itemCategory = categoryForNotification(notification)
          const meta = CATEGORY_META[itemCategory] || CATEGORY_META.other
          const Icon = meta.icon
          return <Link key={notification.id} href={notification.link || '/aktywnosc'} onClick={() => markOne(notification.id)} className={`group flex items-start gap-4 p-4 transition hover:bg-white/[.035] sm:px-5 ${index ? 'border-t border-white/8' : ''} ${notification.is_read ? 'opacity-70' : 'bg-amber-300/[.025]'}`}><span className={`mt-0.5 rounded-xl border p-2.5 ${meta.tone}`}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="flex items-center gap-2"><strong className="truncate text-sm text-[var(--text-primary)]">{notification.title || 'Nowa aktywność'}</strong>{!notification.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,.7)]" />}</span><span className="mt-1.5 block text-[10px] leading-5 text-[var(--text-secondary)]">{notification.message || 'Otwórz, aby zobaczyć szczegóły.'}</span><time className="mt-2 flex items-center gap-1.5 font-mono text-[8px] text-[var(--text-faded)]">{notification.is_read && <Check className="h-3 w-3" />}{formatDate(notification.created_at)}</time></span><ChevronRight className="mt-3 h-4 w-4 shrink-0 text-[var(--text-muted)] transition group-hover:translate-x-0.5 group-hover:text-amber-300" /></Link>
        })}</div> : <EmptyState icon={CATEGORY_META[category].icon} title="Brak aktywności w tej sekcji" description={ACTIVITY_CATEGORIES[category].description} compact className="m-5 min-h-56" />}
        {pagination.hasMore && <div className="border-t border-white/8 p-4 text-center"><button type="button" disabled={loadingMore} onClick={() => load({ append: true, cursor: pagination.nextCursor })} className="btn btn-ghost btn-sm">{loadingMore ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4 rotate-90" />} Pokaż starsze</button></div>}
      </section>
    </div>
  )
}
