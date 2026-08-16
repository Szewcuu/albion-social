import { NextResponse } from 'next/server'

import { getAlbionItemCatalog } from '@/lib/server/albionItemCatalog'
import {
  isSupportedMarketSelection,
  runMarketPriceAlertSync,
  sampleMarketSelection,
} from '@/lib/server/marketPriceAlerts'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { createSupabaseAdminClient, requireApiUser } from '@/lib/server/supabaseAdmin'
import { cleanEnum, cleanInteger, cleanText } from '@/lib/server/validation'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const REGIONS = ['europe', 'america', 'asia']
const CITIES = ['Caerleon', 'Bridgewatch', 'Fort Sterling', 'Lymhurst', 'Martlock', 'Thetford', 'Brecilien']
const DIRECTIONS = ['below', 'above']
const jsonError = (message, status, headers) => NextResponse.json({ error: message }, { status, headers })

function itemName(itemId, fallback) {
  const baseId = itemId.split('@')[0]
  const item = getAlbionItemCatalog().find((entry) => entry.id === baseId)
  const enchantment = itemId.includes('@') ? `.${itemId.split('@')[1]}` : ''
  return cleanText(item ? `${item.name}${enchantment}` : fallback || itemId, { min: 1, max: 120 })
}

function parseSelection(value) {
  const itemId = cleanText(value?.itemId, { min: 3, max: 80 })?.toUpperCase() || null
  const region = cleanEnum(value?.region, REGIONS)
  const quality = cleanInteger(value?.quality, { min: 1, max: 5 })
  const cities = Array.isArray(value?.cities)
    ? [...new Set(value.cities.map((city) => cleanEnum(city, CITIES)).filter(Boolean))]
    : []
  return { itemId, region, quality, cities }
}

async function readHistory(admin, { itemId, region, city, quality, days }) {
  if (!isSupportedMarketSelection({ itemId, region, cities: [city], quality })) return []
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString()
  const { data, error } = await admin
    .from('market_price_snapshots')
    .select('sell_price_min, buy_price_max, source_sell_updated_at, source_buy_updated_at, sampled_at')
    .eq('item_id', itemId)
    .eq('region', region)
    .eq('city', city)
    .eq('quality', quality)
    .gte('sampled_at', cutoff)
    .order('sampled_at', { ascending: true })
    .limit(2_200)
  if (error) throw error
  return data || []
}

export async function GET(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)
    const admin = createSupabaseAdminClient()
    const { data: alerts, error } = await admin
      .from('price_alerts')
      .select('id, item_id, item_name, region, city, quality, price_type, direction, target_price, active, condition_met, last_observed_price, last_checked_at, last_triggered_at, last_error, created_at, updated_at')
      .eq('user_id', auth.user.id)
      .order('updated_at', { ascending: false })
      .limit(100)
    if (error) throw error

    const { searchParams } = new URL(request.url)
    const itemId = cleanText(searchParams.get('item'), { min: 3, max: 80 })?.toUpperCase() || null
    const region = cleanEnum(searchParams.get('region'), REGIONS)
    const city = cleanEnum(searchParams.get('city'), CITIES)
    const quality = cleanInteger(searchParams.get('quality'), { min: 1, max: 5 })
    const days = cleanInteger(searchParams.get('days') || 30, { min: 1, max: 90 }) || 30
    const history = itemId && region && city && quality
      ? await readHistory(admin, { itemId, region, city, quality, days })
      : []

    return NextResponse.json({ alerts: alerts || [], history }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Błąd odczytu alertów i historii cen:', error)
    return jsonError('Nie udało się pobrać zapisanej historii cen.', 500)
  }
}

export async function PUT(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)
    const rateLimit = await checkRateLimit(`price-alert-write:${auth.user.id}`, { limit: 20, windowMs: 60 * 60_000 })
    if (!rateLimit.allowed) return jsonError('Zbyt wiele zmian alertów cenowych.', 429, { 'Retry-After': String(rateLimit.retryAfter) })

    const body = await request.json().catch(() => null)
    const selection = parseSelection({ ...body, cities: [body?.city] })
    const direction = cleanEnum(body?.direction, DIRECTIONS)
    const targetPrice = cleanInteger(body?.targetPrice, { min: 1, max: 1_000_000_000_000 })
    if (!direction || !targetPrice || !isSupportedMarketSelection(selection)) return jsonError('Nieprawidłowe dane alertu cenowego.', 400)

    const admin = createSupabaseAdminClient()
    const priceType = direction === 'above' ? 'buy' : 'sell'
    const now = new Date().toISOString()
    const { data: alert, error } = await admin.from('price_alerts').upsert({
      user_id: auth.user.id,
      item_id: selection.itemId,
      item_name: itemName(selection.itemId, body?.itemName),
      region: selection.region,
      city: selection.cities[0],
      quality: selection.quality,
      price_type: priceType,
      direction,
      target_price: targetPrice,
      active: true,
      condition_met: false,
      last_error: null,
      updated_at: now,
    }, { onConflict: 'user_id,item_id,region,city,quality,price_type' }).select().single()
    if (error) throw error

    let sync = null
    try {
      sync = await sampleMarketSelection({ userId: auth.user.id, ...selection })
    } catch (syncError) {
      console.error('Alert zapisany, ale pierwszy skan rynku nie powiódł się:', syncError)
    }
    return NextResponse.json({ alert, sync }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Błąd zapisu alertu cenowego:', error)
    return jsonError('Nie udało się zapisać alertu cenowego.', 500)
  }
}

export async function DELETE(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)
    const id = new URL(request.url).searchParams.get('id')
    if (!UUID_PATTERN.test(id || '')) return jsonError('Nieprawidłowy identyfikator alertu.', 400)
    const admin = createSupabaseAdminClient()
    const { error } = await admin.from('price_alerts').delete().eq('id', id).eq('user_id', auth.user.id)
    if (error) throw error
    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('Błąd usuwania alertu cenowego:', error)
    return jsonError('Nie udało się usunąć alertu cenowego.', 500)
  }
}

export async function POST(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)
    const rateLimit = await checkRateLimit(`price-sample:${auth.user.id}`, { limit: 12, windowMs: 60 * 60_000 })
    if (!rateLimit.allowed) return jsonError('Historię rynku można odświeżyć dwanaście razy na godzinę.', 429, { 'Retry-After': String(rateLimit.retryAfter) })
    const body = await request.json().catch(() => null)

    if (body?.action === 'sync') {
      const result = await runMarketPriceAlertSync({ userId: auth.user.id, limit: 30 })
      return NextResponse.json({ result })
    }
    if (body?.action !== 'sample') return jsonError('Nieobsługiwana operacja rynku.', 400)
    const selection = parseSelection(body)
    if (!isSupportedMarketSelection(selection)) return jsonError('Nieprawidłowy wybór rynku.', 400)
    const result = await sampleMarketSelection({ userId: auth.user.id, ...selection })
    return NextResponse.json({ result })
  } catch (error) {
    console.error('Błąd serwerowego próbkowania rynku:', error)
    return jsonError('Nie udało się zapisać bieżącej próbki rynku.', 500)
  }
}
