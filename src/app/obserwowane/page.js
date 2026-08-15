'use client'

import Link from 'next/link'
import { BellRing, BookOpen, LoaderCircle, Shield, ShoppingBag, UserRound } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import FollowButton, { FOLLOWS_CHANGED_EVENT } from '@/components/ui/FollowButton'
import { EmptyState, StatusNotice } from '@/components/ui/FeedbackState'
import { authenticatedFetch } from '@/lib/authenticatedFetch'

const META = {
  build: { label: 'Build', icon: BookOpen, tone: 'text-orange-200', href: (id) => `/buildy/${id}` },
  guild: { label: 'Gildia', icon: Shield, tone: 'text-amber-200', href: (id) => `/gildie/${id}` },
  market: { label: 'Oferta', icon: ShoppingBag, tone: 'text-sky-200', href: (id) => `/rynek?offer=${id}` },
  player: { label: 'Gracz', icon: UserRound, tone: 'text-emerald-200', href: (id) => `/profil/${id}` },
}

async function readJson(response) {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || 'Nie udało się pobrać obserwowanych.')
  return payload
}

export default function FollowedEntitiesPage() {
  const [follows, setFollows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const payload = await readJson(await authenticatedFetch('/api/follows'))
      setFollows(payload.follows || [])
      setError('')
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(load)
    const refresh = () => void load()
    window.addEventListener(FOLLOWS_CHANGED_EVENT, refresh)
    return () => window.removeEventListener(FOLLOWS_CHANGED_EVENT, refresh)
  }, [load])

  return <div className="page-content space-y-6">
    <header className="panel relative overflow-hidden rounded-[30px] border-amber-300/20 p-6 sm:p-8 lg:p-10"><div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_8%,rgba(245,158,11,.16),transparent_42%),radial-gradient(circle_at_5%_100%,rgba(14,165,233,.11),transparent_38%)]" /><div className="relative"><p className="text-[9px] font-black uppercase tracking-[.24em] text-amber-300">Wartownia</p><h1 className="font-display mt-2 text-3xl font-black text-white sm:text-5xl">Obserwowane</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-secondary)]">Buildy, gildie, oferty i gracze, których zmiany trafiają bezpośrednio do Twojego centrum powiadomień.</p></div></header>
    {error && <StatusNotice type="error">{error}</StatusNotice>}
    {loading ? <div className="panel flex min-h-56 items-center justify-center rounded-[24px]"><LoaderCircle className="h-7 w-7 animate-spin text-amber-300" /></div> : follows.length === 0 ? <EmptyState icon={BellRing} title="Wartownia jest pusta" description="Użyj przycisku Obserwuj przy buildzie, gildii, ofercie lub profilu gracza." /> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{follows.map((follow) => { const meta = META[follow.entity_type] || META.player; const Icon = meta.icon; return <article key={`${follow.entity_type}-${follow.entity_id}`} className="panel panel-interactive flex items-center gap-4 rounded-[22px] p-4"><Link href={meta.href(follow.entity_id)} className="flex min-w-0 flex-1 items-center gap-4"><span className={`rounded-xl border border-white/8 bg-black/20 p-3 ${meta.tone}`}><Icon className="h-5 w-5" /></span><span className="min-w-0"><span className="block text-[8px] font-black uppercase tracking-[.15em] text-[var(--text-secondary)]">{meta.label}</span><strong className="mt-1 block truncate text-sm text-white">{follow.label || 'Obserwowany element'}</strong></span></Link><FollowButton id={follow.entity_id} name={follow.label || meta.label} type={follow.entity_type} compact /></article> })}</div>}
  </div>
}
