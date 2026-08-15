import { NextResponse } from 'next/server'

import { getMarketConversationForUser, marketDisplayName } from '@/lib/server/marketConversations'
import { createNotification } from '@/lib/server/notifications'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { createSupabaseAdminClient, requireApiUser } from '@/lib/server/supabaseAdmin'
import { cleanEnum, cleanText } from '@/lib/server/validation'

const jsonError = (message, status, headers) => NextResponse.json({ error: message }, { status, headers })

async function accessConversation(request, context) {
  const auth = await requireApiUser(request)
  if (auth.error) return { response: jsonError(auth.error, auth.status) }

  const { id } = await context.params
  const admin = createSupabaseAdminClient()
  const conversation = await getMarketConversationForUser(admin, id, auth.user.id)
  if (!conversation) return { response: jsonError('Rozmowa nie istnieje.', 404) }
  return { auth, admin, conversation }
}

export async function GET(request, context) {
  try {
    const access = await accessConversation(request, context)
    if (access.response) return access.response
    const { auth, admin, conversation } = access

    const counterpartId = conversation.buyer_id === auth.user.id ? conversation.seller_id : conversation.buyer_id
    const [{ data: messages, error: messagesError }, { data: profiles, error: profilesError }] = await Promise.all([
      admin.from('market_messages').select('id, sender_id, body, created_at').eq('conversation_id', conversation.id).order('created_at', { ascending: true }).limit(500),
      admin.from('profiles').select('id, username, ingame_nick').in('id', [auth.user.id, counterpartId]),
    ])
    if (messagesError || profilesError) throw messagesError || profilesError

    const readColumn = conversation.buyer_id === auth.user.id ? 'buyer_last_read_at' : 'seller_last_read_at'
    const { error: readError } = await admin.from('market_conversations').update({ [readColumn]: new Date().toISOString() }).eq('id', conversation.id)
    if (readError) throw readError

    const names = new Map((profiles || []).map((profile) => [profile.id, marketDisplayName(profile)]))
    return NextResponse.json({
      conversation: {
        id: conversation.id,
        marketItemId: conversation.market_item_id,
        offerTitle: conversation.offer_title,
        offerPrice: Number(conversation.offer_price),
        offeredPrice: conversation.offered_price == null ? null : Number(conversation.offered_price),
        status: conversation.status,
        counterpartId,
        counterpartName: names.get(counterpartId) || 'Gracz',
      },
      messages: (messages || []).map((message) => ({
        id: message.id,
        senderId: message.sender_id,
        senderName: names.get(message.sender_id) || 'Gracz',
        body: message.body,
        createdAt: message.created_at,
        own: message.sender_id === auth.user.id,
      })),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Błąd rozmowy handlowej:', error)
    return jsonError('Nie udało się pobrać rozmowy.', 500)
  }
}

export async function POST(request, context) {
  try {
    const access = await accessConversation(request, context)
    if (access.response) return access.response
    const { auth, admin, conversation } = access

    const rateLimit = await checkRateLimit(`market-message:${auth.user.id}`, {
      limit: 30,
      windowMs: 10 * 60 * 1000,
    })
    if (!rateLimit.allowed) {
      return jsonError('Wysyłasz wiadomości zbyt szybko. Spróbuj ponownie później.', 429, {
        'Retry-After': String(rateLimit.retryAfter),
      })
    }

    const body = await request.json().catch(() => null)
    const message = cleanText(body?.message, { min: 1, max: 1000 })
    if (!message) return jsonError('Wiadomość musi mieć od 1 do 1000 znaków.', 400)

    const { error } = await admin.rpc('service_send_market_message', {
      p_actor_id: auth.user.id,
      p_conversation_id: conversation.id,
      p_body: message,
    })
    if (error) {
      if (['22023', 'P0002'].includes(error.code)) return jsonError(error.message, error.code === 'P0002' ? 404 : 400)
      throw error
    }

    const counterpartId = conversation.buyer_id === auth.user.id ? conversation.seller_id : conversation.buyer_id
    const { data: profile } = await admin.from('profiles').select('username, ingame_nick').eq('id', auth.user.id).maybeSingle()
    await createNotification({
      userId: counterpartId,
      title: 'Nowa wiadomość handlowa',
      message: `${marketDisplayName(profile)} odpisał w sprawie „${conversation.offer_title}”.`,
      type: 'market_message',
      link: `/wiadomosci?conversation=${conversation.id}`,
    })

    return NextResponse.json({ sent: true }, { status: 201 })
  } catch (error) {
    console.error('Błąd wysyłania wiadomości handlowej:', error)
    return jsonError('Nie udało się wysłać wiadomości.', 500)
  }
}

export async function PATCH(request, context) {
  try {
    const access = await accessConversation(request, context)
    if (access.response) return access.response
    const { admin, conversation } = access

    const body = await request.json().catch(() => null)
    const status = cleanEnum(body?.status, ['open', 'closed'])
    if (!status) return jsonError('Nieprawidłowy stan rozmowy.', 400)

    const { error } = await admin.from('market_conversations').update({ status, updated_at: new Date().toISOString() }).eq('id', conversation.id)
    if (error) throw error
    return NextResponse.json({ status })
  } catch (error) {
    console.error('Błąd zmiany stanu rozmowy:', error)
    return jsonError('Nie udało się zmienić stanu rozmowy.', 500)
  }
}
