'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Buildy() {
  const [builds, setBuilds] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Filtry
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActivity, setFilterActivity] = useState('ALL')
  const [filterServer, setFilterServer] = useState('ALL')

  // Formularz nowego buildu
    const [formData, setFormData] = useState({
      title: '',
      activity_type: 'PvP',
      server: 'Europa',
      slot_head: '',
      slot_chest: '',
      slot_shoes: '',
      slot_weapon: '',
      slot_offhand: '',
      slot_cape: '',
      slot_food: '',
      slot_potion: '',
      description: ''
    })
  const [formMessage, setFormMessage] = useState('')
  const [isSubmitting, setIsActiveSubmitting] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    fetchBuilds()
  }, [])

  const fetchBuilds = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('builds')
        .select('*, profiles(username)')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setBuilds(data)
    } catch (err) {
      console.error("Błąd pobierania buildów:", err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormMessage('')
    setIsActiveSubmitting(true)

    if (!user) {
      setFormMessage('BŁĄD: Musisz być zalogowany, aby zapisać projekt!')
      setIsActiveSubmitting(false)
      return
    }

    const cleanTitle = formData.title.trim()
    if (cleanTitle.length < 3) {
      setFormMessage('BŁĄD: Tytuł konfiguracji musi mieć minimum 3 znaki!')
      setIsActiveSubmitting(false)
      return
    }

    try {
      // Bezpieczny zapis do bazy danych
      const { error } = await supabase.from('builds').insert([
        {
          title: cleanTitle,
          activity_type: formData.activity_type,
          server: formData.server,
          slot_head: formData.slot_head.trim(),
          slot_chest: formData.slot_chest.trim(),
          slot_shoes: formData.slot_shoes.trim(),
          slot_weapon: formData.slot_weapon.trim(),
          slot_offhand: formData.slot_offhand.trim(),
          slot_cape: formData.slot_cape.trim(),
          slot_food: formData.slot_food.trim(),
          slot_potion: formData.slot_potion.trim(),
          description: formData.description.trim() || null,
          user_id: user.id
        }
      ])

      if (error) {
        // Jeśli tabela profiles nie zdążyła się zsynchronizować z nowym kontem Discorda
        if (error.message.includes('profiles')) {
          throw new Error('Brak zsynchronizowanego profilu użytkownika. Spróbuj wylogować się i zalogować ponownie.')
        }
        throw error
      }

      setFormMessage('SUKCES: Konfiguracja zapisana w zbrojowni!');
      
      // Reset tytułu i opisu po udanym zapisie
      setFormData(prev => ({
        ...prev,
        title: '',
        description: ''
      }))
      
      // Odświeżenie listy na żywo
      await fetchBuilds()
    } catch (err) {
      setFormMessage(`BŁĄD BAZY: ${err.message}`)
    } finally {
      setIsActiveSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (confirm('Czy chcesz trwale usunąć tę konfigurację sprzętową?')) {
      const { error } = await supabase.from('builds').delete().eq('id', id)
      if (!error) fetchBuilds()
    }
  }

  const filteredBuilds = builds.filter(b => {
    const matchesSearch = b.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          b.slot_weapon.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (b.description && b.description.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesActivity = filterActivity === 'ALL' || b.activity_type === filterActivity
    const matchesServer = filterServer === 'ALL' || b.server === filterServer
    return matchesSearch && matchesActivity && matchesServer
  })

  return (
    <main className="min-h-screen animate-bg-drift text-[#bcbbc2] p-4 sm:p-6 flex flex-col items-center antialiased font-albion-ui select-none relative overflow-hidden">
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Inter:wght@400;500;700;800&display=swap');
        .font-albion-title { font-family: 'Cinzel', serif; }
        .font-albion-ui { font-family: 'Inter', sans-serif; }

        @keyframes bgDrift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-bg-drift {
          background: linear-gradient(-45deg, #020203, #080706, #140f0a, #040405);
          background-size: 300% 300%;
          animation: bgDrift 35s ease infinite;
        }
      `}</style>

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.85)_100%)] pointer-events-none z-0"></div>

      <div className="max-w-7xl w-full space-y-5 z-10">
        <div className="mb-2">
          <Link href="/" className="text-[#c59b27] hover:underline text-xs font-bold tracking-wider uppercase font-albion-title">← Zamknij Zbrojownię</Link>
        </div>

        <header className="bg-[#141419] border-2 border-[#c59b27] p-4 shadow-2xl">
          <h1 className="text-2xl font-black text-gray-100 font-albion-title tracking-wider">⚔️ KREATOR I ARCHIWUM BUILDÓW SPOŁECZNOŚCI</h1>
          <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mt-0.5">Projektuj zestawy, sprawdzaj synergie przedmiotów i publikuj swoje strategie</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* LEWA STRONA: FORMULARZ KREATORA */}
          
          <div className="lg:col-span-5">
            <div className="bg-[#141419] border border-[#23232c] p-5 shadow-xl">
              <h2 className="text-xs font-black mb-4 text-[#c59b27] uppercase tracking-widest border-b border-[#23232c] pb-1.5 font-albion-title">Kuj Nowy Zestaw Ekwipunku</h2>
              
              {!user ? (
                <p className="text-gray-500 text-xs italic bg-[#0b0b0d] p-4 border border-[#23232c]">Brama autoryzacji zamknięta. Zaloguj się na panelu głównym.</p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                  {formMessage && (
                    <div className={`p-2 border text-center font-bold font-mono text-[10px] uppercase ${formMessage.startsWith('SUKCES') ? 'text-emerald-400 border-emerald-950 bg-emerald-950/20' : 'text-red-400 border-red-950 bg-red-950/20'}`}>
                      {formMessage}
                    </div>
                  )}

                  <div>
                    <label className="block text-[9px] text-gray-500 mb-1 font-bold uppercase tracking-wider">Nazwa Konfiguracji (Min. 3 znaki)</label>
                    <input type="text" name="title" required value={formData.title} onChange={handleInputChange} placeholder="np. Carving Solo PvP" className="w-full bg-[#0b0b0d] border border-[#23232c] p-2 text-white focus:border-[#c59b27] focus:outline-none" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] text-gray-500 mb-1 font-bold uppercase tracking-wider">Aktywność</label>
                      <select name="activity_type" value={formData.activity_type} onChange={handleInputChange} className="w-full bg-[#0b0b0d] border border-[#23232c] p-2 text-white focus:border-[#c59b27] focus:outline-none cursor-pointer">
                        <option value="PvP">PvP / Ganking</option>
                        <option value="ZvZ">ZvZ</option>
                        <option value="PvE / HCE">PvE / HCE</option>
                        <option value="Solo">Solo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-500 mb-1 font-bold uppercase tracking-wider">Serwer</label>
                      <select name="server" value={formData.server} onChange={handleInputChange} className="w-full bg-[#0b0b0d] border border-[#23232c] p-2 text-[#c59b27] font-bold focus:border-[#c59b27] focus:outline-none cursor-pointer">
                        <option value="Europa">Europa</option>
                        <option value="Ameryka">Ameryka</option>
                        <option value="Azja">Azja</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-[#23232c] my-2 pt-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] text-gray-500 mb-1 font-bold uppercase tracking-wider">Broń Główna</label>
                      <input type="text" name="slot_weapon" required value={formData.slot_weapon} onChange={handleInputChange} placeholder="np. Miecz Rzeźbiarz (Carving)" className="w-full bg-[#0b0b0d] border border-[#23232c] p-2 text-white focus:border-[#c59b27] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-500 mb-1 font-bold uppercase tracking-wider">Druga Ręka (Offhand)</label>
                      <input type="text" name="slot_offhand" value={formData.slot_offhand} onChange={handleInputChange} placeholder="np. Brak (Dwuręczny) lub Tarczka" className="w-full bg-[#0b0b0d] border border-[#23232c] p-2 text-white focus:border-[#c59b27] focus:outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] text-gray-500 mb-1 font-bold uppercase tracking-wider">Głowa</label>
                      <input type="text" name="slot_head" value={formData.slot_head} onChange={handleInputChange} placeholder="np. Kaptur Uczonego" className="w-full bg-[#0b0b0d] border border-[#23232c] p-2 text-white focus:border-[#c59b27] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-500 mb-1 font-bold uppercase tracking-wider">Klatka</label>
                      <input type="text" name="slot_chest" value={formData.slot_chest} onChange={handleInputChange} placeholder="np. Kurtka Najemnika" className="w-full bg-[#0b0b0d] border border-[#23232c] p-2 text-white focus:border-[#c59b27] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-500 mb-1 font-bold uppercase tracking-wider">Buty</label>
                      <input type="text" name="slot_shoes" value={formData.slot_shoes} onChange={handleInputChange} placeholder="np. Buty Żołnierza" className="w-full bg-[#0b0b0d] border border-[#23232c] p-2 text-white focus:border-[#c59b27] focus:outline-none" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] text-gray-500 mb-1 font-bold uppercase tracking-wider">Peleryna</label>
                      <input type="text" name="slot_cape" value={formData.slot_cape} onChange={handleInputChange} placeholder="np. Przylądek Martlock" className="w-full bg-[#0b0b0d] border border-[#23232c] p-2 text-white focus:border-[#c59b27] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-500 mb-1 font-bold uppercase tracking-wider">Jedzenie</label>
                      <input type="text" name="slot_food" value={formData.slot_food} onChange={handleInputChange} placeholder="np. Gulasz Wołowy" className="w-full bg-[#0b0b0d] border border-[#23232c] p-2 text-white focus:border-[#c59b27] focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[9px] text-gray-500 mb-1 font-bold uppercase tracking-wider">Mikstura</label>
                      <input type="text" name="slot_potion" value={formData.slot_potion} onChange={handleInputChange} placeholder="np. Mikstura Odporności" className="w-full bg-[#0b0b0d] border border-[#23232c] p-2 text-white focus:border-[#c59b27] focus:outline-none" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] text-gray-500 mb-1 font-bold uppercase tracking-wider">Opis Strategii / Uwagi Taktyczne</label>
                    <textarea name="description" rows="3" value={formData.description} onChange={handleInputChange} placeholder="Opisz rotację skilli, sytuacje taktyczne..." className="w-full bg-[#0b0b0d] border border-[#23232c] p-2 text-white focus:border-[#c59b27] focus:outline-none font-sans resize-none" />
                  </div>

                  <button type="submit" disabled={isSubmitting} className="w-full bg-gradient-to-b from-[#dca62b] to-[#a87a1e] hover:from-[#f0b73a] hover:to-[#be8c27] text-black font-black py-2 px-4 uppercase tracking-widest border border-[#4a3a1d] transition transform active:scale-95 font-albion-title disabled:opacity-50">
                    {isSubmitting ? 'KUŹNIA PRACUJE...' : 'ZAPISZ PROJEKT W ZBROJOWNI'}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* PRAWA STRONA: PRZEGLĄDANIE BUILDÓW */}
          <div className="lg:col-span-7 space-y-4">
            
            <div className="bg-[#141419] border border-[#23232c] p-4 flex flex-col sm:flex-row gap-3 shadow-md">
              <input type="text" placeholder="Szukaj buildu po nazwie lub broni..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 bg-[#0b0b0d] border border-[#23232c] p-2 text-xs text-white focus:outline-none focus:border-[#c59b27]" />
              
              <select value={filterServer} onChange={(e) => setFilterServer(e.target.value)} className="bg-[#0b0b0d] border border-[#23232c] p-2 text-xs text-[#c59b27] font-bold focus:outline-none focus:border-[#c59b27]">
                <option value="ALL">Wszystkie Serwery</option>
                <option value="Europa">Europa</option>
                <option value="Ameryka">Ameryka</option>
                <option value="Azja">Azja</option>
              </select>

              <select value={filterActivity} onChange={(e) => setFilterActivity(e.target.value)} className="bg-[#0b0b0d] border border-[#23232c] p-2 text-xs text-gray-300 focus:outline-none focus:border-[#c59b27]">
                <option value="ALL">Każda aktywność</option>
                <option value="PvP">PvP / Ganking</option>
                <option value="ZvZ">ZvZ</option>
                <option value="PvE / HCE">PvE / HCE</option>
                <option value="Solo">Solo</option>
              </select>
            </div>

            <div className="space-y-4">
              {loading ? (
                <p className="text-gray-500 font-bold animate-pulse text-xs font-mono">Wczytywanie planów wojennych społeczności...</p>
              ) : filteredBuilds.length === 0 ? (
                <p className="text-gray-600 italic text-center bg-[#141419]/40 border border-[#23232c]/60 p-8 text-xs">Brak zgłoszonych konfiguracji bojowych spełniających filtry.</p>
              ) : (
                filteredBuilds.map((build) => (
                  <div key={build.id} className="bg-[#141419] border-2 border-[#23232c] p-4 shadow-2xl space-y-3">
                    <div className="flex justify-between items-center border-b border-[#23232c] pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold bg-[#0b0b0d] border border-[#23232c] text-purple-400 px-1.5 py-0.5 uppercase">{build.server}</span>
                          <span className="text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 uppercase">{build.activity_type}</span>
                          <h3 className="text-base font-black text-gray-100 font-serif tracking-wide">{build.title}</h3>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-0.5">Autor taktyki: <span className="text-gray-400 font-mono font-bold">{build.profiles?.username || 'Gracz'}</span></p>
                      </div>
                      {user && user.id === build.user_id && (
                        <button onClick={() => handleDelete(build.id)} className="text-[10px] text-red-400 font-bold uppercase tracking-wider hover:underline">Rozmontuj</button>
                      )}
                    </div>

                    <div className="bg-[#0b0b0d] p-3 rounded border border-[#1f1f26] grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div><span className="text-gray-500 block text-[8px] uppercase font-bold">Weapon:</span> <span className="text-[#c59b27] font-bold">{build.slot_weapon}</span></div>
                      <div><span className="text-gray-500 block text-[8px] uppercase font-bold">Chest Armor:</span> <span className="text-gray-300">{build.slot_chest}</span></div>
                      <div><span className="text-gray-500 block text-[8px] uppercase font-bold">Helmet:</span> <span className="text-gray-400">{build.slot_head}</span></div>
                      <div><span className="text-gray-500 block text-[8px] uppercase font-bold">Shoes:</span> <span className="text-gray-400">{build.slot_shoes}</span></div>
                      <div><span className="text-gray-500 block text-[8px] uppercase font-bold">Offhand:</span> <span className="text-gray-400">{build.slot_offhand}</span></div>
                      <div><span className="text-gray-500 block text-[8px] uppercase font-bold">Cape:</span> <span className="text-gray-400">{build.slot_cape}</span></div>
                      <div><span className="text-gray-500 block text-[8px] uppercase font-bold">Food:</span> <span className="text-gray-400">{build.slot_food}</span></div>
                      <div><span className="text-gray-500 block text-[8px] uppercase font-bold">Potion:</span> <span className="text-gray-400">{build.slot_potion}</span></div>
                    </div>

                    {build.description && (
                      <p className="text-xs text-gray-400 bg-[#1a1a24]/30 p-2.5 rounded border border-[#23232c]/40 font-sans leading-relaxed">{build.description}</p>
                    )}
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      </div>
    </main>
  )
}