'use client'
import { authenticatedFetch } from '@/lib/authenticatedFetch'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import CustomSelect from '@/components/ui/CustomSelect'
import UpcomingExpeditionsWidget from '@/components/expeditions/UpcomingExpeditionsWidget'
import { StatusNotice } from '@/components/ui/FeedbackState'
import { useConfirmDialog } from '@/components/ui/ConfirmDialog'
import { usePortalSession } from '@/contexts/PortalSessionContext'
import { 
  Swords, Shield, Heart, UserCheck, Plus, Search,
  Clock, Users, Trash2, AlertTriangle, MapPin, Compass, Sparkles, Calendar 
} from 'lucide-react'

function toLocalInputValue(date) {
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function getDefaultExpeditionDate() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(19, 0, 0, 0)
  return toLocalInputValue(date)
}

function getMinimumExpeditionDate() {
  return toLocalInputValue(new Date(Date.now() + 10 * 60 * 1000))
}

function formatExpeditionDate(value) {
  if (!value) return 'Termin nieznany'
  return new Intl.DateTimeFormat('pl-PL', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value))
}

export default function Wyprawy() {
  const { user } = usePortalSession()
  const { requestConfirmation, confirmationDialog } = useConfirmDialog()
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expeditions, setExpeditions] = useState([])
  
  const [formData, setFormData] = useState({
    title: '',
    activity_type: 'Statyk',
    custom_activity: '',
    min_ip: 1400,
    starts_at: getDefaultExpeditionDate(),
    server: 'Europa',
    description: '',
    max_tanks: 1,
    max_healers: 1,
    max_dps: 3,
    max_supports: 1
  })
  const [formMessage, setFormMessage] = useState('')
  const [deleteMessage, setDeleteMessage] = useState('')
  const [deletingExpeditionId, setDeletingExpeditionId] = useState(null)
  const [publishingExpeditionId, setPublishingExpeditionId] = useState(null)
  const [showOrganizerForm, setShowOrganizerForm] = useState(false)

  const [signupData, setFormSignupData] = useState({
    ingame_nick: '',
    player_ip: 1400,
    role_type: 'Tank'
  })
  const [activeExpeditionForSignup, setActiveExpeditionForSignup] = useState(null)
  const [signupError, setSignupError] = useState('')

  // POBIERANIE WYPRAW Z BAZY
  const fetchExpeditions = useCallback(async () => {
    setLoading(true)
    try {
      const response = await authenticatedFetch('/api/expeditions', { cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Nie udało się pobrać wypraw.')

      setExpeditions(result.expeditions || [])
      setUserProfile(result.profile || null)
    } catch (error) {
      setFormMessage(error.message || 'Nie udało się pobrać wypraw.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user) void Promise.resolve().then(fetchExpeditions)
  }, [fetchExpeditions, user])

  useEffect(() => {
    if (loading) return
    const expeditionId = new URLSearchParams(window.location.search).get('expedition')
    if (!expeditionId) return
    window.requestAnimationFrame(() => document.getElementById(`expedition-${expeditionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }, [loading])

  const openSignupModal = (exp) => {
    setSignupError('')
    const signups = exp.expedition_signups || []
    
    const tanksCount = signups.filter(s => s.role_type === 'Tank').length
    const healersCount = signups.filter(s => s.role_type === 'Healer').length
    const dpsCount = signups.filter(s => s.role_type === 'DPS').length
    const supportsCount = signups.filter(s => s.role_type === 'Support').length

    let defaultRole = 'Tank'

    if (exp.max_tanks > tanksCount) defaultRole = 'Tank'
    else if (exp.max_healers > healersCount) defaultRole = 'Healer'
    else if (exp.max_dps > dpsCount) defaultRole = 'DPS'
    else if (exp.max_supports > supportsCount) defaultRole = 'Support'

    // Pobieranie domyślnego nicku z profilu gracza lub z Discorda
    const defaultNick = userProfile?.ingame_nick || user?.user_metadata?.full_name || user?.user_metadata?.name || ''
    const defaultIp = userProfile?.avg_ip || exp.min_ip || 1400

    setFormSignupData({
      ingame_nick: defaultNick,
      player_ip: defaultIp,
      role_type: defaultRole
    })
    setActiveExpeditionForSignup(exp)
  }

  const handleCreateExpedition = async (e) => {
    e.preventDefault()
    setFormMessage('')

    if (!user) {
      setFormMessage('Musisz być zalogowany, aby zwołać wyprawę!')
      return
    }

    // 1. Ustalamy właściwą nazwę aktywności
    const finalActivityType = formData.activity_type === 'Inna / Własna aktywność' 
      ? (formData.custom_activity.trim() || 'Inna Aktywność')
      : formData.activity_type

    try {
      const createResponse = await authenticatedFetch('/api/expeditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: formData.title,
          activity_type: finalActivityType,
          min_ip: Number(formData.min_ip),
          starts_at: new Date(formData.starts_at).toISOString(),
          server: formData.server,
          description: formData.description,
          max_tanks: Number(formData.max_tanks),
          max_healers: Number(formData.max_healers),
          max_dps: Number(formData.max_dps),
          max_supports: Number(formData.max_supports),
        }),
      })
      const createdExpedition = await createResponse.json().catch(() => ({}))
      if (!createResponse.ok) throw new Error(createdExpedition.error || 'Nie udało się utworzyć wyprawy.')

      let discordPublished = false
      try {
        const response = await authenticatedFetch('/api/webhooks/expedition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expeditionId: createdExpedition.expeditionId }),
        })
        const discordResult = await response.json().catch(() => ({}))
        discordPublished = response.ok && !discordResult.skipped
      } catch (err) {
        console.error('Błąd Webhooka:', err)
      }

      setFormMessage(discordPublished
        ? 'Wyprawa została ogłoszona na tablicy oraz na Discordzie!'
        : 'Wyprawa została zapisana, ale publikacja na Discordzie nie powiodła się.')
      setFormData({
        title: '',
        activity_type: 'Statyk',
        custom_activity: '',
        min_ip: 1400,
        starts_at: getDefaultExpeditionDate(),
        server: 'Europa',
        description: '',
        max_tanks: 1,
        max_healers: 1,
        max_dps: 3,
        max_supports: 1
      })
      await fetchExpeditions()
    } catch (error) {
      setFormMessage(`Błąd: ${error.message || 'Nie udało się utworzyć wyprawy.'}`)
    }
  }

  const handleJoinExpedition = async (e) => {
    e.preventDefault()
    if (!user || !activeExpeditionForSignup) return

    const signups = activeExpeditionForSignup.expedition_signups || []
    const role = signupData.role_type
    
    const currentCount = signups.filter(s => s.role_type === role).length
    let maxAllowed = 0

    if (role === 'Tank') maxAllowed = activeExpeditionForSignup.max_tanks
    if (role === 'Healer') maxAllowed = activeExpeditionForSignup.max_healers
    if (role === 'DPS') maxAllowed = activeExpeditionForSignup.max_dps
    if (role === 'Support') maxAllowed = activeExpeditionForSignup.max_supports

    if (maxAllowed <= 0 || currentCount >= maxAllowed) {
      setSignupError(`Brak wolnych miejsc dla roli ${role}. Wybierz inną rolę lub wróć później.`)
      return
    }

    try {
      const joinResponse = await authenticatedFetch('/api/expeditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'join',
          expeditionId: activeExpeditionForSignup.id,
          role_type: role,
          ingame_nick: signupData.ingame_nick,
          player_ip: Number(signupData.player_ip),
        }),
      })
      const joinResult = await joinResponse.json().catch(() => ({}))
      if (!joinResponse.ok) throw new Error(joinResult.error || 'Nie udało się dołączyć do wyprawy.')

      const totalMax = activeExpeditionForSignup.max_tanks + activeExpeditionForSignup.max_healers + activeExpeditionForSignup.max_dps + activeExpeditionForSignup.max_supports
      const totalJoined = signups.length + 1
      let partyFull = totalJoined >= totalMax && totalMax > 0

      try {
        const notificationResponse = await authenticatedFetch('/api/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'expedition_joined',
            expeditionId: activeExpeditionForSignup.id,
          }),
        })
        const notificationResult = await notificationResponse.json().catch(() => ({}))
        if (!notificationResponse.ok) {
          console.warn('Nie udało się utworzyć powiadomienia wyprawy:', notificationResult.error || notificationResponse.status)
        } else {
          partyFull = notificationResult.partyFull === true
        }
      } catch (notificationError) {
        console.warn('Błąd powiadomienia wyprawy:', notificationError)
      }

      if (partyFull) {
        try {
          const res = await authenticatedFetch('/api/webhooks/expedition', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'PARTY_FULL',
              expeditionId: activeExpeditionForSignup.id,
            })
          })

          const discordResult = await res.json().catch(() => ({}))
          if (!res.ok) {
            console.warn('Nie udało się wysłać powiadomienia o pełnym składzie:', discordResult.error || res.status)
          } else if (discordResult.skipped) {
            console.warn('Powiadomienie o pełnym składzie pominięto, ponieważ webhook Discord nie jest skonfigurowany.')
          }
        } catch (err) {
          console.error('Błąd powiadomienia o pełnym składzie:', err)
        }
      }

      setActiveExpeditionForSignup(null)
      await fetchExpeditions()
    } catch (error) {
      setSignupError(error.message || 'Nie udało się dołączyć do wyprawy.')
    }
  }

  const handleLeaveExpedition = async (signupId) => {
    const accepted = await requestConfirmation({
      title: 'Opuścić drużynę?',
      description: 'Twoje miejsce zostanie zwolnione dla innego gracza.',
      confirmLabel: 'Opuść drużynę',
    })
    if (!accepted) return
    try {
      const response = await authenticatedFetch('/api/expeditions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signupId }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Nie udało się opuścić wyprawy.')
      setDeleteMessage('Opuściłeś drużynę. Zwolnione miejsce jest ponownie dostępne.')
      await fetchExpeditions()
    } catch (error) {
      setDeleteMessage(error.message || 'Nie udało się opuścić wyprawy.')
    }
  }

  const handleDeleteExpedition = async (expeditionId) => {
    const accepted = await requestConfirmation({
      title: 'Odwołać wyprawę?',
      description: 'Ogłoszenie zniknie z portalu, a powiązane wiadomości Discord zostaną usunięte, jeśli integracja na to pozwoli.',
      confirmLabel: 'Odwołaj wyprawę',
    })
    if (!accepted) return
    setDeleteMessage('')
    setDeletingExpeditionId(expeditionId)
    try {
      const response = await authenticatedFetch('/api/webhooks/expedition', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expeditionId }),
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'Nie udało się odwołać wyprawy.')
      }

      setExpeditions((current) => current.filter((expedition) => expedition.id !== expeditionId))
      setDeleteMessage(result.warning || 'Wyprawa została odwołana i usunięta z tablicy.')
    } catch (err) {
      console.error('Błąd kasowania wyprawy:', err)
      setDeleteMessage(err.message || 'Nie udało się odwołać wyprawy. Spróbuj ponownie.')
    } finally {
      setDeletingExpeditionId(null)
    }
  }

  const retryDiscordPublication = async (expeditionId) => {
    setDeleteMessage('')
    setPublishingExpeditionId(expeditionId)
    try {
      const response = await authenticatedFetch('/api/webhooks/expedition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expeditionId }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || result.skipped) {
        throw new Error(result.error || 'Webhook Discord nie jest skonfigurowany.')
      }

      setDeleteMessage('Ogłoszenie wyprawy zostało opublikowane na Discordzie.')
    } catch (error) {
      setDeleteMessage(error.message || 'Nie udało się opublikować wyprawy na Discordzie.')
    } finally {
      setPublishingExpeditionId(null)
    }
  }

  const totalSignups = expeditions.reduce((sum, expedition) => sum + (expedition.expedition_signups?.length || 0), 0)

  return (
    <div className="page-content">
      {confirmationDialog}
      <div className="subpage-header">
        <h1>Wyprawy & Party</h1>
        <p>Organizuj zbiórki grupowe, harmonogram wydarzeń i ZvZ z weryfikacją IP.</p>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8 mt-2">
        <UpcomingExpeditionsWidget expeditions={expeditions} loading={loading} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          
          {/* FORMULARZ WYPRAWY */}
          <div className="lg:col-span-4">
            <div className="panel sticky top-6 space-y-5 rounded-3xl p-6">
              <div className="border-b border-white/[.07] pb-4">
                <p className="text-[9px] font-black uppercase tracking-[.2em] text-[var(--text-secondary)]">Dla organizatorów</p>
                <h2 className="font-display mt-1 flex items-center gap-2 text-xl font-black text-violet-200"><Plus className="h-5 w-5" /> Zwołaj wyprawę</h2>
                <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">Ustal cel, wymagania i skład. Resztę ogłosimy drużynie.</p>
              </div>

              {!showOrganizerForm ? (
                <button
                  type="button"
                  onClick={() => setShowOrganizerForm(true)}
                  className="btn btn-primary min-h-11 w-full text-xs font-extrabold uppercase tracking-wider"
                  aria-expanded="false"
                >
                  <Plus className="h-4 w-4" /> Otwórz formularz wyprawy
                </button>
              ) : !user ? (
                <p className="text-xs text-gray-400 italic bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--border-hover)]">
                  Zaloguj się na stronie głównej, aby tworzyć nowe ogłoszenia.
                </p>
              ) : (
                <form onSubmit={handleCreateExpedition} className="space-y-3 text-xs">
                  <div>
                    <label htmlFor="expedition-title" className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">Cel / Tytuł Wyprawy *</label>
                    <input 
                      id="expedition-title"
                      type="text" 
                      required 
                      value={formData.title} 
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl p-2.5 text-gray-100 focus:border-[var(--amber)] outline-none text-xs"
                      placeholder="np. Statyk T8.2 Martlock + Chest" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <CustomSelect
                        label="Typ Aktywności *"
                        value={formData.activity_type}
                        onChange={(val) => setFormData((prev) => ({ ...prev, activity_type: val }))}
                        options={[
                          { value: 'Statyk', label: 'Statyk / Group Dungeon' },
                          { value: 'Ava Dungeon', label: 'Avalonian Dungeon' },
                          { value: 'Tropienie (Tracking)', label: 'Tropienie w Grupie' },
                          { value: 'Lochy Spaczenia (Corrupted)', label: 'Corrupted Dungeons' },
                          { value: 'ZvZ / Zamki / Terytoria', label: 'ZvZ / Zamki / Terki' },
                          { value: 'Wojny Frakcyjne (Faction)', label: 'Wojny Frakcyjne (Faction)' },
                          { value: 'Roaming / Ganking', label: 'Ganking / Small Scale' },
                          { value: 'Hellgate 2v2 / 5v5 / 10v10', label: 'Hellgate (2v2 / 5v5 / 10v10)' },
                          { value: 'Kryształowa Arena / League', label: 'Kryształowa Arena' },
                          { value: 'Ochrona Karawany', label: 'Karawana do Caerleon / Transport' },
                          { value: 'Power Core / Vortex', label: 'Esporta Core / Vortex' },
                          { value: 'Zbieractwo w Grupie / Aspekty', label: 'Zbieractwo w Grupie / Aspekty' },
                          { value: 'Inna / Własna aktywność', label: '✍️ Inna / Własna aktywność...' },
                        ]}
                      />
                      {/* Pole na własną nazwę aktywności, widoczne tylko po wybraniu "Inna" */}
                      {formData.activity_type === 'Inna / Własna aktywność' && (
                        <input 
                          aria-label="Własny typ aktywności"
                          type="text"
                          required
                          placeholder="Wpisz własną nazwę aktywności..."
                          value={formData.custom_activity}
                          onChange={(e) => setFormData({ ...formData, custom_activity: e.target.value })}
                          className="w-full mt-2 bg-[var(--bg-elevated)] border border-[var(--amber)]/50 rounded-xl p-2.5 text-gray-100 outline-none text-xs"
                        />
                      )}
                    </div>

                    <div>
                      <label htmlFor="expedition-min-ip" className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">Min. IP *</label>
                      <input 
                        id="expedition-min-ip"
                        type="number" 
                        required 
                        value={formData.min_ip} 
                        onChange={(e) => setFormData({ ...formData, min_ip: e.target.value })} 
                        className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl p-2.5 text-gray-100 focus:border-[var(--amber)] outline-none text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="expedition-start-time" className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">Termin (Twój czas) *</label>
                      <input 
                        id="expedition-start-time"
                        type="datetime-local"
                        required 
                        min={getMinimumExpeditionDate()}
                        value={formData.starts_at}
                        onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
                        className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl p-2.5 text-gray-100 focus:border-[var(--amber)] outline-none text-xs font-mono"
                      />
                      <p className="mt-1 text-[9px] leading-4 text-gray-500">Na Discordzie każdy zobaczy termin we własnej strefie czasowej.</p>
                    </div>

                    <div>
                      <CustomSelect
                        label="Serwer"
                        value={formData.server}
                        onChange={(val) => setFormData((prev) => ({ ...prev, server: val }))}
                        options={['Europa', 'Ameryka', 'Azja']}
                      />
                    </div>
                  </div>

                  <fieldset className="border-t border-[var(--border-hover)] pt-3">
                    <legend className="block text-[var(--amber)] mb-2 font-bold uppercase tracking-wider text-[10px] font-mono">Poszukiwane Role</legend>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <label>
                        <span className="text-[10px] text-gray-400 block font-bold font-mono">Tank</span>
                        <input type="number" min="0" max="5" value={formData.max_tanks} onChange={(e) => setFormData({ ...formData, max_tanks: e.target.value })} className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl p-2 text-center text-gray-100 font-mono text-xs" />
                      </label>
                      <label>
                        <span className="text-[10px] text-gray-400 block font-bold font-mono">Heal</span>
                        <input type="number" min="0" max="5" value={formData.max_healers} onChange={(e) => setFormData({ ...formData, max_healers: e.target.value })} className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl p-2 text-center text-gray-100 font-mono text-xs" />
                      </label>
                      <label>
                        <span className="text-[10px] text-gray-400 block font-bold font-mono">DPS</span>
                        <input type="number" min="0" max="20" value={formData.max_dps} onChange={(e) => setFormData({ ...formData, max_dps: e.target.value })} className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl p-2 text-center text-gray-100 font-mono text-xs" />
                      </label>
                      <label>
                        <span className="text-[10px] text-gray-400 block font-bold font-mono">Supp</span>
                        <input type="number" min="0" max="5" value={formData.max_supports} onChange={(e) => setFormData({ ...formData, max_supports: e.target.value })} className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl p-2 text-center text-gray-100 font-mono text-xs" />
                      </label>
                    </div>
                  </fieldset>

                  <div>
                    <label htmlFor="expedition-description" className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">Opis / Miejsce Zbiórki</label>
                    <textarea 
                      id="expedition-description"
                      rows="3" 
                      value={formData.description} 
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl p-2.5 text-gray-100 focus:border-[var(--amber)] outline-none resize-none text-xs"
                      placeholder="np. Zbiórka w banku Martlock, komunikacja na Discordzie..." 
                    />
                  </div>

                  <button type="submit" className="btn btn-primary w-full py-3.5 text-xs font-extrabold uppercase tracking-wider">
                    Ogłoś Wyprawę
                  </button>
                  {formMessage && <p className="text-center font-bold text-amber-400 mt-2 text-xs">{formMessage}</p>}
                </form>
              )}
            </div>
          </div>

          {/* LISTA WYPRAW */}
          <div className="lg:col-span-8 space-y-4">
            <div className="panel flex flex-wrap items-center justify-between gap-3 rounded-2xl px-5 py-4">
              <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[var(--text-secondary)]">Aktualna mobilizacja · ogłoszenia wygasają 12h po terminie</p><h2 className="font-display text-xl font-bold text-white">Otwarte drużyny</h2></div>
              <div className="flex items-center gap-2 text-xs"><span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" /></span><span className="font-bold text-[#bcb6ab]">{expeditions.length} aktywnych ogłoszeń</span></div>
            </div>
            {deleteMessage && (
              <p role="status" className="rounded-xl border border-amber-400/20 bg-amber-400/8 px-4 py-3 text-xs text-amber-100/80">{deleteMessage}</p>
            )}
            {loading ? (
              <div
                className="panel min-h-[672px] animate-pulse rounded-3xl p-6 lg:min-h-[420px]"
                aria-label="Ładowanie aktywnych wypraw"
                aria-busy="true"
              >
                <div className="h-4 w-28 rounded bg-white/8" />
                <div className="mt-4 h-8 w-2/3 rounded bg-white/8" />
                <div className="mt-7 grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="h-12 rounded-xl bg-white/5" />
                  ))}
                </div>
                <div className="mt-7 h-2 rounded bg-white/5" />
                <p className="mt-8 text-center font-mono text-xs text-gray-500">Ładowanie aktywnych wypraw...</p>
              </div>
            ) : expeditions.length === 0 ? (
              <div className="panel rounded-3xl py-14 text-center"><Users className="mx-auto h-9 w-9 text-violet-300/35" /><p className="font-display mt-4 text-lg font-bold text-[#c7c1b7]">Tablica jest teraz pusta</p><p className="mt-1 text-xs text-[#817d75]">Zwołaj pierwszą wyprawę i rozpocznij mobilizację.</p></div>
            ) : (
              expeditions.map((exp) => {
                const signups = exp.expedition_signups || []
                const tanksJoined = signups.filter(s => s.role_type === 'Tank')
                const healersJoined = signups.filter(s => s.role_type === 'Healer')
                const dpsJoined = signups.filter(s => s.role_type === 'DPS')
                const supportsJoined = signups.filter(s => s.role_type === 'Support')

                const mySignup = signups.find(s => s.user_id === user?.id)
                const isOwner = user?.id === exp.user_id
                const totalSlots = Number(exp.max_tanks || 0) + Number(exp.max_healers || 0) + Number(exp.max_dps || 0) + Number(exp.max_supports || 0)
                const fillPercent = totalSlots > 0 ? Math.min(100, Math.round((signups.length / totalSlots) * 100)) : 0

                return (
                  <div id={`expedition-${exp.id}`} key={exp.id} className="panel panel-interactive group relative space-y-5 overflow-hidden rounded-3xl p-6 [content-visibility:auto] [contain-intrinsic-size:auto_540px]">
                    
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[.07] pb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase">{exp.activity_type === 'Statyk T8' ? 'Statyk' : exp.activity_type}</span>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold uppercase">[{exp.server}]</span>
                        </div>
                        <h3 className="font-display text-2xl font-black tracking-wide text-white">{exp.title}</h3>
                      </div>

                      <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="flex items-center gap-1.5 text-amber-400 font-bold bg-[var(--bg-elevated)] px-3 py-1.5 rounded-xl border border-[var(--border-hover)]">
                          <Clock className="w-3 h-3" /> {formatExpeditionDate(exp.starts_at)}
                        </span>
                        <span className="bg-[var(--bg-elevated)] px-3 py-1.5 rounded-xl border border-[var(--border-hover)] text-gray-300 font-bold">
                          IP: <b className="text-emerald-400">{exp.min_ip}+</b>
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[.14em]"><span className="text-[var(--text-secondary)]">Gotowość drużyny</span><span className="text-violet-200">{signups.length}/{totalSlots} graczy</span></div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-black/45"><div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-[var(--amber)] transition-all" style={{ width: `${fillPercent}%` }} /></div>
                    </div>

                    {exp.description && (
                      <p className="rounded-2xl border border-white/[.06] bg-black/25 p-4 text-sm leading-6 text-[#c7c1b7]">
                        {exp.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="aopp-role-card space-y-2 rounded-2xl p-3">
                        <div className="flex justify-between items-center border-b border-[#1c0b10] pb-1.5">
                          <span className="font-bold text-sky-400 flex items-center gap-1 font-mono text-[11px]"><Shield className="w-3 h-3" /> Tank</span>
                          <span className="font-mono text-[10px] text-gray-400">{tanksJoined.length}/{exp.max_tanks}</span>
                        </div>
                        {tanksJoined.map(s => (
                          <div key={s.id} className="text-[11px] text-gray-300 flex justify-between items-center">
                            <span>{s.ingame_nick}</span>
                            <span className="text-gray-500 text-[9px] font-mono">{s.player_ip} IP</span>
                          </div>
                        ))}
                      </div>

                      <div className="aopp-role-card space-y-2 rounded-2xl p-3">
                        <div className="flex justify-between items-center border-b border-[#1c0b10] pb-1.5">
                          <span className="font-bold text-emerald-400 flex items-center gap-1 font-mono text-[11px]"><Heart className="w-3 h-3" /> Healer</span>
                          <span className="font-mono text-[10px] text-gray-400">{healersJoined.length}/{exp.max_healers}</span>
                        </div>
                        {healersJoined.map(s => (
                          <div key={s.id} className="text-[11px] text-gray-300 flex justify-between items-center">
                            <span>{s.ingame_nick}</span>
                            <span className="text-gray-500 text-[9px] font-mono">{s.player_ip} IP</span>
                          </div>
                        ))}
                      </div>

                      <div className="aopp-role-card space-y-2 rounded-2xl p-3">
                        <div className="flex justify-between items-center border-b border-[#1c0b10] pb-1.5">
                          <span className="font-bold text-rose-400 flex items-center gap-1 font-mono text-[11px]"><Swords className="w-3 h-3" /> DPS</span>
                          <span className="font-mono text-[10px] text-gray-400">{dpsJoined.length}/{exp.max_dps}</span>
                        </div>
                        {dpsJoined.map(s => (
                          <div key={s.id} className="text-[11px] text-gray-300 flex justify-between items-center">
                            <span>{s.ingame_nick}</span>
                            <span className="text-gray-500 text-[9px] font-mono">{s.player_ip} IP</span>
                          </div>
                        ))}
                      </div>

                      <div className="aopp-role-card space-y-2 rounded-2xl p-3">
                        <div className="flex justify-between items-center border-b border-[#1c0b10] pb-1.5">
                          <span className="font-bold text-purple-400 flex items-center gap-1 font-mono text-[11px]"><UserCheck className="w-3 h-3" /> Support</span>
                          <span className="font-mono text-[10px] text-gray-400">{supportsJoined.length}/{exp.max_supports}</span>
                        </div>
                        {supportsJoined.map(s => (
                          <div key={s.id} className="text-[11px] text-gray-300 flex justify-between items-center">
                            <span>{s.ingame_nick}</span>
                            <span className="text-gray-500 text-[9px] font-mono">{s.player_ip} IP</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[.07] pt-4 text-xs">
                      <span className="text-gray-500 font-mono">
                        Lider: <b className="text-emerald-400">{exp.profiles?.username || 'Gracz'}</b>
                      </span>

                      <div className="flex items-center gap-2">
                        {isOwner && !exp.discord_published && (
                          <button disabled={publishingExpeditionId === exp.id} onClick={() => retryDiscordPublication(exp.id)} className="border border-sky-400/30 bg-sky-400/8 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-sky-200 transition hover:bg-sky-400/12 disabled:cursor-wait disabled:opacity-60">
                            {publishingExpeditionId === exp.id ? 'Publikowanie…' : 'Opublikuj na Discordzie'}
                          </button>
                        )}
                        {isOwner && (
                          <button disabled={deletingExpeditionId === exp.id} onClick={() => handleDeleteExpedition(exp.id)} className="bg-rose-950/80 hover:bg-rose-900 border border-rose-900/60 text-rose-300 font-bold px-3 py-1.5 rounded-xl uppercase text-[10px] tracking-wider transition cursor-pointer disabled:cursor-wait disabled:opacity-60">
                            {deletingExpeditionId === exp.id ? 'Odwoływanie…' : 'Odwołaj Wyprawę'}
                          </button>
                        )}

                        {mySignup ? (
                          <button onClick={() => handleLeaveExpedition(mySignup.id)} className="bg-rose-950/80 hover:bg-rose-900 border border-rose-900/60 text-rose-300 font-bold px-3 py-1.5 rounded-xl uppercase text-[10px] tracking-wider transition flex items-center gap-1 cursor-pointer">
                            <Trash2 className="w-3 h-3" /> Opuść Drużynę
                          </button>
                        ) : user ? (
                          <button onClick={() => openSignupModal(exp)} className="btn btn-primary px-4 py-2 text-[11px] font-extrabold uppercase tracking-wider">
                            Dołącz do Ekipy
                          </button>
                        ) : (
                          <span className="text-gray-500 italic text-[11px]">Zaloguj się, by dołączyć</span>
                        )}
                      </div>
                    </div>

                  </div>
                )
              })
            )}
          </div>

        </div>
      </div>

      {/* MODAL ZAPISU DO DRUŻYNY */}
      {activeExpeditionForSignup && (
        <div role="dialog" aria-modal="true" aria-labelledby="expedition-signup-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="panel relative w-full max-w-md space-y-4 rounded-3xl p-6 text-gray-200 sm:p-8">
            <h2 id="expedition-signup-title" className="font-display border-b border-white/[.07] pb-3 text-xl font-black text-[var(--amber)]">
              Dołącz do Wyprawy: {activeExpeditionForSignup.title}
            </h2>

            <form onSubmit={handleJoinExpedition} className="space-y-3 text-xs">
              {signupError && <StatusNotice type="error">{signupError}</StatusNotice>}
              <div>
                <label htmlFor="expedition-signup-nick" className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">Twój Nick w grze *</label>
                <input 
                  id="expedition-signup-nick"
                  type="text" 
                  required 
                  value={signupData.ingame_nick} 
                  onChange={(e) => setFormSignupData({ ...signupData, ingame_nick: e.target.value })} 
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl p-2.5 text-gray-100 focus:border-[var(--amber)] outline-none text-xs"
                  placeholder="np. SirLancelot" 
                />
              </div>

              <div>
                <CustomSelect
                  label="Wybierz Rolę *"
                  value={signupData.role_type}
                  onChange={(val) => {
                    setSignupError('')
                    setFormSignupData((prev) => ({ ...prev, role_type: val }))
                  }}
                  options={[
                    activeExpeditionForSignup.max_tanks > 0 && {
                      value: 'Tank',
                      label: `Tank (${activeExpeditionForSignup.expedition_signups?.filter(s => s.role_type === 'Tank').length || 0}/${activeExpeditionForSignup.max_tanks})`
                    },
                    activeExpeditionForSignup.max_healers > 0 && {
                      value: 'Healer',
                      label: `Healer (${activeExpeditionForSignup.expedition_signups?.filter(s => s.role_type === 'Healer').length || 0}/${activeExpeditionForSignup.max_healers})`
                    },
                    activeExpeditionForSignup.max_dps > 0 && {
                      value: 'DPS',
                      label: `DPS (${activeExpeditionForSignup.expedition_signups?.filter(s => s.role_type === 'DPS').length || 0}/${activeExpeditionForSignup.max_dps})`
                    },
                    activeExpeditionForSignup.max_supports > 0 && {
                      value: 'Support',
                      label: `Support (${activeExpeditionForSignup.expedition_signups?.filter(s => s.role_type === 'Support').length || 0}/${activeExpeditionForSignup.max_supports})`
                    },
                  ].filter(Boolean)}
                />
              </div>

              <div>
                <label htmlFor="expedition-signup-ip" className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">Twoje Deklarowane IP *</label>
                <input 
                  id="expedition-signup-ip"
                  type="number" 
                  required 
                  value={signupData.player_ip} 
                  onChange={(e) => setFormSignupData({ ...signupData, player_ip: e.target.value })} 
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl p-2.5 text-gray-100 focus:border-[var(--amber)] outline-none text-xs font-mono"
                />
              </div>

              {Number(signupData.player_ip) < activeExpeditionForSignup.min_ip && (
                <div className="text-[10px] font-mono text-rose-400 bg-rose-950/40 border border-rose-800/40 p-2.5 rounded-xl flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                  <span>Uwaga: Twoje IP ({signupData.player_ip}) jest niższe niż wymagane minimum wyprawy ({activeExpeditionForSignup.min_ip} IP).</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn btn-primary flex-1 py-3 text-xs font-extrabold uppercase tracking-wider">
                  Potwierdź Zgłoszenie
                </button>
                <button type="button" onClick={() => setActiveExpeditionForSignup(null)} className="bg-[#1a080d] text-rose-300 hover:bg-rose-950/80 border border-rose-900/40 font-bold px-4 py-3 rounded-xl uppercase text-xs cursor-pointer">
                  Anuluj
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

</div>
  )
}
