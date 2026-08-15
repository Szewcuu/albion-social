import 'server-only'

import { isModerationId } from '@/lib/server/moderation'

export function isMarketConversationId(value) {
  return isModerationId(value)
}

export function marketDisplayName(profile) {
  return (profile?.ingame_nick || profile?.username || 'Gracz').replace(/#0$/, '')
}

export async function getMarketConversationForUser(supabase, conversationId, userId) {
  if (!isMarketConversationId(conversationId)) return null

  const { data, error } = await supabase
    .from('market_conversations')
    .select('id, market_item_id, offer_title, offer_price, offered_price, buyer_id, seller_id, status, last_message_at, created_at')
    .eq('id', conversationId)
    .maybeSingle()

  if (error) throw error
  if (!data || ![data.buyer_id, data.seller_id].includes(userId)) return null
  return data
}

export function serializeConversation(row) {
  return {
    id: row.id,
    marketItemId: row.market_item_id,
    offerTitle: row.offer_title,
    offerPrice: Number(row.offer_price),
    offeredPrice: row.offered_price == null ? null : Number(row.offered_price),
    status: row.status,
    counterpartId: row.counterpart_id,
    counterpartName: (row.counterpart_name || 'Gracz').replace(/#0$/, ''),
    lastMessage: row.last_message || '',
    lastMessageAt: row.last_message_at,
    unreadCount: Number(row.unread_count || 0),
  }
}
