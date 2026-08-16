import { NextResponse } from 'next/server'

import { buildObservedSoloMeta } from '@/lib/meta1v1'
import { getAlbionRecentEvents } from '@/lib/server/albionApi'
import { getAlbionItemCatalog } from '@/lib/server/albionItemCatalog'

const REGIONS = [
  { id: 'europe', label: 'Europa' },
  { id: 'america', label: 'Ameryka' },
  { id: 'asia', label: 'Azja' },
]
const OFFSETS = [0, 51]

export const revalidate = 300

export async function GET() {
  const requestDescriptors = REGIONS.flatMap((region) => OFFSETS.map((offset) => ({ region, offset })))
  const results = await Promise.allSettled(requestDescriptors.map(async ({ region, offset }) => ({
    region,
    offset,
    events: await getAlbionRecentEvents(region.id, { limit: 51, offset }),
  })))
  const fulfilled = results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : [])
  const failedRequests = results.filter((result) => result.status === 'rejected').length

  if (!fulfilled.length) {
    return NextResponse.json({
      error: 'Regionalne Gameinfo API nie zwróciło danych potrzebnych do analizy 1v1. Spróbuj ponownie później.',
      data: [],
      meta: {
        source: 'Albion Online Gameinfo API',
        isDemo: false,
        unavailableRegions: REGIONS.map((region) => region.label),
        updatedAt: new Date().toISOString(),
      },
    }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }

  const eventsByRegion = REGIONS.flatMap((region) => {
    const events = fulfilled
      .filter((page) => page.region.id === region.id)
      .flatMap((page) => page.events)
    return events.length ? [{ region: region.id, events }] : []
  })
  const availableRegionIds = new Set(eventsByRegion.map((source) => source.region))
  const analysis = buildObservedSoloMeta(eventsByRegion, getAlbionItemCatalog())
  const availableRegions = REGIONS.filter((region) => availableRegionIds.has(region.id)).map((region) => region.label)
  const unavailableRegions = REGIONS.filter((region) => !availableRegionIds.has(region.id)).map((region) => region.label)

  return NextResponse.json({
    data: analysis.data,
    meta: {
      source: 'Albion Online Gameinfo API',
      mode: 'Najnowsze publiczne zdarzenia z jednym uczestnikiem i jednoosobową grupą po stronie zabójcy',
      methodology: `Ranking obserwacyjny z ${analysis.stats.validDuels} pojedynków. Wynik tieru to skuteczność ważona do 50% próbą bazową ${analysis.stats.priorMatches} walk; broń wymaga co najmniej ${analysis.stats.minimumMatches} wystąpień. API nie udostępnia typu lokacji, więc próbka obejmuje wszystkie publiczne zdarzenia solo — nie tylko Mists i Corrupted Dungeons.`,
      isDemo: false,
      updatedAt: new Date().toISOString(),
      cacheSeconds: 300,
      availableRegions,
      unavailableRegions,
      failedRequests,
      requestedPages: requestDescriptors.length,
      ...analysis.stats,
    },
  }, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=900' },
  })
}
