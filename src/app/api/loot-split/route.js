import { NextResponse } from 'next/server'

import { normalizeLootSplitPayload } from '@/lib/server/lootSplit'
import { checkRateLimit } from '@/lib/server/rateLimit'
import { recordSystemEvent } from '@/lib/server/monitoring'
import { createSupabaseRequestClient, requireApiUser } from '@/lib/server/supabaseAdmin'

const jsonError = (message, status, headers) => NextResponse.json({ error: message }, { status, headers })

async function authorize(request) {
  const auth = await requireApiUser(request)
  if (auth.error) return { error: jsonError(auth.error, auth.status) }
  return { auth, supabase: createSupabaseRequestClient(request) }
}

export async function GET(request) {
  try {
    const access = await authorize(request)
    if (access.error) return access.error

    const [draftResult, reportsResult] = await Promise.all([
      access.supabase.from('loot_split_drafts').select('title, payload, updated_at').eq('user_id', access.auth.user.id).maybeSingle(),
      access.supabase.from('loot_split_reports').select('id, title, version, report_text, created_at').eq('user_id', access.auth.user.id).order('created_at', { ascending: false }).limit(30),
    ])
    if (draftResult.error || reportsResult.error) throw draftResult.error || reportsResult.error
    return NextResponse.json({ draft: draftResult.data, reports: reportsResult.data || [] }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) {
    console.error('Błąd odczytu Loot Splitu:', error)
    await recordSystemEvent({ source: 'backend', eventType: 'loot_split_read_failed', message: error?.message })
    return jsonError('Nie udało się pobrać szkicu i historii rozliczeń.', 500)
  }
}

export async function PUT(request) {
  try {
    const access = await authorize(request)
    if (access.error) return access.error
    const rateLimit = await checkRateLimit(`loot-draft:${access.auth.user.id}`, { limit: 60, windowMs: 60 * 60 * 1000 })
    if (!rateLimit.allowed) return jsonError('Zbyt wiele zapisów szkicu.', 429, { 'Retry-After': String(rateLimit.retryAfter) })

    const body = await request.json().catch(() => null)
    const payload = normalizeLootSplitPayload(body?.payload)
    const title = payload.eventName || 'Szkic rozliczenia'
    const updatedAt = new Date().toISOString()
    const { error } = await access.supabase.from('loot_split_drafts').upsert({
      user_id: access.auth.user.id,
      title,
      payload,
      updated_at: updatedAt,
    }, { onConflict: 'user_id' })
    if (error) throw error
    return NextResponse.json({ savedAt: updatedAt })
  } catch (error) {
    console.error('Błąd zapisu szkicu Loot Splitu:', error)
    const invalidPayload = error.message === 'Nieprawidłowy format rozliczenia.'
    if (!invalidPayload) await recordSystemEvent({ source: 'backend', eventType: 'loot_split_draft_failed', message: error?.message })
    return jsonError(invalidPayload ? error.message : 'Nie udało się zapisać szkicu na koncie.', invalidPayload ? 400 : 500)
  }
}

export async function POST(request) {
  try {
    const access = await authorize(request)
    if (access.error) return access.error
    const rateLimit = await checkRateLimit(`loot-report:${access.auth.user.id}`, { limit: 30, windowMs: 60 * 60 * 1000 })
    if (!rateLimit.allowed) return jsonError('Zbyt wiele zapisanych wersji raportu.', 429, { 'Retry-After': String(rateLimit.retryAfter) })

    const body = await request.json().catch(() => null)
    const payload = normalizeLootSplitPayload(body?.payload)
    const title = payload.eventName || 'Rozliczenie grupy'
    const reportText = String(body?.reportText || '').slice(0, 20_000)
    if (!reportText) return jsonError('Raport jest pusty.', 400)

    const { data, error } = await access.supabase.rpc('save_loot_split_report', {
      p_title: title,
      p_payload: payload,
      p_report_text: reportText,
    })
    if (error) throw error
    return NextResponse.json({ report: data }, { status: 201 })
  } catch (error) {
    console.error('Błąd wersjonowania raportu Loot Splitu:', error)
    const invalidPayload = error.message === 'Nieprawidłowy format rozliczenia.'
    if (!invalidPayload) await recordSystemEvent({ source: 'backend', eventType: 'loot_split_report_failed', message: error?.message })
    return jsonError(invalidPayload ? error.message : 'Nie udało się zapisać wersji raportu.', invalidPayload ? 400 : 500)
  }
}

export async function DELETE(request) {
  try {
    const access = await authorize(request)
    if (access.error) return access.error
    const reportId = new URL(request.url).searchParams.get('reportId')
    const query = reportId
      ? access.supabase.from('loot_split_reports').delete().eq('id', reportId).eq('user_id', access.auth.user.id)
      : access.supabase.from('loot_split_drafts').delete().eq('user_id', access.auth.user.id)
    const { error } = await query
    if (error) throw error
    return NextResponse.json({ deleted: true })
  } catch (error) {
    console.error('Błąd usuwania danych Loot Splitu:', error)
    await recordSystemEvent({ source: 'backend', eventType: 'loot_split_delete_failed', message: error?.message })
    return jsonError('Nie udało się usunąć zapisu.', 500)
  }
}
