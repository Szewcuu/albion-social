'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ShieldCheck,
  Shield,
  Swords,
  ShoppingBag,
  Users,
  Award,
  ExternalLink,
  ArrowLeft,
  Calendar,
  Sparkles,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { EmptyState, SkeletonBlock, StatusNotice } from '@/components/ui/FeedbackState'
import { EquipmentPreview } from '@/components/builds/EquipmentGrid'
import { buildFromDbRow } from '@/lib/buildSlots'

const ROLE_STYLES = {
  Tank: 'badge-sky',
  Healer: 'badge-forest',
  DPS: 'badge-blood',
  Support: 'badge-purple',
}

function formatDate(value) {
  if (!value) return 'Właśnie dołączył'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function PublicProfilePage() {
  const params = useParams()
  const profileId = params?.id

  const [profile, setProfile] = useState(null)
  const [builds, setBuilds] = useState([])
  const [offers, setOffers] = useState([])
  const [expeditions, setExpeditions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activeTab, setActiveTab] = useState('builds')

  const fetchProfileData = useCallback(async () => {
    if (!profileId) return
    setLoading(true)
    setError(null)

    try {
      // 1. Fetch profile by ID or username
      let profileRes = await supabase.from('profiles').select('*').eq('id', profileId).maybeSingle()
      
      if (!profileRes.data) {
        profileRes = await supabase.from('profiles').select('*').eq('username', profileId).maybeSingle()
      }

      if (!profileRes.data) {
        setError('Nie znaleziono profilu danego gracza.')
        setLoading(false)
        return
      }

      const foundProfile = profileRes.data
      setProfile(foundProfile)

      // 2. Fetch player's public data in parallel
      const [buildsRes, offersRes, expeditionsRes] = await Promise.all([
        supabase.from('builds').select('*, build_votes(id, vote_type)').eq('user_id', foundProfile.id).order('created_at', { ascending: false }),
        supabase.from('market_items').select('*').eq('user_id', foundProfile.id).order('created_at', { ascending: false }),
        supabase.from('expeditions').select('*').eq('user_id', foundProfile.id).order('created_at', { ascending: false }),
      ])

      setBuilds(buildResData(buildsRes.data))
      setOffers(offersRes.data || [])
      setExpeditions(expeditionsRes.data || [])
    } catch (err) {
      console.error('Błąd pobierania publicznego profilu:', err)
      setError('Wystąpił błąd podczas ładowania profilu.')
    } finally {
      setLoading(false)
    }
  }, [profileId])

  useEffect(() => {
    fetchProfileData()
  }, [fetchProfileData])

  if (loading) {
    return (
      <div className="page-content">
        <div className="subpage-header">
          <h1>Profil Gracza</h1>
          <p>Pobieranie karty przygód...</p>
        </div>
        <div className="space-y-4">
          <SkeletonBlock className="h-48 rounded-xl" />
          <SkeletonBlock className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="page-content">
        <div className="subpage-header">
          <h1>Profil Gracza</h1>
          <p>Profil nie został odnaleziony.</p>
        </div>
        <EmptyState
          icon={Shield}
          title="Brak wyników w rejestrze"
          description={error || 'Szukany profil gracza nie istnieje lub został usunięty.'}
          actionLabel="Wróć do strony głównej"
          actionHref="/"
        />
      </div>
    )
  }

  const isVerified = Boolean(profile.is_verified || profile.verified_player_id)
  const roleBadgeClass = ROLE_STYLES[profile.main_role] || 'badge-gold'

  return (
    <div className="page-content">
      {/* Back button & Header */}
      <div className="mb-4">
        <Link href="/" className="btn btn-ghost btn-sm inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Wróć do portalu
        </Link>
      </div>

      {/* Main Profile Header Panel */}
      <div className="panel mb-6" style={{ borderLeft: '4px solid var(--gold-dim)' }}>
        <div className="panel-body flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.username || 'Gracz'}
                width={80}
                height={80}
                className="w-20 h-20 rounded-xl object-cover border border-[var(--border-warm)] shadow-md"
              />
            ) : (
              <div
                className="w-20 h-20 rounded-xl bg-[var(--bg-stone)] border border-[var(--border-warm)] flex items-center justify-center text-3xl font-bold text-[var(--gold)] shadow-md"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                {(profile.username || 'G').charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1">
                <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '22px', color: 'var(--text-bright)', fontWeight: 700 }}>
                  {profile.username || 'Anonimowy Wojownik'}
                </h1>
                {isVerified && (
                  <span className="badge badge-forest flex items-center gap-1" title="Zweryfikowany gracz Albion Online">
                    <ShieldCheck className="w-3.5 h-3.5" /> Zweryfikowany
                  </span>
                )}
                <span className={`badge ${roleBadgeClass}`}>
                  {profile.main_role || 'Gracz'}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-body)] mt-2 font-mono">
                {profile.ingame_nick && (
                  <span className="flex items-center gap-1">
                    <Swords className="w-3.5 h-3.5 text-[var(--gold)]" /> Nick w grze: <strong>{profile.ingame_nick}</strong>
                  </span>
                )}
                {profile.guild_name && (
                  <span className="flex items-center gap-1">
                    <Shield className="w-3.5 h-3.5 text-[var(--forest)]" /> Gildia: <strong>{profile.guild_name}</strong>
                  </span>
                )}
                {profile.main_server && (
                  <span className="flex items-center gap-1">
                    Serwer: <strong>{profile.main_server}</strong>
                  </span>
                )}
                <span className="flex items-center gap-1 text-[var(--text-muted)]">
                  <Calendar className="w-3.5 h-3.5" /> Dołączył: {formatDate(profile.created_at)}
                </span>
                {(profile.ingame_nick || profile.username) && (
                  <Link
                    href={`/killboard?nick=${encodeURIComponent(profile.ingame_nick || profile.username)}`}
                    className="btn btn-ghost btn-xs inline-flex items-center gap-1 text-[10px] text-rose-300 hover:text-rose-200 ml-auto md:ml-0"
                  >
                    <Swords className="w-3 h-3 text-rose-400" />
                    <span>Statystyki Killboard</span>
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Player Quick Stats */}
          <div className="flex items-center gap-3 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0 border-[var(--border)]">
            <div className="stat-card flex-1 md:flex-none text-center px-4 py-2.5">
              <span className="stat-card-label">Średnie IP</span>
              <span className="stat-card-value gold" style={{ fontSize: '18px' }}>
                {profile.avg_ip || 1400}
              </span>
            </div>
            <div className="stat-card flex-1 md:flex-none text-center px-4 py-2.5">
              <span className="stat-card-label">Buildy</span>
              <span className="stat-card-value sky" style={{ fontSize: '18px' }}>
                {builds.length}
              </span>
            </div>
            <div className="stat-card flex-1 md:flex-none text-center px-4 py-2.5">
              <span className="stat-card-label">Oferty</span>
              <span className="stat-card-value forest" style={{ fontSize: '18px' }}>
                {offers.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Trophies & Achievements */}
      {(() => {
        const badges = []
        if (isVerified) badges.push({ emoji: '🛡️', label: 'Zweryfikowany', desc: 'Potwierdzona postać w Albion Online', color: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' })
        if (builds.length >= 1) badges.push({ emoji: '⚔️', label: 'Rzemieślnik Buildów', desc: 'Opublikował co najmniej 1 build', color: 'border-amber-400/30 bg-amber-500/10 text-amber-300' })
        if (builds.length >= 5) badges.push({ emoji: '🏹', label: 'Mistrz Kuźni', desc: '5+ buildów w Zbrojowni', color: 'border-amber-400/30 bg-amber-500/10 text-amber-300' })
        if (offers.length >= 1) badges.push({ emoji: '🏪', label: 'Kupiec', desc: 'Wystawił co najmniej 1 ofertę na Rynku', color: 'border-sky-400/30 bg-sky-500/10 text-sky-300' })
        if (offers.length >= 5) badges.push({ emoji: '💰', label: 'Baron Handlowy', desc: '5+ ofert na Rynku P2P', color: 'border-sky-400/30 bg-sky-500/10 text-sky-300' })
        if (expeditions.length >= 1) badges.push({ emoji: '🧭', label: 'Poszukiwacz Przygód', desc: 'Uczestnik co najmniej 1 wyprawy', color: 'border-violet-400/30 bg-violet-500/10 text-violet-300' })
        if (profile.guild_name) badges.push({ emoji: '⚜️', label: 'Gildyjny', desc: `Członek gildii: ${profile.guild_name}`, color: 'border-rose-400/30 bg-rose-500/10 text-rose-300' })
        const joinDays = profile.created_at ? Math.floor((new Date() - new Date(profile.created_at)) / (1000 * 60 * 60 * 24)) : 0
        if (joinDays >= 30) badges.push({ emoji: '🏆', label: 'Weteran Portalu', desc: '30+ dni aktywności na portalu', color: 'border-yellow-400/30 bg-yellow-500/10 text-yellow-300' })

        if (badges.length === 0) return null
        return (
          <div className="panel mb-6 p-5">
            <p className="text-[9px] font-black uppercase tracking-[.2em] text-amber-400 mb-3">Trofea i Osiągnięcia</p>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge, i) => (
                <div
                  key={i}
                  title={badge.desc}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold font-mono ${badge.color}`}
                >
                  <span>{badge.emoji}</span>
                  <span>{badge.label}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Tabs Navigation */}
      <div className="flex gap-2 mb-6 border-b border-[var(--border)] pb-3">
        <button
          onClick={() => setActiveTab('builds')}
          className={`chip ${activeTab === 'builds' ? 'active' : ''}`}
        >
          <Swords className="w-4 h-4" /> Doktryny & Buildy ({builds.length})
        </button>
        <button
          onClick={() => setActiveTab('offers')}
          className={`chip ${activeTab === 'offers' ? 'active' : ''}`}
        >
          <ShoppingBag className="w-4 h-4" /> Oferty na Rynku ({offers.length})
        </button>
        <button
          onClick={() => setActiveTab('expeditions')}
          className={`chip ${activeTab === 'expeditions' ? 'active' : ''}`}
        >
          <Users className="w-4 h-4" /> Organizowane Wyprawy ({expeditions.length})
        </button>
      </div>

      {/* Tab Content: Builds */}
      {activeTab === 'builds' && (
        <div>
          {builds.length === 0 ? (
            <EmptyState
              icon={Swords}
              title="Brak opublikowanych doktryn"
              description="Ten gracz nie dodał jeszcze własnego zestawu ekwipunku w Kuźni Buildów."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {builds.map((b) => {
                const parsed = buildFromDbRow(b)
                const voteCount = Math.max(
                  (b.build_votes || []).filter((vote) => vote.vote_type === 'up').length,
                  b.votes_count || 0
                )
                return (
                  <article key={b.id} className="panel panel-interactive flex flex-col justify-between overflow-hidden">
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="badge badge-gold">{b.activity_type || 'PvP'}</span>
                        <span className="text-[11px] text-[var(--text-muted)] font-mono">
                          {formatDate(b.created_at)}
                        </span>
                      </div>
                      <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', color: 'var(--text-bright)' }} className="hover:text-[var(--gold)] transition">
                        <Link href={`/buildy/${b.id}`}>{b.title}</Link>
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-[var(--text-body)]">
                        {b.description || 'Brak opisu taktycznego.'}
                      </p>
                    </div>

                    <div className="mx-4 mb-3 p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-stone)]">
                      <EquipmentPreview slots={parsed.slots} size="sm" />
                    </div>

                    <div className="flex items-center justify-between px-4 pb-3 pt-2 border-t border-[var(--border)] text-xs text-[var(--text-muted)]">
                      <span className="font-mono">Głosy: <strong className="text-[var(--gold-bright)]">{voteCount}</strong></span>
                      <Link href={`/buildy/${b.id}`} className="btn btn-ghost btn-sm">
                        Zobacz <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Market Offers */}
      {activeTab === 'offers' && (
        <div>
          {offers.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="Brak aktywnych ofert"
              description="Gracz nie posiada aktualnie żadnych ogłoszeń w handlu P2P."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {offers.map((item) => (
                <div key={item.id} className="panel p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`badge ${item.transaction_type === 'SELL' ? 'badge-blood' : 'badge-forest'}`}>
                        {item.transaction_type === 'SELL' ? 'Sprzedam' : 'Kupię'}
                      </span>
                      <span className="text-xs font-mono text-[var(--gold-bright)] font-bold">
                        {Number(item.price).toLocaleString('pl-PL')} Silver
                      </span>
                    </div>
                    <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '14px', color: 'var(--text-bright)' }}>
                      {item.item_name}
                    </h4>
                    <p className="text-xs text-[var(--text-body)] mt-1">
                      Miasto: <strong>{item.city || 'Bridgewatch'}</strong>
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Expeditions */}
      {activeTab === 'expeditions' && (
        <div>
          {expeditions.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Brak organizowanych zbiórek"
              description="Gracz nie zgłosił ostatnio nowych wypraw grupowych."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {expeditions.map((exp) => (
                <div key={exp.id} className="panel p-4 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="badge badge-gold">{exp.activity_type || 'Wyprawa'}</span>
                    <span className="text-xs font-mono text-[var(--text-muted)]">
                      {formatDate(exp.created_at)}
                    </span>
                  </div>
                  <h4 style={{ fontFamily: 'var(--font-heading)', fontSize: '15px', color: 'var(--text-bright)' }}>
                    {exp.title}
                  </h4>
                  <p className="text-xs text-[var(--text-body)] leading-relaxed">
                    {exp.description || 'Brak dodatkowego opisu.'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function buildResData(data) {
  if (!data) return []
  return data.map((b) => ({
    ...b,
    votes_count: (b.build_votes || []).filter((v) => v.vote_type === 'up').length,
  }))
}
