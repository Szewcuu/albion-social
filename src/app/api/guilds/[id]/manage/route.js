import { NextResponse } from 'next/server'

import { checkRateLimit } from '@/lib/server/rateLimit'
import { createNotification } from '@/lib/server/notifications'
import { createSupabaseAdminClient, requireApiUser } from '@/lib/server/supabaseAdmin'
import { cleanEnum, cleanText } from '@/lib/server/validation'

const MANAGER_ROLES = ['leader', 'officer']
const MEMBER_ROLES = ['officer', 'member', 'recruit']
const EVENT_TYPES = ['ZvZ', 'PvP', 'PvE', 'Avalon', 'Ekonomia', 'Spotkanie', 'Inne']
const SERVERS = ['Europa', 'Ameryka', 'Azja']
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const jsonError = (message, status, headers) => NextResponse.json({ error: message }, { status, headers })

async function readGuildId(params) {
  const { id } = await params
  return /^\d{1,18}$/.test(id || '') ? id : null
}

async function readManager(admin, guildId, userId) {
  const { data: guild, error: guildError } = await admin
    .from('guilds')
    .select('id, user_id, name, status')
    .eq('id', guildId)
    .maybeSingle()
  if (guildError) throw new Error('Nie udało się odczytać gildii.')
  if (!guild) return { error: 'Nie znaleziono gildii.', status: 404 }

  if (guild.user_id === userId) return { guild, role: 'leader' }

  const { data: membership, error: membershipError } = await admin
    .from('guild_members')
    .select('role, status')
    .eq('guild_id', guildId)
    .eq('user_id', userId)
    .maybeSingle()
  if (membershipError) throw new Error('Nie udało się sprawdzić roli w gildii.')
  if (!membership || membership.status !== 'active' || !MANAGER_ROLES.includes(membership.role)) {
    return { error: 'Nie masz uprawnień do zarządzania tą gildią.', status: 403 }
  }
  return { guild, role: membership.role }
}

async function logActivity(admin, payload) {
  const { error } = await admin.from('guild_activity').insert(payload)
  if (error) throw new Error('Nie udało się zapisać kroniki gildii.')
}

export async function GET(request, { params }) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)
    const guildId = await readGuildId(params)
    if (!guildId) return jsonError('Nieprawidłowy identyfikator gildii.', 400)

    const admin = createSupabaseAdminClient()
    const access = await readManager(admin, guildId, auth.user.id)
    if (access.error) return jsonError(access.error, access.status)

    const [applicationsResult, membersResult, eventsResult] = await Promise.all([
      admin
        .from('guild_applications')
        .select('id, applicant_user_id, applicant_username, ingame_nick, total_fame, main_role, message, status, created_at, reviewed_at')
        .eq('guild_id', guildId)
        .order('created_at', { ascending: false })
        .limit(50),
      admin
        .from('guild_members')
        .select('id, user_id, role, title, status, joined_at, profiles!guild_members_user_id_fkey(username, avatar_url, ingame_nick, main_role)')
        .eq('guild_id', guildId)
        .order('joined_at', { ascending: true }),
      admin
        .from('guild_events')
        .select('id, title, description, event_type, starts_at, server, status, created_at')
        .eq('guild_id', guildId)
        .order('starts_at', { ascending: false })
        .limit(50),
    ])

    const firstError = applicationsResult.error || membersResult.error || eventsResult.error
    if (firstError) throw new Error('Nie udało się pobrać panelu dowodzenia.')

    return NextResponse.json({
      role: access.role,
      applications: applicationsResult.data || [],
      members: membersResult.data || [],
      events: eventsResult.data || [],
    })
  } catch (error) {
    console.error('Błąd panelu gildii:', error)
    return jsonError('Nie udało się pobrać panelu gildii.', 500)
  }
}

