'use client'

import { useCallback, useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowRight, Beer, Check } from 'lucide-react'
import styles from './HomeAtmosphere.module.css'
import { authenticatedFetch } from '@/lib/authenticatedFetch'
import { scheduleIdleTask } from '@/lib/clientIdle'
import { usePortalSession } from '@/contexts/PortalSessionContext'
import { ErrorState, LoadingState } from '@/components/ui/FeedbackState'
import TavernAnnouncements from '@/components/home/TavernAnnouncements'

const ChatBox = dynamic(() => import('@/components/ChatBox'), {
  loading: () => <LoadingState label="Ładowanie czatu Tawerny…" className="panel min-h-[360px]" />,
})
const PortalAnalyticsWidget = dynamic(() => import('@/components/stats/PortalAnalyticsWidget'), {
  loading: () => <LoadingState label="Ładowanie statystyk portalu…" className="panel" />,
})
export default function MemberTavern() {
  const { user, isAdmin } = usePortalSession()
  const [prepared, setPrepared] = useState([])
  const preparations = ['Ekwipunek naprawiony', 'Jedzenie i mikstury spakowane', 'Miejsce zbiórki ustalone']
  const [overview, setOverview] = useState({
    verifiedPlayers: 0,
    totalPvpFame: 0,
    activeBuilds: 0,
    activeMarketOffers: 0,
    guildsCount: 0,
  })
  const [overviewLoading, setOverviewLoading] = useState(true)
  const [overviewUnavailable, setOverviewUnavailable] = useState(false)

  const fetchPortalOverview = useCallback(async () => {
    setOverviewLoading(true)
    try {
      const response = await authenticatedFetch('/api/portal-overview')
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body?.error || 'Nie udało się pobrać podsumowania.')
      setOverview((current) => ({ ...current, ...body.stats }))
      setOverviewUnavailable(false)
    } catch {
      // Statystyki są dodatkiem; główna Tawerna pozostaje dostępna.
      setOverviewUnavailable(true)
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  useEffect(() => scheduleIdleTask(fetchPortalOverview), [fetchPortalOverview])

  return (
    <div className={styles.tavern}>
      <header className={styles.tavernHeader}>
        <div><small>Polska kompania · wszystkie serwery</small><h1>Rozgość się w Tawernie</h1><p>Wymień wieści, znajdź towarzyszy i zaplanuj następny wymarsz.</p></div>
        <span className={styles.tavernSign} aria-hidden="true"><Beer /></span>
      </header>
      <div className={styles.tavernLayout}>
        <div className={styles.conversation}>
          <ChatBox user={user} isAdmin={isAdmin} />
          <TavernAnnouncements isStaff={isAdmin} />
        </div>
        <div className={styles.sidebar}>
          {overviewUnavailable && !overviewLoading ? <ErrorState title="Podsumowanie społeczności jest niedostępne" description="Nie udało się pobrać aktualnych danych Tawerny." onRetry={fetchPortalOverview} className="panel" /> : <PortalAnalyticsWidget stats={overview} loading={overviewLoading} />}
          <Link href="/aktualnosci" className={styles.news}><small>Goniec Królewski</small><h2>Co słychać za murami?</h2><p>Oficjalne wiadomości i patch notes. Sprawdź, co zmieniło się w świecie Albionu przed kolejnym wyjściem w teren.</p><span>Otwórz kronikę wieści <ArrowRight aria-hidden="true" /></span></Link>
          <section className={styles.checklist} aria-label="Przygotowania do wyprawy">
            <div className={styles.checklistHeader}><h2>Przed wymarszem</h2><span aria-live="polite">{prepared.length}/3</span></div>
            <p>Podręczna lista na tę wizytę w Tawernie.</p>
            {preparations.map((label, index) => <button key={label} type="button" aria-pressed={prepared.includes(index)} onClick={() => setPrepared(current => current.includes(index) ? current.filter(item => item !== index) : [...current, index])}><span aria-hidden="true">{prepared.includes(index) && <Check />}</span>{label}</button>)}
          </section>
        </div>
      </div>
    </div>
  )
}
