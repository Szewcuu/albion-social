'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowRightLeft, BarChart3, CheckCircle2, Coins, ExternalLink, LoaderCircle, Scale, Sparkles, Zap } from 'lucide-react'

import { EquipmentPreview } from '@/components/builds/EquipmentGrid'
import CustomSelect from '@/components/ui/CustomSelect'
import { chunkBuildItemIds, compareBuildCosts, getUniqueBuildItemIds, valuateBuildInCity } from '@/lib/buildComparison'
import { buildFromDbRow, EQUIPMENT_SLOTS } from '@/lib/buildSlots'
import { calculateBuildStats, QUALITY_OPTIONS } from '@/lib/statCalculator'

const REGION_OPTIONS = [
  { value: 'europe', label: 'Europa' },
  { value: 'america', label: 'Ameryka' },
  { value: 'asia', label: 'Azja' },
]
const CITY_OPTIONS = ['Caerleon', 'Bridgewatch', 'Fort Sterling', 'Lymhurst', 'Martlock', 'Thetford', 'Brecilien']
  .map((city) => ({ value: city, label: city }))
const FRESHNESS_LABELS = { fresh: 'Świeże skany', aging: 'Starsze skany', stale: 'Nieaktualne skany', missing: 'Brak skanów' }

function formatSilver(value) {
  return Number.isFinite(value) ? `${Math.round(value).toLocaleString('pl-PL')} Silver` : 'Brak danych'
}

function freshnessTone(status) {
  if (status === 'fresh') return 'text-emerald-300 border-emerald-400/25 bg-emerald-400/8'
  if (status === 'aging') return 'text-amber-200 border-amber-400/25 bg-amber-400/8'
  return 'text-rose-200 border-rose-400/25 bg-rose-400/8'
}

function ValuationRow({ city, valuation, accent }) {
  const hasPrice = valuation.pricedItems > 0
  return (
    <div className="rounded-xl border border-white/8 bg-black/25 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[.16em] text-[var(--text-muted)]">{city}</p>
          <p className={`mt-1 font-mono text-sm font-black ${accent}`}>{hasPrice ? formatSilver(valuation.estimatedValue) : 'Brak wyceny'}</p>
        </div>
        <span className={`rounded-lg border px-2 py-1 font-mono text-[8px] font-black uppercase ${freshnessTone(valuation.freshness)}`}>
          {FRESHNESS_LABELS[valuation.freshness]}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[9px] text-[var(--text-muted)]">
        <span>Pokrycie {valuation.coveragePercent}%</span>
        {valuation.maxAgeHours != null && <span>Najstarszy skan {valuation.maxAgeHours} h</span>}
        {valuation.fallbackItems > 0 && <span>{valuation.fallbackItems} × cena kupna</span>}
      </div>
    </div>
  )
}

