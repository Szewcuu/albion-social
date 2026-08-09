'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  Shield,
  Swords,
  Globe,
  MapPin,
  Users,
  ExternalLink,
  ArrowLeft,
  Calendar,
  Sparkles,
  HelpCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { EmptyState, SkeletonBlock } from '@/components/ui/FeedbackState'
import GuildApplyModal from '@/components/GuildApplyModal'
import GuildZvZInspectorModal from '@/components/guilds/GuildZvZInspectorModal'

function formatDate(value) {
  if (!value) return 'Niedawno'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function GuildDetailPage() {
  const params = useParams()
  const guildId = params?.id

  const [guild, setGuild] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)
  const [isZvZInspectorOpen, setIsZvZInspectorOpen] = useState(false)

  const fetchGuild = useCallback(async () => {
    if (!guildId) return
    setLoading(true)
    setError(null)

    try {
      // Fetch by ID or name
      let res = await supabase
        .from('guilds')
        .select('*, profiles!guilds_user_id_fkey(username, avatar_url, ingame_nick)')
        .eq('id', guildId)
        .maybeSingle()

      if (!res.data) {
        res = await supabase
          .from('guilds')
          .select('*, profiles!guilds_user_id_fkey(username, avatar_url, ingame_nick)')
          .ilike('name', guildId)
          .maybeSingle()
      }

      if (!res.data) {
        setError('Gildia nie została odnaleziona w rejestrze.')
      } else {
        setGuild(res.data)
      }
    } catch (err) {
      console.error('Błąd pobierania gildii:', err)
      setError('Wystąpił błąd podczas ładowania danych gildii.')
    } finally {
      setLoading(false)
    }
  }, [guildId])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      fetchGuild()
    })
  }, [fetchGuild])

  if (loading) {
    return (
      <div className="page-content">
        <div className="subpage-header">
          <h1>Manifest Gildii</h1>
          <p>Pobieranie rejestru chorągwi...</p>
        </div>
        <div className="space-y-4">
          <SkeletonBlock className="h-48 rounded-xl" />
          <SkeletonBlock className="h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error || !guild) {
    return (
      <div className="page-content">
        <div className="subpage-header">
          <h1>Manifest Gildii</h1>
          <p>Chorągiew nie odnaleziona.</p>
        </div>
        <EmptyState
          icon={Shield}
          title="Brak wyników"
          description={error || 'Szukana gildia nie istnieje lub jej rejestracja wygasła.'}
          actionLabel="Wróć do listy gildii"
          actionHref="/gildie"
        />
      </div>
    )
  }

  const leaderUsername = guild.profiles?.username || guild.profiles?.ingame_nick || 'Lider'

  return (
    <div className="page-content">
      {/* Back Link */}
      <div className="mb-4">
        <Link href="/gildie" className="btn btn-ghost btn-sm inline-flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Wróć do rejestru gildii
        </Link>
      </div>

      {/* Main Guild Banner */}
      <div className="panel mb-6 relative overflow-hidden" style={{ borderLeft: '4px solid var(--gold-dim)' }}>
        <div className="pointer-events-none absolute -right-4 -top-10 text-[11rem] font-black leading-none text-[var(--gold)]/[.04]">
          {guild.name.charAt(0)}
        </div>

        <div className="panel-body relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-[var(--gold-glow)] border border-[var(--border-warm)] flex items-center justify-center text-3xl font-bold text-[var(--gold-bright)] shadow-md" style={{ fontFamily: 'var(--font-heading)' }}>
                {guild.name.charAt(0)}
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--text-muted)]">Chorągiew Gildyjna</span>
                <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '26px', color: 'var(--text-bright)', fontWeight: 700 }}>
                  {guild.name}
                </h1>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="badge badge-gold">
                    <Globe className="w-3 h-3" /> {guild.server || 'Europa'}
                  </span>
                  <span className="badge badge-forest">
                    <MapPin className="w-3 h-3" /> {guild.main_city || 'Martlock'}
                  </span>
                  <span className="badge badge-blood">
                    <Swords className="w-3 h-3" /> {guild.activity_type || 'PvP'}
                  </span>
                </div>
              </div>
            </div>

            {/* Guild Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsApplyModalOpen(true)}
                className="btn btn-primary"
              >
                <Users className="w-4 h-4" /> Dołącz / Rekrutacja
              </button>

              <button
                onClick={() => setIsZvZInspectorOpen(true)}
                className="btn btn-secondary"
              >
                <Swords className="w-4 h-4 text-[var(--gold)]" /> Inspekcja ZvZ
              </button>

              {guild.discord_link && (
                <a
                  href={guild.discord_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                >
                  <ExternalLink className="w-4 h-4" /> Discord Gildii
                </a>
              )}
            </div>
          </div>

          <hr className="divider" />

          {/* Leader and Registration Info */}
          <div className="flex flex-wrap items-center justify-between text-xs text-[var(--text-body)] gap-4">
            <div className="flex items-center gap-2">
              <span>Lider / Założyciel:</span>
              <Link href={`/profil/${guild.user_id}`} className="font-bold text-[var(--gold)] hover:underline flex items-center gap-1">
                {leaderUsername}
              </Link>
            </div>
            <div className="flex items-center gap-2 text-[var(--text-muted)] font-mono">
              <Calendar className="w-3.5 h-3.5" /> Rejestracja w portalu: {formatDate(guild.created_at)}
            </div>
          </div>
        </div>
      </div>

      {/* Guild Description & Doctrine Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 panel">
          <div className="panel-header">
            <span>Manifest & Wymagania</span>
          </div>
          <div className="panel-body leading-relaxed text-sm text-[var(--text-primary)] whitespace-pre-wrap">
            {guild.description || 'Brak opisu doktryny gildyjnej.'}
          </div>
        </div>

        {/* Guild Overview Sidebar */}
        <div className="panel space-y-4">
          <div className="panel-header">
            <span>Metryki Chorągwi</span>
          </div>
          <div className="panel-body space-y-3 font-mono text-xs">
            <div className="flex justify-between py-2 border-b border-[var(--border)]">
              <span className="text-[var(--text-muted)]">Główny Serwer:</span>
              <span className="font-bold text-[var(--gold-bright)]">{guild.server || 'Europa'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[var(--border)]">
              <span className="text-[var(--text-muted)]">Miasto Bazowe:</span>
              <span className="font-bold text-white">{guild.main_city || 'Martlock'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[var(--border)]">
              <span className="text-[var(--text-muted)]">Główna Doktryna:</span>
              <span className="font-bold text-[var(--forest)]">{guild.activity_type || 'PvP'}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[var(--text-muted)]">Integracja Webhook:</span>
              <span className={`font-bold ${guild.webhook_url ? 'text-[var(--forest)]' : 'text-[var(--text-muted)]'}`}>
                {guild.webhook_url ? 'Aktywna' : 'Brak'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Recruitment Modal */}
      {isApplyModalOpen && (
        <GuildApplyModal
          isOpen={isApplyModalOpen}
          onClose={() => setIsApplyModalOpen(false)}
          guild={guild}
          currentUser={user}
        />
      )}

      {/* ZvZ Inspector Modal */}
      {isZvZInspectorOpen && (
        <GuildZvZInspectorModal
          isOpen={isZvZInspectorOpen}
          onClose={() => setIsZvZInspectorOpen(false)}
          guildName={guild.name}
          server={guild.server || 'Europa'}
        />
      )}
    </div>
  )
}
