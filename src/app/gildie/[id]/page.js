'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, ArrowLeft, CalendarDays, ChevronRight, CircleUserRound, Clock3, Crown, ExternalLink, Globe, MapPin, MessageSquareText, Settings2, Shield, ShieldCheck, Sparkles, Swords, UserRoundCheck, Users } from 'lucide-react'

import GuildApplyModal from '@/components/GuildApplyModal'
import GuildCommandPanel from '@/components/guilds/GuildCommandPanel'
import GuildZvZInspectorModal from '@/components/guilds/GuildZvZInspectorModal'
import { EmptyState, SkeletonBlock } from '@/components/ui/FeedbackState'
import FollowButton from '@/components/ui/FollowButton'
import { supabase } from '@/lib/supabase'
import { portalAuth } from '@/lib/supabaseAuth'

const ROLE_LABELS = { leader: 'Lider', officer: 'Oficer', member: 'Członek', recruit: 'Rekrut' }
const ROLE_STYLES = {
  leader: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
  officer: 'border-violet-300/30 bg-violet-300/10 text-violet-200',
  member: 'border-sky-300/25 bg-sky-300/8 text-sky-200',
  recruit: 'border-emerald-300/25 bg-emerald-300/8 text-emerald-200',
}

const ACTIVITY_ICONS = {
  guild_created: Crown,
  member_joined: UserRoundCheck,
  member_role_changed: ShieldCheck,
  member_left: Users,
  application_received: MessageSquareText,
  application_accepted: UserRoundCheck,
  application_rejected: MessageSquareText,
  event_created: CalendarDays,
  event_cancelled: CalendarDays,
  recruitment_updated: Settings2,
}

function formatDate(value, withTime = false) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return 'Data nieznana'
  return new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: 'short', year: 'numeric', ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(date)
}

function GuildSkeleton() {
  return <div className="page-content space-y-5"><SkeletonBlock className="h-11 w-48 rounded-xl" /><SkeletonBlock className="h-72 rounded-[30px]" /><div className="grid gap-5 lg:grid-cols-2"><SkeletonBlock className="h-72 rounded-[24px]" /><SkeletonBlock className="h-72 rounded-[24px]" /></div></div>
}

