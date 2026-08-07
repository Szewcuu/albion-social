'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Award,
  ChevronRight,
  CircleUserRound,
  ExternalLink,
  Gamepad2,
  Globe2,
  LoaderCircle,
  Save,
  Shield,
  ShieldCheck,
  CheckCircle2,
  ShoppingBag,
  Sparkles,
  Swords,
  Trophy,
  UserRoundCheck,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import PortalSubpageHeader from '@/components/PortalSubpageHeader'
import CharacterVerificationModal from '@/components/CharacterVerificationModal'
import { EmptyState, SkeletonBlock, StatusNotice } from '@/components/ui/FeedbackState'

const INITIAL_FORM = {
  ingame_nick: '',
  main_server: 'Europa',
  guild_name: '',
  main_role: 'DPS',
  avg_ip: 1400,
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
    <main className="aopp-shell min-h-screen text-[#d5d0c6]">
      <div className="aopp-world-bg" />
      <div className="aopp-grain" />
      <div className="relative z-10 mx-auto w-full max-w-[1380px] space-y-6 p-4 sm:p-6 lg:p-8">
        <SkeletonBlock className="h-5 w-44 rounded" />
        <SkeletonBlock className="h-[310px] rounded-[28px]" />
        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          <SkeletonBlock className="h-96 rounded-[28px]" />
          <SkeletonBlock className="h-96 rounded-[28px]" />
        </div>
      </div>
    </main>
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
  const [verifiedState, setVerifiedState] = useState(null)

  const fetchProfileData = useCallback(async (userId) => {
    setLoading(true)
    const [profileResult, expeditionsResult, marketResult] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('expeditions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('market_items').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    ])

    if (profileResult.data) {
      setFormData({
        ingame_nick: profileResult.data.ingame_nick || '',
        main_server: profileResult.data.main_server || 'Europa',
        guild_name: profileResult.data.guild_name || '',
        main_role: profileResult.data.main_role || 'DPS',
        avg_ip: profileResult.data.avg_ip || 1400,
      })
      if (profileResult.data.is_verified || profileResult.data.verified_player_id) {
        setVerifiedState({
          is_verified: true,
          verified_player_id: profileResult.data.verified_player_id,
          pvp_fame: profileResult.data.pvp_fame || 0,
          pve_fame: profileResult.data.pve_fame || 0,
        })
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

    if (nick.length > 80 || guild.length > 100 || !Number.isInteger(avgIp) || avgIp < 0 || avgIp > 3000) {
      setNotice({ type: 'error', text: 'Sprawdź długość nazw i podaj Item Power od 0 do 3000.' })
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
      })
      .eq('id', user.id)

    setSaving(false)
    setNotice(error
      ? { type: 'error', text: 'Nie udało się zapisać karty postaci. Spróbuj ponownie.' }
      : { type: 'success', text: 'Karta postaci została zapisana.' })
  }

  async function handleVerifySuccess(data) {
    if (!user) return
    setFormData((prev) => ({
      ...prev,
      ingame_nick: data.ingame_nick,
      guild_name: data.guild_name,
    }))
    setVerifiedState({
      is_verified: true,
      verified_player_id: data.verified_player_id,
      pvp_fame: data.pvp_fame,
      pve_fame: data.pve_fame,
    })

    const { error } = await supabase
      .from('profiles')
      .update({
        ingame_nick: data.ingame_nick,
        guild_name: data.guild_name,
        verified_player_id: data.verified_player_id,
        verified_server: data.verified_server,
        pvp_fame: data.pvp_fame,
        pve_fame: data.pve_fame,
        is_verified: true,
        verified_at: data.verified_at,
      })
      .eq('id', user.id)

    setNotice(error
      ? { type: 'error', text: 'Weryfikacja udana w API, ale nie udało się zapisać danych w profilu.' }
      : { type: 'success', text: `Postać „${data.ingame_nick}” została oficjalnie zweryfikowana w API Albion Online!` })
  }

  if (loading) return <ProfileSkeleton />

  if (!user) {
    return (
      <main className="aopp-shell min-h-screen text-[#d5d0c6]">
        <div className="aopp-world-bg" />
        <div className="aopp-grain" />
        <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-3xl items-center p-4 sm:p-6">
          <section className="aopp-panel w-full rounded-[28px] p-7 text-center sm:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-[#d8ad4a]/25 bg-[#d8ad4a]/10 text-[#e5bb55]"><CircleUserRound className="h-8 w-8" /></div>
            <p className="mt-6 text-[9px] font-black uppercase tracking-[.22em] text-[#d9b45a]">Karta bohatera</p>
            <h1 className="font-display mt-2 text-3xl font-black text-[#fff8e8]">Zaloguj się, aby otworzyć profil.</h1>
            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-[#8f8a81]">Profil łączy Twoją tożsamość Discord z postacią Albionu, wyprawami i ofertami handlowymi.</p>
            <Link href="/" className="aopp-primary-button mt-7 inline-flex items-center justify-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-[.12em]">Przejdź do logowania <ChevronRight className="h-4 w-4" /></Link>
          </section>
        </div>
      </main>
    )
  }

  const displayName = (user.user_metadata?.full_name || user.user_metadata?.name || 'Gracz').replace(/#0$/, '')
  const avatarUrl = user.user_metadata?.avatar_url

  return (
    <main className="aopp-shell min-h-screen text-[#d5d0c6]">
      <div className="aopp-world-bg" />
      <div className="aopp-grain" />

      <div className="relative z-10 mx-auto w-full max-w-[1380px] space-y-7 p-4 sm:p-6 lg:p-8">
        <PortalSubpageHeader
          eyebrow="Karta bohatera • Centrum gracza"
          title={<>Twoja historia zaczyna się<br /><span className="text-[#e5bb55]">od dobrze opisanej postaci.</span></>}
          description="Uzupełnij dane postaci, kontroluj własne aktywności i przechodź bezpośrednio do narzędzi przygotowanych dla Twojej roli."
          icon={CircleUserRound}
          tone="gold"
          stats={[
            { label: 'Kompletność', value: `${completion}%` },
            { label: 'Wyprawy', value: myExpeditions.length },
            { label: 'Oferty P2P', value: myOffers.length },
          ]}
          imagePosition="68% center"
        />

        {notice && <StatusNotice type={notice.type === 'success' ? 'success' : 'error'}>{notice.text}</StatusNotice>}

        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <section className="aopp-panel overflow-hidden rounded-[28px]">
              <div className="relative h-24 border-b border-[#d8ad4a]/15 bg-[radial-gradient(circle_at_50%_0%,rgba(216,173,74,.2),transparent_70%)]" />
              <div className="px-5 pb-6 text-center sm:px-6">
                <div className="relative mx-auto -mt-12 h-24 w-24 overflow-hidden rounded-2xl border-2 border-[#e5bb55]/60 bg-[#0b0c0a] shadow-[0_10px_35px_rgba(0,0,0,.5)]">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt={`Awatar ${displayName}`} fill sizes="96px" className="object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-[#e5bb55]"><CircleUserRound className="h-10 w-10" /></div>
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
                <h2 className="font-display mt-2 truncate text-2xl font-black text-[#fff8e8]">{displayName}</h2>
                <p className="mt-1 truncate text-[10px] text-[#918b82]">{user.email}</p>

                <div className="mt-5 grid grid-cols-2 gap-2 text-left">
                  <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                    <p className="text-[8px] font-black uppercase tracking-[.15em] text-[#918b82]">Postać</p>
                    <p className="mt-1 truncate text-xs font-bold text-[#eee7d9]">{formData.ingame_nick || 'Nieprzypisana'}</p>
                  </div>
                  <div className="rounded-xl border border-white/8 bg-black/20 p-3">
                    <p className="text-[8px] font-black uppercase tracking-[.15em] text-[#918b82]">Item Power</p>
                    <p className="font-display mt-1 text-lg font-black text-[#e5bb55]">{formData.avg_ip || '—'}</p>
                  </div>
                </div>

                {verifiedState?.is_verified && (
                  <div className="mt-3 bg-[#050204] border border-amber-500/20 p-3 rounded-xl text-left font-mono text-[10px] space-y-1">
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

                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-black/35" aria-label={`Kompletność profilu ${completion}%`}>
                  <div className="h-full rounded-full bg-gradient-to-r from-[#b9872c] to-[#f0cf77]" style={{ width: `${completion}%` }} />
                </div>
                <p className="mt-2 text-[9px] text-[#918b82]">Kompletność karty: {completion}%</p>
              </div>
            </section>

            <nav className="aopp-panel rounded-[24px] p-3" aria-label="Skróty profilu">
              {[
                ['/killboard', Swords, 'Otwórz Killboard', 'Historia walk i statystyki'],
                ['/wyprawy', Shield, 'Zarządzaj wyprawami', `${myExpeditions.length} utworzonych`],
                ['/rynek', ShoppingBag, 'Moje stoisko', `${myOffers.length} ofert P2P`],
              ].map(([href, Icon, label, detail]) => (
                <Link key={href} href={href} className="group flex items-center gap-3 rounded-xl px-3 py-3 transition hover:bg-white/5">
                  <span className="rounded-lg border border-white/8 bg-black/20 p-2 text-sky-300"><Icon className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-xs font-bold text-[#d8d2c8]">{label}</span><span className="block text-[9px] text-[#918b82]">{detail}</span></span>
                  <ChevronRight className="h-4 w-4 text-[#5f5b55] transition group-hover:translate-x-0.5 group-hover:text-[#e5bb55]" />
                </Link>
              ))}
            </nav>
          </aside>

          <div className="space-y-6">
            <section className="aopp-panel rounded-[28px] p-5 sm:p-7">
              <div className="flex flex-col justify-between gap-3 border-b border-white/8 pb-5 sm:flex-row sm:items-end">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.22em] text-[#e5bb55]">Tożsamość w Albionie</p>
                  <h2 className="font-display mt-1 text-2xl font-black text-[#fff8e8]">Karta postaci</h2>
                  <p className="mt-2 text-xs leading-5 text-[#8f8a81]">
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
                  <label className="text-[9px] font-black uppercase tracking-[.14em] text-[#8f8a81]">Nick w grze
                    <input type="text" maxLength={80} value={formData.ingame_nick} onChange={(event) => setFormData({ ...formData, ingame_nick: event.target.value })} placeholder="np. Szewczykos" className="mt-1.5 w-full rounded-xl border px-3 py-3 text-xs normal-case tracking-normal text-[#eee7d9] outline-none" />
                  </label>
                  <label className="text-[9px] font-black uppercase tracking-[.14em] text-[#8f8a81]">Serwer główny
                    <select value={formData.main_server} onChange={(event) => setFormData({ ...formData, main_server: event.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-3 text-xs normal-case tracking-normal text-[#eee7d9] outline-none">
                      <option value="Europa">Europa</option><option value="Ameryka">Ameryka</option><option value="Azja">Azja</option>
                    </select>
                  </label>
                  <label className="text-[9px] font-black uppercase tracking-[.14em] text-[#8f8a81]">Nazwa gildii
                    <input type="text" maxLength={100} value={formData.guild_name} onChange={(event) => setFormData({ ...formData, guild_name: event.target.value })} placeholder="Opcjonalnie" className="mt-1.5 w-full rounded-xl border px-3 py-3 text-xs normal-case tracking-normal text-[#eee7d9] outline-none" />
                  </label>
                  <label className="text-[9px] font-black uppercase tracking-[.14em] text-[#8f8a81]">Główna rola
                    <select value={formData.main_role} onChange={(event) => setFormData({ ...formData, main_role: event.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-3 text-xs normal-case tracking-normal text-[#eee7d9] outline-none">
                      <option value="Tank">Tank</option><option value="Healer">Healer</option><option value="DPS">DPS</option><option value="Support">Support / Utility</option>
                    </select>
                  </label>
                  <label className="text-[9px] font-black uppercase tracking-[.14em] text-[#8f8a81]">Średnie Item Power
                    <input type="number" min="0" max="3000" value={formData.avg_ip} onChange={(event) => setFormData({ ...formData, avg_ip: event.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-3 font-mono text-xs normal-case tracking-normal text-[#eee7d9] outline-none" />
                  </label>
                </div>

                <div className="flex flex-col gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex items-start gap-2 text-[10px] leading-5 text-[#918b82]"><Gamepad2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-300" /> Nick i statystyki są deklarowane przez użytkownika.</p>
                  <button type="submit" disabled={saving} className="aopp-primary-button inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-[.12em] disabled:cursor-wait disabled:opacity-60">
                    {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{saving ? 'Zapisywanie' : 'Zapisz kartę'}
                  </button>
                </div>
              </form>
            </section>

            <div className="grid gap-6 xl:grid-cols-2">
              <ActivityPanel title="Twoje wyprawy" eyebrow="Dowodzenie" icon={Shield} tone="violet" href="/wyprawy" empty="Nie utworzyłeś jeszcze żadnej wyprawy.">
                {myExpeditions.slice(0, 4).map((expedition) => (
                  <div key={expedition.id} className="rounded-xl border border-white/8 bg-black/20 p-3">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-bold text-[#eee7d9]">{expedition.title}</p><p className="mt-1 text-[9px] text-[#918b82]">{expedition.activity_type || 'Aktywność'} · {formatDate(expedition.start_time)}</p></div><span className="rounded-md border border-violet-400/20 bg-violet-400/8 px-2 py-1 text-[8px] font-black uppercase text-violet-300">Wyprawa</span></div>
                  </div>
                ))}
              </ActivityPanel>

              <ActivityPanel title="Oferty handlowe" eyebrow="Twoje stoisko" icon={ShoppingBag} tone="sky" href="/rynek" empty="Nie masz aktywnych ofert na rynku P2P.">
                {myOffers.slice(0, 4).map((offer) => (
                  <div key={offer.id} className="rounded-xl border border-white/8 bg-black/20 p-3">
                    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-bold text-[#eee7d9]">{offer.title || offer.item_name || 'Oferta'}</p><p className="mt-1 font-mono text-[10px] text-[#e5bb55]">{Number(offer.price || 0).toLocaleString('pl-PL')} silver</p></div><span className="rounded-md border border-sky-400/20 bg-sky-400/8 px-2 py-1 text-[8px] font-black uppercase text-sky-300">{offer.city || 'Albion'}</span></div>
                  </div>
                ))}
              </ActivityPanel>
            </div>

            <section className="aopp-panel grid gap-4 rounded-[24px] p-5 sm:grid-cols-3">
              {[
                [Globe2, 'Serwer', formData.main_server],
                [Award, 'Rola', formData.main_role],
                [Activity, 'Aktywności', myExpeditions.length + myOffers.length],
              ].map(([Icon, label, value]) => (
                <div key={label} className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/15 p-3"><Icon className="h-4 w-4 text-[#e5bb55]" /><div><p className="text-[8px] font-black uppercase tracking-[.14em] text-[#918b82]">{label}</p><p className="mt-0.5 text-xs font-bold text-[#d8d2c8]">{value}</p></div></div>
              ))}
            </section>
          </div>
        </div>

        <footer className="flex flex-col gap-2 border-t border-white/8 py-5 text-[10px] text-[#9b958b] sm:flex-row sm:items-center sm:justify-between"><p>Profil wykorzystuje dane konta Discord oraz informacje zapisane w Supabase.</p><Link href="/prywatnosc" className="inline-flex items-center gap-1 font-bold text-sky-300 hover:text-sky-200">Polityka prywatności <ExternalLink className="h-3 w-3" /></Link></footer>
      </div>

      <CharacterVerificationModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        defaultNick={formData.ingame_nick}
        defaultServer={formData.main_server}
        onVerifySuccess={handleVerifySuccess}
      />
    </main>
  )
}

function ActivityPanel({ title, eyebrow, icon: Icon, tone, href, empty, children }) {
  const count = Array.isArray(children) ? children.length : children ? 1 : 0
  const toneClass = tone === 'sky' ? 'text-sky-300' : 'text-violet-300'
  return (
    <section className="aopp-panel rounded-[24px] p-5 sm:p-6">
      <div className="flex items-end justify-between gap-3 border-b border-white/8 pb-4"><div><p className={`text-[9px] font-black uppercase tracking-[.18em] ${toneClass}`}>{eyebrow}</p><h3 className="font-display mt-1 text-xl font-black text-[#fff8e8]">{title}</h3></div><Icon className={`h-5 w-5 ${toneClass}`} /></div>
      <div className="mt-4 space-y-2">{count ? children : <EmptyState icon={Icon} title="Jeszcze tu pusto" description={empty} compact />}</div>
      <Link href={href} className="mt-4 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[.14em] text-[#a9a49b] hover:text-[#e5bb55]">Zobacz cały moduł <ChevronRight className="h-3.5 w-3.5" /></Link>
    </section>
  )
}
