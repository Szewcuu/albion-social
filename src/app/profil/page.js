'use client'

import CustomSelect from '@/components/ui/CustomSelect'
import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import AccountDeletionModal from '@/components/profile/AccountDeletionModal'
import ConnectedAccountsPanel from '@/components/profile/ConnectedAccountsPanel'
import {
  Activity,
  AlertTriangle,
  Award,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleUserRound,
  ExternalLink,
  Eye,
  Flame,
  Globe2,
  Heart,
  KeyRound,
  LoaderCircle,
  Lock,
  Plus,
  RefreshCw,
  Save,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Swords,
  Trash2,
  Trophy,
  UserCheck,
  UserCog,
  UserRoundCheck,
  Zap,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { portalAuth } from '@/lib/supabaseAuth'
import { hasAuthIdentity } from '@/lib/authFlow'
import { authenticatedFetch } from '@/lib/authenticatedFetch'
import { MAX_FEATURED_BUILDS, PROFILE_ROLES } from '@/lib/profilePreferences'
import CharacterVerificationModal from '@/components/CharacterVerificationModal'
import { EmptyState, SkeletonBlock, StatusNotice } from '@/components/ui/FeedbackState'
import { useConfirmDialog } from '@/components/ui/ConfirmDialog'

const INITIAL_FORM = {
  ingame_nick: '',
  main_server: '',
  guild_name: '',
  main_role: 'DPS',
  avg_ip: 1400,
  bio: '',
  favorite_builds_public: false,
  favorite_roles: [],
  featured_build_ids: [],
}

const PROFILE_FIELDS = [
  'id', 'username', 'avatar_url', 'created_at', 'ingame_nick', 'main_server',
  'guild_name', 'main_role', 'avg_ip', 'bio', 'favorite_builds_public', 'favorite_roles', 'featured_build_ids',
  'is_verified', 'verified_player_id', 'verified_server', 'verified_region',
  'pvp_fame', 'pve_fame', 'verified_at',
].join(', ')

const ROLE_CONFIG = {
  Tank: {
    icon: Shield,
    color: 'text-sky-300',
    border: 'border-sky-400/35',
    activeBg: 'bg-sky-400/15',
    tag: 'border-sky-400/25 bg-sky-400/10 text-sky-300',
    desc: 'Kontrola tłumu, absorpcja obrażeń i inicjacja',
  },
  Healer: {
    icon: Heart,
    color: 'text-emerald-300',
    border: 'border-emerald-400/35',
    activeBg: 'bg-emerald-400/15',
    tag: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300',
    desc: 'Utrzymanie drużyny przy życiu i usuwanie debuffów',
  },
  DPS: {
    icon: Swords,
    color: 'text-rose-300',
    border: 'border-rose-400/35',
    activeBg: 'bg-rose-400/15',
    tag: 'border-rose-400/25 bg-rose-400/10 text-rose-300',
    desc: 'Zadawanie obrażeń punktowych i obszarowych',
  },
  Support: {
    icon: Zap,
    color: 'text-violet-300',
    border: 'border-violet-400/35',
    activeBg: 'bg-violet-400/15',
    tag: 'border-violet-400/25 bg-violet-400/10 text-violet-300',
    desc: 'Wzmocnienia sojuszników, utility i osłabianie wrogów',
  },
}

const IP_PRESETS = [
  { label: 'T5 (1000)', value: 1000 },
  { label: 'T6 (1200)', value: 1200 },
  { label: 'T7 (1350)', value: 1350 },
  { label: 'T8 (1500)', value: 1500 },
  { label: '8.3 (1700+)', value: 1700 },
]

function formatDate(value) {
  if (!value) return 'Termin nieustalony'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ProfileSkeleton() {
  return (
    <div className="page-content min-w-0 space-y-6">
      <div className="subpage-header">
        <h1>
          <UserCog className="h-6 w-6 text-[var(--gold)]" /> Twój Profil
        </h1>
        <p>Zarządzaj postacią, weryfikacją API i ustawieniami konta.</p>
      </div>

      <SkeletonBlock className="h-40 rounded-[26px]" />

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <SkeletonBlock className="h-96 rounded-[24px]" />
          <SkeletonBlock className="h-44 rounded-[24px]" />
        </div>
        <div className="space-y-4">
          <SkeletonBlock className="h-12 w-80 rounded-xl" />
          <SkeletonBlock className="h-[500px] rounded-[26px]" />
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const { requestConfirmation, confirmationDialog } = useConfirmDialog()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [myExpeditions, setMyExpeditions] = useState([])
  const [myOffers, setMyOffers] = useState([])
  const [myBuilds, setMyBuilds] = useState([])
  const [notice, setNotice] = useState(null)
  const [activeTab, setActiveTab] = useState('card') // 'card' | 'activity' | 'security'
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [verifiedState, setVerifiedState] = useState(null)
  const [unlinkingCharacter, setUnlinkingCharacter] = useState(false)

  const fetchProfileData = useCallback(async (userId) => {
    setLoading(true)
    const [profileResult, expeditionsResult, marketResult, buildsResult] = await Promise.all([
      supabase.from('profiles').select(PROFILE_FIELDS).eq('id', userId).maybeSingle(),
      supabase.from('expeditions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('market_items').select('id, created_at, user_id, title, price, city, category, description, status, item_name, server').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('builds').select('id, title, activity_type, created_at').eq('user_id', userId).eq('status', 'visible').order('created_at', { ascending: false }).limit(40),
    ])

    if (profileResult.data) {
      setFormData({
        ingame_nick: profileResult.data.ingame_nick || '',
        main_server: profileResult.data.main_server || '',
        guild_name: profileResult.data.guild_name || '',
        main_role: profileResult.data.main_role || 'DPS',
        avg_ip: profileResult.data.avg_ip || 1400,
        bio: profileResult.data.bio || '',
        favorite_builds_public: Boolean(profileResult.data.favorite_builds_public),
        favorite_roles: Array.isArray(profileResult.data.favorite_roles) ? profileResult.data.favorite_roles : [],
        featured_build_ids: Array.isArray(profileResult.data.featured_build_ids) ? profileResult.data.featured_build_ids : [],
      })
      if (profileResult.data.is_verified && profileResult.data.verified_player_id) {
        const pId = profileResult.data.verified_player_id
        const pServer = profileResult.data.verified_server || profileResult.data.main_server || 'Europa'
        const region = profileResult.data.verified_region
          || (pServer.toLowerCase().includes('ameryka') ? 'america' : pServer.toLowerCase().includes('azja') ? 'asia' : 'europe')

        setVerifiedState({
          is_verified: true,
          verified_player_id: pId,
          verified_server: pServer,
          verified_region: region,
          pvp_fame: profileResult.data.pvp_fame || 0,
          pve_fame: profileResult.data.pve_fame || 0,
        })

        fetch(`/api/albion/player?mode=overview&id=${encodeURIComponent(pId)}&region=${region}`)
          .then(res => res.json())
          .then(apiRes => {
            const p = apiRes?.data?.player
            if (p) {
              const freshPvp = p.killFame || 0
              const freshPve = p.fame?.pve || 0
              setVerifiedState(prev => ({
                ...prev,
                pvp_fame: freshPvp,
                pve_fame: freshPve,
              }))
            }
          })
          .catch(() => {})
      } else {
        setVerifiedState(null)
      }
    }

    setMyExpeditions(expeditionsResult.data || [])
    setMyOffers(marketResult.data || [])
    setMyBuilds(buildsResult.data || [])

    const firstError = profileResult.error || expeditionsResult.error || marketResult.error || buildsResult.error
    if (firstError) {
      setNotice({ type: 'error', text: 'Nie udało się pobrać części danych profilu. Spróbuj odświeżyć stronę.' })
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    portalAuth.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) fetchProfileData(currentUser.id)
      else setLoading(false)
    })
  }, [fetchProfileData])

  const completionDetails = useMemo(() => {
    return [
      { label: 'Nick w grze', done: Boolean(formData.ingame_nick.trim()) },
      { label: 'Główny serwer', done: Boolean(formData.main_server) },
      { label: 'Nazwa gildii', done: Boolean(formData.guild_name.trim()) },
      { label: 'Główna rola', done: Boolean(formData.main_role) },
      { label: 'Item Power', done: Number(formData.avg_ip) > 0 },
      { label: 'Dziennik (O mnie)', done: Boolean(formData.bio.trim()) },
    ]
  }, [formData])

  const completionPercent = useMemo(() => {
    const doneCount = completionDetails.filter((item) => item.done).length
    return Math.round((doneCount / completionDetails.length) * 100)
  }, [completionDetails])

  async function handleSaveProfile(event) {
    event.preventDefault()
    if (!user || saving) return

    const nick = formData.ingame_nick.trim()
    const guild = formData.guild_name.trim()
    const avgIp = Number(formData.avg_ip)
    const bio = formData.bio.trim()

    if (nick.length > 80 || guild.length > 100 || bio.length > 500 || !Number.isInteger(avgIp) || avgIp < 0 || avgIp > 3000) {
      setNotice({ type: 'error', text: 'Sprawdź długość nazw i opisu oraz podaj Item Power od 0 do 3000.' })
      return
    }

    setSaving(true)
    setNotice(null)
    try {
      const response = await authenticatedFetch('/api/profile/card', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingameNick: nick,
          mainServer: formData.main_server,
          guildName: guild,
          mainRole: formData.main_role,
          avgIp,
          bio,
          favoriteBuildsPublic: formData.favorite_builds_public,
          favoriteRoles: formData.favorite_roles,
          featuredBuildIds: formData.featured_build_ids,
        }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || 'Nie udało się zapisać karty postaci.')
      setFormData((current) => ({
        ...current,
        ...result.profile,
        favorite_roles: result.profile.favorite_roles || [],
        featured_build_ids: result.profile.featured_build_ids || [],
      }))
      setNotice({ type: 'success', text: 'Karta postaci została pomyślnie zapisana!' })
    } catch (saveError) {
      setNotice({ type: 'error', text: saveError.message || 'Nie udało się zapisać karty postaci. Spróbuj ponownie.' })
    } finally {
      setSaving(false)
    }
  }

  async function handleVerifySuccess(data) {
    if (!user) return false

    const { data: { session } } = await portalAuth.auth.getSession()
    if (!session?.access_token) {
      setNotice({ type: 'error', text: 'Sesja wygasła. Zaloguj się ponownie.' })
      return false
    }

    try {
      const response = await fetch('/api/profile/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ playerId: data.verified_player_id, region: data.region }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.profile) {
        throw new Error(result?.error || 'Nie udało się zweryfikować postaci.')
      }

      const verifiedPayload = result.profile
      setFormData((prev) => ({
        ...prev,
        ingame_nick: verifiedPayload.ingame_nick,
        guild_name: verifiedPayload.guild_name,
        main_server: verifiedPayload.verified_server || prev.main_server,
      }))
      setVerifiedState(verifiedPayload)
      setNotice({
        type: 'success',
        text: `Postać „${verifiedPayload.ingame_nick}” została przypięta do profilu!`,
      })
      return true
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Nie udało się zapisać profilu.' })
      return false
    }
  }

  async function handleUnlinkCharacter() {
    if (!user || unlinkingCharacter) return
    const accepted = await requestConfirmation({
      title: 'Odłączyć postać z gry?',
      description: 'Połączenie z oficjalnym API Albion Online zostanie usunięte. Pozostałe dane profilu (buildy, oferty, biografia) pozostaną bez zmian.',
      confirmLabel: 'Odłącz postać',
    })
    if (!accepted) return

    setUnlinkingCharacter(true)
    try {
      const { data: { session } } = await portalAuth.auth.getSession()
      if (!session?.access_token) throw new Error('Sesja wygasła. Zaloguj się ponownie.')

      const response = await fetch('/api/profile/verify', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.profile) {
        throw new Error(result?.error || 'Nie udało się odłączyć postaci.')
      }

      setVerifiedState(null)
      setNotice({ type: 'success', text: 'Postać została odłączona od profilu.' })
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Nie udało się odłączyć postaci.' })
    } finally {
      setUnlinkingCharacter(false)
    }
  }

  if (loading) return <ProfileSkeleton />

  if (!user) {
    return (
      <div className="page-content min-w-0 space-y-6">
        <div className="subpage-header">
          <h1>
            <UserCog className="h-6 w-6 text-[var(--gold)]" /> Twój Profil
          </h1>
          <p>Zaloguj się, aby zarządzać swoją postacią w Albionie, wyprawami i ofertami.</p>
        </div>

        <div className="relative z-10 mx-auto flex min-h-[400px] w-full max-w-2xl items-center justify-center p-4">
          <section className="panel w-full rounded-[28px] p-8 text-center sm:p-12 border-[var(--border-warm)] shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-300">
              <CircleUserRound className="h-8 w-8" />
            </div>
            <p className="mt-6 text-[9px] font-black uppercase tracking-[.22em] text-amber-400">Rejestr Bohaterów</p>
            <h2 className="font-display mt-2 text-2xl sm:text-3xl font-black text-white">Zaloguj się, aby otworzyć profil</h2>
            <p className="mx-auto mt-3 max-w-md text-xs sm:text-sm leading-6 text-[var(--text-secondary)]">
              Profil łączy konto portalu ze statystykami postaci w grze, zwołanymi wyprawami, ofertami handlowymi i Kuźnią Buildów.
            </p>
            <Link
              href="/"
              className="btn btn-primary mt-6 inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-wider"
            >
              Przejdź do logowania <ChevronRight className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </div>
    )
  }

  const displayName = (user.user_metadata?.full_name || user.user_metadata?.name || 'Gracz').replace(/#0$/, '')
  const avatarUrl = user.user_metadata?.avatar_url
  const currentRoleStyle = ROLE_CONFIG[formData.main_role] || ROLE_CONFIG.DPS

  return (
    <div className="page-content min-w-0 space-y-6">
      {confirmationDialog}

      {/* 1. Header Podstrony */}
      <header className="subpage-header">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1>
              <UserCog className="h-7 w-7 text-[var(--gold)]" />
              Karta Bohatera & Zarządzanie Kontem
            </h1>
            <p>
              Zarządzaj tożsamością w Albionie, statystykami z API, ulubionymi doktrynami bojowymi oraz bezpieczeństwem konta.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={`/profil/${user.id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-warm)] bg-[var(--bg-elevated)] px-4 py-2.5 text-xs font-bold text-amber-200 transition hover:border-[var(--gold)] hover:bg-amber-400/10 shadow-sm"
              title="Zobacz jak inni gracze widzą Twój profil"
            >
              <Eye className="h-4 w-4 text-[var(--gold)]" />
              <span>Podgląd publiczny</span>
              <ExternalLink className="h-3 w-3 text-amber-300/70" />
            </Link>
          </div>
        </div>
      </header>

      {/* Powiadomienia */}
      {notice && (
        <StatusNotice type={notice.type === 'success' ? 'success' : 'error'}>
          {notice.text}
        </StatusNotice>
      )}

      {/* 2. Hero Baner Postaci (Zweryfikowana vs Nieprzypięta) */}
      {verifiedState?.is_verified ? (
        <section className="relative overflow-hidden rounded-[26px] border border-[var(--border-warm)] bg-gradient-to-br from-[#2e1c10] via-[#1a110a] to-[#0f0907] p-5 sm:p-6 shadow-xl">
          <div className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 rounded-full bg-amber-400/10 blur-2xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-amber-400/50 bg-amber-400/10 shadow-[0_0_20px_rgba(216,173,74,0.15)] text-amber-300">
                <ShieldCheck className="h-9 w-9 text-amber-400" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-300">
                    <CheckCircle2 className="h-3 w-3" /> Postać zweryfikowana w API
                  </span>
                  <span className="rounded-full border border-amber-400/20 bg-black/40 px-2.5 py-0.5 text-[9px] font-mono font-bold text-amber-300">
                    {verifiedState.verified_server || formData.main_server || 'Europa'}
                  </span>
                </div>
                <h2 className="font-display mt-1 text-2xl sm:text-3xl font-black text-white truncate">
                  {formData.ingame_nick}
                </h2>
                <p className="text-xs text-amber-200/75">
                  Gildia: <strong className="text-white font-semibold">{formData.guild_name || 'Brak gildii'}</strong>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {/* PvP Fame */}
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-center min-w-[90px]">
                <span className="flex items-center justify-center gap-1 text-[8px] font-black uppercase tracking-wider text-rose-300">
                  <Swords className="h-3 w-3" /> PvP Fame
                </span>
                <p className="font-display mt-1 text-base sm:text-lg font-black text-white">
                  {Number(verifiedState.pvp_fame || 0).toLocaleString('pl-PL')}
                </p>
              </div>
              {/* PvE Fame */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center min-w-[90px]">
                <span className="flex items-center justify-center gap-1 text-[8px] font-black uppercase tracking-wider text-amber-300">
                  <Flame className="h-3 w-3" /> PvE Fame
                </span>
                <p className="font-display mt-1 text-base sm:text-lg font-black text-white">
                  {Number(verifiedState.pve_fame || 0).toLocaleString('pl-PL')}
                </p>
              </div>
              {/* Item Power */}
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-3 text-center min-w-[90px]">
                <span className="flex items-center justify-center gap-1 text-[8px] font-black uppercase tracking-wider text-sky-300">
                  <Shield className="h-3 w-3" /> Średnie IP
                </span>
                <p className="font-display mt-1 text-base sm:text-lg font-black text-white">
                  {formData.avg_ip || '—'}
                </p>
              </div>
              {/* Rola */}
              <div className="rounded-xl border border-white/10 bg-black/25 p-3 text-center min-w-[90px] flex flex-col justify-center">
                <span className="text-[8px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
                  Rola
                </span>
                <p className="mt-1 text-xs font-black uppercase tracking-wider text-amber-300">
                  {formData.main_role}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-white/8 pt-3 lg:border-t-0 lg:pt-0">
              <Link
                href={`/killboard?nick=${encodeURIComponent(formData.ingame_nick)}&region=${verifiedState.verified_region || 'europe'}`}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3.5 py-2 text-xs font-mono font-bold text-amber-200 transition hover:bg-amber-400/20 shadow-sm"
              >
                <Swords className="h-3.5 w-3.5 text-amber-400" />
                <span>Killboard</span>
              </Link>
              <button
                type="button"
                onClick={() => setIsVerifyModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-black/30 px-3.5 py-2 text-xs font-mono font-bold text-gray-300 transition hover:border-amber-400/40 hover:text-white cursor-pointer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Zmień postać</span>
              </button>
              <button
                type="button"
                onClick={handleUnlinkCharacter}
                disabled={unlinkingCharacter}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-mono font-bold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50 cursor-pointer"
              >
                {unlinkingCharacter ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                <span>{unlinkingCharacter ? 'Odłączanie…' : 'Odłącz'}</span>
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="relative overflow-hidden rounded-[26px] border border-dashed border-amber-500/35 bg-gradient-to-r from-amber-950/25 via-black/40 to-black/30 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-400/30 bg-amber-400/10 text-amber-300">
                <Shield className="h-7 w-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-black uppercase tracking-[.18em] text-amber-400">Oficjalne API Albionu</span>
                  <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[9px] font-bold text-amber-300 uppercase">Zalecane</span>
                </div>
                <h2 className="font-display mt-0.5 text-lg sm:text-xl font-bold text-white">Przypnij swoją postać z gry</h2>
                <p className="mt-1 text-xs text-[var(--text-secondary)] max-w-xl">
                  Połącz postać z serwera Europa, Ameryka lub Azja, aby pobierać statystyki PvP/PvE, otrzymać zieloną tarczę zaufania i ułatwić innym weryfikację.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsVerifyModalOpen(true)}
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-5 py-3 text-xs font-mono font-bold uppercase tracking-wider text-black shadow-lg shadow-amber-950/50 hover:from-amber-500 hover:to-amber-400 transition cursor-pointer"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Przypnij postać z gry</span>
            </button>
          </div>
        </section>
      )}

      {/* 3. Główny Układ Dwukolumnowy */}
      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Lewa kolumna: Tożsamość Portalu i Kompletność */}
        <aside className="space-y-5">
          <section className="panel overflow-hidden rounded-[26px] border-[var(--border-warm)]">
            <div className="relative h-24 border-b border-[var(--amber)]/15 bg-[radial-gradient(circle_at_50%_0%,rgba(216,173,74,.25),transparent_70%)]" />
            <div className="px-5 pb-6 text-center sm:px-6">
              <div className="relative mx-auto -mt-12 h-24 w-24 overflow-hidden rounded-2xl border-2 border-[var(--amber)]/60 bg-[var(--bg-surface)] shadow-[0_10px_35px_rgba(0,0,0,.5)]">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={`Awatar ${displayName}`} fill sizes="96px" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[var(--amber)]">
                    <CircleUserRound className="h-10 w-10" />
                  </div>
                )}
              </div>

              <h2 className="font-display mt-3 truncate text-xl font-black text-white">{displayName}</h2>
              <p className="truncate text-[11px] text-[var(--text-secondary)]">{user.email}</p>

              {/* Statusy połączeń */}
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-wider ${
                    hasAuthIdentity(user, 'discord')
                      ? 'border border-indigo-400/30 bg-indigo-500/10 text-indigo-300'
                      : 'border border-white/10 bg-black/20 text-[var(--text-muted)]'
                  }`}
                >
                  <UserRoundCheck className="h-3 w-3" /> Discord
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[8px] font-black uppercase tracking-wider ${
                    verifiedState?.is_verified
                      ? 'border border-emerald-400/30 bg-emerald-500/10 text-emerald-300'
                      : 'border border-white/10 bg-black/20 text-[var(--text-muted)]'
                  }`}
                >
                  <ShieldCheck className="h-3 w-3" /> Albion API
                </span>
              </div>

              {/* Pasek kompletności profilu */}
              <div className="mt-5 rounded-2xl border border-white/8 bg-black/25 p-3.5 text-left">
                <div className="flex items-center justify-between text-[10px] font-bold">
                  <span className="text-[var(--text-secondary)] uppercase tracking-wider">Kompletność karty</span>
                  <span className="font-mono text-amber-300">{completionPercent}%</span>
                </div>
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-black/40"
                  role="progressbar"
                  aria-valuenow={completionPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-300 transition-all duration-500"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-1.5 text-[9px]">
                  {completionDetails.map((item) => (
                    <div key={item.label} className="flex items-center gap-1 text-[var(--text-secondary)]">
                      {item.done ? (
                        <Check className="h-3 w-3 text-emerald-400 shrink-0" />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-white/20 ml-0.5 mr-1 shrink-0" />
                      )}
                      <span className={item.done ? 'text-white/90' : 'text-white/40'}>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Szybkie Skróty Modułów */}
          <nav className="panel rounded-[24px] p-3 space-y-1 border-[var(--border-warm)]" aria-label="Skróty profilu">
            <p className="px-3 py-1 text-[8px] font-black uppercase tracking-[.2em] text-[var(--amber)]">Skróty w portalu</p>
            {[
              ['/killboard', Swords, 'Killboard Albionu', 'Historia walk i statystyki'],
              ['/wyprawy', Shield, 'Twoje wyprawy', `${myExpeditions.length} zorganizowanych`],
              ['/rynek', ShoppingBag, 'Twoje oferty rynku', `${myOffers.length} aktywnych ogłoszeń`],
              ['/buildy/nowy', Plus, 'Kuźnia Buildów', 'Stwórz nową doktrynę'],
            ].map(([href, Icon, label, detail]) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/5"
              >
                <span className="rounded-lg border border-white/8 bg-black/25 p-2 text-amber-300 group-hover:border-amber-400/30 transition">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-[var(--text-primary)] group-hover:text-white">{label}</span>
                  <span className="block text-[9px] text-[var(--text-secondary)]">{detail}</span>
                </span>
                <ChevronRight className="h-4 w-4 text-[#5f5b55] transition group-hover:translate-x-0.5 group-hover:text-[var(--amber)]" />
              </Link>
            ))}
          </nav>
        </aside>

        {/* Prawa kolumna: Zakładki (Tabs) & Zawartość Robocza */}
        <main className="space-y-6">
          {/* Przełącznik Zakładek */}
          <div className="flex flex-wrap gap-2 border-b border-white/8 pb-3" role="tablist" aria-label="Sekcje zarządzania profilem">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'card'}
              onClick={() => setActiveTab('card')}
              className={`chip ${activeTab === 'card' ? 'active' : ''}`}
            >
              <Shield className="h-4 w-4" />
              <span>Karta Postaci (Edycja)</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'activity'}
              onClick={() => setActiveTab('activity')}
              className={`chip ${activeTab === 'activity' ? 'active' : ''}`}
            >
              <Activity className="h-4 w-4" />
              <span>Moja Aktywność ({myExpeditions.length + myOffers.length + myBuilds.length})</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'security'}
              onClick={() => setActiveTab('security')}
              className={`chip ${activeTab === 'security' ? 'active' : ''}`}
            >
              <KeyRound className="h-4 w-4" />
              <span>Konto & Bezpieczeństwo</span>
            </button>
          </div>

          {/* TAB 1: Karta Postaci (Edycja) */}
          {activeTab === 'card' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Sekcja 1: Identyfikacja w Albionie */}
              <section className="panel rounded-[26px] p-5 sm:p-7 border-[var(--border-warm)] space-y-5">
                <div className="flex items-center justify-between border-b border-white/8 pb-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[.2em] text-[var(--amber)]">Krok 1</p>
                    <h3 className="font-display mt-0.5 text-xl font-bold text-white">Tożsamość w Albionie</h3>
                  </div>
                  <span className={`rounded-lg border px-3 py-1 text-[9px] font-black uppercase tracking-wider ${currentRoleStyle.tag}`}>
                    {formData.main_role}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Nick w grze */}
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)] block">
                      <span className="flex items-center justify-between">
                        <span>Nick w grze</span>
                        {verifiedState?.is_verified && (
                          <span className="text-[8px] text-amber-400 font-mono flex items-center gap-1 normal-case font-normal">
                            <Lock className="w-3 h-3 text-amber-400" /> Zablokowane przez API
                          </span>
                        )}
                      </span>
                      <input
                        type="text"
                        maxLength={80}
                        value={formData.ingame_nick}
                        readOnly={Boolean(verifiedState?.is_verified)}
                        disabled={Boolean(verifiedState?.is_verified)}
                        onChange={(event) => setFormData({ ...formData, ingame_nick: event.target.value })}
                        placeholder="np. SirLancelot"
                        className={`mt-1.5 w-full rounded-xl border px-3.5 py-2.5 text-xs outline-none transition ${
                          verifiedState?.is_verified
                            ? 'bg-black/40 border-amber-500/30 text-amber-200/90 cursor-not-allowed select-none'
                            : 'border-[var(--border-warm)] bg-[var(--bg-elevated)] text-white focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/30'
                        }`}
                      />
                    </label>
                  </div>

                  {/* Serwer główny */}
                  <div>
                    <CustomSelect
                      label="Serwer główny"
                      value={formData.main_server}
                      onChange={(val) => setFormData({ ...formData, main_server: val })}
                      options={[
                        { value: '', label: 'Nie wybrano' },
                        { value: 'Europa', label: 'Europa (Amsterdam)' },
                        { value: 'Ameryka', label: 'Ameryka (Waszyngton)' },
                        { value: 'Azja', label: 'Azja (Singapur)' },
                      ]}
                      disabled={Boolean(verifiedState?.is_verified)}
                    />
                  </div>

                  {/* Nazwa gildii */}
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)] block">
                      <span>Nazwa gildii</span>
                      <input
                        type="text"
                        maxLength={100}
                        value={formData.guild_name}
                        onChange={(event) => setFormData({ ...formData, guild_name: event.target.value })}
                        placeholder="np. Polish Hussars (opcjonalnie)"
                        className="mt-1.5 w-full rounded-xl border border-[var(--border-warm)] bg-[var(--bg-elevated)] px-3.5 py-2.5 text-xs text-white placeholder-white/30 transition focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/30 outline-none font-mono"
                      />
                    </label>
                  </div>

                  {/* Główna rola */}
                  <div>
                    <CustomSelect
                      label="Główna rola w drużynie"
                      value={formData.main_role}
                      onChange={(val) => setFormData({ ...formData, main_role: val })}
                      options={[
                        { value: 'Tank', label: 'Tank (Kontrola & Inicjacja)' },
                        { value: 'Healer', label: 'Healer (Leczenie & Wsparcie)' },
                        { value: 'DPS', label: 'DPS (Obrażenia bojowe)' },
                        { value: 'Support', label: 'Support / Utility' },
                      ]}
                    />
                  </div>
                </div>
              </section>

              {/* Sekcja 2: Parametry Bojowe & Role */}
              <section className="panel rounded-[26px] p-5 sm:p-7 border-[var(--border-warm)] space-y-5">
                <div className="border-b border-white/8 pb-4">
                  <p className="text-[9px] font-black uppercase tracking-[.2em] text-[var(--amber)]">Krok 2</p>
                  <h3 className="font-display mt-0.5 text-xl font-bold text-white">Parametry Bojowe i Specjalizacja</h3>
                </div>

                {/* Średnie Item Power */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-[9px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)]">
                      Średnie Item Power (IP postaci)
                    </label>
                    <span className="font-mono text-xs font-bold text-amber-300">
                      Wartość: {formData.avg_ip} IP
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[160px_1fr] items-center">
                    <input
                      type="number"
                      min="0"
                      max="3000"
                      value={formData.avg_ip}
                      onChange={(event) => setFormData({ ...formData, avg_ip: event.target.value })}
                      className="rounded-xl border border-[var(--border-warm)] bg-[var(--bg-elevated)] px-3.5 py-2.5 font-mono text-xs text-white transition focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/30 outline-none"
                    />

                    {/* Presety IP */}
                    <div className="flex flex-wrap gap-1.5">
                      {IP_PRESETS.map((preset) => (
                        <button
                          key={preset.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, avg_ip: preset.value })}
                          className={`rounded-lg border px-2.5 py-1.5 text-[10px] font-mono transition ${
                            Number(formData.avg_ip) === preset.value
                              ? 'border-amber-400 bg-amber-400/20 text-amber-200 font-bold'
                              : 'border-white/10 bg-black/20 text-[var(--text-secondary)] hover:border-white/20 hover:text-white'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Ulubione role bojowe */}
                <div className="pt-2">
                  <label className="text-[9px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)] block mb-2">
                    Ulubione role bojowe (wybierz wszystkie, którymi grasz)
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {PROFILE_ROLES.map((role) => {
                      const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.DPS
                      const Icon = cfg.icon
                      const isSelected = formData.favorite_roles.includes(role)
                      return (
                        <button
                          key={role}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => setFormData((current) => ({
                            ...current,
                            favorite_roles: isSelected
                              ? current.favorite_roles.filter((r) => r !== role)
                              : [...current.favorite_roles, role],
                          }))}
                          className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition cursor-pointer ${
                            isSelected
                              ? `${cfg.border} ${cfg.activeBg} shadow-[0_0_20px_rgba(216,173,74,0.08)]`
                              : 'border-white/10 bg-black/20 hover:border-white/20'
                          }`}
                        >
                          <div className={`rounded-xl border border-white/10 bg-black/30 p-2.5 ${cfg.color} shrink-0`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                {role === 'Support' ? 'Support / Utility' : role}
                              </span>
                              {isSelected && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-black">
                                  <Check className="h-3 w-3 stroke-[3]" />
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-[11px] text-[var(--text-secondary)] leading-4">
                              {cfg.desc}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </section>

              {/* Sekcja 3: Zestawy Sygnaturowe (Wyróżnione Buildy) */}
              <section className="panel rounded-[26px] p-5 sm:p-7 border-[var(--border-warm)] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-white/8 pb-4">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[.2em] text-[var(--amber)]">Krok 3</p>
                    <h3 className="font-display mt-0.5 text-xl font-bold text-white">Najczęściej Używane Zestawy</h3>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Wybierz maksymalnie {MAX_FEATURED_BUILDS} własne publiczne buildy, które pojawią się na szczycie Twojej karty.
                    </p>
                  </div>
                  <span className="font-mono text-xs font-bold text-amber-300 shrink-0">
                    {formData.featured_build_ids.length} / {MAX_FEATURED_BUILDS} wybrane
                  </span>
                </div>

                {myBuilds.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {myBuilds.map((build) => {
                      const selected = formData.featured_build_ids.includes(build.id)
                      const disabled = !selected && formData.featured_build_ids.length >= MAX_FEATURED_BUILDS
                      return (
                        <button
                          key={build.id}
                          type="button"
                          aria-pressed={selected}
                          disabled={disabled}
                          onClick={() => setFormData((current) => ({
                            ...current,
                            featured_build_ids: selected
                              ? current.featured_build_ids.filter((id) => id !== build.id)
                              : [...current.featured_build_ids, build.id],
                          }))}
                          className={`min-w-0 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-35 cursor-pointer ${
                            selected
                              ? 'border-amber-400/60 bg-amber-400/10 shadow-[0_0_20px_rgba(216,173,74,0.1)]'
                              : 'border-white/10 bg-black/20 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[8px] font-black uppercase text-amber-300">
                              {build.activity_type || 'Doktryna'}
                            </span>
                            {selected && (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-amber-300 uppercase">
                                <Check className="h-3.5 w-3.5" /> Wyróżniony
                              </span>
                            )}
                          </div>
                          <p className="mt-2 truncate text-xs font-bold text-white">{build.title}</p>
                          <p className="mt-1 text-[9px] text-[var(--text-secondary)] font-mono">
                            {formatDate(build.created_at)}
                          </p>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/12 bg-black/15 p-6 text-center">
                    <Swords className="mx-auto h-8 w-8 text-amber-400/50" />
                    <p className="mt-3 text-sm font-bold text-white">Brak opublikowanych buildów</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">
                      Stwórz i opublikuj swój pierwszy build w Kuźni, aby móc go wyróżnić na profilu.
                    </p>
                    <Link
                      href="/buildy/nowy"
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-xs font-bold text-amber-200 hover:bg-amber-400/20 transition"
                    >
                      <Plus className="h-3.5 w-3.5" /> Przejdź do Kuźni
                    </Link>
                  </div>
                )}
              </section>

              {/* Sekcja 4: Biografia ("O mnie") & Prywatność */}
              <section className="panel rounded-[26px] p-5 sm:p-7 border-[var(--border-warm)] space-y-5">
                <div className="border-b border-white/8 pb-4">
                  <p className="text-[9px] font-black uppercase tracking-[.2em] text-[var(--amber)]">Krok 4</p>
                  <h3 className="font-display mt-0.5 text-xl font-bold text-white">Dziennik Bohatera & Widoczność</h3>
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)]">
                    <span>Notatka w dzienniku (O mnie)</span>
                    <textarea
                      rows={4}
                      maxLength={500}
                      value={formData.bio}
                      onChange={(event) => setFormData({ ...formData, bio: event.target.value })}
                      placeholder="Opisz swój styl gry, ulubione strefy (Black Zone, Drogi Avalonu, Mists), staż w Albionie lub w jakich godzinach grasz."
                      className="mt-1.5 w-full resize-y rounded-xl border border-[var(--border-warm)] bg-[var(--bg-elevated)] p-3.5 text-xs text-white placeholder-white/30 transition focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/30 outline-none leading-relaxed"
                    />
                  </label>
                  <div className="mt-1.5 flex justify-end font-mono text-[10px] text-[var(--text-secondary)]">
                    <span className={formData.bio.length >= 480 ? 'text-rose-400 font-bold' : ''}>
                      {formData.bio.length} / 500 znaków
                    </span>
                  </div>
                </div>

                {/* Przełącznik widoczności ulubionych */}
                <label className="flex cursor-pointer items-start gap-3.5 rounded-2xl border border-white/10 bg-black/25 p-4 transition hover:border-amber-400/30">
                  <input
                    type="checkbox"
                    checked={formData.favorite_builds_public}
                    onChange={(event) => setFormData({ ...formData, favorite_builds_public: event.target.checked })}
                    className="aopp-checkbox mt-0.5"
                  />
                  <div>
                    <span className="block text-xs font-bold text-white">
                      Pokazuj zapisane ulubione buildy na publicznym profilu
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-5 text-[var(--text-secondary)]">
                      Domyślnie Twoja prywatna lista polubionych doktryn jest ukryta. Zaznacz, jeśli chcesz polecać innym graczom swoje ulubione kompozycje.
                    </span>
                  </div>
                </label>
              </section>

              {/* Dolny Pasek Zapisu */}
              <div className="panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-[22px] p-5 border-[var(--border-warm)]">
                <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <Sparkles className="h-4 w-4 text-[var(--gold)] shrink-0" />
                  <span>Zmiany w karcie są widoczne natychmiast po zapisaniu na Twojej publicznej wizytówce.</span>
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-wider shrink-0 disabled:cursor-wait disabled:opacity-60"
                >
                  {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  <span>{saving ? 'Zapisywanie…' : 'Zapisz kartę postaci'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Moja Aktywność */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              {/* Liczniki zawartości */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="panel rounded-2xl p-4 text-center border-[var(--border-warm)]">
                  <Swords className="mx-auto h-5 w-5 text-amber-300" />
                  <p className="font-display mt-2 text-2xl font-black text-white">{myBuilds.length}</p>
                  <p className="text-[9px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Opublikowane Doktryny</p>
                  <Link href="/buildy/nowy" className="mt-3 inline-block text-[9px] font-bold text-amber-300 hover:underline uppercase">
                    + Dodaj build
                  </Link>
                </div>

                <div className="panel rounded-2xl p-4 text-center border-[var(--border-warm)]">
                  <Shield className="mx-auto h-5 w-5 text-violet-300" />
                  <p className="font-display mt-2 text-2xl font-black text-white">{myExpeditions.length}</p>
                  <p className="text-[9px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Zwołane Wyprawy</p>
                  <Link href="/wyprawy" className="mt-3 inline-block text-[9px] font-bold text-violet-300 hover:underline uppercase">
                    + Nowa wyprawa
                  </Link>
                </div>

                <div className="panel rounded-2xl p-4 text-center border-[var(--border-warm)]">
                  <ShoppingBag className="mx-auto h-5 w-5 text-sky-300" />
                  <p className="font-display mt-2 text-2xl font-black text-white">{myOffers.length}</p>
                  <p className="text-[9px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Oferty na Rynku</p>
                  <Link href="/rynek" className="mt-3 inline-block text-[9px] font-bold text-sky-300 hover:underline uppercase">
                    + Wystaw przedmiot
                  </Link>
                </div>
              </div>

              {/* Twoje Wyprawy */}
              <section className="panel rounded-[26px] p-5 sm:p-6 border-[var(--border-warm)] space-y-4">
                <div className="flex items-center justify-between border-b border-white/8 pb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-violet-300" />
                    <h3 className="font-display text-lg font-bold text-white">Twoje Wyprawy</h3>
                  </div>
                  <Link href="/wyprawy" className="text-[9px] font-black uppercase tracking-wider text-amber-300 hover:underline">
                    Zobacz wszystkie ({myExpeditions.length})
                  </Link>
                </div>

                {myExpeditions.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {myExpeditions.slice(0, 6).map((expedition) => (
                      <div key={expedition.id} className="rounded-xl border border-white/8 bg-black/20 p-3.5 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-white">{expedition.title}</p>
                          <p className="mt-1 text-[10px] text-[var(--text-secondary)]">
                            {expedition.activity_type || 'Wyprawa'} · {formatDate(expedition.start_time)}
                          </p>
                        </div>
                        <span className="rounded-md border border-violet-400/20 bg-violet-400/10 px-2 py-0.5 text-[8px] font-black uppercase text-violet-300 shrink-0">
                          {expedition.server || 'Europa'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={Shield} title="Brak utworzonych wypraw" description="Nie zorganizowałeś jeszcze żadnej wyprawy drużynowej." compact />
                )}
              </section>

              {/* Twoje Oferty Handlowe */}
              <section className="panel rounded-[26px] p-5 sm:p-6 border-[var(--border-warm)] space-y-4">
                <div className="flex items-center justify-between border-b border-white/8 pb-3">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-sky-300" />
                    <h3 className="font-display text-lg font-bold text-white">Oferty Handlowe (Rynek P2P)</h3>
                  </div>
                  <Link href="/rynek" className="text-[9px] font-black uppercase tracking-wider text-amber-300 hover:underline">
                    Przejdź do rynku ({myOffers.length})
                  </Link>
                </div>

                {myOffers.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {myOffers.slice(0, 6).map((offer) => (
                      <div key={offer.id} className="rounded-xl border border-white/8 bg-black/20 p-3.5 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-white">{offer.title || offer.item_name || 'Oferta handlowa'}</p>
                          <p className="mt-1 font-mono text-[10px] text-amber-300">
                            {Number(offer.price || 0).toLocaleString('pl-PL')} silver
                          </p>
                        </div>
                        <span className="rounded-md border border-sky-400/20 bg-sky-400/10 px-2 py-0.5 text-[8px] font-black uppercase text-sky-300 shrink-0">
                          {offer.city || 'Rynek'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState icon={ShoppingBag} title="Brak aktywnych ofert" description="Nie wystawiłeś jeszcze żadnego przedmiotu na rynku społeczności." compact />
                )}
              </section>
            </div>
          )}

          {/* TAB 3: Konto & Bezpieczeństwo */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Metody Logowania & Hasło Portalowe */}
              <ConnectedAccountsPanel />

              {/* Strefa Niebezpieczna (Danger Zone) */}
              <section className="panel rounded-[26px] p-5 sm:p-7 border border-rose-500/30 bg-rose-500/5 space-y-4">
                <div className="flex items-center gap-3 text-rose-400">
                  <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-2">
                    <AlertTriangle className="h-5 w-5 text-rose-400" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-white">Strefa Niebezpieczna</h3>
                    <p className="text-xs text-rose-300/80">Trwałe usunięcie konta i danych osobowych (RODO)</p>
                  </div>
                </div>

                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  Zgodnie z unijnymi przepisami o ochronie danych osobowych (RODO), masz prawo do całkowitego usunięcia swoich danych z serwerów portalu. Ta operacja jest nieodwracalna i trwale usuwa Twoje konto, przypiętą postać, buildy oraz powiązania OAuth.
                </p>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-500/40 bg-rose-600/20 px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-rose-300 transition hover:bg-rose-600 hover:text-white cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Usuń Konto & Dane RODO</span>
                  </button>
                </div>
              </section>
            </div>
          )}
        </main>
      </div>

      {/* Modale weryfikacji i usuwania konta */}
      <CharacterVerificationModal
        key={isVerifyModalOpen ? `verify-${formData.main_server}-${formData.ingame_nick}` : 'closed'}
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        defaultNick={formData.ingame_nick}
        defaultServer={formData.main_server}
        onVerifySuccess={handleVerifySuccess}
      />

      <AccountDeletionModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </div>
  )
}
