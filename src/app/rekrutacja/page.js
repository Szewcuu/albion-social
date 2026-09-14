'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Globe,
  HeartHandshake,
  Loader2,
  Lock,
  MessageSquare,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react'

import { usePortalSession } from '@/contexts/PortalSessionContext'
import { authenticatedFetch } from '@/lib/authenticatedFetch'
import CustomSelect from '@/components/ui/CustomSelect'
import {
  RECRUITMENT_PLATFORMS,
  RECRUITMENT_STATUSES,
  isFacebookUrl,
} from '@/lib/recruitment'

const SERVERS = ['Europa', 'Ameryka', 'Azja']

export default function RecruitmentPage() {
  const { user, loginWithOAuth } = usePortalSession()

  const defaultNick = useMemo(() => {
    return (
      user?.user_metadata?.custom_claims?.global_name ||
      user?.user_metadata?.global_name ||
      user?.user_metadata?.full_name ||
      user?.user_metadata?.name ||
      user?.user_metadata?.preferred_username ||
      ''
    )
  }, [user])

  const defaultDiscord = useMemo(() => {
    const discordIdentity = user?.identities?.find((id) => id.provider === 'discord')
    if (!discordIdentity) return ''
    const meta = discordIdentity.identity_data || {}
    return (
      meta.custom_claims?.global_name ||
      meta.global_name ||
      meta.user_name ||
      meta.preferred_username ||
      meta.name ||
      ''
    )
  }, [user])

  const [selectedPlatform, setSelectedPlatform] = useState('both')
  const [formData, setFormData] = useState({
    applicantName: '',
    age: '',
    discordTag: '',
    facebookUrl: '',
    albionNick: '',
    server: 'Europa',
    experience: '',
    availability: '',
    motivation: '',
  })

  const [checkingApp, setCheckingApp] = useState(true)
  const [existingApp, setExistingApp] = useState(null)
  const [status, setStatus] = useState({ loading: false, success: false, error: null })

  // Uzupełnij domyślne dane po załadowaniu sesji użytkownika
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        applicantName: prev.applicantName || defaultNick,
        discordTag: prev.discordTag || defaultDiscord,
      }))
    }
  }, [user, defaultNick, defaultDiscord])

  // Sprawdź czy użytkownik ma już aktywne zgłoszenie
  const checkExistingApplication = useCallback(async () => {
    if (!user) {
      setCheckingApp(false)
      return
    }
    try {
      setCheckingApp(true)
      const res = await authenticatedFetch('/api/recruitment')
      const data = await res.json().catch(() => ({}))
      if (data.hasApplication && data.application) {
        setExistingApp(data.application)
      }
    } catch {
      // Ignoruj błąd sprawdzania; formularz pozostaje dostępny
    } finally {
      setCheckingApp(false)
    }
  }, [user])

  useEffect(() => {
    checkExistingApplication()
  }, [checkExistingApplication])

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (status.error) setStatus((prev) => ({ ...prev, error: null }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Szybka walidacja po stronie klienta
    if (!formData.applicantName.trim()) {
      setStatus({ loading: false, success: false, error: 'Podaj swoje imię lub nick.' })
      return
    }

    const platformConfig = RECRUITMENT_PLATFORMS[selectedPlatform]
    if (platformConfig.requiresDiscord && !formData.discordTag.trim()) {
      setStatus({ loading: false, success: false, error: 'Podaj swój Discord tag / nick.' })
      return
    }

    if (platformConfig.requiresFacebook) {
      if (!formData.facebookUrl.trim()) {
        setStatus({ loading: false, success: false, error: 'Dla tej roli wymagany jest link do Twojego profilu na Facebooku.' })
        return
      }
      if (!isFacebookUrl(formData.facebookUrl)) {
        setStatus({ loading: false, success: false, error: 'Podaj poprawny adres URL do profilu Facebook (np. https://facebook.com/twoj.profil).' })
        return
      }
    }

    if (!formData.experience.trim() || formData.experience.trim().length < 10) {
      setStatus({ loading: false, success: false, error: 'Opisz swoje doświadczenie (minimum 10 znaków).' })
      return
    }

    if (!formData.availability.trim() || formData.availability.trim().length < 5) {
      setStatus({ loading: false, success: false, error: 'Wskaż swoją dyspozycyjność czasową (minimum 5 znaków).' })
      return
    }

    if (!formData.motivation.trim() || formData.motivation.trim().length < 10) {
      setStatus({ loading: false, success: false, error: 'Uzupełnij motywację dołączenia do ekipy (minimum 10 znaków).' })
      return
    }

    try {
      setStatus({ loading: true, success: false, error: null })
      const res = await authenticatedFetch('/api/recruitment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          platform: selectedPlatform,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'Nie udało się wysłać zgłoszenia.')
      }

      setStatus({ loading: false, success: true, error: null })
      setExistingApp({
        platform: selectedPlatform,
        applicant_name: formData.applicantName,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
    } catch (err) {
      setStatus({ loading: false, success: false, error: err.message })
    }
  }

  return (
    <div className="page-content">
      {/* Nagłówek klimatyczny */}
      <section className="relative overflow-hidden rounded-3xl border border-[#9c713850] bg-gradient-to-br from-[#241710] via-[#160f0b] to-[#0d0907] p-6 shadow-2xl sm:p-10">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3.5 py-1 text-[10px] font-black uppercase tracking-widest text-amber-300">
            <Sparkles className="h-3 w-3" /> Nabór do Straży Społeczności
          </div>
          <h1 className="font-display mt-4 text-3xl font-black text-[#fff2d8] sm:text-5xl">
            Zostań Moderatorem Albion Online Polska
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-[#c4b193] sm:text-base">
            Tworzymy największą i najbardziej zgraną polską społeczność w Albion Online. Poszukujemy
            odpowiedzialnych, zrównoważonych i zaangażowanych ochotników do moderowania serwera <strong>Discord</strong>,
            oficjalnej grupy <strong>Facebook</strong> lub <strong>obu platform jednocześnie</strong>.
          </p>

          <div className="mt-6 flex flex-wrap gap-4 pt-2 text-xs font-bold text-[#e2cfb2]">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" /> Prestiżowa ranga w społeczności
            </span>
            <span className="flex items-center gap-2">
              <HeartHandshake className="h-4 w-4 text-amber-400" /> Wpływ na rozwój portalu i eventy
            </span>
            <span className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-sky-400" /> Zgrany sztab moderatorski
            </span>
          </div>
        </div>
      </section>

      {/* Istniejące zgłoszenie jeśli użytkownik już wysłał */}
      {existingApp && (
        <div className="panel border-amber-400/40 bg-gradient-to-r from-amber-950/30 via-[#1b140e] to-amber-950/20 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-amber-300">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">Twoje zgłoszenie rekrutacyjne</p>
                <h2 className="font-display text-lg font-bold text-white">
                  Podanie dla platformy: {RECRUITMENT_PLATFORMS[existingApp.platform]?.label || existingApp.platform}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  Kandydat: <strong>{existingApp.applicant_name}</strong> · Złożono: {new Date(existingApp.created_at).toLocaleDateString('pl-PL')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`badge ${RECRUITMENT_STATUSES[existingApp.status]?.badgeClass || 'badge-amber'}`}>
                {RECRUITMENT_STATUSES[existingApp.status]?.label || existingApp.status}
              </span>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-[#cbb99f] border-t border-white/5 pt-3">
            Twoje zgłoszenie zostało zarejestrowane. Administratorzy i starsi moderatorzy weryfikują podania na bieżąco.
            W przypadku pozytywnej oceny skontaktujemy się z Tobą bezpośrednio przez podany profil lub Discord.
          </p>
        </div>
      )}

      {/* Siatka ról do wyboru */}
      <section className="space-y-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">Krok 1: Wybór ścieżki służby</p>
          <h2 className="font-display text-2xl font-black text-white">Gdzie chcesz pomagać jako moderator?</h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Wybierz rolę dopasowaną do Twojej aktywności i ulubionego środowiska.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {Object.values(RECRUITMENT_PLATFORMS).map((platform) => {
            const isSelected = selectedPlatform === platform.id
            const Icon = platform.id === 'discord' ? MessageSquare : platform.id === 'facebook' ? Users : ShieldAlert

            return (
              <button
                key={platform.id}
                type="button"
                onClick={() => setSelectedPlatform(platform.id)}
                className={`panel text-left p-5 transition-all duration-200 relative cursor-pointer ${
                  isSelected
                    ? 'border-[var(--gold)] ring-2 ring-[var(--gold)]/35 bg-gradient-to-b from-[#2d1e14] via-[#22160f] to-[#170e0a] shadow-[0_0_28px_rgba(205,164,65,0.18)]'
                    : 'border-[var(--border-warm)] hover:border-[var(--gold)]/60 bg-[#17100c] hover:bg-[#1f1510]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className={`rounded-xl p-3 transition-colors ${isSelected ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-white/5 text-[var(--text-secondary)] border border-white/5'}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  {isSelected ? (
                    <span className="badge badge-amber text-[9px] flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-amber-400" /> Wybrana
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                      Kliknij, by wybrać
                    </span>
                  )}
                </div>

                <h3 className="font-display mt-4 text-base font-black text-white">{platform.label}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">{platform.desc}</p>

                <div className="mt-4 pt-3 border-t border-white/5 text-[10px] font-bold text-[#bba789]">
                  {platform.id === 'discord' && 'Wymagane: Aktywne konto Discord & mikrofon'}
                  {platform.id === 'facebook' && 'Wymagane: Prawdziwy profil FB & aktywność na grupie'}
                  {platform.id === 'both' && 'Wymagane: Koordynacja obu platform'}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Formularz podania rekrutacyjnego */}
      <section className="panel p-6 sm:p-8 space-y-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">Krok 2: Formularz kandydata</p>
          <h2 className="font-display text-2xl font-black text-white">
            Wypełnij podanie na stanowisko: {RECRUITMENT_PLATFORMS[selectedPlatform]?.shortLabel}
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Odpowiedz szczerze na poniższe pytania. Nie szukamy robotów, lecz ludzi z pasją i zaangażowaniem.
          </p>
        </div>

        {!user && (
          <aside className="flex items-center justify-between gap-4 rounded-2xl border border-sky-400/20 bg-sky-400/5 p-4 text-xs text-sky-200">
            <div className="flex items-center gap-3">
              <Globe className="h-5 w-5 shrink-0 text-sky-400" />
              <span>
                Wypełniasz formularz jako gość. Jeśli chcesz automatycznie powiązać zgłoszenie ze swoim kontem i uzupełnić Discord, możesz się zalogować.
              </span>
            </div>
            <button
              type="button"
              onClick={() => loginWithOAuth('discord', '/rekrutacja')}
              className="btn btn-ghost btn-sm shrink-0 border-sky-400/30 text-sky-200 hover:bg-sky-400/10"
            >
              Zaloguj Discord
            </button>
          </aside>
        )}

        {status.error && (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs font-bold text-rose-200">
            <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
            <span>{status.error}</span>
          </div>
        )}

        {status.success && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs font-bold text-emerald-200">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <span>Twoje podanie zostało pomyślnie wysłane! Skontaktujemy się z Tobą po weryfikacji.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Podstawowe dane */}
          {/* Podstawowe dane */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="form-label">
              Twoje Imię / Nick <span className="text-amber-300">*</span>
              <input
                type="text"
                value={formData.applicantName}
                onChange={(e) => handleChange('applicantName', e.target.value)}
                placeholder="np. Mikołaj / Szewcu"
                maxLength={60}
                required
                className="mt-1.5 w-full rounded-xl border border-[var(--border-warm)] bg-[var(--bg-elevated)] p-3 text-xs text-white placeholder-white/30 transition-colors focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/30 focus:outline-none"
              />
            </label>

            <label className="form-label">
              Wiek <span className="text-[var(--text-muted)] font-normal">(zalecane 16+)</span>
              <input
                type="number"
                min={14}
                max={99}
                value={formData.age}
                onChange={(e) => handleChange('age', e.target.value)}
                placeholder="np. 22"
                className="mt-1.5 w-full rounded-xl border border-[var(--border-warm)] bg-[var(--bg-elevated)] p-3 text-xs text-white placeholder-white/30 transition-colors focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/30 focus:outline-none"
              />
            </label>
          </div>

          {/* Dane kontaktowe i platformy */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="form-label">
              Tag / ID konta Discord <span className="text-amber-300">*</span>
              <input
                type="text"
                value={formData.discordTag}
                onChange={(e) => handleChange('discordTag', e.target.value)}
                placeholder="np. szewcu lub szewcu#1234"
                maxLength={60}
                required={RECRUITMENT_PLATFORMS[selectedPlatform].requiresDiscord}
                className="mt-1.5 w-full rounded-xl border border-[var(--border-warm)] bg-[var(--bg-elevated)] p-3 text-xs text-white placeholder-white/30 transition-colors focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/30 focus:outline-none"
              />
              <span className="mt-1 block text-[10px] text-[var(--text-muted)]">
                Niezbędny do kontaktu i nadania rangi na serwerze Discord.
              </span>
            </label>

            <label className="form-label">
              Link do Twojego profilu na Facebooku
              {RECRUITMENT_PLATFORMS[selectedPlatform].requiresFacebook && (
                <span className="text-amber-300 font-bold ml-1">(Wymagany dla tej roli)</span>
              )}
              <input
                type="url"
                value={formData.facebookUrl}
                onChange={(e) => handleChange('facebookUrl', e.target.value)}
                placeholder="https://facebook.com/twoj.profil"
                maxLength={250}
                required={RECRUITMENT_PLATFORMS[selectedPlatform].requiresFacebook}
                className={`mt-1.5 w-full rounded-xl border p-3 text-xs text-white placeholder-white/30 transition-colors focus:outline-none ${
                  RECRUITMENT_PLATFORMS[selectedPlatform].requiresFacebook
                    ? 'border-amber-400/60 bg-[#251b14] focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30'
                    : 'border-[var(--border-warm)] bg-[var(--bg-elevated)] focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/30'
                }`}
              />
              <span className="mt-1 block text-[10px] text-[var(--text-muted)]">
                Pozwala zweryfikować konto i dodać Cię do panelu moderatorów grupy.
              </span>
            </label>
          </div>

          {/* Staż w grze */}
          <div className="grid gap-4 sm:grid-cols-2 items-end">
            <label className="form-label">
              Nick postaci w Albion Online
              <input
                type="text"
                value={formData.albionNick}
                onChange={(e) => handleChange('albionNick', e.target.value)}
                placeholder="np. SirSzewcu"
                maxLength={60}
                className="mt-1.5 w-full rounded-xl border border-[var(--border-warm)] bg-[var(--bg-elevated)] p-3 text-xs text-white placeholder-white/30 transition-colors focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/30 focus:outline-none"
              />
            </label>

            <div>
              <CustomSelect
                label="Główny Serwer w Albionie"
                value={formData.server}
                onChange={(val) => handleChange('server', val)}
                options={SERVERS.map((srv) => ({
                  value: srv,
                  label: `${srv} (Albion ${srv})`,
                }))}
              />
            </div>
          </div>

          {/* Doświadczenie */}
          <label className="form-label">
            Doświadczenie moderatorskie lub organizacyjne <span className="text-amber-300">*</span>
            <textarea
              value={formData.experience}
              onChange={(e) => handleChange('experience', e.target.value)}
              placeholder="Opisz, czy pełniłeś funkcję moderatora na serwerach Discord, w grupach na Facebooku lub w gildii. Jeśli nie masz jeszcze doświadczenia, napisz jak szybko się uczysz."
              rows={3}
              maxLength={2000}
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--border-warm)] bg-[var(--bg-elevated)] p-3 text-xs text-white placeholder-white/30 transition-colors focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/30 focus:outline-none"
            />
          </label>

          {/* Dyspozycyjność */}
          <label className="form-label">
            Dostępność czasowa <span className="text-amber-300">*</span>
            <input
              type="text"
              value={formData.availability}
              onChange={(e) => handleChange('availability', e.target.value)}
              placeholder="np. Około 2-3 godziny dziennie, głównie popołudniami i wieczorami (17:00 - 23:00)."
              maxLength={1000}
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--border-warm)] bg-[var(--bg-elevated)] p-3 text-xs text-white placeholder-white/30 transition-colors focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/30 focus:outline-none"
            />
          </label>

          {/* Motywacja & Sytuacja kryzysowa */}
          <label className="form-label">
            Dlaczego chcesz dołączyć do ekipy i jak radzisz sobie z toksycznością? <span className="text-amber-300">*</span>
            <textarea
              value={formData.motivation}
              onChange={(e) => handleChange('motivation', e.target.value)}
              placeholder="Napisz krótko, co motywuje Cię do pomocy i jak zareagujesz, gdy na czacie lub grupie pojawi się wulgarny użytkownik lub próba oszustwa (scam)."
              rows={4}
              maxLength={2000}
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--border-warm)] bg-[var(--bg-elevated)] p-3 text-xs text-white placeholder-white/30 transition-colors focus:border-[var(--gold)] focus:ring-1 focus:ring-[var(--gold)]/30 focus:outline-none"
            />
          </label>

          {/* Przycisk wysyłania */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/5">
            <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
              Wysyłając podanie, akceptujesz regulamin portalu i zobowiązujesz się do zachowania kultury oraz poufności ustaleń administracji.
            </p>
            <button
              type="submit"
              disabled={status.loading}
              className="btn btn-primary w-full sm:w-auto px-8 py-3.5 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-500/20"
            >
              {status.loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Wysyłanie podania…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Wyślij podanie rekrutacyjne
                </>
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
