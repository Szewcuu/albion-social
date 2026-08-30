'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { authenticatedFetch } from '@/lib/authenticatedFetch'
import { scheduleIdleTask } from '@/lib/clientIdle'
import { usePortalSession } from '@/contexts/PortalSessionContext'

const ChatBox = dynamic(() => import('@/components/ChatBox'), {
  loading: () => <div className="panel min-h-[640px] animate-pulse" aria-label="Ładowanie czatu tawerny" />,
})
const PortalAnalyticsWidget = dynamic(() => import('@/components/stats/PortalAnalyticsWidget'), {
  loading: () => <div className="panel min-h-[240px] animate-pulse" aria-label="Ładowanie statystyk portalu" />,
})
const DIRECTION_OPTIONS = [
  ['community', 'Społeczność'],
  ['market', 'Rynek'],
  ['guild_tools', 'Narzędzia gildii'],
]

export default function MemberTavern() {
  const { user, isAdmin } = usePortalSession()
  const [overview, setOverview] = useState({
    verifiedPlayers: 0,
    totalPvpFame: 0,
    activeBuilds: 0,
    activeMarketOffers: 0,
    guildsCount: 0,
  })
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [productDirection, setProductDirection] = useState(null)

  const fetchPortalOverview = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/portal-overview')
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body?.error || 'Nie udało się pobrać podsumowania.')
      setOverview((current) => ({ ...current, ...body.stats }))
      setProductDirection(body.productDirection || null)
    } catch {
      // Statystyki są dodatkiem; główna Tawerna pozostaje dostępna.
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  useEffect(() => scheduleIdleTask(fetchPortalOverview), [fetchPortalOverview])

  return (
    <div className="w-full max-w-[1320px] mx-auto px-4 sm:px-6 pt-5 sm:pt-7 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 xl:col-span-8">
          <ChatBox user={user} isAdmin={isAdmin} />
        </div>
        <div className="lg:col-span-5 xl:col-span-4">
          <PortalAnalyticsWidget stats={overview} loading={overviewLoading} />
          <ProductDirectionPulse data={productDirection} onChange={setProductDirection} />
        </div>
      </div>
    </div>
  )
}

function ProductDirectionPulse({ data, onChange }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const selectDirection = async (direction) => {
    if (busy || direction === data?.selection) return
    setBusy(true)
    setError('')
    try {
      const response = await authenticatedFetch('/api/product-direction', {
        method: 'POST',
        body: JSON.stringify({ direction }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Nie udało się zapisać wyboru.')
      onChange(body)
    } catch (reason) {
      setError(reason.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className="panel mt-5 p-4">
      <div className="mb-3">
        <span className="badge badge-amber">Głos kompanii</span>
        <h3 className="mt-2 text-xl font-bold text-white">Co rozwijamy dalej?</h3>
        <p className="mt-2 text-xs">Wybierz obszar, do którego wracałbyś najczęściej.</p>
      </div>
      <div className="grid gap-2" aria-busy={busy}>
        {DIRECTION_OPTIONS.map(([key, label]) => {
          const selected = key === data?.selection
          return <button key={key} type="button" aria-pressed={selected} disabled={busy} onClick={() => selectDirection(key)} className={`chip w-full justify-between ${selected ? 'active' : ''}`}><strong>{label}</strong><span>{selected ? 'Twój wybór' : 'Wybierz'}</span></button>
        })}
        {error && <p className="text-xs text-rose-200" role="alert">{error}</p>}
        {!error && data?.summary && <p className="text-[9px] text-[var(--text-muted)]">Próba: {data.summary.totalVotes}/{data.summary.minimumResponses}.</p>}
      </div>
    </aside>
  )
}