export async function POST(request, { params }) {
  try {
    const auth = await requireApiUser(request)
    if (auth.error) return jsonError(auth.error, auth.status)
    const guildId = await readGuildId(params)
    if (!guildId) return jsonError('Nieprawidłowy identyfikator gildii.', 400)

    const rateLimit = await checkRateLimit(`guild-manage:${auth.user.id}`, { limit: 30, windowMs: 60_000 })
    if (!rateLimit.allowed) return jsonError('Zbyt wiele zmian. Spróbuj ponownie za chwilę.', 429, { 'Retry-After': String(rateLimit.retryAfter) })

    const admin = createSupabaseAdminClient()
    const access = await readManager(admin, guildId, auth.user.id)
    if (access.error) return jsonError(access.error, access.status)

    const body = await request.json()
    const action = cleanText(body.action, { min: 3, max: 40 })

    if (action === 'update_recruitment') {
      const headline = cleanText(body.headline || '', { max: 160 })
      if (headline === null || typeof body.open !== 'boolean') return jsonError('Nieprawidłowe ustawienia rekrutacji.', 400)

      const { error } = await admin.from('guilds').update({
        recruitment_open: body.open,
        recruitment_headline: headline,
        updated_at: new Date().toISOString(),
      }).eq('id', guildId)
      if (error) throw new Error('Nie udało się zaktualizować rekrutacji.')

      await logActivity(admin, {
        guild_id: guildId,
        actor_id: auth.user.id,
        event_type: 'recruitment_updated',
        title: body.open ? 'Rekrutacja została otwarta' : 'Rekrutacja została zamknięta',
        details: headline,
        entity_type: 'guild',
        entity_id: String(guildId),
      })
      return NextResponse.json({ success: true })
    }

    if (action === 'create_event') {
      const title = cleanText(body.title, { min: 3, max: 80 })
      const description = cleanText(body.description || '', { max: 600 })
      const eventType = cleanEnum(body.eventType, EVENT_TYPES)
      const server = cleanEnum(body.server, SERVERS)
      const startsAt = new Date(body.startsAt)
      const maxDate = Date.now() + 366 * 24 * 60 * 60 * 1000
      if (!title || description === null || !eventType || !server || Number.isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now() - 60_000 || startsAt.getTime() > maxDate) {
        return jsonError('Sprawdź nazwę, termin, typ i serwer wydarzenia.', 400)
      }

      const { data: event, error } = await admin.from('guild_events').insert({
        guild_id: guildId,
        creator_id: auth.user.id,
        title,
        description,
        event_type: eventType,
        starts_at: startsAt.toISOString(),
        server,
      }).select('id, title, description, event_type, starts_at, server, status, created_at').single()
      if (error) throw new Error('Nie udało się utworzyć wydarzenia.')

      await logActivity(admin, {
        guild_id: guildId,
        actor_id: auth.user.id,
        event_type: 'event_created',
        title: `Zaplanowano: ${title}`,
        details: `${eventType} · ${server}`,
        entity_type: 'event',
        entity_id: event.id,
      })
      return NextResponse.json({ success: true, event }, { status: 201 })
    }

    if (action === 'cancel_event') {
      if (!UUID_PATTERN.test(body.eventId || '')) return jsonError('Nieprawidłowe wydarzenie.', 400)
      const { data: event, error } = await admin.from('guild_events').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', body.eventId).eq('guild_id', guildId).neq('status', 'cancelled').select('id, title').maybeSingle()
      if (error) throw new Error('Nie udało się odwołać wydarzenia.')
      if (!event) return jsonError('Wydarzenie nie istnieje lub zostało już odwołane.', 404)
      await logActivity(admin, { guild_id: guildId, actor_id: auth.user.id, event_type: 'event_cancelled', title: `Odwołano: ${event.title}`, entity_type: 'event', entity_id: event.id })
      return NextResponse.json({ success: true })
    }

    if (action === 'review_application') {
      const decision = cleanEnum(body.decision, ['accepted', 'rejected'])
      if (!UUID_PATTERN.test(body.applicationId || '') || !decision) return jsonError('Nieprawidłowa decyzja rekrutacyjna.', 400)

      const { data: application, error: applicationError } = await admin.from('guild_applications').select('id, applicant_user_id, ingame_nick, status').eq('id', body.applicationId).eq('guild_id', guildId).maybeSingle()
      if (applicationError) throw new Error('Nie udało się odczytać podania.')
      if (!application || application.status !== 'pending') return jsonError('Podanie nie istnieje lub zostało już rozpatrzone.', 409)

      const { error: reviewError } = await admin.rpc('service_review_guild_application', {
        p_application_id: application.id,
        p_guild_id: Number(guildId),
        p_reviewer_id: auth.user.id,
        p_decision: decision,
      })
      if (reviewError) throw new Error('Nie udało się rozpatrzyć podania.')
      if (application.applicant_user_id) {
        await createNotification({
          userId: application.applicant_user_id,
          title: decision === 'accepted' ? 'Podanie do gildii przyjęte' : 'Podanie do gildii rozpatrzone',
          message: decision === 'accepted'
            ? `Dołączasz do składu gildii „${access.guild.name}”.`
            : `Gildia „${access.guild.name}” odrzuciła Twoje podanie.`,
          link: `/gildie/${guildId}`,
          type: 'info',
        })
      }
      return NextResponse.json({ success: true })
    }

    if (action === 'update_member') {
      const role = cleanEnum(body.role, MEMBER_ROLES)
      const title = cleanText(body.title || '', { max: 50 })
      const status = cleanEnum(body.status, ['active', 'left'])
      if (!UUID_PATTERN.test(body.memberId || '') || !role || title === null || !status) return jsonError('Nieprawidłowe dane członka gildii.', 400)

      const { data: member, error: memberError } = await admin.from('guild_members').select('id, user_id, role, profiles!guild_members_user_id_fkey(username, ingame_nick)').eq('id', body.memberId).eq('guild_id', guildId).maybeSingle()
      if (memberError) throw new Error('Nie udało się odczytać członka gildii.')
      if (!member || member.role === 'leader') return jsonError('Nie można zmienić roli lidera.', 403)
      if (access.role === 'officer' && member.role === 'officer') return jsonError('Oficer nie może zmieniać innego oficera.', 403)
      if (access.role === 'officer' && role === 'officer') return jsonError('Tylko lider może mianować oficerów.', 403)

      const { error } = await admin.from('guild_members').update({ role, title, status, updated_at: new Date().toISOString() }).eq('id', member.id)
      if (error) throw new Error('Nie udało się zaktualizować składu.')
      const memberName = member.profiles?.ingame_nick || member.profiles?.username || 'Członek gildii'
      await logActivity(admin, {
        guild_id: guildId,
        actor_id: auth.user.id,
        event_type: status === 'left' ? 'member_left' : 'member_role_changed',
        title: status === 'left' ? `${memberName} opuścił skład` : `Zmieniono rolę: ${memberName}`,
        details: status === 'left' ? '' : `${role}${title ? ` · ${title}` : ''}`,
        entity_type: 'member',
        entity_id: member.id,
      })
      if (member.user_id !== auth.user.id) {
        await createNotification({
          userId: member.user_id,
          title: status === 'left' ? 'Zmiana w składzie gildii' : 'Nowa rola w gildii',
          message: status === 'left'
            ? `Nie jesteś już w aktywnym składzie gildii „${access.guild.name}”.`
            : `Twoja rola w gildii „${access.guild.name}” została zaktualizowana.`,
          link: `/gildie/${guildId}`,
          type: 'info',
        })
      }
      return NextResponse.json({ success: true })
    }

    return jsonError('Nieobsługiwana operacja.', 400)
  } catch (error) {
    console.error('Błąd zarządzania gildią:', error)
    return jsonError(error.message || 'Nie udało się zapisać zmian gildii.', 500)
  }
}
