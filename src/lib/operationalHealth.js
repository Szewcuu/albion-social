export const ARCHIVE_READINESS_THRESHOLDS = Object.freeze({
  observationDays: 30,
  lookups: 1000,
  regionalLookups: 100,
  minimumAvailability: 0.95,
})

const REGION_KEYS = Object.freeze({
  Europa: 'europe',
  Ameryka: 'america',
  Azja: 'asia',
})

function toTimestamp(value) {
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

export function buildOperationalSummary(checks = [], usage = [], now = new Date()) {
  const cutoff = now.getTime() - ARCHIVE_READINESS_THRESHOLDS.observationDays * 86_400_000
  const usageCutoff = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  usageCutoff.setUTCDate(usageCutoff.getUTCDate() - ARCHIVE_READINESS_THRESHOLDS.observationDays + 1)
  const regionMap = new Map(Object.entries(REGION_KEYS).map(([label, key]) => [key, {
    key,
    label,
    probes: 0,
    operational: 0,
    degraded: 0,
    down: 0,
    latencyTotal: 0,
    latencySamples: 0,
    lookups: 0,
    successfulLookups: 0,
  }]))

  for (const check of checks) {
    if (toTimestamp(check.checked_at) < cutoff) continue
    for (const probe of Array.isArray(check.metadata?.regions) ? check.metadata.regions : []) {
      const key = REGION_KEYS[probe.region]
      const region = regionMap.get(key)
      if (!region) continue
      region.probes += 1
      if (['operational', 'degraded', 'down'].includes(probe.status)) region[probe.status] += 1
      if (Number.isFinite(probe.latencyMs)) {
        region.latencyTotal += probe.latencyMs
        region.latencySamples += 1
      }
    }
  }

  const observedDays = new Set()
  for (const row of usage) {
    if (row.feature !== 'killboard_search' || toTimestamp(`${row.usage_day}T00:00:00Z`) < usageCutoff.getTime()) continue
    const region = regionMap.get(row.region)
    if (!region) continue
    region.lookups += Number(row.request_count) || 0
    region.successfulLookups += Number(row.success_count) || 0
    observedDays.add(row.usage_day)
  }

  const regions = [...regionMap.values()].map(({ latencyTotal, latencySamples, ...region }) => ({
    ...region,
    availability: region.probes ? region.operational / region.probes : null,
    averageLatencyMs: latencySamples ? Math.round(latencyTotal / latencySamples) : null,
  }))
  const totalLookups = regions.reduce((sum, region) => sum + region.lookups, 0)
  const strainedRegion = regions.find((region) => (
    region.probes > 0
    && region.lookups >= ARCHIVE_READINESS_THRESHOLDS.regionalLookups
    && region.availability < ARCHIVE_READINESS_THRESHOLDS.minimumAvailability
  ))
  const enoughObservation = observedDays.size >= ARCHIVE_READINESS_THRESHOLDS.observationDays
  const enoughTraffic = totalLookups >= ARCHIVE_READINESS_THRESHOLDS.lookups
  const ready = enoughObservation && enoughTraffic && Boolean(strainedRegion)

  return {
    regions,
    archiveReadiness: {
      ready,
      observationDays: observedDays.size,
      totalLookups,
      strainedRegion: strainedRegion?.label || null,
      reason: ready
        ? `Ruch i awaryjność regionu ${strainedRegion.label} uzasadniają analizę kosztu archiwum.`
        : !enoughObservation
          ? `Zbieranie próby: ${observedDays.size}/${ARCHIVE_READINESS_THRESHOLDS.observationDays} dni.`
          : !enoughTraffic
            ? `Za mały ruch: ${totalLookups}/${ARCHIVE_READINESS_THRESHOLDS.lookups} wyszukań w 30 dni.`
            : 'Brak regionu z jednocześnie istotnym ruchem i dostępnością poniżej 95%.',
      thresholds: ARCHIVE_READINESS_THRESHOLDS,
    },
  }
}
