const DAY_MS = 24 * 60 * 60 * 1000

export function getUtcWeekWindow(value = new Date()) {
  const now = value instanceof Date ? new Date(value.getTime()) : new Date(value)
  if (Number.isNaN(now.getTime())) throw new TypeError('Nieprawidłowa data tygodnia.')

  const isoDay = now.getUTCDay() || 7
  const startsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - isoDay + 1))
  const endsAt = new Date(startsAt.getTime() + 7 * DAY_MS)

  return {
    weekStart: startsAt.toISOString().slice(0, 10),
    startsAt: startsAt.toISOString(),
    endsAt: endsAt.toISOString(),
  }
}

const likeCount = (build) => Math.max(
  (build.build_votes || []).filter((vote) => vote.vote_type === 'up').length,
  Number(build.votes_count) || 0,
)

export function rankWeeklyBuilds(builds = [], votes = [], limit = 3) {
  const weeklyVotes = votes.reduce((counts, vote) => {
    counts.set(vote.build_id, (counts.get(vote.build_id) || 0) + 1)
    return counts
  }, new Map())

  return [...builds]
    .map((build) => ({
      ...build,
      weekly_votes_count: weeklyVotes.get(build.id) || 0,
      likes_count: likeCount(build),
    }))
    .sort((a, b) => (
      b.weekly_votes_count - a.weekly_votes_count
      || b.likes_count - a.likes_count
      || Date.parse(b.created_at) - Date.parse(a.created_at)
      || String(a.id).localeCompare(String(b.id))
    ))
    .slice(0, Math.max(0, limit))
}
