const WEAPON_PATTERN = /^T[3-8]_(?:MAIN|2H)_[A-Z0-9_]+(?:@\d+)?$/
const GEAR_SLOTS = ['Head', 'Armor', 'Shoes', 'Cape', 'OffHand']

export function canonicalWeaponId(value) {
  const itemId = typeof value === 'string' ? value.trim().toUpperCase() : ''
  if (!WEAPON_PATTERN.test(itemId)) return null
  return itemId.replace(/@\d+$/, '').replace(/^T[3-8]_/, 'T8_')
}

function equipmentType(combatant, slot) {
  const value = combatant?.Equipment?.[slot]?.Type
  return typeof value === 'string' && value ? value : null
}

function eventCount(event, camelCaseKey, pascalCaseKey, fallbackKey) {
  const value = event?.[camelCaseKey] ?? event?.[pascalCaseKey] ?? event?.[fallbackKey]?.length
  const count = Number(value)
  return Number.isFinite(count) ? count : null
}

function itemName(itemId, catalogById) {
  if (!itemId) return ''
  const plainId = itemId.replace(/@\d+$/, '')
  const canonicalId = plainId.replace(/^T[1-8]_/, 'T8_')
  return catalogById.get(plainId)?.name || catalogById.get(canonicalId)?.name || plainId
}

function createWeaponStats(weaponId) {
  return { weaponId, wins: 0, losses: 0, ipTotal: 0, ipSamples: 0, matchups: new Map(), builds: new Map() }
}

function recordMatchup(stats, opponentId, won) {
  if (!opponentId) return
  const matchup = stats.matchups.get(opponentId) || { wins: 0, losses: 0 }
  if (won) matchup.wins += 1
  else matchup.losses += 1
  stats.matchups.set(opponentId, matchup)
}

function recordBuild(stats, combatant) {
  const build = Object.fromEntries(GEAR_SLOTS.map((slot) => [slot, equipmentType(combatant, slot)]))
  if (!build.Head || !build.Armor || !build.Shoes || !build.Cape) return
  const key = GEAR_SLOTS.map((slot) => build[slot] || '').join('|')
  const current = stats.builds.get(key) || { count: 0, build }
  current.count += 1
  stats.builds.set(key, current)
}

function recordAppearance(stats, combatant, opponentId, won) {
  if (won) {
    stats.wins += 1
    recordBuild(stats, combatant)
  } else stats.losses += 1

  const itemPower = Number(combatant?.AverageItemPower)
  if (Number.isFinite(itemPower) && itemPower > 0) {
    stats.ipTotal += itemPower
    stats.ipSamples += 1
  }
  recordMatchup(stats, opponentId, won)
}

function tierFor(score, matches) {
  if (matches >= 20 && score >= 58) return 'S+'
  if (matches >= 12 && score >= 55) return 'S'
  if (score >= 52) return 'A'
  if (score >= 48) return 'B'
  return 'C'
}

function strongestMatchups(matchups, catalogById, won) {
  return [...matchups.entries()]
    .map(([weaponId, result]) => ({ weaponId, count: won ? result.wins : result.losses }))
    .filter((entry) => entry.count > 0)
    .sort((first, second) => second.count - first.count || first.weaponId.localeCompare(second.weaponId))
    .slice(0, 3)
    .map((entry) => itemName(entry.weaponId, catalogById))
}

function mostCommonBuild(builds, catalogById) {
  const selected = [...builds.values()].sort((first, second) => second.count - first.count)[0]
  if (!selected) return null
  const build = selected.build
  return {
    head: build.Head,
    headName: itemName(build.Head, catalogById),
    armor: build.Armor,
    armorName: itemName(build.Armor, catalogById),
    shoes: build.Shoes,
    shoesName: itemName(build.Shoes, catalogById),
    cape: build.Cape,
    capeName: itemName(build.Cape, catalogById),
    offhand: build.OffHand,
    offhandName: itemName(build.OffHand, catalogById),
    observations: selected.count,
  }
}

export function buildObservedSoloMeta(eventsByRegion, catalog, { minimumMatches = 4, priorMatches = 10 } = {}) {
  const catalogById = new Map((catalog || []).map((item) => [item.id, item]))
  const weapons = new Map()
  const seenEvents = new Set()
  let soloEvents = 0
  let validDuels = 0

  for (const source of eventsByRegion || []) {
    for (const event of source.events || []) {
      const eventKey = `${source.region}:${event?.EventId ?? event?.TimeStamp ?? seenEvents.size}`
      if (seenEvents.has(eventKey)) continue
      seenEvents.add(eventKey)
      const participantCount = eventCount(event, 'numberOfParticipants', 'NumberOfParticipants', 'Participants')
      const groupMemberCount = eventCount(event, 'groupMemberCount', 'GroupMemberCount', 'GroupMembers')
      if (participantCount !== 1 || (groupMemberCount !== null && groupMemberCount !== 1)) continue
      soloEvents += 1

      const winnerId = canonicalWeaponId(equipmentType(event?.Killer, 'MainHand'))
      const loserId = canonicalWeaponId(equipmentType(event?.Victim, 'MainHand'))
      if (!winnerId || !loserId) continue
      validDuels += 1

      const winner = weapons.get(winnerId) || createWeaponStats(winnerId)
      const loser = weapons.get(loserId) || createWeaponStats(loserId)
      recordAppearance(winner, event.Killer, loserId, true)
      recordAppearance(loser, event.Victim, winnerId, false)
      weapons.set(winnerId, winner)
      weapons.set(loserId, loser)
    }
  }

  const totalAppearances = validDuels * 2
  const data = [...weapons.values()]
    .map((stats) => {
      const matches = stats.wins + stats.losses
      const winrate = matches ? stats.wins / matches * 100 : 0
      const score = (stats.wins + priorMatches / 2) / (matches + priorMatches) * 100
      const confidence = matches >= 20 ? 'wysoka' : matches >= 10 ? 'średnia' : 'niska'
      return {
        id: stats.weaponId.toLowerCase(),
        name: itemName(stats.weaponId, catalogById),
        weaponId: stats.weaponId,
        tier: tierFor(score, matches),
        winrate: Number(winrate.toFixed(1)),
        score: Number(score.toFixed(1)),
        popularity: totalAppearances ? Number((matches / totalAppearances * 100).toFixed(1)) : 0,
        matches,
        wins: stats.wins,
        losses: stats.losses,
        avgIp: stats.ipSamples ? Math.round(stats.ipTotal / stats.ipSamples) : null,
        confidence,
        role: `${matches} wystąpień · pewność ${confidence}`,
        playstyle: `Wynik oparty na ${matches} wystąpieniach w publicznych zdarzeniach solo: ${stats.wins} zwycięstw i ${stats.losses} porażek.`,
        bestBuild: mostCommonBuild(stats.builds, catalogById),
        strongAgainst: strongestMatchups(stats.matchups, catalogById, true),
        weakAgainst: strongestMatchups(stats.matchups, catalogById, false),
      }
    })
    .filter((weapon) => weapon.matches >= minimumMatches)
    .sort((first, second) => second.score - first.score || second.matches - first.matches || first.name.localeCompare(second.name, 'pl'))

  return {
    data,
    stats: { fetchedEvents: seenEvents.size, soloEvents, validDuels, weaponAppearances: totalAppearances, minimumMatches, priorMatches },
  }
}
