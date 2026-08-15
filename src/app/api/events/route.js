import { NextResponse } from 'next/server'

import { checkRateLimit } from '@/lib/server/rateLimit'
import { createSupabaseAdminClient, requireApiUser } from '@/lib/server/supabaseAdmin'
import { cleanEnum, cleanText } from '@/lib/server/validation'

const ROLES = ['tank', 'healer', 'dps', 'support', 'flex']
const REMINDERS = [15, 30, 60, 120, 1440]
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const jsonError = (error, status, headers) => NextResponse.json({ error }, { status, headers })

export async function GET(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const admin = createSupabaseAdminClient()
    const { data: events, error: eventsError } = await admin
      .from('guild_events')
      .select('id, guild_id, creator_id, title, description, event_type, starts_at, server, status, location, audience, capacity, signup_open, guilds!inner(id, name, status)')
      .eq('status', 'scheduled')
      .eq('guilds.status', 'visible')
      .gt('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(100)

    if (eventsError) throw eventsError
    const eventIds = (events || []).map((event) => event.id)
    let signups = []

    if (eventIds.length) {
      const { data, error } = await admin
        .from('guild_event_signups')
        .select('id, event_id, user_id, role, status, reminder_minutes, created_at, profiles!guild_event_signups_user_id_fkey(username, ingame_nick, avatar_url)')
        .in('event_id', eventIds)
        .in('status', ['confirmed', 'waitlist'])
        .order('created_at', { ascending: true })
      if (error) throw error
      signups = data || []
    }

    return NextResponse.json({
      events: (events || []).map((event) => ({
        ...event,
        signups: signups.filter((signup) => signup.event_id === event.id),
        mySignup: signups.find((signup) => signup.event_id === event.id && signup.user_id === auth.user.id) || null,
      })),
    })
  } catch (error) {
    console.error('Błąd kalendarza wydarzeń:', error)
    return jsonError('Nie udało się pobrać kalendarza wydarzeń.', 500)
  }
}

export async function POST(request) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)

    const rateLimit = await checkRateLimit(`event-signup:${auth.user.id}`, { limit: 30, windowMs: 60_000 })
    if (!rateLimit.allowed) return jsonError('Zbyt wiele zmian zapisu. Spróbuj ponownie za chwilę.', 429, { 'Retry-After': String(rateLimit.retryAfter) })

    const body = await request.json()
    const eventId = cleanText(body.eventId, { min: 36, max: 36 })
    const action = cleanEnum(body.action, ['join', 'cancel'])
    const role = cleanEnum(body.role || 'flex', ROLES)
    const reminder = body.reminderMinutes === null || body.reminderMinutes === undefined || body.reminderMinutes === ''
      ? null
      : Number(body.reminderMinutes)

    if (!eventId || !UUID_PATTERN.test(eventId) || !action || !role || (reminder !== null && !REMINDERS.includes(reminder))) {
      return jsonError('Nieprawidłowe dane zapisu na wydarzenie.', 400)
    }

    const admin = createSupabaseAdminClient()
    const { data, error } = await admin.rpc('service_set_guild_event_signup', {
      p_event_id: eventId,
      p_user_id: auth.user.id,
      p_role: role,
      p_reminder_minutes: reminder,
      p_action: action,
    })

    if (error) {
      const message = error.message || ''
      if (message.includes('tylko dla członków')) return jsonError('To wydarzenie jest tylko dla członków gildii.', 403)
      if (message.includes('zamknięte') || message.includes('nie przyjmuje') || message.includes('aktywnego zapisu')) return jsonError(message, 409)
      throw error
    }

    return NextResponse.json({ success: true, signup: data })
  } catch (error) {
    console.error('Błąd zapisu na wydarzenie:', error)
    return jsonError('Nie udało się zaktualizować zapisu na wydarzenie.', 500)
  }
}
