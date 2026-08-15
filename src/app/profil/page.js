'use client'

import CustomSelect from '@/components/ui/CustomSelect'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import AccountDeletionModal from '@/components/profile/AccountDeletionModal'
import {
  Activity,
  Award,
  ChevronRight,
  CircleUserRound,
  ExternalLink,
  Gamepad2,
  Globe2,
  LoaderCircle,
  Lock,
  Save,
  Shield,
  ShieldCheck,
  CheckCircle2,
  ShoppingBag,
  Sparkles,
  Swords,
  Trophy,
  UserRoundCheck,
  Zap,
  Trash2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import CharacterVerificationModal from '@/components/CharacterVerificationModal'
import { EmptyState, SkeletonBlock, StatusNotice } from '@/components/ui/FeedbackState'

const INITIAL_FORM = {
  ingame_nick: '',
  main_server: 'Europa',
  guild_name: '',
  main_role: 'DPS',
  avg_ip: 1400,
  bio: '',
  favorite_builds_public: false,
}

const ROLE_STYLES = {
  Tank: 'border-sky-400/25 bg-sky-400/8 text-sky-300',
  Healer: 'border-emerald-400/25 bg-emerald-400/8 text-emerald-300',
  DPS: 'border-rose-400/25 bg-rose-400/8 text-rose-300',
  Support: 'border-violet-400/25 bg-violet-400/8 text-violet-300',
}

function formatDate(value) {
  if (!value) return 'Termin nieustalony'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('pl-PL', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ProfileSkeleton() {
  return (
    <div className="page-content">
      <div className="subpage-header">
        <h1>Twój Profil</h1>
        <p>Zarządzaj postacią, weryfikacją i ofertami.</p>
      </div>

<div className="relative z-10 mx-auto w-full max-w-[1380px] space-y-6 p-4 sm:p-6 lg:p-8">
        <SkeletonBlock className="h-5 w-44 rounded" />
        <SkeletonBlock className="h-[310px] rounded-[28px]" />
        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          <SkeletonBlock className="h-96 rounded-[28px]" />
          <SkeletonBlock className="h-96 rounded-[28px]" />
        </div>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [myExpeditions, setMyExpeditions] = useState([])
  const [myOffers, setMyOffers] = useState([])
  const [notice, setNotice] = useState(null)
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [verifiedState, setVerifiedState] = useState(null)

  const fetchProfileData = useCallback(async (userId) => {
    setLoading(true)
    const [profileResult, expeditionsResult, marketResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('expeditions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('market_items').select('id, created_at, user_id, title, price, city, category, description, status, item_name, server').eq('user_id', userId).order('created_at', { ascending: false }),
    ])

    if (profileResult.data) {
      setFormData({
        ingame_nick: profileResult.data.ingame_nick || '',
        main_server: profileResult.data.main_server || 'Europa',
        guild_name: profileResult.data.guild_name || '',
        main_role: profileResult.data.main_role || 'DPS',
        avg_ip: profileResult.data.avg_ip || 1400,
        bio: profileResult.data.bio || '',
        favorite_builds_public: Boolean(profileResult.data.favorite_builds_public),
      })
      if (profileResult.data.is_verified && profileResult.data.verified_player_id) {
        const pId = profileResult.data.verified_player_id
        const pServer = profileResult.data.verified_server || profileResult.data.main_server || 'Europa'
        const region = pServer.toLowerCase().includes('ameryka') ? 'america' : pServer.toLowerCase().includes('azja') ? 'asia' : 'europe'

        setVerifiedState({
          is_verified: true,
          verified_player_id: pId,
          verified_server: pServer,
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

    const firstError = profileResult.error || expeditionsResult.error || marketResult.error
    if (firstError) {
      setNotice({ type: 'error', text: 'Nie udało się pobrać części danych profilu. Spróbuj odświeżyć stronę.' })
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) fetchProfileData(currentUser.id)
      else setLoading(false)
    })
  }, [fetchProfileData])

  const completion = useMemo(() => {
    const fields = [formData.ingame_nick, formData.main_server, formData.guild_name, formData.main_role, Number(formData.avg_ip) > 0]
    return Math.round((fields.filter(Boolean).length / fields.length) * 100)
  }, [formData])

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
    const { error } = await supabase
      .from('profiles')
      .update({
        ingame_nick: nick,
        main_server: formData.main_server,
        guild_name: guild,
        main_role: formData.main_role,
        avg_ip: avgIp,
        bio,
        favorite_builds_public: formData.favorite_builds_public,
      })
      .eq('id', user.id)

    setSaving(false)
    setNotice(error
      ? { type: 'error', text: 'Nie udało się zapisać karty postaci. Spróbuj ponownie.' }
      : { type: 'success', text: 'Karta postaci została zapisana.' })
  }

  async function handleVerifySuccess(data) {
    if (!user) return false

    const { data: { session } } = await supabase.auth.getSession()
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
        text: `Postać „${verifiedPayload.ingame_nick}” została zweryfikowana w API Albion Online!`,
      })
      return true
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Nie udało się zapisać profilu.' })
      return false
    }
  }

  if (loading) return <ProfileSkeleton />

  if (!user) {
    return (
      <div className="page-content">
<div className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl items-center p-4 sm:p-6">
          <section className="panel w-full rounded-[28px] p-7 text-center sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[var(--amber)]/25 bg-[var(--amber)]/10 text-[var(--amber)]"><CircleUserRound className="h-8 w-8" /></div>
            <p className="mt-6 text-[9px] font-black uppercase tracking-[.22em] text-[var(--amber)]">Karta bohatera</p>
            <h1 className="font-display mt-2 text-3xl font-black text-[#fff]">Zaloguj się, aby otworzyć profil.</h1>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[var(--text-secondary)]">Profil łączy Twoją tożsamość Discord z postacią Albionu, wyprawami i ofertami handlowymi.</p>
            <Link href="/" className="btn btn-primary mt-7 inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-[.12em]">Przejdź do logowania <ChevronRight className="h-4 w-4" /></Link>
          </section>
        </div>
      </div>
    )
  }

  const displayName = (user.user_metadata?.full_name || user.user_metadata?.name || 'Gracz').replace(/#0$/, '')
  const avatarUrl = user.user_metadata?.avatar_url

  return (
    <div className="page-content">
<div className="relative z-10 mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8 mt-2">
{notice && <StatusNotice type={notice.type === 'success' ? 'success' : 'error'}>{notice.text}</StatusNotice>}

        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <section className="panel overflow-hidden rounded-[28px]">
              <div className="relative h-24 border-b border-[var(--amber)]/15 bg-[radial-gradient(circle_at_50%_0%,rgba(216,173,74,.2),transparent_70%)]" />
              <div className="px-5 pb-6 text-center sm:px-6">
                <div className="relative mx-auto -mt-12 h-24 w-24 overflow-hidden rounded-2xl border-2 border-[var(--amber)]/60 bg-[var(--bg-surface)] shadow-[0_10px_35px_rgba(0,0,0,.5)]">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt={`Awatar ${displayName}`} fill sizes="96px" className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[var(--amber)]"><CircleUserRound className="h-10 w-10" /></div>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-center gap-1.5 text-[9px] font-black uppercase tracking-[.15em] text-emerald-300">
                  <UserRoundCheck className="h-3.5 w-3.5" /> Discord połączony
                </div>
                {verifiedState?.is_verified && (
                  <div className="mt-1.5 flex items-center justify-center gap-1.5 text-[9px] font-mono font-bold uppercase text-amber-300 bg-amber-950/40 border border-amber-500/40 px-2.5 py-1 rounded-full">
                    <ShieldCheck className="h-3.5 w-3.5 text-amber-400" /> Postać Zweryfikowana w API
                  </div>
                )}
                <h2 className="font-display mt-2 truncate text-2xl font-black text-[#fff]">{displayName}</h2>
                <p className="mt-1 truncate text-[10px] text-[var(--text-secondary)]">{user.email}</p>

                <div className="mt-5 grid grid-cols-2 gap-2 text-left">
                  <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                    <p className="text-[8px] font-black uppercase tracking-[.15em] text-[var(--text-secondary)]">Postać</p>
                    <p className="mt-1 truncate text-xs font-bold text-[var(--text-primary)]">{formData.ingame_nick || 'Nieprzypisana'}</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                    <p className="text-[8px] font-black uppercase tracking-[.15em] text-[var(--text-secondary)]">Item Power</p>
                    <p className="font-display mt-1 text-lg font-black text-[var(--amber)]">{formData.avg_ip || '—'}</p>
                  </div>
                </div>

                {verifiedState?.is_verified && (
                  <div className="mt-3 bg-[var(--bg-elevated)] border border-amber-500/20 p-3 rounded-xl text-left font-mono text-[10px] space-y-1">
                    <div className="text-gray-400 uppercase text-[8px]">Statystyki Oficjalne:</div>
                    <div className="flex justify-between text-rose-300 font-bold">
                      <span>PvP Fame:</span>
                      <span>{Number(verifiedState.pvp_fame || 0).toLocaleString('pl-PL')}</span>
                    </div>
                    <div className="flex justify-between text-amber-300 font-bold">
                      <span>PvE Fame:</span>
                      <span>{Number(verifiedState.pve_fame || 0).toLocaleString('pl-PL')}</span>
                    </div>
                  </div>
                )}

                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/35" role="progressbar" aria-valuenow={completion} aria-valuemin={0} aria-valuemax={100} aria-label={`Kompletność profilu ${completion}%`}>
                  <div className="h-full rounded-full bg-gradient-to-r from-[#b9872c] to-[#f0cf77]" style={{ width: `${completion}%` }} />
                </div>
                <p className="mt-2 text-[9px] text-[var(--text-secondary)]">Kompletność karty: {completion}%</p>
              </div>
            </section>

            <nav className="panel rounded-[24px] p-3 space-y-1" aria-label="Skróty profilu">
              {[
                ['/killboard', Swords, 'Otwórz Killboard', 'Historia walk i statystyki'],
                ['/wyprawy', Shield, 'Zarządzaj wyprawami', `${myExpeditions.length} utworzonych`],
                ['/rynek', ShoppingBag, 'Moje stoisko', `${myOffers.length} ofert P2P`],
              ].map(([href, Icon, label, detail]) => (
                <Link key={href} href={href} className="group flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-white/5">
                  <span className="rounded-lg border border-white/8 bg-black/20 p-2 text-sky-300"><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-[var(--text-primary)]">{label}</span><span className="block text-[9px] text-[var(--text-secondary)]">{detail}</span></span>
                  <ChevronRight className="h-4 w-4 text-[#5f5b55] transition group-hover:translate-x-0.5 group-hover:text-[var(--amber)]" />
                </Link>
              ))}

              <div className="pt-2 border-t border-white/8">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="w-full py-2.5 px-3 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-mono font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Usuń Konto & Dane RODO
                </button>
              </div>
            </nav>
          </aside>

          <div className="space-y-6">
            <section className="panel rounded-[28px] p-5 sm:p-7">
              <div className="flex flex-col justify-between gap-3 border-b border-white/8 pb-5 sm:flex-row sm:items-end">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.22em] text-[var(--amber)]">Tożsamość w Albionie</p>
                  <h2 className="font-display mt-1 text-2xl font-black text-[#fff]">Karta postaci</h2>
                  <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">
                    Weryfikacja pobiera oficjalne statystyki postaci z serwerów Albion Online.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsVerifyModalOpen(true)}
                    className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-mono font-bold text-xs rounded-xl uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-amber-950/50 transition cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    {verifiedState?.is_verified ? 'Zaktualizuj Weryfikację' : 'Zweryfikuj w API'}
                  </button>
                  <span className={`rounded-lg border px-3 py-1.5 text-[9px] font-black uppercase tracking-[.14em] ${ROLE_STYLES[formData.main_role] || ROLE_STYLES.DPS}`}>
                    {formData.main_role}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="mt-6 space-y-6">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  <label className="text-[9px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)] block">
                    <span className="flex items-center justify-between">
                      <span>Nick w grze</span>
                      {verifiedState?.is_verified && (
                        <span className="text-[8px] text-amber-400/90 font-mono font-normal normal-case flex items-center gap-1">
                          <Lock className="w-3 h-3 text-amber-400" /> Zablokowano (Zweryfikowano w API)
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
                      title={verifiedState?.is_verified ? "Nick został Oficjalnie Zweryfikowany z API. Użyj przycisku 'Zaktualizuj Weryfikację', aby zmienić postać." : "Nick w grze"}
                      className={`mt-1.5 w-full rounded-xl border px-3 py-3 text-xs normal-case tracking-normal outline-none ${
                        verifiedState?.is_verified
                          ? 'bg-[#080406] border-amber-500/30 text-amber-200/80 cursor-not-allowed select-none'
                          : 'text-[var(--text-primary)]'
                      }`}
                    />
                  </label>
                  <div>
                    <CustomSelect
                      label="Serwer główny"
                      value={formData.main_server}
                      onChange={(val) => setFormData({ ...formData, main_server: val })}
                      options={['Europa', 'Ameryka', 'Azja']}
                    />
                  </div>
                  <label className="text-[9px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)]">Nazwa gildii
                    <input type="text" maxLength={100} value={formData.guild_name} onChange={(event) => setFormData({ ...formData, guild_name: event.target.value })} placeholder="Opcjonalnie" className="mt-1.5 w-full rounded-xl border px-3 py-3 text-xs normal-case tracking-normal text-[var(--text-primary)] outline-none font-mono" />
                  </label>
                  <div>
                    <CustomSelect
                      label="Główna rola"
                      value={formData.main_role}
                      onChange={(val) => setFormData({ ...formData, main_role: val })}
                      options={[
                        'Tank',
                        'Healer',
                        'DPS',
                        { value: 'Support', label: 'Support / Utility' },
                      ]}
                    />
                  </div>
                  <label className="text-[9px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)]">Średnie Item Power
                    <input type="number" min="0" max="3000" value={formData.avg_ip} onChange={(event) => setFormData({ ...formData, avg_ip: event.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-3 font-mono text-xs normal-case tracking-normal text-[var(--text-primary)] outline-none" />
                  </label>
                </div>

                <label className="block text-[9px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)]">
                  O mnie
                  <textarea
                    rows={4}
                    maxLength={500}
                    value={formData.bio}
                    onChange={(event) => setFormData({ ...formData, bio: event.target.value })}
                    placeholder="Napisz, czym grasz, jakiej aktywności szukasz i kiedy najczęściej jesteś online."
                    className="mt-1.5 w-full resize-y rounded-xl border px-3 py-3 text-sm font-normal normal-case leading-6 tracking-normal text-[var(--text-primary)] outline-none"
                  />
                  <span className="mt-1 block text-right font-mono text-[9px] font-normal normal-case tracking-normal text-[var(--text-secondary)]">{formData.bio.length}/500</span>
                </label>

                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/8 bg-black/20 p-4 normal-case tracking-normal">
                  <input
                    type="checkbox"
                    checked={formData.favorite_builds_public}
                    onChange={(event) => setFormData({ ...formData, favorite_builds_public: event.target.checked })}
                    className="mt-0.5 h-4 w-4 accent-[var(--amber)]"
                  />
                  <span>
                    <span className="block text-xs font-bold text-[var(--text-primary)]">Pokaż zapisane buildy na profilu</span>
                    <span className="mt-1 block text-[10px] leading-5 text-[var(--text-secondary)]">Domyślnie ulubione są prywatne. Włącz tę opcję, jeśli chcesz polecać społeczności swoje zapisane doktryny.</span>
                  </span>
                </label>

                <div className="flex flex-col gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex items-start gap-2 text-[10px] leading-5 text-[var(--text-secondary)]"><Gamepad2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-300" /> Nick i statystyki są deklarowane przez użytkownika.</p>
                  <button type="submit" disabled={saving} className="btn btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-[.12em] disabled:cursor-wait disabled:opacity-60">
                    {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Zapisywanie' : 'Zapisz kartę'}
                  </button>
                </div>
              </form>
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
              <ActivityPanel title="Twoje wyprawy" eyebrow="Dowodzenie" icon={Shield} tone="violet" href="/wyprawy" empty="Nie utworzyłeś jeszcze żadnej wyprawy.">
                {myExpeditions.slice(0, 4).map((expedition) => (
                  <div key={expedition.id} className="rounded-xl border border-white/8 bg-black/20 p-3">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-bold text-[var(--text-primary)]">{expedition.title}</p><p className="mt-1 text-[9px] text-[var(--text-secondary)]">{expedition.activity_type || 'Aktywność'} · {formatDate(expedition.start_time)}</p></div><span className="rounded-md border border-violet-400/20 bg-violet-400/8 px-2 py-1 text-[8px] font-black uppercase text-violet-300">Wyprawa</span></div>
                  </div>
                ))}
              </ActivityPanel>

              <ActivityPanel title="Oferty handlowe" eyebrow="Twoje stoisko" icon={ShoppingBag} tone="sky" href="/rynek" empty="Nie masz aktywnych ofert na rynku P2P.">
                {myOffers.slice(0, 4).map((offer) => (
                  <div key={offer.id} className="rounded-xl border border-white/8 bg-black/20 p-3">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-bold text-[var(--text-primary)]">{offer.title || offer.item_name || 'Oferta'}</p><p className="mt-1 font-mono text-[10px] text-[var(--amber)]">{Number(offer.price || 0).toLocaleString('pl-PL')} silver</p></div><span className="rounded-md border border-sky-400/20 bg-sky-400/8 px-2 py-1 text-[8px] font-black uppercase text-sky-300">{offer.city || 'Albion'}</span></div>
                  </div>
                ))}
              </ActivityPanel>
            </div>

            <section className="panel grid gap-4 rounded-[24px] p-5 sm:grid-cols-3">
              {[
                [Globe2, 'Serwer', formData.main_server],
                [Award, 'Rola', formData.main_role],
                [Activity, 'Aktywności', myExpeditions.length + myOffers.length],
              ].map(([Icon, label, value]) => (
                <div key={label} className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/15 p-3"><Icon className="h-4 w-4 text-[var(--amber)]" /><div><p className="text-[8px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)]">{label}</p><p className="mt-0.5 text-xs font-bold text-[var(--text-primary)]">{value}</p></div></div>
              ))}
            </section>
          </div>
        </div>

</div>

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

function ActivityPanel({ title, eyebrow, icon: Icon, tone, href, empty, children }) {
  const count = Array.isArray(children) ? children.length : children ? 1 : 0
  const toneClass = tone === 'sky' ? 'text-sky-300' : 'text-violet-300'
  return (
    <section className="panel rounded-[24px] p-5 sm:p-6">
      <div className="flex items-end justify-between gap-3 border-b border-white/8 pb-4"><div><p className={`text-[9px] font-black uppercase tracking-[.18em] ${toneClass}`}>{eyebrow}</p><h3 className="font-display mt-1 text-xl font-black text-[#fff]">{title}</h3></div><Icon className={`h-5 w-5 ${toneClass}`} /></div>
      <div className="mt-4 space-y-2">{count ? children : <EmptyState icon={Icon} title="Jeszcze tu pusto" description={empty} compact />}</div>
      <Link href={href} className="mt-4 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[.14em] text-[var(--text-secondary)] hover:text-[var(--amber)]">Zobacz cały moduł <ChevronRight className="h-3.5 w-3.5" /></Link>
    </section>
  )
}
