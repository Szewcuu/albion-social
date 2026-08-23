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
    const now = new Date().toISOString()
    const [{ data: events, error: eventsError }, { data: expeditions, error: expeditionsError }] = await Promise.all([
      admin
        .from('guild_events')
        .select('id, guild_id, creator_id, title, description, event_type, starts_at, server, status, location, audience, capacity, signup_open, guilds!inner(id, name, status)')
        .eq('status', 'scheduled')
        .eq('guilds.status', 'visible')
        .gt('starts_at', now)
        .order('starts_at', { ascending: true })
        .limit(100),
      admin
        .from('expeditions')
        .select('id, user_id, title, description, activity_type, starts_at, expires_at, server, max_tanks, max_healers, max_dps, max_supports, profiles!expeditions_user_id_fkey(username), expedition_signups(id, user_id, role_type, ingame_nick)')
        .eq('status', 'visible')
        .gt('expires_at', now)
        .order('starts_at', { ascending: true })
        .limit(100),
    ])

    if (eventsError || expeditionsError) throw eventsError || expeditionsError
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
      events: [
        ...(events || []).map((event) => ({
        ...event,
        source: 'guild',
        signups: signups.filter((signup) => signup.event_id === event.id),
        mySignup: signups.find((signup) => signup.event_id === event.id && signup.user_id === auth.user.id) || null,
        })),
        ...(expeditions || []).map((expedition) => ({
          id: expedition.id,
          source: 'expedition',
          title: expedition.title,
          description: expedition.description,
          event_type: expedition.activity_type,
          starts_at: expedition.starts_at,
          server: expedition.server,
          location: '',
          audience: 'public',
          capacity: Number(expedition.max_tanks || 0) + Number(expedition.max_healers || 0) + Number(expedition.max_dps || 0) + Number(expedition.max_supports || 0),
          signup_open: true,
          organizer: expedition.profiles?.username || 'Gracz',
          signups: (expedition.expedition_signups || []).map((signup) => ({
            id: signup.id,
            user_id: signup.user_id,
            role: String(signup.role_type || 'flex').toLowerCase(),
            status: 'confirmed',
            displayName: signup.ingame_nick,
          })),
          mySignup: (expedition.expedition_signups || []).some((signup) => signup.user_id === auth.user.id),
        })),
      ].sort((left, right) => new Date(left.starts_at) - new Date(right.starts_at)),
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