export default function GuildDetailPage() {
  const { id: guildId } = useParams()
  const [guild, setGuild] = useState(null)
  const [members, setMembers] = useState([])
  const [events, setEvents] = useState([])
  const [activity, setActivity] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [isApplyOpen, setIsApplyOpen] = useState(false)
  const [isZvZOpen, setIsZvZOpen] = useState(false)

  const loadGuild = useCallback(async () => {
    if (!guildId) return
    setLoading(true)
    setError('')
    try {
      const guildSelect = 'id, user_id, name, description, activity_type, main_city, server, discord_link, created_at, status, recruitment_open, recruitment_headline, profiles!guilds_user_id_fkey(username, avatar_url, ingame_nick)'
      let guildResult = await supabase.from('guilds').select(guildSelect).eq('id', guildId).maybeSingle()
      if (!guildResult.data && !guildResult.error) guildResult = await supabase.from('guilds').select(guildSelect).ilike('name', guildId).maybeSingle()
      if (guildResult.error) throw guildResult.error
      if (!guildResult.data) {
        setError('Gildia nie została odnaleziona w rejestrze.')
        return
      }

      const found = guildResult.data
      const [membersResult, eventsResult, activityResult] = await Promise.all([
        supabase.from('guild_members').select('id, user_id, role, title, status, joined_at, profiles!guild_members_user_id_fkey(username, avatar_url, ingame_nick, main_role, is_verified)').eq('guild_id', found.id).eq('status', 'active').order('joined_at', { ascending: true }),
        supabase.from('guild_events').select('id, creator_id, title, description, event_type, starts_at, server, status, location, audience, capacity, signup_open, created_at').eq('guild_id', found.id).in('status', ['scheduled', 'completed']).order('starts_at', { ascending: true }).limit(30),
        supabase.from('guild_activity').select('id, actor_id, event_type, title, details, entity_type, entity_id, created_at, profiles!guild_activity_actor_id_fkey(username, ingame_nick)').eq('guild_id', found.id).order('created_at', { ascending: false }).limit(40),
      ])
      const firstError = membersResult.error || eventsResult.error || activityResult.error
      if (firstError) throw firstError
      setGuild(found)
      setMembers(membersResult.data || [])
      setEvents(eventsResult.data || [])
      setActivity(activityResult.data || [])
    } catch (loadError) {
      console.error('Błąd pobierania gildii:', loadError)
      setError('Nie udało się załadować centrum gildii.')
    } finally {
      setLoading(false)
    }
  }, [guildId])

  useEffect(() => {
    portalAuth.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null)
      return loadGuild()
    })
  }, [loadGuild])

  const upcomingEvents = useMemo(() => events.filter((event) => event.status === 'scheduled'), [events])

  if (loading) return <GuildSkeleton />
  if (error || !guild) return <div className="page-content"><EmptyState icon={Shield} title="Chorągiew poza rejestrem" description={error || 'Ta gildia nie istnieje lub została usunięta.'} actionLabel="Wróć do gildii" actionHref="/gildie" /></div>

  const leaderName = guild.profiles?.ingame_nick || guild.profiles?.username || 'Lider'
  const myMembership = members.find((member) => member.user_id === user?.id)
  const canManage = guild.user_id === user?.id || ['leader', 'officer'].includes(myMembership?.role)
  const tabItems = [
    ['overview', Shield, 'Manifest'],
    ['roster', Users, `Skład (${members.length})`],
    ['events', CalendarDays, `Wydarzenia (${upcomingEvents.length})`],
    ['activity', Activity, 'Kronika'],
    ...(canManage ? [['command', Settings2, 'Dowództwo']] : []),
  ]

  return (
    <div className="page-content space-y-6">
      <Link href="/gildie" className="aopp-ghost-button inline-flex min-h-11 items-center gap-2 px-4 text-xs font-bold"><ArrowLeft className="h-4 w-4" /> Wróć do rejestru gildii</Link>

      <header className="panel relative overflow-hidden rounded-[30px] border-amber-300/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_0%,rgba(190,140,38,.22),transparent_44%),linear-gradient(120deg,rgba(55,17,11,.45),transparent_60%)]" />
        <div className="pointer-events-none absolute -right-5 -top-16 font-display text-[16rem] font-black leading-none text-amber-200/[.035]">{guild.name.charAt(0)}</div>
        <div className="relative grid gap-7 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-10">
          <div className="flex min-w-0 items-center gap-5">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-[24px] border-2 border-amber-300/40 bg-black/30 font-display text-5xl font-black text-amber-200 shadow-[0_18px_50px_rgba(0,0,0,.45)]">{guild.name.charAt(0)}</div>
            <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.24em] text-amber-300">Centrum gildii</p><h1 className="font-display mt-2 truncate text-3xl font-black text-white sm:text-4xl">{guild.name}</h1><div className="mt-3 flex flex-wrap gap-2"><Badge icon={Globe}>{guild.server || 'Serwer nieustalony'}</Badge><Badge icon={MapPin}>{guild.main_city || 'Nieustalone'}</Badge><Badge icon={Swords}>{guild.activity_type || 'Mieszana'}</Badge><span className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] ${guild.recruitment_open ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200' : 'border-rose-300/25 bg-rose-300/8 text-rose-200'}`}>{guild.recruitment_open ? 'Rekrutacja otwarta' : 'Rekrutacja zamknięta'}</span></div></div>
          </div>
          <div className="grid grid-cols-3 gap-2">{[[Users, 'Skład', members.length], [CalendarDays, 'Nadchodzące', upcomingEvents.length], [Activity, 'Wpisy', activity.length]].map(([Icon, label, value]) => <div key={label} className="min-w-[86px] rounded-2xl border border-white/8 bg-black/20 p-3 text-center sm:min-w-[105px]"><Icon className="mx-auto h-4 w-4 text-amber-300" /><p className="font-display mt-2 text-xl font-black text-white">{value}</p><p className="mt-1 text-[8px] font-black uppercase tracking-[.12em] text-[var(--text-secondary)]">{label}</p></div>)}</div>
        </div>
        <div className="relative flex flex-wrap items-center justify-between gap-4 border-t border-white/8 bg-black/15 px-6 py-4 sm:px-8 lg:px-10">
          <p className="text-[10px] text-[var(--text-secondary)]">Lider: <Link href={`/profil/${guild.user_id}`} className="font-bold text-amber-200 hover:underline">{leaderName}</Link> · w portalu od {formatDate(guild.created_at)}</p>
          <div className="flex flex-wrap gap-2">{user?.id !== guild.user_id && <FollowButton id={guild.id} name={guild.name} type="guild" />}<button type="button" onClick={() => setIsZvZOpen(true)} className="aopp-ghost-button inline-flex min-h-10 items-center gap-2 px-4 text-[10px] font-black"><Swords className="h-4 w-4" /> Inspekcja ZvZ</button>{guild.discord_link && <a href={guild.discord_link} target="_blank" rel="noopener noreferrer" className="aopp-ghost-button inline-flex min-h-10 items-center gap-2 px-4 text-[10px] font-black"><ExternalLink className="h-4 w-4" /> Discord</a>}<button type="button" disabled={!guild.recruitment_open} onClick={() => setIsApplyOpen(true)} className="btn btn-primary inline-flex min-h-10 items-center gap-2 px-4 text-[10px] font-black disabled:cursor-not-allowed disabled:opacity-45"><Users className="h-4 w-4" /> Złóż podanie</button></div>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto border-b border-white/8 pb-3" role="tablist" aria-label="Sekcje gildii">{tabItems.map(([id, Icon, label]) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)} className={`chip shrink-0 ${activeTab === id ? 'active' : ''}`}><Icon className="h-4 w-4" /> {label}</button>)}</div>

      {activeTab === 'overview' && <div className="grid gap-6 lg:grid-cols-[1.25fr_.75fr]"><section className="panel rounded-[24px] p-5 sm:p-7"><p className="text-[8px] font-black uppercase tracking-[.2em] text-amber-300">Manifest i wymagania</p><h2 className="font-display mt-1 text-2xl font-black text-white">Doktryna formacji</h2><p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{guild.description || 'Gildia nie opublikowała jeszcze manifestu.'}</p>{guild.recruitment_headline && <div className="mt-6 rounded-2xl border border-emerald-300/20 bg-emerald-300/5 p-4"><p className="text-[8px] font-black uppercase tracking-[.15em] text-emerald-300">Aktualna rekrutacja</p><p className="mt-2 text-sm font-bold leading-6 text-[var(--text-primary)]">{guild.recruitment_headline}</p></div>}</section><section className="panel rounded-[24px] p-5 sm:p-6"><p className="text-[8px] font-black uppercase tracking-[.2em] text-violet-300">Najbliższa mobilizacja</p>{upcomingEvents[0] ? <EventCard event={upcomingEvents[0]} featured /> : <div className="mt-5 rounded-2xl border border-dashed border-white/10 p-5 text-center"><Clock3 className="mx-auto h-6 w-6 text-[var(--text-secondary)]" /><p className="mt-3 text-xs text-[var(--text-secondary)]">Brak zaplanowanych wydarzeń.</p></div>}</section></div>}

      {activeTab === 'roster' && (members.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{members.map((member) => <MemberCard key={member.id} member={member} />)}</div> : <EmptyState icon={Users} title="Skład nie został jeszcze opublikowany" description="Lider gildii może budować skład przez przyjmowanie podań w panelu dowodzenia." />)}

      {activeTab === 'events' && (events.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{events.map((event) => <EventCard key={event.id} event={event} />)}</div> : <EmptyState icon={CalendarDays} title="Brak wydarzeń gildii" description="Dowództwo nie dodało jeszcze żadnej mobilizacji ani spotkania." />)}

      {activeTab === 'activity' && (activity.length ? <div className="panel overflow-hidden rounded-[24px]">{activity.map((entry, index) => { const Icon = ACTIVITY_ICONS[entry.event_type] || Sparkles; return <div key={entry.id} className={`flex items-center gap-4 p-4 sm:px-5 ${index ? 'border-t border-white/8' : ''}`}><span className="rounded-xl border border-white/8 bg-black/20 p-2.5 text-amber-300"><Icon className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="text-sm font-bold text-[var(--text-primary)]">{entry.title}</p>{entry.details && <p className="mt-1 truncate text-[10px] text-[var(--text-secondary)]">{entry.details}</p>}</div><span className="hidden shrink-0 font-mono text-[9px] text-[var(--text-secondary)] sm:block">{formatDate(entry.created_at, true)}</span></div> })}</div> : <EmptyState icon={Activity} title="Kronika jest jeszcze pusta" description="Zmiany składu, rekrutacji i wydarzenia będą zapisywane tutaj." />)}

      {activeTab === 'command' && canManage && <GuildCommandPanel guild={guild} onChanged={loadGuild} />}

      {isApplyOpen && <GuildApplyModal isOpen={isApplyOpen} onClose={() => setIsApplyOpen(false)} guild={guild} currentUser={user} />}
      {isZvZOpen && <GuildZvZInspectorModal isOpen={isZvZOpen} onClose={() => setIsZvZOpen(false)} guildName={guild.name} server={guild.server || 'Europa'} />}
    </div>
  )
}

