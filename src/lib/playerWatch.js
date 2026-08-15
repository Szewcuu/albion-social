const MAX_SEEN_EVENTS = 80

function safeEvents(events) {
  return Array.isArray(events) ? events.filter((event) => event?.id) : []
}

export function getWatchEventIds(snapshot, previousIds = []) {
  const currentIds = [...safeEvents(snapshot?.kills), ...safeEvents(snapshot?.deaths)]
    .sort((first, second) => new Date(second.timestamp || 0) - new Date(first.timestamp || 0))
    .map((event) => String(event.id))

  return [...new Set([...currentIds, ...(Array.isArray(previousIds) ? previousIds.map(String) : [])])]
    .slice(0, MAX_SEEN_EVENTS)
}

export function summarizeNewPlayerEvents(snapshot, seenEventIds = []) {
  const seen = new Set((Array.isArray(seenEventIds) ? seenEventIds : []).map(String))
  const kills = safeEvents(snapshot?.kills).filter((event) => !seen.has(String(event.id)))
  const deaths = safeEvents(snapshot?.deaths).filter((event) => !seen.has(String(event.id)))
  const events = [...kills, ...deaths]
    .sort((first, second) => new Date(second.timestamp || 0) - new Date(first.timestamp || 0))

  return {
    kills: kills.length,
    deaths: deaths.length,
    killFame: kills.reduce((sum, event) => sum + (Number(event.fame) || 0), 0),
    deathFame: deaths.reduce((sum, event) => sum + (Number(event.fame) || 0), 0),
    total: events.length,
    latestEventId: events[0]?.id ? String(events[0].id) : null,
    latestEventAt: events[0]?.timestamp || null,
    oldestEventAt: events.at(-1)?.timestamp || null,
  }
}

export function buildPlayerWatchMessage(playerName, summary) {
  const name = playerName || 'Obserwowany gracz'
  const killFame = Number(summary?.killFame || 0).toLocaleString('pl-PL')
  const deathFame = Number(summary?.deathFame || 0).toLocaleString('pl-PL')
  return `${name}: ${summary?.kills || 0} nowych zabójstw (+${killFame} Fame) i ${summary?.deaths || 0} zgonów (${deathFame} Fame).`
}
