'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { BarChart3, Coins, Gauge, Sparkles } from 'lucide-react'

const MarketIntelligence = dynamic(() => import('./MarketIntelligence'), {
  loading: () => <ToolSkeleton label="Ładowanie wywiadu rynkowego" />,
})
const GoldExchangeWidget = dynamic(() => import('@/components/economy/GoldExchangeWidget'), {
  loading: () => <ToolSkeleton label="Ładowanie kursu złota" />,
})

function ToolSkeleton({ label }) {
  return <div className="panel min-h-72 animate-pulse" role="status" aria-label={label} />
}

export default function DeferredMarketTools() {
  const containerRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [activeTool, setActiveTool] = useState('intelligence')
  const [loadedTools, setLoadedTools] = useState(() => new Set())

  useEffect(() => {
    const node = containerRef.current
    if (!node) return undefined

    if (!('IntersectionObserver' in window)) {
      const timer = window.setTimeout(() => {
        setReady(true)
        setLoadedTools(new Set(['intelligence']))
      }, 0)
      return () => window.clearTimeout(timer)
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setReady(true)
      setLoadedTools(new Set(['intelligence']))
      observer.disconnect()
    }, { rootMargin: '500px 0px' })

    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const activateTool = (tool) => {
    setActiveTool(tool)
    if (!ready) return
    setLoadedTools((current) => current.has(tool) ? current : new Set([...current, tool]))
  }

  return (
    <section ref={containerRef} className="space-y-4" aria-labelledby="market-tools-title">
      <div className="panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[.22em] text-amber-300">Narzędzia kupca</p>
          <h2 id="market-tools-title" className="font-display mt-1 text-xl font-black text-white">Analityka rynku</h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">Uruchamiamy tylko wybrane narzędzie, aby nie obciążać łącza niepotrzebnymi skanami.</p>
        </div>
        <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Narzędzia rynku">
          <button
            type="button"
            role="tab"
            aria-selected={activeTool === 'intelligence'}
            onClick={() => activateTool('intelligence')}
            className={`btn btn-sm gap-2 ${activeTool === 'intelligence' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <BarChart3 className="h-4 w-4" /> Wywiad rynkowy
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTool === 'gold'}
            onClick={() => activateTool('gold')}
            className={`btn btn-sm gap-2 ${activeTool === 'gold' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Coins className="h-4 w-4" /> Kurs złota
          </button>
        </div>
      </div>

      {!ready ? (
        <div className="panel flex min-h-40 items-center justify-center gap-3 border-dashed p-6 text-center text-xs text-[var(--text-secondary)]">
          <Gauge className="h-5 w-5 text-amber-300" /> Narzędzia zostaną przygotowane, gdy przewiniesz do tej sekcji.
        </div>
      ) : (
        <>
          {loadedTools.has('intelligence') && (
            <div role="tabpanel" hidden={activeTool !== 'intelligence'}>
              <MarketIntelligence />
            </div>
          )}
          {loadedTools.has('gold') && (
            <div role="tabpanel" hidden={activeTool !== 'gold'}>
              <GoldExchangeWidget />
            </div>
          )}
          {!loadedTools.has(activeTool) && <ToolSkeleton label="Przygotowywanie narzędzia rynku" />}
        </>
      )}

      <p className="flex items-center justify-center gap-2 text-[10px] text-[var(--text-secondary)]">
        <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Każde narzędzie zachowuje stan po pierwszym uruchomieniu.
      </p>
    </section>
  )
}
