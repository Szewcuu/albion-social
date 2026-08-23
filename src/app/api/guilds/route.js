import { NextResponse } from 'next/server'

import { checkRateLimit } from '@/lib/server/rateLimit'
import { createSupabaseRequestClient, requireApiUser } from '@/lib/server/supabaseAdmin'
import { cleanEnum, cleanText, isSafeDiscordWebhook } from '@/lib/server/validation'

const SERVERS = ['Europa', 'Ameryka', 'Azja']
const CITIES = ['Martlock', 'Lymhurst', 'Bridgewatch', 'Fort Sterling', 'Thetford', 'Caerleon', 'Brecilien']
const ACTIVITIES = ['PvP', 'PvE / HCE', 'ZvZ / Wojny', 'Casual / Wszystko']
const GUILD_FIELDS = 'id, name, description, activity_type, main_city, server, discord_link, user_id, created_at, recruitment_open, recruitment_headline, profiles!guilds_user_id_fkey(username)'
const NO_STORE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' }

const jsonError = (message, status, headers) => NextResponse.json({ error: message }, { status, headers: { ...NO_STORE_HEADERS, ...headers } })

function cleanDiscordInvite(value) {
  const cleaned = cleanText(value, { min: 18, max: 160 })
  if (!cleaned) return null
  try {
    const url = new URL(cleaned)
    const host = url.hostname.toLowerCase()
    const isInvite = host === 'discord.gg' || ((host === 'discord.com' || host.endsWith('.discord.com')) && url.pathname.startsWith('/invite/'))
    return url.protocol === 'https:' && isInvite && !url.username && !url.password ? url.toString() : null
  } catch {
    return null
  }
}

async function authorize(request) {
  const auth = await requireApiUser(request)
  if (auth.error) return { response: jsonError(auth.error, auth.status) }
  return { auth, supabase: createSupabaseRequestClient(request) }
}

export async function GET(request) {
  try {
    const context = await authorize(request)
    if (context.response) return context.response
    const { data, error } = await context.supabase.from('guilds').select(GUILD_FIELDS).order('created_at', { ascending: false }).limit(100)
    if (error) throw error
    return NextResponse.json({ guilds: data || [] }, { headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error('Błąd pobierania gildii:', error)
    return jsonError('Nie udało się otworzyć rejestru gildii.', 500)
  }
}

export async function POST(request) {
  try {
    const context = await authorize(request)
    if (context.response) return context.response
    const rateLimit = await checkRateLimit(`guilds:${context.auth.user.id}`, { limit: 5, windowMs: 24 * 60 * 60 * 1000 })
    if (!rateLimit.allowed) return jsonError('Osiągnięto dzienny limit publikacji gildii.', 429, { 'Retry-After': String(rateLimit.retryAfter) })

    const body = await request.json().catch(() => null)
    const name = cleanText(body?.name, { min: 2, max: 30 })
    const description = cleanText(body?.description, { min: 10, max: 600 })
    const server = cleanEnum(body?.server, SERVERS)
    const mainCity = cleanEnum(body?.mainCity, CITIES)
    const activityType = cleanEnum(body?.activityType, ACTIVITIES)
    const discordLink = cleanDiscordInvite(body?.discordLink)
    const webhookUrl = cleanText(body?.webhookUrl || '', { max: 300 })

    if (!name || !description || !server || !mainCity || !activityType || !discordLink) return jsonError('Sprawdź nazwę, opis, serwer, miasto, doktrynę i zaproszenie Discord.', 400)
    if (webhookUrl && !isSafeDiscordWebhook(webhookUrl)) return jsonError('Webhook Discord ma nieprawidłowy adres.', 400)

    const { data, error } = await context.supabase.from('guilds').insert({
      name, description, server, main_city: mainCity, activity_type: activityType, discord_link: discordLink, webhook_url: webhookUrl, user_id: context.auth.user.id,
    }).select(GUILD_FIELDS).single()
    if (error) throw error
    return NextResponse.json({ guild: data }, { status: 201, headers: NO_STORE_HEADERS })
  } catch (error) {
    console.error('Błąd publikacji gildii:', error)
    return jsonError('Nie udało się opublikować manifestu gildii.', 500)
  }
}
