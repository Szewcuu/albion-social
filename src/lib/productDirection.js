export const PRODUCT_DIRECTIONS = Object.freeze([
  {
    key: 'community',
    label: 'Społeczność',
  },
  {
    key: 'market',
    label: 'Rynek',
  },
  {
    key: 'guild_tools',
    label: 'Narzędzia gildii',
  },
])

export const PRODUCT_DIRECTION_KEYS = Object.freeze(PRODUCT_DIRECTIONS.map(({ key }) => key))
export const PRODUCT_TEST_MINIMUM_RESPONSES = 8

export function isProductDirection(value) {
  return PRODUCT_DIRECTION_KEYS.includes(value)
}

export function buildProductDirectionSummary(counts = {}) {
  const results = PRODUCT_DIRECTIONS.map((direction) => ({
    ...direction,
    votes: Math.max(0, Number(counts[direction.key]) || 0),
  }))
  const totalVotes = results.reduce((sum, result) => sum + result.votes, 0)
  const ranked = [...results].sort((left, right) => right.votes - left.votes)
  const leaders = ranked.filter((result) => result.votes === ranked[0]?.votes && result.votes > 0)

  return {
    totalVotes,
    minimumResponses: PRODUCT_TEST_MINIMUM_RESPONSES,
    readyForReview: totalVotes >= PRODUCT_TEST_MINIMUM_RESPONSES,
    leader: leaders.length === 1 ? leaders[0].key : null,
    results: results.map((result) => ({
      ...result,
      share: totalVotes ? result.votes / totalVotes : 0,
    })),
  }
}
