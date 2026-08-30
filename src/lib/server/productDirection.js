import 'server-only'

import { buildProductDirectionSummary, PRODUCT_DIRECTION_KEYS } from '@/lib/productDirection'

export async function readProductDirection(supabase, userId) {
  const [ownResult, ...countResults] = await Promise.all([
    supabase.from('product_direction_votes').select('direction, updated_at').eq('user_id', userId).maybeSingle(),
    ...PRODUCT_DIRECTION_KEYS.map((direction) => supabase
      .from('product_direction_votes')
      .select('user_id', { count: 'exact', head: true })
      .eq('direction', direction)),
  ])
  const failed = [ownResult, ...countResults].find((result) => result.error)
  if (failed?.error) throw failed.error

  return {
    selection: ownResult.data?.direction || null,
    updatedAt: ownResult.data?.updated_at || null,
    summary: buildProductDirectionSummary(Object.fromEntries(PRODUCT_DIRECTION_KEYS.map((direction, index) => [
      direction,
      countResults[index].count || 0,
    ]))),
  }
}
