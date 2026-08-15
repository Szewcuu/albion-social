import { NextResponse } from 'next/server'

import { createNotification } from '@/lib/server/notifications'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { isMarketConversationId, marketDisplayName, serializeConversation } from '@/lib/server/marketConversations'
import { createSupabaseAdminClient, requireApiUser } from '@/lib/server/supabaseAdmin'
import { cleanInteger, cleanText } from '@/lib/server/validation'

const jsonError = (message, status, headers) => NextResponse.json({ error: message }, { status, headers })

export async function GET(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const admin = createSupabaseAdminClient()
    const { data, error } = await admin.rpc('service_market_conversation_inbox', {
      p_user_id: auth.user.id,
    })
    if (error) throw error

    return NextResponse.json({ conversations: (data || []).map(serializeConversation) }, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (error) {
    console.error('Błąd skrzynki handlowej:', error)
    return jsonError('Nie udało się pobrać skrzynki handlowej.', 500)
  }
}

export async function POST(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const rateLimit = await checkRateLimit(`market-conversation-open:${auth.user.id}`, {
      limit: 8,
      windowMs: 10 * 60 * 1000,
    })
    if (!rateLimit.allowed) {
      return jsonError('Otwierasz zbyt wiele rozmów. Spróbuj ponownie później.', 429, {
        'Retry-After': String(rateLimit.retryAfter),
      })
    }

    const body = await request.json().catch(() => null)
    const marketItemId = isMarketConversationId(body?.marketItemId) ? body.marketItemId : null
    const offeredPrice = cleanInteger(body?.offeredPrice, { min: 1, max: 1_000_000_000_000 })
    const message = cleanText(body?.message, { min: 1, max: 1000 })
    if (!marketItemId || !offeredPrice || !message) return jsonError('Uzupełnij poprawną cenę i wiadomość.', 400)

    const admin = createSupabaseAdminClient()
    const { data: conversationId, error } = await admin.rpc('service_open_market_conversation', {
      p_actor_id: auth.user.id,
      p_market_item_id: marketItemId,
      p_offered_price: offeredPrice,
      p_body: message,
    })
    if (error) {
      if (['22023', 'P0002'].includes(error.code)) return jsonError(error.message, error.code === 'P0002' ? 404 : 400)
      throw error
    }

    const [{ data: conversation }, { data: profile }] = await Promise.all([
      admin.from('market_conversations').select('seller_id, offer_title').eq('id', conversationId).single(),
      admin.from('profiles').select('username, ingame_nick').eq('id', auth.user.id).maybeSingle(),
    ])
    if (conversation) {
      await createNotification({
        userId: conversation.seller_id,
        title: 'Nowa rozmowa na rynku',
        message: `${marketDisplayName(profile)} pyta o ofertę „${conversation.offer_title}”.`,
        type: 'market_message',
        link: `/wiadomosci?conversation=${conversationId}`,
      })
    }

    return NextResponse.json({ conversationId }, { status: 201 })
  } catch (error) {
    console.error('Błąd otwierania rozmowy handlowej:', error)
    return jsonError('Nie udało się rozpocząć rozmowy.', 500)
  }
}
