'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, ArrowLeft, Bookmark, CalendarDays, ChevronRight, CircleUserRound, Compass, Crown, Flame, Heart, MessageSquare, Shield, ShieldCheck, ShoppingBag, Sparkles, Swords, Trophy } from 'lucide-react'

import EquipmentPreview from '@/components/builds/EquipmentPreview'
import { EmptyState, SkeletonBlock } from '@/components/ui/FeedbackState'
import FollowButton from '@/components/ui/FollowButton'
import { usePortalSession } from '@/contexts/PortalSessionContext'
import { buildFromDbRow } from '@/lib/buildSlots'
import { supabase } from '@/lib/supabase'

const PROFILE_FIELDS = [
  'id', 'username', 'avatar_url', 'created_at', 'ingame_nick', 'main_server',
  'guild_name', 'main_role', 'avg_ip', 'bio', 'favorite_builds_public', 'favorite_roles', 'featured_build_ids',
  'is_verified', 'verified_player_id', 'verified_server', 'verified_region', 'pvp_fame', 'pve_fame', 'verified_at',
].join(', ')

const BUILD_FIELDS = 'id, user_id, title, description, activity_type, weapon, offhand, helmet, armor, shoes, cape, head, potion, food, bag, build_data, votes_count, created_at, status, build_votes(id, vote_type)'

const ROLE_STYLES = {
  Tank: 'border-sky-400/30 bg-sky-400/10 text-sky-200',
  Healer: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  DPS: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
  Support: 'border-violet-400/30 bg-violet-400/10 text-violet-200',
}

function formatDate(value, withTime = false) {
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return 'Data nieznana'
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date)
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('pl-PL')
}

function voteCount(build) {
  return Math.max(
    (build.build_votes || []).filter((vote) => vote.vote_type === 'up').length,
    Number(build.votes_count || 0),
  )
}

function ProfileSkeleton() {
  return <div className="page-content space-y-5"><SkeletonBlock className="h-12 w-44 rounded-xl" /><SkeletonBlock className="h-72 rounded-[28px]" /><div className="grid gap-5 lg:grid-cols-2"><SkeletonBlock className="h-72 rounded-[24px]" /><SkeletonBlock className="h-72 rounded-[24px]" /></div></div>
}

function BuildCard({ build, favorite = false, badge = '' }) {
  const parsed = buildFromDbRow(build)
  return (
    <Link href={`/buildy/${build.id}`} className="panel panel-interactive group flex min-w-0 flex-col overflow-hidden rounded-[22px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--amber)]">
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-amber-300/25 bg-amber-300/8 px-2.5 py-1 text-[8px] font-black uppercase tracking-[.15em] text-amber-200">{build.activity_type || 'Doktryna'}</span>
            {(favorite || badge) && <span className="flex items-center gap-1 text-[8px] font-black uppercase tracking-[.13em] text-orange-200"><Bookmark className="h-3 w-3 fill-current" /> {badge || 'polecany'}</span>}
          </div>
          <h3 className="font-display truncate text-lg font-black text-[var(--text-primary)] transition group-hover:text-[var(--amber)]">{build.title}</h3>
          <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-[var(--text-secondary)]">{build.description || 'Build bez opisu taktycznego.'}</p>
        </div>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[var(--text-secondary)] transition group-hover:translate-x-0.5 group-hover:text-[var(--amber)]" />
      </div>
      <div className="mx-4 rounded-xl border border-white/8 bg-black/20 p-3"><EquipmentPreview slots={parsed.slots} size="sm" /></div>
      <div className="mt-auto flex items-center justify-between border-t border-white/8 px-4 py-3 font-mono text-[9px] text-[var(--text-secondary)]"><span>{formatDate(build.created_at)}</span><span className="flex items-center gap-1 text-amber-200"><Heart className="h-3 w-3" /> {voteCount(build)}</span></div>
    </Link>
  )
}