function BuildSide({ label, buildRow, build, stats, valuations, cities, accent, border }) {
  return (
    <article className={`rounded-2xl border bg-black/20 p-4 sm:p-5 ${border}`}>
      <div className="flex items-start justify-between gap-3 border-b border-white/8 pb-4">
        <div className="min-w-0">
          <p className={`text-[9px] font-black uppercase tracking-[.18em] ${accent}`}>{label}</p>
          <h3 className="mt-1 truncate font-display text-xl font-black text-white">{build.title}</h3>
          <p className="mt-1 text-[10px] text-[var(--text-muted)]">{build.authorName || 'Autor niepodany'}</p>
        </div>
        <Link href={`/buildy/${buildRow.id}`} className="btn-icon shrink-0" aria-label={`Otwórz build ${build.title}`}>
          <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      <div className="my-4 rounded-xl border border-white/8 bg-[var(--bg-elevated)] p-3">
        <EquipmentPreview slots={build.slots} size="card" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/8 bg-black/25 p-3">
          <p className="text-[8px] font-black uppercase tracking-wider text-[var(--text-muted)]">Szacowane IP</p>
          <p className={`mt-1 font-mono text-lg font-black ${accent}`}>{stats.avgIp || '—'}</p>
        </div>
        <div className="rounded-xl border border-white/8 bg-black/25 p-3">
          <p className="text-[8px] font-black uppercase tracking-wider text-[var(--text-muted)]">Sloty bojowe</p>
          <p className={`mt-1 font-mono text-lg font-black ${accent}`}>{stats.activeSlotsCount}/6</p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {cities.map((city) => <ValuationRow key={city} city={city} valuation={valuations[city]} accent={accent} />)}
      </div>

      <div className="mt-4 border-t border-white/8 pt-4">
        <div className="mb-2 flex items-center gap-2">
          <Zap className={`h-3.5 w-3.5 ${accent}`} />
          <p className="text-[9px] font-black uppercase tracking-[.16em] text-[var(--text-secondary)]">Rotacje zapisane przez autora</p>
        </div>
        {build.skillCombos?.length ? (
          <div className="space-y-2">
            {build.skillCombos.map((combo, index) => (
              <div key={`${combo.name}-${index}`} className="rounded-xl border border-white/8 bg-black/20 p-3">
                <p className="text-xs font-bold text-white">{combo.name || `Rotacja ${index + 1}`}</p>
                <p className="mt-1 font-mono text-[10px] leading-5 text-[var(--text-secondary)]">{combo.description || 'Brak opisu sekwencji.'}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-white/10 p-3 text-[10px] text-[var(--text-muted)]">Autor nie opisał jeszcze umiejętności ani rotacji tego zestawu.</p>
        )}
      </div>
    </article>
  )
}

export default function BuildComparator({ builds = [], initialOpen = false }) {
  const [isOpen, setIsOpen] = useState(initialOpen)
  const [buildAId, setBuildAId] = useState('')
  const [buildBId, setBuildBId] = useState('')
  const [region, setRegion] = useState('europe')
  const [cityA, setCityA] = useState('Martlock')
  const [cityB, setCityB] = useState('Caerleon')
  const [quality, setQuality] = useState(1)
  const [priceRows, setPriceRows] = useState([])
  const [priceState, setPriceState] = useState({ loading: false, error: '' })

  const effectiveBuildAId = builds.some((build) => build.id === buildAId) ? buildAId : builds[0]?.id || ''
  const effectiveBuildBId = builds.some((build) => build.id === buildBId) ? buildBId : builds[1]?.id || ''
  const buildARow = builds.find((build) => build.id === effectiveBuildAId)
  const buildBRow = builds.find((build) => build.id === effectiveBuildBId)
  const buildA = useMemo(() => buildARow ? buildFromDbRow(buildARow) : null, [buildARow])
  const buildB = useMemo(() => buildBRow ? buildFromDbRow(buildBRow) : null, [buildBRow])
  const cities = useMemo(() => [...new Set([cityA, cityB])], [cityA, cityB])
  const marketItemIds = useMemo(() => getUniqueBuildItemIds([buildA, buildB]), [buildA, buildB])

  useEffect(() => {
    if (!isOpen || !buildA || !buildB) return undefined
    if (!marketItemIds.length) return undefined

    const controller = new AbortController()
    async function loadPrices() {
      setPriceState({ loading: true, error: '' })
      try {
        const payloads = await Promise.all(chunkBuildItemIds(marketItemIds).map(async (chunk) => {
          const params = new URLSearchParams({
            mode: 'current',
            region,
            items: chunk.join(','),
            cities: cities.join(','),
            qualities: [...new Set([quality, 1])].join(','),
          })
          const response = await fetch(`/api/prices?${params}`, { signal: controller.signal })
          const payload = await response.json()
          if (!response.ok) throw new Error(payload?.error?.message || 'Nie udało się pobrać cen.')
          return payload.data || []
        }))
        setPriceRows(payloads.flat())
        setPriceState({ loading: false, error: '' })
      } catch (error) {
        if (error.name === 'AbortError') return
        setPriceRows([])
        setPriceState({ loading: false, error: error.message || 'Rynek jest chwilowo niedostępny.' })
      }
    }
    loadPrices()
    return () => controller.abort()
  }, [buildA, buildB, cities, isOpen, marketItemIds, quality, region])

  const statsA = useMemo(() => calculateBuildStats(buildA?.slots, quality), [buildA, quality])
  const statsB = useMemo(() => calculateBuildStats(buildB?.slots, quality), [buildB, quality])
  const valuationsA = useMemo(() => Object.fromEntries(cities.map((city) => [city, valuateBuildInCity(buildA, priceRows, { city, quality })])), [buildA, cities, priceRows, quality])
  const valuationsB = useMemo(() => Object.fromEntries(cities.map((city) => [city, valuateBuildInCity(buildB, priceRows, { city, quality })])), [buildB, cities, priceRows, quality])
  const slotDifferences = useMemo(() => EQUIPMENT_SLOTS.filter((slot) => buildA?.slots?.[slot.key]?.main !== buildB?.slots?.[slot.key]?.main), [buildA, buildB])
  const buildOptions = useMemo(() => builds.map((build) => ({ value: build.id, label: `${build.title} · ${build.activity_type || 'Ogólny'}` })), [builds])
  const visiblePriceState = marketItemIds.length ? priceState : { loading: false, error: 'Wybrane buildy nie zawierają przedmiotów do wyceny.' }

  if (builds.length < 2) return null

  return (
    <section className="panel mb-6 overflow-visible" aria-labelledby="build-comparator-title">
      <div className="panel-body">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-300"><Scale className="h-5 w-5" /></div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[.2em] text-amber-300">Analityka doktryn</p>
              <h2 id="build-comparator-title" className="font-display text-xl font-black text-white">Porównaj dwa buildy</h2>
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">Ekwipunek, rotacje, IP i prawdziwe ceny rynkowe.</p>
            </div>
          </div>
          <button type="button" onClick={() => setIsOpen((value) => !value)} className="btn btn-secondary btn-sm">
            <ArrowRightLeft className="h-4 w-4" /> {isOpen ? 'Zamknij analizę' : 'Rozpocznij porównanie'}
          </button>
        </div>

        {isOpen && buildA && buildB && (
          <div className="mt-6 space-y-5 border-t border-white/8 pt-5 animate-fade-in">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <CustomSelect label="Build A" value={effectiveBuildAId} onChange={setBuildAId} options={buildOptions} className="xl:col-span-2" />
              <CustomSelect label="Build B" value={effectiveBuildBId} onChange={setBuildBId} options={buildOptions} className="xl:col-span-2" />
              <CustomSelect label="Region rynku" value={region} onChange={setRegion} options={REGION_OPTIONS} />
              <CustomSelect label="Jakość" value={quality} onChange={(value) => setQuality(Number(value))} options={QUALITY_OPTIONS.map((option) => ({ value: option.value, label: option.label }))} />
              <CustomSelect label="Miasto I" value={cityA} onChange={setCityA} options={CITY_OPTIONS} className="xl:col-start-3" />
              <CustomSelect label="Miasto II" value={cityB} onChange={setCityB} options={CITY_OPTIONS} />
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/8 bg-black/25 px-3 py-2.5 font-mono text-[9px] text-[var(--text-secondary)]">
              {visiblePriceState.loading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin text-amber-300" /> : visiblePriceState.error ? <AlertTriangle className="h-3.5 w-3.5 text-rose-300" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />}
              <span>{visiblePriceState.loading ? 'Pobieram najnowsze skany rynku…' : visiblePriceState.error || 'Ceny pochodzą z Albion Online Data Project. Cena kupna jest używana tylko przy braku ofert sprzedaży.'}</span>
            </div>

            {!visiblePriceState.loading && !visiblePriceState.error && (
              <div className="grid gap-2 sm:grid-cols-2">
                {cities.map((city) => {
                  const comparison = compareBuildCosts(valuationsA[city], valuationsB[city])
                  const cheaperName = comparison?.cheaper === 'first' ? buildA.title : comparison?.cheaper === 'second' ? buildB.title : null
                  return (
                    <div key={city} className="flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/6 p-3">
                      <Coins className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-wider text-amber-200">{city}</p>
                        <p className="mt-1 text-[11px] leading-5 text-[var(--text-secondary)]">
                          {comparison ? cheaperName ? <><strong className="text-white">{cheaperName}</strong> jest tańszy o <strong className="text-emerald-300">{formatSilver(comparison.difference)}</strong>.</> : 'Oba buildy kosztują tyle samo.' : 'Za mało skanów, aby rzetelnie wskazać tańszy build.'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <BuildSide label="Build A" buildRow={buildARow} build={buildA} stats={statsA} valuations={valuationsA} cities={cities} accent="text-amber-300" border="border-amber-400/25" />
              <BuildSide label="Build B" buildRow={buildBRow} build={buildB} stats={statsB} valuations={valuationsB} cities={cities} accent="text-sky-300" border="border-sky-400/25" />
            </div>

            <div className="rounded-2xl border border-white/8 bg-black/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-violet-300" /><h3 className="text-[10px] font-black uppercase tracking-[.16em] text-white">Różnice slot po slocie</h3></div>
                <span className="font-mono text-[9px] text-[var(--text-muted)]">{slotDifferences.length} z 10 slotów różni się</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {EQUIPMENT_SLOTS.map((slot) => {
                  const same = buildA.slots?.[slot.key]?.main === buildB.slots?.[slot.key]?.main
                  return (
                    <div key={slot.key} className={`rounded-lg border px-2.5 py-2 text-center font-mono text-[8px] font-bold uppercase ${same ? 'border-emerald-400/20 bg-emerald-400/6 text-emerald-200' : 'border-violet-400/20 bg-violet-400/6 text-violet-200'}`}>
                      {slot.label}<span className="mt-1 block text-[7px] opacity-70">{same ? 'Ten sam' : 'Inny'}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <p className="flex items-start gap-2 text-[9px] leading-4 text-[var(--text-muted)]"><Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-amber-300" /> IP i statystyki są estymacją portalu. Ceny zależą od dobrowolnych skanów rynku i mogą nie obejmować wszystkich przedmiotów.</p>
          </div>
        )}
      </div>
    </section>
  )
}