function Badge({ icon: Icon, children }) {
  return <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.12em] text-[var(--text-primary)]"><Icon className="h-3.5 w-3.5 text-amber-300" /> {children}</span>
}

function MemberCard({ member }) {
  const profile = member.profiles || {}
  const name = profile.ingame_nick || profile.username || 'Gracz'
  return <Link href={`/profil/${member.user_id}`} className="panel panel-interactive group flex items-center gap-4 rounded-[22px] p-4"><div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/25">{profile.avatar_url ? <Image src={profile.avatar_url} alt={`Awatar ${name}`} fill sizes="56px" className="object-cover" /> : <CircleUserRound className="absolute inset-0 m-auto h-7 w-7 text-amber-200" />}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h3 className="truncate text-sm font-black text-white group-hover:text-amber-200">{name}</h3>{profile.is_verified && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-300" />}</div><p className="mt-1 truncate text-[10px] text-[var(--text-secondary)]">{member.title || profile.main_role || 'Wojownik gildii'}</p><span className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[.12em] ${ROLE_STYLES[member.role] || ROLE_STYLES.member}`}>{ROLE_LABELS[member.role] || 'Członek'}</span></div><ChevronRight className="h-4 w-4 text-[var(--text-secondary)] transition group-hover:translate-x-0.5 group-hover:text-amber-300" /></Link>
}

function EventCard({ event, featured = false }) {
  return <article className={`${featured ? 'mt-5' : 'panel'} rounded-[22px] border border-violet-300/15 bg-violet-300/[.035] p-5`}><div className="flex items-start justify-between gap-3"><span className="rounded-full border border-violet-300/25 bg-violet-300/10 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.13em] text-violet-200">{event.event_type}</span><span className="text-[8px] font-black uppercase tracking-[.12em] text-sky-200">{event.server}</span></div><h3 className="font-display mt-4 text-xl font-black text-white">{event.title}</h3>{event.description && <p className="mt-2 line-clamp-3 text-xs leading-5 text-[var(--text-secondary)]">{event.description}</p>}<div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-4"><span className="flex items-center gap-2 text-[10px] font-bold text-amber-200"><CalendarDays className="h-4 w-4" /> {formatDate(event.starts_at, true)}</span>{event.status === 'scheduled' && <Link href={`/kalendarz?event=${event.id}`} className="aopp-ghost-button px-3 py-2 text-[9px] font-black">Zapisy · {event.capacity || 20} miejsc</Link>}</div></article>
}