export default function PublicProfilePage() {
  const { id: profileId } = useParams()
  const { user } = usePortalSession()
  const [profile, setProfile] = useState(null)
  const [builds, setBuilds] = useState([])
  const [favorites, setFavorites] = useState([])
  const [offers, setOffers] = useState([])
  const [expeditions, setExpeditions] = useState([])
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('activity')

  const loadProfile = useCallback(async () => {
    if (!profileId) return
    setLoading(true)
    setError('')
    try {
      let profileResult = await supabase.from('profiles').select(PROFILE_FIELDS).eq('id', profileId).maybeSingle()
      if (!profileResult.data && !profileResult.error) profileResult = await supabase.from('profiles').select(PROFILE_FIELDS).eq('username', profileId).maybeSingle()
      if (profileResult.error) throw profileResult.error
      if (!profileResult.data) {
        setError('Nie znaleziono profilu danego gracza.')
        return
      }

      const found = profileResult.data
      setProfile(found)
      const requests = [
        supabase.from('builds').select(BUILD_FIELDS).eq('user_id', found.id).eq('status', 'visible').order('created_at', { ascending: false }).limit(12),
        supabase.from('market_items').select('id, title, item_name, price, city, category, created_at, status').eq('user_id', found.id).eq('status', 'visible').order('created_at', { ascending: false }).limit(12),
        supabase.from('expeditions').select('id, title, activity_type, server, start_time, created_at, status').eq('user_id', found.id).eq('status', 'visible').order('created_at', { ascending: false }).limit(12),
        supabase.from('build_comments').select('id, build_id, content, created_at, status, builds!build_comments_build_id_fkey(id, title)').eq('user_id', found.id).eq('status', 'visible').order('created_at', { ascending: false }).limit(12),
      ]
      if (found.favorite_builds_public) requests.push(supabase.from('build_favorites').select(`created_at, builds!build_favorites_build_id_fkey(${BUILD_FIELDS})`).eq('user_id', found.id).order('created_at', { ascending: false }).limit(12))

      const [buildResult, offerResult, expeditionResult, commentResult, favoriteResult] = await Promise.all(requests)
      const firstError = [buildResult, offerResult, expeditionResult, commentResult, favoriteResult].find((result) => result?.error)?.error
      if (firstError) throw firstError
      setBuilds(buildResult.data || [])
      setOffers(offerResult.data || [])
      setExpeditions(expeditionResult.data || [])
      setComments(commentResult.data || [])
      setFavorites((favoriteResult?.data || []).map((row) => row.builds).filter(Boolean))
    } catch (loadError) {
      console.error('Błąd pobierania publicznego profilu:', loadError)
      setError('Nie udało się załadować karty gracza. Spróbuj ponownie.')
    } finally {
      setLoading(false)
    }
  }, [profileId])

  useEffect(() => { void Promise.resolve().then(loadProfile) }, [loadProfile])

  const timeline = useMemo(() => [
    ...builds.map((item) => ({ id: `build-${item.id}`, at: item.created_at, icon: Swords, tone: 'text-amber-300', label: 'Opublikował build', title: item.title, href: `/buildy/${item.id}` })),
    ...offers.map((item) => ({ id: `offer-${item.id}`, at: item.created_at, icon: ShoppingBag, tone: 'text-sky-300', label: 'Dodał ofertę na rynku', title: item.title || item.item_name || 'Oferta handlowa', href: '/rynek' })),
    ...expeditions.map((item) => ({ id: `expedition-${item.id}`, at: item.created_at, icon: Compass, tone: 'text-violet-300', label: 'Zwołał wyprawę', title: item.title, href: '/wyprawy' })),
    ...comments.map((item) => ({ id: `comment-${item.id}`, at: item.created_at, icon: MessageSquare, tone: 'text-emerald-300', label: 'Dołączył do dyskusji', title: item.builds?.title || 'Rada wojowników', href: `/buildy/${item.build_id}` })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 16), [builds, comments, expeditions, offers])

  if (loading) return <ProfileSkeleton />
  if (error || !profile) return <div className="page-content"><EmptyState icon={Shield} title="Profil poza rejestrem" description={error || 'Ten profil nie istnieje lub został usunięty.'} actionLabel="Wróć do portalu" actionHref="/" /></div>

  const displayName = (profile.username || 'Gracz Albionu').replace(/#0$/, '')
  const characterName = profile.ingame_nick || 'Postać nieprzypięta'
  const verified = Boolean(profile.is_verified && profile.verified_player_id)
  const roleStyle = ROLE_STYLES[profile.main_role] || 'border-amber-300/25 bg-amber-300/8 text-amber-200'
  const favoriteRoles = Array.isArray(profile.favorite_roles) && profile.favorite_roles.length
    ? profile.favorite_roles
    : [profile.main_role].filter(Boolean)
  const featuredBuilds = (Array.isArray(profile.featured_build_ids) ? profile.featured_build_ids : [])
    .map((buildId) => builds.find((build) => build.id === buildId))
    .filter(Boolean)

  return (
    <div className="page-content min-w-0 space-y-6 overflow-x-clip">
      <Link href="/" className="aopp-ghost-button inline-flex min-h-11 items-center gap-2 px-4 text-xs font-bold"><ArrowLeft className="h-4 w-4" /> Wróć do portalu</Link>

      <header className="panel relative overflow-hidden rounded-[30px] border-amber-300/20">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_0%,rgba(210,158,50,.2),transparent_42%),linear-gradient(120deg,rgba(77,22,12,.35),transparent_55%)]" />
        <div className="relative grid gap-7 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center lg:p-10">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[22px] border-2 border-amber-300/45 bg-black/30 shadow-[0_18px_50px_rgba(0,0,0,.45)]">
              {profile.avatar_url ? <Image src={profile.avatar_url} alt={`Awatar ${displayName}`} fill sizes="96px" className="object-cover" /> : <CircleUserRound className="absolute inset-0 m-auto h-11 w-11 text-amber-200" />}
            </div>
            <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[.24em] text-amber-300">Karta gracza</p><h1 className="font-display mt-2 truncate text-3xl font-black text-white sm:text-4xl">{displayName}</h1><div className="mt-3 flex flex-wrap items-center gap-2">{favoriteRoles.map((role) => <span key={role} className={`rounded-full border px-3 py-1.5 text-[9px] font-black uppercase tracking-[.13em] ${ROLE_STYLES[role] || roleStyle}`}>{role}</span>)}{verified && <span className="flex items-center gap-1.5 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[.13em] text-emerald-200"><ShieldCheck className="h-3.5 w-3.5" /> postać przypięta</span>}<span className="flex items-center gap-1.5 text-[10px] text-[var(--text-secondary)]"><CalendarDays className="h-3.5 w-3.5" /> w portalu od {formatDate(profile.created_at)}</span></div></div>
          </div>
          <div><div className="grid grid-cols-3 gap-2 sm:gap-3">{[[Trophy, 'Buildy', builds.length], [Activity, 'Aktywność', timeline.length], [Bookmark, 'Polecane', profile.favorite_builds_public ? favorites.length : '—']].map(([Icon, label, value]) => <div key={label} className="min-w-[84px] rounded-2xl border border-white/8 bg-black/20 p-3 text-center sm:min-w-[105px]"><Icon className="mx-auto h-4 w-4 text-amber-300" /><p className="font-display mt-2 text-xl font-black text-white">{value}</p><p className="mt-1 text-[8px] font-black uppercase tracking-[.13em] text-[var(--text-secondary)]">{label}</p></div>)}</div>{user?.id !== profile.id && <FollowButton id={profile.id} name={displayName} type="player" className="mt-3 w-full" />}</div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <section className="panel rounded-[26px] p-5 sm:p-6">
          <div className="flex items-center gap-3 border-b border-white/8 pb-4"><span className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-2.5 text-amber-200"><Crown className="h-5 w-5" /></span><div><p className="text-[8px] font-black uppercase tracking-[.2em] text-amber-300">Przypięta postać</p><h2 className="font-display mt-1 text-xl font-black text-white">{characterName}</h2></div></div>
          {verified ? <><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl border border-rose-300/15 bg-rose-400/5 p-4"><p className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[.15em] text-rose-300"><Swords className="h-3.5 w-3.5" /> PvP Fame</p><p className="font-display mt-2 text-2xl font-black text-white">{formatNumber(profile.pvp_fame)}</p></div><div className="rounded-2xl border border-amber-300/15 bg-amber-400/5 p-4"><p className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[.15em] text-amber-300"><Flame className="h-3.5 w-3.5" /> PvE Fame</p><p className="font-display mt-2 text-2xl font-black text-white">{formatNumber(profile.pve_fame)}</p></div></div><div className="mt-3 grid grid-cols-2 gap-3 text-xs"><InfoBox label="Serwer" value={profile.verified_server || profile.main_server || 'Nieustalony'} /><InfoBox label="Item Power" value={formatNumber(profile.avg_ip)} /></div><Link href={`/killboard?nick=${encodeURIComponent(characterName)}&region=${profile.verified_region || 'europe'}`} className="btn btn-primary mt-4 inline-flex w-full items-center justify-center gap-2 py-3 text-xs font-black uppercase tracking-[.1em]"><Swords className="h-4 w-4" /> Otwórz Killboard</Link></> : <div className="mt-5 rounded-2xl border border-dashed border-white/12 bg-black/15 p-5 text-center"><Shield className="mx-auto h-7 w-7 text-[var(--text-secondary)]" /><p className="mt-3 text-sm font-bold text-[var(--text-primary)]">Nie przypięto jeszcze postaci.</p><p className="mt-1 text-[10px] leading-5 text-[var(--text-secondary)]">Statystyki Fame pojawią się po połączeniu profilu z Albion Online API.</p></div>}
        </section>

        <section className="panel rounded-[26px] p-5 sm:p-6">
          <p className="text-[8px] font-black uppercase tracking-[.2em] text-amber-300">O graczu</p><h2 className="font-display mt-1 text-xl font-black text-white">Notatka z dziennika</h2><p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--text-secondary)]">{profile.bio || 'Ten gracz nie uzupełnił jeszcze opisu. Zajrzyj do jego aktywności i opublikowanych doktryn.'}</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2"><InfoBox label="Gildia" value={profile.guild_name || 'Bez gildii'} icon={Shield} /><InfoBox label="Główny serwer" value={profile.main_server || 'Nieustalony'} icon={Sparkles} /></div>
        </section>
      </div>

      {featuredBuilds.length > 0 && (
        <section>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div><p className="text-[8px] font-black uppercase tracking-[.2em] text-amber-300">Zestawy sygnaturowe</p><h2 className="font-display mt-1 text-2xl font-black text-white">Najczęściej używane buildy</h2></div>
            <span className="font-mono text-[9px] uppercase text-[var(--text-secondary)]">wybrane przez gracza</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {featuredBuilds.map((build) => <BuildCard key={build.id} build={build} badge="najczęściej gram" />)}
          </div>
        </section>
      )}

      <section>
        <div className="mb-5 flex gap-2 overflow-x-auto border-b border-white/8 pb-3" role="tablist" aria-label="Sekcje profilu">{[['activity', Activity, `Aktywność (${timeline.length})`], ['builds', Swords, `Buildy (${builds.length})`], ['favorites', Bookmark, `Polecane (${profile.favorite_builds_public ? favorites.length : 0})`]].map(([id, Icon, label]) => <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)} className={`chip shrink-0 ${activeTab === id ? 'active' : ''}`}><Icon className="h-4 w-4" /> {label}</button>)}</div>

        {activeTab === 'activity' && (timeline.length ? <div className="panel overflow-hidden rounded-[24px]">{timeline.map((item, index) => { const Icon = item.icon; return <Link key={item.id} href={item.href} className={`group flex items-center gap-4 p-4 transition hover:bg-white/[.035] sm:px-5 ${index ? 'border-t border-white/8' : ''}`}><span className={`rounded-xl border border-white/8 bg-black/20 p-2.5 ${item.tone}`}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block text-[9px] font-black uppercase tracking-[.13em] text-[var(--text-secondary)]">{item.label}</span><span className="mt-1 block truncate text-sm font-bold text-[var(--text-primary)]">{item.title}</span></span><span className="hidden shrink-0 font-mono text-[9px] text-[var(--text-secondary)] sm:block">{formatDate(item.at, true)}</span><ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-secondary)] transition group-hover:translate-x-0.5 group-hover:text-amber-300" /></Link> })}</div> : <EmptyState icon={Activity} title="Dziennik jest jeszcze pusty" description="Publiczne buildy, wyprawy, oferty i komentarze tego gracza pojawią się tutaj chronologicznie." />)}
        {activeTab === 'builds' && (builds.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{builds.map((build) => <BuildCard key={build.id} build={build} />)}</div> : <EmptyState icon={Swords} title="Brak opublikowanych buildów" description="Ten gracz nie opublikował jeszcze doktryny w Kuźni Buildów." />)}
        {activeTab === 'favorites' && (profile.favorite_builds_public ? (favorites.length ? <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{favorites.map((build) => <BuildCard key={build.id} build={build} favorite />)}</div> : <EmptyState icon={Bookmark} title="Brak polecanych buildów" description="Gracz udostępnia kolekcję, ale nie zapisał jeszcze żadnego buildu." />) : <EmptyState icon={ShieldCheck} title="Kolekcja prywatna" description="Ulubione buildy są widoczne tylko wtedy, gdy właściciel profilu świadomie udostępni kolekcję." />)}
      </section>
    </div>
  )
}

function InfoBox({ label, value, icon: Icon }) {
  return <div className="rounded-xl border border-white/8 bg-black/15 p-3"><p className="text-[8px] font-black uppercase tracking-[.13em] text-[var(--text-secondary)]">{label}</p><p className="mt-1 flex items-center gap-2 font-bold text-[var(--text-primary)]">{Icon && <Icon className="h-4 w-4 text-emerald-300" />}{value}</p></div>
}
