import { NextResponse } from 'next/server'

import {
  buildRecruitmentDiscordEmbed,
  RECRUITMENT_PLATFORMS,
  RECRUITMENT_STATUSES,
  validateRecruitmentPayload,
} from '@/lib/recruitment'
import { checkRateLimit } from '@/lib/server/rateLimit'
import {
  createSupabaseAdminClient,
  getPortalRole,
  requireApiUser,
} from '@/lib/server/supabaseAdmin'
import { isSafeDiscordWebhook } from '@/lib/server/validation'

const jsonError = (message, status = 400, headers = {}) => (
  NextResponse.json({ error: message }, { status, headers })
)

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return request.headers.get('x-real-ip') || '127.0.0.1'
}

function getWebhookUrl() {
  const staffWebhook = process.env.DISCORD_STAFF_WEBHOOK_URL
  if (staffWebhook && isSafeDiscordWebhook(staffWebhook)) return staffWebhook

  const generalWebhook = process.env.DISCORD_EXPEDITIONS_WEBHOOK_URL
  if (generalWebhook && isSafeDiscordWebhook(generalWebhook)) return generalWebhook

  return null
}

export async function GET(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) {
      return NextResponse.json({ hasApplication: false, application: null })
    }

    const supabase = createSupabaseAdminClient()
    const role = await getPortalRole(auth.user.id, supabase)
    const isAdmin = role === 'admin'

    const url = new URL(request.url)
    const viewAll = url.searchParams.get('all') === 'true'

    if (isAdmin && viewAll) {
      const platformFilter = url.searchParams.get('platform')
      const statusFilter = url.searchParams.get('status')

      let query = supabase
        .from('staff_applications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (platformFilter && RECRUITMENT_PLATFORMS[platformFilter]) {
        query = query.eq('platform', platformFilter)
      }
      if (statusFilter && RECRUITMENT_STATUSES[statusFilter]) {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query
      if (error) {
        // Tabela może jeszcze nie istnieć jeśli migracja nie została wdrożona na zdalną bazę
        console.warn('Nie udało się pobrać listy podań z bazy:', error.message)
        return NextResponse.json({ applications: [] })
      }

      return NextResponse.json({ applications: data || [] })
    }

    // Pobierz ostatnie zgłoszenie zalogowanego użytkownika
    const { data: userApp, error } = await supabase
      .from('staff_applications')
      .select('*')
      .eq('user_id', auth.user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.warn('Błąd odczytu zgłoszenia użytkownika:', error.message)
      return NextResponse.json({ hasApplication: false, application: null })
    }

    return NextResponse.json({
      hasApplication: Boolean(userApp),
      application: userApp || null,
      isAdmin,
    })
  } catch (error) {
    console.error('Błąd GET /api/recruitment:', error)
    return NextResponse.json({ hasApplication: false, application: null })
  }
}

export async function POST(request) {
  try {
    const ip = getClientIp(request)
    const auth = await requireApiUser(request)
    const userId = !auth.error && auth.user?.id ? auth.user.id : null

    const rateKey = userId ? `recruitment-user:${userId}` : `recruitment-ip:${ip}`
    const rateLimit = await checkRateLimit(rateKey, {
      limit: 3,
      windowMs: 30 * 60 * 1000,
    })

    if (!rateLimit.allowed) {
      return jsonError(
        'Wysłano zbyt wiele zgłoszeń. Odczekaj chwilę przed ponowną próbą.',
        429,
        { 'Retry-After': String(rateLimit.retryAfter) },
      )
    }

    const body = await request.json().catch(() => ({}))
    const validation = validateRecruitmentPayload(body)

    if (!validation.valid) {
      return jsonError(validation.errors[0] || 'Nieprawidłowe dane formularza.', 400)
    }

    const appData = validation.sanitized
    const supabase = createSupabaseAdminClient()

    let savedRecord = null
    try {
      const { data, error } = await supabase
        .from('staff_applications')
        .insert({
          user_id: userId,
          platform: appData.platform,
          applicant_name: appData.applicantName,
          age: appData.age,
          discord_tag: appData.discordTag,
          facebook_url: appData.facebookUrl || null,
          albion_nick: appData.albionNick || null,
          server: appData.server || 'Europa',
          experience: appData.experience,
          availability: appData.availability,
          motivation: appData.motivation,
          status: 'pending',
        })
        .select('*')
        .single()

      if (!error && data) {
        savedRecord = data
      } else if (error) {
        console.warn('Nie udało się zapisać podania w tabeli staff_applications:', error.message)
      }
    } catch (dbErr) {
      console.warn('Błąd połączenia z bazą podczas zapisu podania:', dbErr.message)
    }

    // Wysłanie powiadomienia Webhook Discord
    let discordSent = false
    const webhookUrl = getWebhookUrl()
    if (webhookUrl) {
      try {
        const discordEmbed = buildRecruitmentDiscordEmbed(appData)
        const discordRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          redirect: 'error',
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            allowed_mentions: { parse: [] },
            embeds: [discordEmbed],
          }),
        })
        discordSent = discordRes.ok
      } catch (webhookErr) {
        console.error('Błąd wysyłania powiadomienia Webhook:', webhookErr)
      }
    }

    // Powiadomienie w portalu dla administratorów
    try {
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')

      if (Array.isArray(admins) && admins.length > 0) {
        const platformObj = RECRUITMENT_PLATFORMS[appData.platform]
        const notifications = admins.map((admin) => ({
          user_id: admin.id,
          title: '🛡️ Nowe zgłoszenie do moderacji!',
          message: `${appData.applicantName} złożył podanie na: ${platformObj?.label || appData.platform}.`,
          type: 'info',
          link: '/admin',
        }))

        await supabase.from('notifications').insert(notifications)
      }
    } catch (notifErr) {
      console.warn('Błąd powiadamiania administratorów w portalu:', notifErr.message)
    }

    return NextResponse.json({
      success: true,
      message: 'Podanie rekrutacyjne zostało pomyślnie przesłane. Dziękujemy za zgłoszenie!',
      discordSent,
      applicationId: savedRecord?.id || null,
    })
  } catch (err) {
    console.error('Błąd POST /api/recruitment:', err)
    return jsonError('Wystąpił błąd serwera podczas wysyłania zgłoszenia. Spróbuj ponownie później.', 500)
  }
}

export async function PATCH(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const supabase = createSupabaseAdminClient()
    const role = await getPortalRole(auth.user.id, supabase)
    if (role !== 'admin') {
      return jsonError('Tylko administrator może edytować status zgłoszeń.', 403)
    }

    const body = await request.json().catch(() => ({}))
    const { id, status, adminNotes } = body

    if (!id || typeof id !== 'string') {
      return jsonError('Wskaż identyfikator zgłoszenia.', 400)
    }

    if (status && !RECRUITMENT_STATUSES[status]) {
      return jsonError('Nieprawidłowy status zgłoszenia.', 400)
    }

    const updates = {
      updated_at: new Date().toISOString(),
    }
    if (status) updates.status = status
    if (typeof adminNotes === 'string') updates.admin_notes = adminNotes.trim().slice(0, 1000)

    const { data, error } = await supabase
      .from('staff_applications')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return jsonError('Nie udało się zaktualizować zgłoszenia w bazie.', 500)
    }

    return NextResponse.json({ success: true, application: data })
  } catch (err) {
    console.error('Błąd PATCH /api/recruitment:', err)
    return jsonError('Błąd serwera podczas aktualizacji zgłoszenia.', 500)
  }
}
