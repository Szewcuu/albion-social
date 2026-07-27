'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Swords, Shield, Globe, MapPin, Search, ArrowLeft, ExternalLink, HelpCircle, Plus } from 'lucide-react'
import GuildApplyModal from '@/components/GuildApplyModal'

export default function Gildie() {
  const [guilds, setGuilds] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Stan dla okna aplikacji do gildii
  const [selectedGuildForApply, setSelectedGuildForApply] = useState(null)

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    fetchGuilds()
  }, [])

  const fetchGuilds = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('guilds')
      .select(`*, profiles(username)`)
      .order('created_at', { ascending: false })

    if (!error && data) setGuilds(data)
    setLoading(false)
  }

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
    <main className="min-h-screen bg-[#050305] text-gray-300 flex flex-col justify-between antialiased font-sans select-none relative">
      
      {/* TŁO KRWISTO-ZŁOTE */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1d0b12] via-[#050305] to-[#020102] z-0 pointer-events-none"></div>
      <div className="fixed inset-0 opacity-10 bg-[radial-gradient(#f3ba2f_1px,transparent_1px)] [background-size:24px_24px] z-0 pointer-events-none"></div>

      <div className="max-w-[1600px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 flex-1 z-10 text-sm">
        
        {/* POWRÓT */}
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-[#f3ba2f] hover:text-[#fcd053] text-xs font-black tracking-widest uppercase transition group">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Powrót do Centrum Caerleon</span>
          </Link>
        </div>

        {/* NAGŁÓWEK */}
        <header className="bg-[#0c0407] border border-[#2c1219] p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#1c0a10] border border-[#3d1823] flex items-center justify-center text-[#f3ba2f] shrink-0 shadow-[0_0_15px_rgba(243,186,47,0.2)]">
            <Swords className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider font-serif">
              Rejestr Dekretów &amp; Sojuszy Gildyjnych
            </h1>
            <p className="text-xs text-gray-400 font-mono mt-1">
              Oficjalny rejestr polskich formacji w Albion Online. Dołącz do ZvZ, małych grup lub zarejestruj własną gildię.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEWA STRONA: FORMULARZ */}
          <div className="lg:col-span-4">
            <div className="bg-[#0c0407] border border-[#281017] p-6 rounded-3xl shadow-2xl sticky top-6 space-y-4">
              <h2 className="text-sm font-black text-[#f3ba2f] uppercase tracking-wider font-serif border-b border-[#200d13] pb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Zarejestruj Gildię</span>
              </h2>
              
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

                  <button type="submit" className="w-full bg-gradient-to-r from-[#f3ba2f] to-[#d9981e] hover:from-[#fcd053] text-black font-extrabold py-3.5 rounded-xl uppercase tracking-wider transition text-xs cursor-pointer shadow-md">
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
            <div className="bg-[#0c0407] border border-[#281017] p-4 rounded-3xl shadow-xl space-y-3 font-mono text-xs">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Szukaj gildii po nazwie lub opisie..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="w-full bg-[#050204] border border-[#220e14] rounded-xl pl-9 pr-4 py-2.5 text-xs text-gray-100 focus:border-[#f3ba2f] outline-none"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Serwer</label>
                  <select value={filterServer} onChange={(e) => setFilterServer(e.target.value)} className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-2 text-[#f3ba2f] font-bold outline-none cursor-pointer">
                    <option value="ALL">Wszystkie Serwery</option>
                    <option value="Europa">Europa</option>
                    <option value="Ameryka">Ameryka</option>
                    <option value="Azja">Azja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Miasto</label>
                  <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-2 text-gray-300 outline-none cursor-pointer">
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
                  <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Doktryna</label>
                  <select value={filterActivity} onChange={(e) => setFilterActivity(e.target.value)} className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-2 text-gray-300 outline-none cursor-pointer">
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
                <div className="text-gray-500 italic text-center bg-[#0c0407] border border-[#281017] p-12 rounded-3xl">
                  Brak zarejestrowanych sojuszy spełniających te kryteria.
                </div>
              ) : (
                filteredGuilds.map((guild) => (
                  <div 
                    key={guild.id} 
                    className="bg-[#0c0407] border border-[#281017] hover:border-[#f3ba2f]/40 p-6 rounded-3xl shadow-xl transition space-y-4 relative overflow-hidden"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#200d13] pb-3">
                      <h3 className="text-xl font-black text-white uppercase tracking-wide font-serif">
                        {guild.name}
                      </h3>

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

                    <p className="text-xs text-gray-300 bg-[#050204] p-3.5 rounded-2xl border border-[#220e14] leading-relaxed font-sans whitespace-pre-wrap">
                      {guild.description}
                    </p>

                    <div className="flex flex-wrap items-center justify-between border-t border-[#200d13] pt-3 text-xs text-gray-500 gap-3 font-mono">
                      <p>
                        Lider: <b className="text-emerald-400">{guild.profiles?.username || 'Gracz'}</b>
                      </p>

                      <div className="flex items-center gap-2">
                        {guild.webhook_url && guild.webhook_url.trim() !== '' && (
                          <button
                            onClick={() => setSelectedGuildForApply(guild)}
                            className="bg-gradient-to-r from-[#f3ba2f] to-[#d9981e] hover:from-[#fcd053] text-black font-extrabold px-4 py-2 rounded-xl uppercase tracking-wider text-[11px] transition shadow cursor-pointer flex items-center gap-1.5"
                          >
                            <Swords className="w-3.5 h-3.5" />
                            <span>Aplikuj</span>
                          </button>
                        )}

                        <a 
                          href={guild.discord_link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="bg-[#5865F2]/20 hover:bg-[#5865F2] text-[#5865F2] hover:text-white border border-[#5865F2]/40 font-bold px-4 py-2 rounded-xl uppercase tracking-wider text-[11px] transition flex items-center gap-1.5 cursor-pointer"
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

      <footer className="w-full bg-[#030102] border-t border-[#200d13] py-6 text-center text-xs text-gray-500 mt-12 relative z-10">
        <div className="max-w-[1600px] mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© {new Date().getFullYear()} <span className="text-[#f3ba2f] font-bold">Albion Online Polska Portal</span>.</p>
          <p className="font-mono text-[10px] text-gray-600">Rejestr Gildii &amp; Rekrutacja</p>
        </div>
      </footer>

      <GuildApplyModal
        isOpen={!!selectedGuildForApply}
        onClose={() => setSelectedGuildForApply(null)}
        guild={selectedGuildForApply}
        currentUser={user}
      />
    </main>
  )
}