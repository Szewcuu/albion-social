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

  const fetchPortalOverview = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/portal-overview')
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body?.error || 'Nie udało się pobrać podsumowania.')
      setOverview((current) => ({ ...current, ...body.stats }))
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
          <a href="/aktualnosci" className="panel panel-interactive mt-5 block p-4"><span className="badge badge-amber">Goniec Królewski</span><h3 className="mt-2 text-xl font-bold text-white">Wieści i patch notes</h3><p className="mt-2 text-xs text-[var(--text-secondary)]">Najnowsze komunikaty Albion Online w jednym miejscu.</p></a>
        </div>
      </div>
    </div>
  )
}
