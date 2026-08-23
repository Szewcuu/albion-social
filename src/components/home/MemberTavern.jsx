'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { Activity } from 'lucide-react'
import { authenticatedFetch } from '@/lib/authenticatedFetch'
import { scheduleIdleTask } from '@/lib/clientIdle'
import { usePortalSession } from '@/contexts/PortalSessionContext'

const ChatBox = dynamic(() => import('@/components/ChatBox'), {
  loading: () => <div className="panel min-h-[430px] animate-pulse" aria-label="Ładowanie czatu tawerny" />,
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

  const displayName = (user?.user_metadata?.full_name || user?.user_metadata?.name || 'Wojowniku').replace(/#0$/, '')

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 pt-6 space-y-6 animate-fade-in">
      <div className="panel p-3.5 sm:p-4 border-amber-400/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-black text-white">Witaj w tawernie, <span className="text-amber-400">{displayName}</span></h1>
            <p className="text-[11px] text-gray-400">Główny punkt wypadowy polskiej społeczności Albion Online.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8">
          <ChatBox user={user} isAdmin={isAdmin} />
        </div>
        <div className="lg:col-span-4">
          <PortalAnalyticsWidget stats={overview} loading={overviewLoading} />
        </div>
      </div>
    </div>
  )
}
