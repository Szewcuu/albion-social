'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Swords, Shield, Globe, MapPin, Search, ArrowLeft, ExternalLink, HelpCircle } from 'lucide-react'
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
    <main className="min-h-screen bg-[#080506] flex flex-col justify-between antialiased select-none relative text-[#bcbbc2] font-sans">
      
      {/* GLĘBOKIE TŁO KRWISTO-ZŁOTE */}
      <div className="fixed inset-0 bg-gradient-to-b from-[#1b0a0d] via-[#0d0708] to-[#050304] z-0 pointer-events-none"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-red-900/30 via-transparent to-transparent z-0 pointer-events-none"></div>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_bottom,_var(--tw-gradient-stops))] from-[#c59b27]/10 via-transparent to-transparent z-0 pointer-events-none"></div>

      <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1 z-10">
        
        {/* POWRÓT */}
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-[#c59b27] hover:text-[#f0b73a] text-xs font-black tracking-widest uppercase transition group">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Powrót do Centrum Caerleon</span>
          </Link>
        </div>

        {/* NOWY NAGŁÓWEK */}
        <header className="relative bg-[#120a0c]/90 border-2 border-[#c59b27]/80 p-6 sm:p-8 shadow-[0_0_30px_rgba(197,155,39,0.15)] overflow-hidden">
          <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none text-[#c59b27]">
            <Swords className="w-64 h-64" />
          </div>
          <div className="relative z-10 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
              <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Królewski Rejestr Wojskowy</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-gray-100 uppercase tracking-wider font-serif">
              ⚔️ Rejestr Dekretów i Sojuszy Gildyjnych
            </h1>
            <p className="text-xs sm:text-sm text-gray-400 max-w-2xl leading-relaxed">
              Oficjalne archiwum polskich formacji bojowych w Albion Online. Znajdź nową gildię, dołącz do ZvZ lub zarejestruj swój własny sojusz.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEWA STRONA: FORMULARZ DEDYKOWANY */}
          <div className="lg:col-span-4">
            <div className="bg-[#120a0c]/80 border border-[#3a1a1e] p-6 shadow-2xl sticky top-6 backdrop-blur-md">
              <div className="flex items-center justify-between border-b border-[#3a1a1e] pb-3 mb-5">
                <h2 className="text-base font-black text-[#c59b27] uppercase tracking-wider flex items-center gap-2 font-serif">
                  <Shield className="w-5 h-5 text-[#c59b27]" />
                  <span>Ogłoś Formację</span>
                </h2>
                <span className="text-[10px] bg-[#2b0d10] text-red-400 font-bold px-2 py-0.5 border border-red-900/50 uppercase">
                  Rejestracja
                </span>
              </div>
              
              {!user ? (
                <div className="text-center py-8 space-y-3 bg-[#080506]/60 border border-[#2b181a] p-4">
                  <p className="text-xs text-gray-400 italic">Brama autoryzacji jest zamknięta.</p>
                  <p className="text-xs font-bold text-[#c59b27]">Zaloguj się przez Discorda w menu głównym, aby wystawić manifest.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase tracking-wider">Nazwa Gildii *</label>
                    <input type="text" name="name" required value={formData.name} onChange={handleInputChange} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 focus:outline-none focus:border-[#c59b27] transition" placeholder="np. Husaria" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-400 mb-1 font-bold uppercase tracking-wider">Serwer *</label>
                      <select name="server" value={formData.server} onChange={handleInputChange} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-200 cursor-pointer focus:border-[#c59b27] outline-none">
                        <option value="Europa">Europa</option>
                        <option value="Ameryka">Ameryka</option>
                        <option value="Azja">Azja</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1 font-bold uppercase tracking-wider">Główne Miasto *</label>
                      <select name="main_city" value={formData.main_city} onChange={handleInputChange} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-200 cursor-pointer focus:border-[#c59b27] outline-none">
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
                    <label className="block text-gray-400 mb-1 font-bold uppercase tracking-wider">Doktryna / Profil *</label>
                    <select name="activity_type" value={formData.activity_type} onChange={handleInputChange} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-200 cursor-pointer focus:border-[#c59b27] outline-none">
                      <option value="PvP">PvP / Ganking</option>
                      <option value="PvE / HCE">PvE / HCE</option>
                      <option value="ZvZ / Wojny">ZvZ / Wojny Terytorialne</option>
                      <option value="Casual / Wszystko">Casual / Mieszana</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase tracking-wider">Zaproszenie Discord *</label>
                    <input type="url" name="discord_link" required value={formData.discord_link} onChange={handleInputChange} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 focus:outline-none focus:border-[#c59b27] transition" placeholder="https://discord.gg/..." />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase tracking-wider">
                      Webhook Rekrutacji (Opcjonalnie)
                    </label>
                    <input
                      type="url"
                      name="webhook_url"
                      value={formData.webhook_url}
                      onChange={handleInputChange}
                      className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 focus:outline-none focus:border-[#c59b27] transition"
                      placeholder="https://discord.com/api/webhooks/..."
                    />
                    
                    <details className="mt-2 text-[11px] text-gray-400 bg-[#080506] border border-[#2b181a] p-2.5 rounded-sm">
                      <summary className="cursor-pointer text-[#c59b27] font-bold hover:underline select-none flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>Jak pobrać link Webhooka z Discorda?</span>
                      </summary>
                      <ol className="list-decimal list-inside space-y-1 text-gray-300 mt-2 pt-2 border-t border-[#2b181a]">
                        <li>Wejdź na swój serwer Discord.</li>
                        <li>Stwórz kanał np. <span className="text-amber-400 font-mono">#rekrutacja</span>.</li>
                        <li>Przejdź w nim do: <b>Ustawienia kanału -&gt; Integracje -&gt; Webhooki</b>.</li>
                        <li>Kliknij <b>Utwórz webhook</b>, a następnie <b>Kopiuj adres URL webhooka</b> i wklej powyżej.</li>
                      </ol>
                    </details>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-gray-400 font-bold uppercase tracking-wider">Dekret / Wymagania *</label>
                      <span className="text-gray-500 font-mono">{formData.description.length}/600</span>
                    </div>
                    <textarea name="description" rows="4" maxLength="600" value={formData.description} onChange={handleInputChange} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 focus:outline-none focus:border-[#c59b27] resize-none" placeholder="Opisz gildie, godziny aktywności, wymagany Fame..." />
                  </div>

                  <button type="submit" className="w-full bg-gradient-to-r from-[#c59b27] to-[#a87a1e] hover:from-[#dca62b] text-black font-black py-3 uppercase tracking-widest transition shadow-lg shadow-[#c59b27]/10 font-serif text-xs">
                    Przybij Manifest
                  </button>
                  {formMessage && <p className="text-center font-bold text-amber-500 animate-pulse mt-2">{formMessage}</p>}
                </form>
              )}
            </div>
          </div>

          {/* PRAWA STRONA: PRZEGLĄDANIE OSOBNO KART */}
          <div className="lg:col-span-8 space-y-5">
            
            {/* PASEK WYSZUKIWANIA I FILTRÓW */}
            <div className="bg-[#120a0c]/80 border border-[#3a1a1e] p-4 shadow-xl backdrop-blur-md space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Szukaj gildii po nazwie, opisie lub słowach kluczowych..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="w-full bg-[#080506] border border-[#2b181a] pl-9 pr-4 py-2.5 text-xs text-gray-100 focus:outline-none focus:border-[#c59b27] transition"
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Serwer</label>
                  <select value={filterServer} onChange={(e) => setFilterServer(e.target.value)} className="w-full bg-[#080506] border border-[#2b181a] p-2 text-[#c59b27] font-bold focus:outline-none focus:border-[#c59b27] cursor-pointer">
                    <option value="ALL">Wszystkie Serwery</option>
                    <option value="Europa">Europa</option>
                    <option value="Ameryka">Ameryka</option>
                    <option value="Azja">Azja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Miasto</label>
                  <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className="w-full bg-[#080506] border border-[#2b181a] p-2 text-gray-300 focus:outline-none focus:border-[#c59b27] cursor-pointer">
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
                  <select value={filterActivity} onChange={(e) => setFilterActivity(e.target.value)} className="w-full bg-[#080506] border border-[#2b181a] p-2 text-gray-300 focus:outline-none focus:border-[#c59b27] cursor-pointer">
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
                <div className="py-12 text-center text-gray-400 font-bold animate-pulse text-sm">
                  Otwieranie królewskich archiwów gildyjnych...
                </div>
              ) : filteredGuilds.length === 0 ? (
                <div className="text-gray-500 italic text-center bg-[#120a0c]/40 border border-[#2b181a] p-12 text-sm">
                  Brak zarejestrowanych sojuszy spełniających te kryteria.
                </div>
              ) : (
                filteredGuilds.map((guild) => (
                  <div 
                    key={guild.id} 
                    className="bg-[#120a0c]/90 border border-[#2b181a] hover:border-[#c59b27]/60 p-5 shadow-xl transition-all duration-200 relative overflow-hidden group"
                  >
                    {/* Złota linia na krawędzi przy hoverze */}
                    <div className="absolute top-0 left-0 w-1 h-full bg-[#c59b27] opacity-0 group-hover:opacity-100 transition-opacity"></div>

                    {/* NAGŁÓWEK KARTY */}
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-3 border-b border-[#2b181a] pb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-black text-gray-100 uppercase tracking-wider font-serif">
                          {guild.name}
                        </h3>
                      </div>

                      {/* TAGI INFORMACYJNE */}
                      <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                        <span className="flex items-center gap-1 bg-[#080506] text-purple-400 border border-purple-900/40 px-2.5 py-1">
                          <Globe className="w-3 h-3" />
                          <span>{guild.server || 'Europa'}</span>
                        </span>
                        
                        <span className="flex items-center gap-1 bg-[#080506] text-amber-400 border border-amber-900/40 px-2.5 py-1">
                          <MapPin className="w-3 h-3" />
                          <span>{guild.main_city}</span>
                        </span>

                        <span className="flex items-center gap-1 bg-[#080506] text-emerald-400 border border-emerald-900/40 px-2.5 py-1">
                          <Shield className="w-3 h-3" />
                          <span>{guild.activity_type}</span>
                        </span>
                      </div>
                    </div>

                    {/* OPIS */}
                    <p className="text-gray-300 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed mb-5 font-sans">
                      {guild.description}
                    </p>

                    {/* STOPKA KARTY & PRZYCISKI */}
                    <div className="flex flex-wrap items-center justify-between border-t border-[#2b181a] pt-3 text-xs text-gray-500 gap-3">
                      <p className="text-[11px]">
                        Lider / Wystawca: <span className="text-gray-300 font-mono">{guild.profiles?.username || 'Nieznany'}</span>
                      </p>

                      <div className="flex items-center gap-2">
                        {/* Przycisk Aplikuj wyświetlany TYLKO gdy jest webhook */}
                        {guild.webhook_url && guild.webhook_url.trim() !== '' && (
                          <button
                            onClick={() => setSelectedGuildForApply(guild)}
                            className="bg-[#2b0d10] hover:bg-red-900 border border-red-700/60 text-red-200 font-bold py-2 px-4 text-xs uppercase tracking-wider flex items-center gap-1.5 transition shadow-md"
                          >
                            <Swords className="w-3.5 h-3.5 text-[#c59b27]" />
                            <span>Aplikuj</span>
                          </button>
                        )}

                        <a 
                          href={guild.discord_link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="bg-[#5865F2]/20 hover:bg-[#5865F2] text-[#5865F2] hover:text-white border border-[#5865F2]/50 font-bold py-2 px-4 text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-md"
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

      {/* FOOTER */}
      <footer className="w-full bg-[#050304] border-t border-[#3a1a1e] py-6 text-center z-10 text-xs text-gray-500 mt-8">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© {new Date().getFullYear()} <span className="text-[#c59b27] font-bold">Albion Online Polska - Portal</span>.</p>
          <p className="font-mono text-[10px] text-gray-600">Rejestr Taktyczny &amp; Tablica Rekrutacji</p>
        </div>
      </footer>

      {/* MODAL FORMULARZA APLIKACYJNEGO */}
      <GuildApplyModal
        isOpen={!!selectedGuildForApply}
        onClose={() => setSelectedGuildForApply(null)}
        guild={selectedGuildForApply}
        currentUser={user}
      />
    </main>
  )
}