'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Activity, Coins, Flame, ShoppingBag, Swords, Users } from 'lucide-react'
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
      <div className="panel p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-amber-400/20">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base font-black text-white">Witaj w tawernie, <span className="text-amber-400">{displayName}</span></h1>
            <p className="text-[11px] text-gray-400">Główny punkt wypadowy polskiej społeczności Albion Online.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="bg-black/30 px-3 py-1.5 rounded-xl border border-white/8"><span className="text-gray-400">Gildie:</span> <strong className="text-amber-300">{overviewLoading ? '…' : overview.guildsCount}</strong></div>
          <div className="bg-black/30 px-3 py-1.5 rounded-xl border border-white/8"><span className="text-gray-400">Oferty:</span> <strong className="text-emerald-300">{overviewLoading ? '…' : overview.activeMarketOffers}</strong></div>
          <div className="bg-black/30 px-3 py-1.5 rounded-xl border border-white/8 flex items-center gap-1.5"><span className="status-dot online" /><span className="text-gray-300">Wszystkie Serwery</span></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7">
          <ChatBox user={user} isAdmin={isAdmin} />
        </div>
        <div className="lg:col-span-5 space-y-4">
          <PortalAnalyticsWidget stats={overview} loading={overviewLoading} />

          <div className="panel p-4 space-y-2.5">
            <h3 className="font-display text-xs font-bold text-white flex items-center gap-2 border-b border-white/8 pb-2">
              <Flame className="w-3.5 h-3.5 text-amber-400" /> Szybkie Akcje Gracza
            </h3>
            <div className="grid grid-cols-2 gap-2 font-mono text-xs">
              <Link href="/buildy/create" prefetch={false} className="p-2.5 rounded-xl bg-white/5 hover:bg-amber-500/10 border border-white/8 hover:border-amber-400/40 text-gray-200 hover:text-amber-300 transition flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px]"><Swords className="w-3.5 h-3.5 text-amber-400" /> Stwórz Build</span>
              </Link>
              <Link href="/rynek" prefetch={false} className="p-2.5 rounded-xl bg-white/5 hover:bg-sky-500/10 border border-white/8 hover:border-sky-400/40 text-gray-200 hover:text-sky-300 transition flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px]"><ShoppingBag className="w-3.5 h-3.5 text-sky-400" /> Wystaw Ofertę</span>
              </Link>
              <Link href="/wyprawy" prefetch={false} className="p-2.5 rounded-xl bg-white/5 hover:bg-purple-500/10 border border-white/8 hover:border-purple-400/40 text-gray-200 hover:text-purple-300 transition flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px]"><Users className="w-3.5 h-3.5 text-purple-400" /> Wyprawa</span>
              </Link>
              <Link href="/loot-split" prefetch={false} className="p-2.5 rounded-xl bg-white/5 hover:bg-emerald-500/10 border border-white/8 hover:border-emerald-400/40 text-gray-200 hover:text-emerald-300 transition flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[11px]"><Coins className="w-3.5 h-3.5 text-emerald-400" /> Loot Split</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
