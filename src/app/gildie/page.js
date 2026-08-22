'use client'
import { supabase } from '@/lib/supabase'
import { portalAuth } from '@/lib/supabaseAuth'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Swords, Shield, Globe, MapPin, Search, ExternalLink, HelpCircle } from 'lucide-react'
import GuildApplyModal from '@/components/GuildApplyModal'
import GuildZvZInspectorModal from '@/components/guilds/GuildZvZInspectorModal'
import CustomSelect from '@/components/ui/CustomSelect'

export default function Gildie() {
  const [guilds, setGuilds] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Stan dla okna aplikacji do gildii oraz podglądu ZvZ API
  const [selectedGuildForApply, setSelectedGuildForApply] = useState(null)
  const [inspectedGuild, setInspectedGuild] = useState(null)

  // Filtry
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCity, setFilterCity] = useState('ALL')
  const [filterActivity, setFilterActivity] = useState('ALL')
  const [filterServer, setFilterServer] = useState('ALL')

  // Formularz
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    activity_type: 'PvP',
    main_city: 'Martlock',
    server: 'Europa',
    discord_link: '',
    webhook_url: ''
  })
  const [formMessage, setFormMessage] = useState('')

  const fetchGuilds = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('guilds')
      .select('id, name, description, activity_type, main_city, server, discord_link, user_id, created_at, recruitment_open, recruitment_headline, profiles!guilds_user_id_fkey(username)')
      .order('created_at', { ascending: false })

    if (!error && data) setGuilds(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    portalAuth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      fetchGuilds()
    })
  }, [fetchGuilds])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormMessage('')

    if (!user) {
      setFormMessage('Musisz być zalogowany!')
      return
    }

    const cleanName = formData.name.trim()
    const cleanDescription = formData.description.trim()
    const cleanDiscord = formData.discord_link.trim()
    const cleanWebhook = formData.webhook_url ? formData.webhook_url.trim() : ''

    if (cleanName.length < 2 || cleanName.length > 30) {
      setFormMessage('Nazwa gildii musi mieć od 2 do 30 znaków.')
      return
    }
    if (cleanDescription.length < 10 || cleanDescription.length > 600) {
      setFormMessage('Opis gildii musi zawierać od 10 do 600 znaków.')
      return
    }
    if (!cleanDiscord.includes('discord.gg') && !cleanDiscord.includes('discord.com/invite')) {
      setFormMessage('Podaj prawidłowy link zaproszenia Discord.')
      return
    }

    const { error } = await supabase.from('guilds').insert([
      {
        name: cleanName,
        description: cleanDescription,
        activity_type: formData.activity_type,
        main_city: formData.main_city,
        server: formData.server,
        discord_link: cleanDiscord,
        webhook_url: cleanWebhook,
        user_id: user.id
      }
    ])

    if (error) {
      setFormMessage(`Błąd: ${error.message}`)
    } else {
      setFormMessage('Gildia została zarejestrowana dekretem!')
      setFormData({ 
        name: '', 
        description: '', 
        activity_type: 'PvP', 
        main_city: 'Martlock', 
        server: 'Europa', 
        discord_link: '',
        webhook_url: ''
      })
      fetchGuilds()
    }
  }

  const filteredGuilds = guilds.filter(guild => {
    const matchesSearch = guild.name.toLowerCase().includes(searchTerm.toLowerCase()) || (guild.description && guild.description.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCity = filterCity === 'ALL' || guild.main_city === filterCity
    const matchesActivity = filterActivity === 'ALL' || guild.activity_type === filterActivity
    const matchesServer = filterServer === 'ALL' || guild.server === filterServer
    return matchesSearch && matchesCity && matchesActivity && matchesServer
  })

  return (
    <div className="page-content">
      <div className="subpage-header">
        <h1>Rejestr Gildii</h1>
        <p>Poznaj aktywne polskie formacje, porównaj doktryny i miasta bazowe albo opublikuj manifest własnej gildii.</p>
      </div>

<div className="relative z-10 mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8 mt-2">

      {/* INFORMACJA O ŹRÓDLE DANYCH */}
      <div className="flex items-center gap-3 p-3.5 rounded-2xl border border-sky-400/20 bg-sky-500/5 text-[10px] font-mono text-sky-300">
        <HelpCircle className="w-4 h-4 shrink-0 text-sky-400" />
        <p>
          <strong>Uwaga:</strong> Dane profilów gildii z Albion Online (statystyki PvP, KD, sława) są pobierane z zewnętrznego <strong>Gameinfo API</strong> i mogą mieć opóźnienie.
          Obecność w rejestrze portalu zarządzają Liderzy Gildii samodzielnie.
        </p>
      </div>
        
<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          
          {/* LEWA STRONA: FORMULARZ */}
          <div className="lg:col-span-4">
            <div className="panel sticky top-6 space-y-5 rounded-3xl p-6 relative z-30 !overflow-visible">
              <div className="border-b border-white/[.07] pb-4">
                <p className="text-[9px] font-black uppercase tracking-[.2em] text-[var(--text-secondary)]">Dla liderów</p>
                <h2 className="font-display mt-1 flex items-center gap-2 text-xl font-black text-[var(--amber)]"><Shield className="h-5 w-5" /> Opublikuj manifest</h2>
                <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">Pokaż graczom profil formacji i otwórz rekrutację.</p>
              </div>
              
              {!user ? (
                <p className="text-xs text-gray-400 italic bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--border-hover)]">
                  Zaloguj się na stronie głównej, aby opublikować manifest swojej gildii.
                </p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">Nazwa Gildii *</label>
                    <input type="text" name="name" required value={formData.name} onChange={handleInputChange} className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl p-2.5 text-gray-100 focus:border-[var(--amber)] outline-none text-xs" placeholder="np. Husaria Polska" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <CustomSelect
                        label="Serwer *"
                        value={formData.server}
                        onChange={(val) => setFormData((prev) => ({ ...prev, server: val }))}
                        options={['Europa', 'Ameryka', 'Azja']}
                      />
                    </div>

                    <div>
                      <CustomSelect
                        label="Główne Miasto *"
                        value={formData.main_city}
                        onChange={(val) => setFormData((prev) => ({ ...prev, main_city: val }))}
                        options={['Martlock', 'Lymhurst', 'Bridgewatch', 'Fort Sterling', 'Thetford', 'Caerleon', 'Brecilien']}
                      />
                    </div>
                  </div>

                  <div>
                    <CustomSelect
                      label="Profil / Doktryna *"
                      value={formData.activity_type}
                      onChange={(val) => setFormData((prev) => ({ ...prev, activity_type: val }))}
                      options={[
                        { value: 'PvP', label: 'PvP / Ganking' },
                        { value: 'PvE / HCE', label: 'PvE / HCE' },
                        { value: 'ZvZ / Wojny', label: 'ZvZ / Wojny Terytorialne' },
                        { value: 'Casual / Wszystko', label: 'Casual / Mieszana' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">Zaproszenie Discord *</label>
                    <input type="url" name="discord_link" required value={formData.discord_link} onChange={handleInputChange} className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl p-2.5 text-gray-100 focus:border-[var(--amber)] outline-none text-xs" placeholder="https://discord.gg/..." />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">Webhook Rekrutacji (Opcjonalnie)</label>
                    <input
                      type="url"
                      name="webhook_url"
                      value={formData.webhook_url}
                      onChange={handleInputChange}
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl p-2.5 text-gray-100 focus:border-[var(--amber)] outline-none text-xs"
                      placeholder="https://discord.com/api/webhooks/..."
                    />
                    
                    <details className="mt-2 text-[10px] text-gray-400 bg-[var(--bg-elevated)] border border-[var(--border-hover)] p-2.5 rounded-xl">
                      <summary className="cursor-pointer text-[var(--amber)] font-bold hover:underline select-none flex items-center gap-1 font-mono">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Jak pobrać Webhook z Discorda?</span>
                      </summary>
                      <ol className="list-decimal list-inside space-y-1 text-gray-300 mt-2 pt-2 border-t border-[#1c0b10] font-mono">
                        <li>Wejdź na serwer Discord.</li>
                        <li>Przejdź do: <b>Ustawienia kanału -&gt; Integracje -&gt; Webhooki</b>.</li>
                        <li>Kliknij <b>Utwórz webhook</b>, skopiuj go i wklej powyżej.</li>
                      </ol>
                    </details>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-gray-400 font-bold uppercase font-mono text-[10px]">Opis / Wymagania *</label>
                      <span className="text-gray-500 font-mono text-[10px]">{formData.description.length}/600</span>
                    </div>
                    <textarea name="description" rows="4" maxLength="600" value={formData.description} onChange={handleInputChange} className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl p-2.5 text-gray-100 focus:border-[var(--amber)] outline-none resize-none text-xs" placeholder="Opisz godziny aktywności, wymagany Fame..." />
                  </div>

                  <button type="submit" className="btn btn-primary w-full py-3.5 text-xs font-extrabold uppercase tracking-wider">
                    Opublikuj Manifest
                  </button>
                  {formMessage && <p className="text-center font-bold text-amber-400 mt-2 text-xs font-mono">{formMessage}</p>}
                </form>
              )}
            </div>
          </div>

          {/* PRAWA STRONA: LISTA GILDII */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* FILTRY */}
            <div className="panel space-y-3 rounded-3xl p-4 font-mono text-xs relative z-30 !overflow-visible">
              <div className="flex items-center justify-between gap-3 px-1">
                <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[var(--text-secondary)]">Archiwum chorągwi</p><h2 className="font-display text-lg font-bold text-white">Przeglądaj formacje</h2></div>
                <span className="rounded-lg border border-[var(--amber)]/20 bg-[var(--amber)]/10 px-3 py-1 text-[10px] font-black text-[var(--amber)]">{filteredGuilds.length} {filteredGuilds.length === 1 ? 'wynik' : 'wyników'}</span>
              </div>
              <div className="relative">
                <label htmlFor="guild-search" className="sr-only">Szukaj gildii po nazwie lub opisie</label>
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input 
                  id="guild-search"
                  type="text" 
                  placeholder="Szukaj gildii po nazwie lub opisie..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="input-with-icon !pl-12 min-h-11 w-full rounded-xl border border-[var(--border-hover)] bg-[var(--bg-elevated)] pr-4 text-xs text-gray-100 outline-none focus:border-[var(--amber)]"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <CustomSelect
                    label="Serwer"
                    value={filterServer}
                    onChange={(val) => setFilterServer(val)}
                    options={[
                      { value: 'ALL', label: 'Wszystkie Serwery' },
                      'Europa',
                      'Ameryka',
                      'Azja',
                    ]}
                  />
                </div>
                <div>
                  <CustomSelect
                    label="Miasto"
                    value={filterCity}
                    onChange={(val) => setFilterCity(val)}
                    options={[
                      { value: 'ALL', label: 'Wszystkie Miasta' },
                      'Martlock',
                      'Lymhurst',
                      'Bridgewatch',
                      'Fort Sterling',
                      'Thetford',
                      'Caerleon',
                      'Brecilien',
                    ]}
                  />
                </div>
                <div>
                  <CustomSelect
                    label="Doktryna"
                    value={filterActivity}
                    onChange={(val) => setFilterActivity(val)}
                    options={[
                      { value: 'ALL', label: 'Wszystkie Doktryny' },
                      { value: 'PvP', label: 'PvP / Ganking' },
                      { value: 'PvE / HCE', label: 'PvE / HCE' },
                      { value: 'ZvZ / Wojny', label: 'ZvZ / Wojny' },
                      { value: 'Casual / Wszystko', label: 'Mieszana (Casual)' },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* LISTA KART GILDII */}
            <div className="space-y-4">
              {loading ? (
                <div className="py-12 text-center text-gray-500 font-mono animate-pulse">
                  Otwieranie archiwów gildyjnych...
                </div>
              ) : filteredGuilds.length === 0 ? (
                <div className="panel rounded-3xl p-12 text-center">
                  <Swords className="mx-auto h-8 w-8 text-[#7e6932]" />
                  <p className="font-display mt-4 text-lg font-bold text-[#c7c1b7]">Żadna chorągiew nie odpowiada filtrom</p>
                  <p className="mt-1 text-xs text-[#817d75]">Zmień serwer, miasto lub doktrynę i spróbuj ponownie.</p>
                </div>
              ) : (
                filteredGuilds.map((guild) => (
                  <div 
                    key={guild.id} 
                    className="panel panel-interactive group relative space-y-5 overflow-hidden rounded-3xl p-6"
                  >
                    <div className="pointer-events-none absolute -right-2 -top-8 text-[9rem] font-black leading-none text-[var(--amber)]/[.035]">{guild.name.charAt(0)}</div>
                    <div className="relative flex flex-wrap items-start justify-between gap-4 border-b border-white/[.07] pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--amber)]/25 bg-[var(--amber)]/10 text-xl font-black text-[var(--amber)]">{guild.name.charAt(0)}</div>
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-[.18em] text-[#817d75]">Chorągiew gildyjna</p>
                          <h3 className="font-display mt-0.5 text-2xl font-black tracking-wide text-white hover:text-[var(--gold)] transition">
                            <Link href={`/gildie/${guild.id}`}>{guild.name}</Link>
                          </h3>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold">
                        <span className="flex items-center gap-1 bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2.5 py-0.5 rounded-full uppercase">
                          <Globe className="w-3 h-3" /> {guild.server || 'Nieustalony'}
                        </span>
                        
                        <span className="flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full uppercase">
                          <MapPin className="w-3 h-3" /> {guild.main_city}
                        </span>

                        <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full uppercase">
                          <Shield className="w-3 h-3" /> {guild.activity_type}
                        </span>

                        <span className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 uppercase ${guild.recruitment_open ? 'border-emerald-300/30 bg-emerald-300/10 text-emerald-300' : 'border-rose-300/30 bg-rose-300/10 text-rose-300'}`}>
                          {guild.recruitment_open ? 'Rekrutacja otwarta' : 'Rekrutacja zamknięta'}
                        </span>
                      </div>
                    </div>

                    <p className="relative whitespace-pre-wrap rounded-2xl border border-white/[.06] bg-black/25 p-4 text-sm leading-6 text-[#c7c1b7]">
                      {guild.description}
                    </p>

                    {guild.recruitment_headline && <p className="relative rounded-xl border border-emerald-300/15 bg-emerald-300/[.04] px-4 py-3 text-xs font-bold leading-5 text-emerald-100">{guild.recruitment_headline}</p>}

                    <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-white/[.07] pt-4 text-xs text-gray-400">
                      <p className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" /> Lider: 
                        <Link href={`/profil/${guild.user_id}`} className="text-[#e3ded3] font-bold hover:underline">
                          {(guild.profiles?.username || 'Gracz').replace(/#0$/, '')}
                        </Link>
                      </p>

                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/gildie/${guild.id}`}
                          className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-[var(--border-warm)] bg-[var(--bg-stone)] px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-[var(--gold)] transition hover:bg-[var(--bg-hover)]"
                        >
                          <Shield className="w-3.5 h-3.5" />
                          <span>Pełny Manifest</span>
                        </Link>

                        <button
                          type="button"
                          onClick={() => setInspectedGuild({ name: guild.name, server: guild.server || 'Europa' })}
                          className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/20 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-rose-300 transition hover:bg-rose-900/40 hover:text-white"
                          title="Podgląd statystyk ZvZ i fragów z oficjalnego API Albionu"
                        >
                          <Swords className="w-3.5 h-3.5 text-rose-400" />
                          <span>Statystyki ZvZ</span>
                        </button>

                        <button
                          onClick={() => setSelectedGuildForApply(guild)}
                          disabled={!guild.recruitment_open}
                          className="btn btn-primary flex min-h-11 items-center gap-1.5 px-4 py-2 text-[11px] font-extrabold uppercase tracking-wider disabled:cursor-not-allowed disabled:opacity-45"
                        >
                          <Swords className="w-3.5 h-3.5" />
                          <span>{guild.recruitment_open ? 'Aplikuj' : 'Zamknięta'}</span>
                        </button>

                        <a 
                          href={guild.discord_link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-indigo-300/40 bg-indigo-300/10 px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-indigo-200 transition hover:bg-[#5865F2] hover:text-white"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Discord</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

<GuildApplyModal
        isOpen={!!selectedGuildForApply}
        onClose={() => setSelectedGuildForApply(null)}
        guild={selectedGuildForApply}
        currentUser={user}
      />

      <GuildZvZInspectorModal
        key={inspectedGuild ? `guild-${inspectedGuild.name}-${inspectedGuild.server}` : 'closed'}
        isOpen={!!inspectedGuild}
        onClose={() => setInspectedGuild(null)}
        guildName={inspectedGuild?.name || ''}
        server={inspectedGuild?.server || 'Europa'}
      />
    </div>
  )
}
