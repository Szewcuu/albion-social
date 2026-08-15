import 'server-only'

import { isBuildId } from '@/lib/server/builds'

export const COMMENT_MIN_LENGTH = 2
export const COMMENT_MAX_LENGTH = 1000
export const REPORT_DETAILS_MAX_LENGTH = 500
export const REPORT_REASONS = ['spam', 'harassment', 'inappropriate', 'misinformation', 'other']

export function isCommunityId(value) {
  return isBuildId(value)
}

export async function ensureBuildExists(supabase, buildId) {
  const { data, error } = await supabase
    .from('builds')
    .select('id')
    .eq('id', buildId)
    .maybeSingle()

  if (error) throw new Error('Nie udało się sprawdzić buildu.')
  return Boolean(data)
}

export function toCommentDto(row, viewerId = null) {
  return {
    id: row.id,
    parentId: row.parent_id || null,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    author: row.profiles?.username || 'Anonimowy wojownik',
    own: Boolean(viewerId && row.user_id === viewerId),
  }
}
