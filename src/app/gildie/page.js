'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Swords } from 'lucide-react'
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

    // WYSYŁKA DO SUPABASE
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
    <main className="min-h-screen bg-[#121216] animate-bg-drift flex flex-col justify-between antialiased font-albion-ui select-none relative overflow-hidden text-[#bcbbc2]">
      
      {/* CSS PŁONĄCEGO CAERLEON */}
      <style>{`
        @keyframes fireDrift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-fire-drift {
          background: linear-gradient(-45deg, #0f0a0a, #1a0c0e, #241014, #12090c);
          background-size: 300% 300%;
          animation: fireDrift 25s ease infinite;
        }
      `}</style>

      {/* WARSTWY TŁA CAERLEON */}
      <div className="fixed inset-0 animate-fire-drift z-0 pointer-events-none"></div>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,#991b1b22,transparent_60%)] z-0 pointer-events-none"></div>
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.85)_100%)] z-0 pointer-events-none"></div>

      <div className="max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5 flex-1 z-10 text-base">
        <div className="mb-2">
          <Link href="/" className="text-[#c59b27] hover:underline text-sm font-bold tracking-wider uppercase font-albion-title">← Zamknij spis sojuszy</Link>
        </div>

        <header className="bg-[#141419] border-2 border-[#c59b27] p-5 shadow-2xl">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-100 font-albion-title tracking-wider">⚔️ REJESTR DEKRETÓW I SOJUSZY GILDYJNYCH</h1>
          <p className="text-sm text-gray-400 uppercase tracking-widest font-bold mt-1">Spis aktywnych formacji bojowych polskiej społeczności</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEWA STRONA: FORMULARZ GILDII */}
          <div className="lg:col-span-4">
            <div className="bg-[#141419] border border-[#23232c] p-6 shadow-xl sticky top-6">
              <h2 className="text-sm sm:text-base font-black mb-4 text-[#c59b27] uppercase tracking-widest border-b border-[#23232c] pb-2 font-albion-title">Ogłoś Formację</h2>
              
              {!user ? (
                <p className="text-gray-400 text-sm italic bg-[#0b0b0d] p-5 border border-[#23232c]">Brama autoryzacji zamknięta. Zaloguj się na panelu głównym.</p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">Nazwa Gildii</label>
                    <input type="text" name="name" required value={formData.name} onChange={handleInputChange} className="w-full bg-[#0b0b0d] border border-[#23232c] p-2.5 text-white focus:outline-none focus:border-[#c59b27] text-sm" placeholder="Np. Husaria" />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">Serwer Rozgrywki</label>
                    <select name="server" value={formData.server} onChange={handleInputChange} className="w-full bg-[#0b0b0d] border border-[#23232c] p-2.5 text-white cursor-pointer focus:border-[#c59b27] focus:outline-none text-sm">
                      <option value="Europa">Europa</option>
                      <option value="Ameryka">Ameryka</option>
                      <option value="Azja">Azja</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">Siedziba / Główne Miasto</label>
                    <select name="main_city" value={formData.main_city} onChange={handleInputChange} className="w-full bg-[#0b0b0d] border border-[#23232c] p-2.5 text-white cursor-pointer focus:border-[#c59b27] focus:outline-none text-sm">
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
                    <label className="block text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">Główny Profil Działalności</label>
                    <select name="activity_type" value={formData.activity_type} onChange={handleInputChange} className="w-full bg-[#0b0b0d] border border-[#23232c] p-2.5 text-white cursor-pointer focus:border-[#c59b27] focus:outline-none text-sm">
                      <option value="PvP">PvP / Ganking</option>
                      <option value="PvE / HCE">PvE / HCE</option>
                      <option value="ZvZ / Wojny">ZvZ / Wojny terytorialne</option>
                      <option value="Casual / Wszystko">Casual / Mieszana</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">Baza Kwatery (Link Discord)</label>
                    <input type="url" name="discord_link" required value={formData.discord_link} onChange={handleInputChange} className="w-full bg-[#0b0b0d] border border-[#23232c] p-2.5 text-white focus:outline-none focus:border-[#c59b27] text-sm" placeholder="https://discord.gg/..." />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">
                      Webhook Discord do Rekrutacji (Opcjonalnie)
                    </label>
                    <input
                      type="url"
                      name="webhook_url"
                      value={formData.webhook_url}
                      onChange={handleInputChange}
                      className="w-full bg-[#0b0b0d] border border-[#23232c] p-2.5 text-white focus:outline-none focus:border-[#c59b27] text-sm"
                      placeholder="https://discord.com/api/webhooks/..."
                    />
                    
                    {/* PROSTY PORADNIK DLA GRACZY */}
                    <details className="mt-2 text-xs text-gray-400 bg-[#0b0b0d] border border-[#23232c] p-3 rounded-sm">
                      <summary className="cursor-pointer text-[#c59b27] font-bold hover:underline select-none">
                        ❓ Jak stworzyć i zdobyć taki Webhook? (Kliknij, aby rozwijać poradnik)
                      </summary>
                      <div className="mt-2 space-y-1.5 text-gray-300 leading-relaxed font-sans border-t border-[#23232c] pt-2">
                        <p>Jeśli chcesz, aby zgłoszenia od graczy ze strony trafiały bezpośrednio na Twój serwer Discord:</p>
                        <ol className="list-decimal list-inside space-y-1 text-gray-300 pl-1">
                          <li>Wejdź na swój serwer na Discordzie.</li>
                          <li>Stwórz nowy kanał tekstowy, np. <span className="text-amber-400 font-mono">#rekrutacja-zgłoszenia</span>.</li>
                          <li>Kliknij ikonę koła zębatego <span className="text-gray-400 font-mono">(Ustawienia kanału)</span> obok tego kanału.</li>
                          <li>W menu po lewej stronie wybierz <span className="text-gray-400 font-mono">Integracje</span>.</li>
                          <li>Kliknij przycisk <span className="text-gray-400 font-mono">Utwórz webhook</span> (lub „Wyświetl webhooki” i dodaj nowy).</li>
                          <li>Nadaj mu nazwę (np. <i>Bot Rekrutacyjny</i>), upewnij się, że kanał to ten od rekrutacji, a następnie kliknij <span className="text-emerald-400 font-bold">Kopiuj adres URL webhooka</span>.</li>
                          <li>Nie zapomnij zapisać webhooka na discordzie.</li>
                          <li>Wklej skopiowany link w pole powyżej! Gotowe.</li>
                        </ol>
                        <p className="text-[11px] text-gray-500 italic mt-1">
                          *Dzięki temu każda aplikacja gracza wysle powiadomienie na wyznaczony kanał na Waszym Discordzie.
                        </p>
                      </div>
                    </details>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs text-gray-400 font-bold uppercase tracking-wider">Dekret rekrutacyjny / Wymagania</label>
                      <span className="text-xs text-gray-500 font-bold font-mono">{formData.description.length}/600</span>
                    </div>
                    <textarea name="description" rows="5" maxLength="600" value={formData.description} onChange={handleInputChange} className="w-full bg-[#0b0b0d] border border-[#23232c] p-2.5 text-white focus:outline-none focus:border-[#c59b27] resize-none text-sm" placeholder="Opisz zasady panujące w gildii..." />
                  </div>

                  <button type="submit" className="w-full bg-gradient-to-b from-[#dca62b] to-[#a87a1e] hover:from-[#f0b73a] hover:to-[#be8c27] text-black font-black py-3 px-5 uppercase tracking-widest border border-[#4a3a1d] font-albion-title text-sm transition">Przybij Manifest</button>
                  {formMessage && <p className="text-center font-bold text-amber-500 animate-pulse mt-3 text-sm">{formMessage}</p>}
                </form>
              )}
            </div>
          </div>

          {/* PRAWA STRONA: PRZEGLĄDANIE REJESTRU */}
          <div className="lg:col-span-8 space-y-4">
            
            <div className="bg-[#141419] border border-[#23232c] p-5 flex flex-col gap-4 shadow-md">
              <input type="text" placeholder="Filtruj sojusze po słowach kluczowych..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#0b0b0d] border border-[#23232c] p-2.5 text-sm text-white focus:outline-none focus:border-[#c59b27]" />
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-black uppercase tracking-wider">Wybierz Świat</label>
                  <select value={filterServer} onChange={(e) => setFilterServer(e.target.value)} className="w-full bg-[#0b0b0d] border border-[#23232c] p-2.5 text-sm text-[#c59b27] font-bold focus:outline-none focus:border-[#c59b27] cursor-pointer">
                    <option value="ALL">Wszystkie Serwery</option>
                    <option value="Europa">Europa</option>
                    <option value="Ameryka">Ameryka</option>
                    <option value="Azja">Azja</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-black uppercase tracking-wider">Główne Miasto</label>
                  <select value={filterCity} onChange={(e) => setFilterCity(e.target.value)} className="w-full bg-[#0b0b0d] border border-[#23232c] p-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#c59b27] cursor-pointer">
                    <option value="ALL">Wszystkie miasta</option>
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
                  <label className="block text-xs text-gray-400 mb-1.5 font-black uppercase tracking-wider">Doktryna Wojenna</label>
                  <select value={filterActivity} onChange={(e) => setFilterActivity(e.target.value)} className="w-full bg-[#0b0b0d] border border-[#23232c] p-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#c59b27] cursor-pointer">
                    <option value="ALL">Dowolna Doktryna</option>
                    <option value="PvP">PvP / Ganking</option>
                    <option value="PvE / HCE">PvE / HCE</option>
                    <option value="ZvZ / Wojny">ZvZ / Wojny</option>
                    <option value="Casual / Wszystko">Mieszana (Casual)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {loading ? (
                <p className="text-gray-400 font-bold animate-pulse font-mono text-sm sm:text-base py-2">Otwieranie królewskich archiwów gildyjnych...</p>
              ) : filteredGuilds.length === 0 ? (
                <p className="text-gray-500 italic text-center bg-[#141419]/40 border border-[#23232c]/60 p-8 text-sm sm:text-base">Nie znaleziono zarejestrowanych sojuszy spełniających te kryteria.</p>
              ) : (
                filteredGuilds.map((guild) => (
                  <div key={guild.id} className="bg-[#141419] border border-[#23232c] hover:border-[#c59b27]/40 p-5 shadow-md flex flex-col justify-between transition duration-150 text-sm sm:text-base">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-bold bg-[#0b0b0d] border border-[#23232c] text-purple-400 px-2 py-0.5 uppercase tracking-wider">{guild.server || 'Europa'}</span>
                          <h3 className="text-xl font-black text-gray-100 font-albion-title tracking-wider">{guild.name}</h3>
                        </div>
                        <div className="flex gap-2 text-xs sm:text-sm font-bold">
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1 rounded-sm">{guild.main_city}</span>
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-sm">{guild.activity_type}</span>
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm sm:text-base whitespace-pre-wrap mb-5 leading-relaxed font-sans">{guild.description}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between border-t border-[#23232c] pt-4 text-xs sm:text-sm text-gray-500 gap-3">
                      <p>Wystawca manifestu: <span className="text-gray-400 font-mono font-medium">{guild.profiles?.username || 'Nieznany'}</span></p>
                      
                      {/* PRZYCISKI: APLIKUJ ORAZ DISCORD */}
                      <div className="flex items-center gap-2">
                        {/* Wyświetlaj przycisk "Aplikuj" TYLKO jeśli gildia posiada podpięty webhook_url */}
                        {guild.webhook_url && guild.webhook_url.trim() !== '' && (
                          <button
                            onClick={() => setSelectedGuildForApply(guild)}
                            className="bg-[#2b0d10] hover:bg-red-900 border border-red-700/50 text-red-200 font-bold py-2 px-4 rounded-sm transition text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5 shadow"
                          >
                            <Swords className="w-4 h-4 text-[#c59b27]" />
                            <span>Aplikuj</span>
                          </button>
                        )}

                        <a 
                          href={guild.discord_link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="bg-gradient-to-b from-[#5865F2] to-[#404eed] text-white font-extrabold py-2 px-5 rounded-sm hover:from-[#6a77f3] hover:to-[#4e5cf5] transition text-xs sm:text-sm uppercase tracking-wider shadow"
                        >
                          Wejdź na Discord
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

      {/* FOOTER PRZYKLEJONY DO PODSTAWY */}
      <footer className="w-full bg-[#0b0b0d] border-t-2 border-[#c59b27] py-6 text-center z-20 text-sm font-sans tracking-wide mt-8 relative">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3 text-gray-500">
          <p className="font-medium">
            © {new Date().getFullYear()} <span className="text-[#c59b27] font-bold font-albion-title">Albion Online Polska Portal</span>. Wszelkie prawa zastrzeżone.
          </p>
          <p className="text-xs border border-gray-900 bg-[#121216] px-3 py-1 text-gray-400 rounded-sm font-mono">
            Rejestr manifestów i organizacji wojskowych.
          </p>
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