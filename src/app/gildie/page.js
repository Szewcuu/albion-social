'use client'
import { supabase } from '@/lib/supabase'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Swords, Shield, Globe, MapPin, Search, ExternalLink, HelpCircle } from 'lucide-react'
import GuildApplyModal from '@/components/GuildApplyModal'
import GuildZvZInspectorModal from '@/components/guilds/GuildZvZInspectorModal'
import ModernHeader from '@/components/ModernHeader'
import PortalSubpageHeader from '@/components/PortalSubpageHeader'

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
      .select('id, name, description, activity_type, main_city, server, discord_link, user_id, created_at, profiles(username)')
      .order('created_at', { ascending: false })

    if (!error && data) setGuilds(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
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
    <main className="modern-shell min-h-screen text-[#f3f4f6] pb-12">
      <ModernHeader user={user} />

      <div className="relative z-10 mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8 mt-2">
        
        <PortalSubpageHeader
          eyebrow="Sala chorągwi • Rejestr sojuszy"
          title={<>Znajdź sztandar,<br /><span className="text-[#e4b94f]">pod którym ruszysz do walki.</span></>}
          description="Poznaj aktywne polskie formacje, porównaj doktryny i miasta bazowe albo opublikuj manifest własnej gildii."
          icon={Swords}
          stats={[
            { label: 'Zarejestrowane gildie', value: guilds.length },
            { label: 'Pasujące wyniki', value: filteredGuilds.length },
            { label: 'Główny serwer', value: filterServer === 'ALL' ? 'Wszystkie' : filterServer },
          ]}
          imagePosition="76% center"
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          
          {/* LEWA STRONA: FORMULARZ */}
          <div className="lg:col-span-4">
            <div className="aopp-panel sticky top-6 space-y-5 rounded-3xl p-6">
              <div className="border-b border-white/[.07] pb-4">
                <p className="text-[9px] font-black uppercase tracking-[.2em] text-[#9e998f]">Dla liderów</p>
                <h2 className="font-display mt-1 flex items-center gap-2 text-xl font-black text-[#f0c75e]"><Shield className="h-5 w-5" /> Opublikuj manifest</h2>
                <p className="mt-2 text-xs leading-5 text-[#8f8b83]">Pokaż graczom profil formacji i otwórz rekrutację.</p>
              </div>
              
              {!user ? (
                <p className="text-xs text-gray-400 italic bg-[#050204] p-4 rounded-2xl border border-[#200d13]">
                  Zaloguj się na stronie głównej, aby opublikować manifest swojej gildii.
                </p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">Nazwa Gildii *</label>
                    <input type="text" name="name" required value={formData.name} onChange={handleInputChange} className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-2.5 text-gray-100 focus:border-[#f3ba2f] outline-none text-xs" placeholder="np. Husaria Polska" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">Serwer *</label>
                      <select name="server" value={formData.server} onChange={handleInputChange} className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-2.5 text-gray-200 outline-none text-xs cursor-pointer">
                        <option value="Europa">Europa</option>
                        <option value="Ameryka">Ameryka</option>
                        <option value="Azja">Azja</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">Główne Miasto *</label>
                      <select name="main_city" value={formData.main_city} onChange={handleInputChange} className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-2.5 text-gray-200 outline-none text-xs cursor-pointer">
                        <option value="Martlock">Martlock</option>
                        <option value="Lymhurst">Lymhurst</option>
                        <option value="Bridgewatch">Bridgewatch</option>
                        <option value="Fort Sterling">Fort Sterling</option>
                        <option value="Thetford">Thetford</option>
                        <option value="Caerleon">Caerleon</option>
                        <option value="Brecilien">Brecilien</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">Profil / Doktryna *</label>
                    <select name="activity_type" value={formData.activity_type} onChange={handleInputChange} className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-2.5 text-gray-200 outline-none text-xs cursor-pointer">
                      <option value="PvP">PvP / Ganking</option>
                      <option value="PvE / HCE">PvE / HCE</option>
                      <option value="ZvZ / Wojny">ZvZ / Wojny Terytorialne</option>
                      <option value="Casual / Wszystko">Casual / Mieszana</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">Zaproszenie Discord *</label>
                    <input type="url" name="discord_link" required value={formData.discord_link} onChange={handleInputChange} className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-2.5 text-gray-100 focus:border-[#f3ba2f] outline-none text-xs" placeholder="https://discord.gg/..." />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">Webhook Rekrutacji (Opcjonalnie)</label>
                    <input
                      type="url"
                      name="webhook_url"
                      value={formData.webhook_url}
                      onChange={handleInputChange}
                      className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-2.5 text-gray-100 focus:border-[#f3ba2f] outline-none text-xs"
                      placeholder="https://discord.com/api/webhooks/..."
                    />
                    
                    <details className="mt-2 text-[10px] text-gray-400 bg-[#050204] border border-[#220e14] p-2.5 rounded-xl">
                      <summary className="cursor-pointer text-[#f3ba2f] font-bold hover:underline select-none flex items-center gap-1 font-mono">
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
                    <textarea name="description" rows="4" maxLength="600" value={formData.description} onChange={handleInputChange} className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-2.5 text-gray-100 focus:border-[#f3ba2f] outline-none resize-none text-xs" placeholder="Opisz godziny aktywności, wymagany Fame..." />
                  </div>

                  <button type="submit" className="aopp-primary-button w-full py-3.5 text-xs font-extrabold uppercase tracking-wider">
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
            <div className="aopp-panel space-y-3 rounded-3xl p-4 font-mono text-xs">
              <div className="flex items-center justify-between gap-3 px-1">
                <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#8f8b83]">Archiwum chorągwi</p><h2 className="font-display text-lg font-bold text-white">Przeglądaj formacje</h2></div>
                <span className="rounded-lg border border-[#d8ad4a]/20 bg-[#d8ad4a]/10 px-3 py-1 text-[10px] font-black text-[#e4b94f]">{filteredGuilds.length} {filteredGuilds.length === 1 ? 'wynik' : 'wyników'}</span>
              </div>
              <div className="relative">
                <label htmlFor="guild-search" className="sr-only">Szukaj gildii po nazwie lub opisie</label>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input 
                  id="guild-search"
                  type="text" 
                  placeholder="Szukaj gildii po nazwie lub opisie..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="min-h-11 w-full rounded-xl border border-[#220e14] bg-[#050204] pl-9 pr-4 text-xs text-gray-100 outline-none focus:border-[#f3ba2f]"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label htmlFor="guild-server-filter" className="mb-1 block text-[10px] font-bold uppercase text-gray-300">Serwer</label>
                  <select id="guild-server-filter" value={filterServer} onChange={(e) => setFilterServer(e.target.value)} className="min-h-11 w-full cursor-pointer rounded-xl border border-[#220e14] bg-[#050204] p-2 font-bold text-[#f3ba2f] outline-none">
                    <option value="ALL">Wszystkie Serwery</option>
                    <option value="Europa">Europa</option>
                    <option value="Ameryka">Ameryka</option>
                    <option value="Azja">Azja</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="guild-city-filter" className="mb-1 block text-[10px] font-bold uppercase text-gray-300">Miasto</label>
                  <select id="guild-city-filter" value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className="min-h-11 w-full cursor-pointer rounded-xl border border-[#220e14] bg-[#050204] p-2 text-gray-200 outline-none">
                    <option value="ALL">Wszystkie Miasta</option>
                    <option value="Martlock">Martlock</option>
                    <option value="Lymhurst">Lymhurst</option>
                    <option value="Bridgewatch">Bridgewatch</option>
                    <option value="Fort Sterling">Fort Sterling</option>
                    <option value="Thetford">Thetford</option>
                    <option value="Caerleon">Caerleon</option>
                    <option value="Brecilien">Brecilien</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="guild-activity-filter" className="mb-1 block text-[10px] font-bold uppercase text-gray-300">Doktryna</label>
                  <select id="guild-activity-filter" value={filterActivity} onChange={(e) => setFilterActivity(e.target.value)} className="min-h-11 w-full cursor-pointer rounded-xl border border-[#220e14] bg-[#050204] p-2 text-gray-200 outline-none">
                    <option value="ALL">Wszystkie Doktryny</option>
                    <option value="PvP">PvP / Ganking</option>
                    <option value="PvE / HCE">PvE / HCE</option>
                    <option value="ZvZ / Wojny">ZvZ / Wojny</option>
                    <option value="Casual / Wszystko">Mieszana (Casual)</option>
                  </select>
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
                <div className="aopp-panel rounded-3xl p-12 text-center">
                  <Swords className="mx-auto h-8 w-8 text-[#7e6932]" />
                  <p className="font-display mt-4 text-lg font-bold text-[#c7c1b7]">Żadna chorągiew nie odpowiada filtrom</p>
                  <p className="mt-1 text-xs text-[#817d75]">Zmień serwer, miasto lub doktrynę i spróbuj ponownie.</p>
                </div>
              ) : (
                filteredGuilds.map((guild) => (
                  <div 
                    key={guild.id} 
                    className="aopp-list-card group relative space-y-5 overflow-hidden rounded-3xl p-6"
                  >
                    <div className="pointer-events-none absolute -right-2 -top-8 font-display text-[9rem] font-black leading-none text-[#d8ad4a]/[.035]">{guild.name.charAt(0)}</div>
                    <div className="relative flex flex-wrap items-start justify-between gap-4 border-b border-white/[.07] pb-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#d8ad4a]/25 bg-[#d8ad4a]/10 font-display text-xl font-black text-[#e4b94f]">{guild.name.charAt(0)}</div>
                        <div><p className="text-[9px] font-black uppercase tracking-[.18em] text-[#817d75]">Chorągiew gildyjna</p><h3 className="font-display mt-0.5 text-2xl font-black tracking-wide text-white">{guild.name}</h3></div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono font-bold">
                        <span className="flex items-center gap-1 bg-purple-500/10 text-purple-400 border border-purple-500/30 px-2.5 py-0.5 rounded-full uppercase">
                          <Globe className="w-3 h-3" /> {guild.server || 'Europa'}
                        </span>
                        
                        <span className="flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full uppercase">
                          <MapPin className="w-3 h-3" /> {guild.main_city}
                        </span>

                        <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full uppercase">
                          <Shield className="w-3 h-3" /> {guild.activity_type}
                        </span>
                      </div>
                    </div>

                    <p className="relative whitespace-pre-wrap rounded-2xl border border-white/[.06] bg-black/25 p-4 text-sm leading-6 text-[#c7c1b7]">
                      {guild.description}
                    </p>

                    <div className="relative flex flex-wrap items-center justify-between gap-3 border-t border-white/[.07] pt-4 text-xs text-gray-400">
                      <p className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" /> Lider: <b className="text-[#e3ded3]">{(guild.profiles?.username || 'Gracz').replace(/#0$/, '')}</b>
                      </p>

                      <div className="flex flex-wrap items-center gap-2">
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
                          className="aopp-primary-button flex min-h-11 items-center gap-1.5 px-4 py-2 text-[11px] font-extrabold uppercase tracking-wider"
                        >
                          <Swords className="w-3.5 h-3.5" />
                          <span>Aplikuj</span>
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

      <footer className="relative z-10 mt-12 w-full border-t border-[#d8ad4a]/15 bg-[#070807]/85 py-6 text-center text-xs text-gray-400">
        <div className="max-w-[1600px] mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© {new Date().getFullYear()} <span className="text-[#f3ba2f] font-bold">Albion Online Polska Portal</span>.</p>
          <p className="font-mono text-[10px] text-gray-400">Rejestr Gildii &amp; Rekrutacja</p>
        </div>
      </footer>

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
    </main>
  )
}
