'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  ArrowLeft, Swords, Shield, Heart, UserCheck, Plus, 
  Clock, MapPin, Users, Trash2, CheckCircle2, AlertCircle 
} from 'lucide-react'

export default function Wyprawy() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expeditions, setExpeditions] = useState([])
  
  // Stan formularza nowej wyprawy
  const [formData, setFormData] = useState({
    title: '',
    activity_type: 'Statyk T8',
    min_ip: 1400,
    start_time: '19:00 UTC',
    server: 'Europa',
    description: '',
    max_tanks: 1,
    max_healers: 1,
    max_dps: 3,
    max_supports: 1
  })
  const [formMessage, setFormMessage] = useState('')

  // Stan formularza zapisu gracza do drużyny
  const [signupData, setFormSignupData] = useState({
    ingame_nick: '',
    player_ip: 1400,
    role_type: 'DPS'
  })
  const [activeExpeditionForSignup, setActiveExpeditionForSignup] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    fetchExpeditions()
  }, [])

  const fetchExpeditions = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('expeditions')
      .select(`
        *,
        profiles(username),
        expedition_signups(*, profiles(username))
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setExpeditions(data)
    }
    setLoading(false)
  }

const handleCreateExpedition = async (e) => {
    e.preventDefault()
    setFormMessage('')

    if (!user) {
      setFormMessage('Musisz być zalogowany, aby zwołać wyprawę!')
      return
    }

    const creatorName = user?.user_metadata?.full_name || user?.email || 'Gracz'

    const { error } = await supabase.from('expeditions').insert([
      {
        ...formData,
        min_ip: parseInt(formData.min_ip),
        max_tanks: parseInt(formData.max_tanks),
        max_healers: parseInt(formData.max_healers),
        max_dps: parseInt(formData.max_dps),
        max_supports: parseInt(formData.max_supports),
        user_id: user.id
      }
    ])

    if (error) {
      setFormMessage(`Błąd: ${error.message}`)
    } else {
      setFormMessage('Wyprawa została ogłoszona na tablicy!')

      // Wysyłamy automatyczne powiadomienie na Discorda
      try {
        await fetch('/api/webhooks/expedition', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title,
            activity_type: formData.activity_type,
            min_ip: formData.min_ip,
            start_time: formData.start_time,
            server: formData.server,
            description: formData.description,
            creator: creatorName
          })
        })
      } catch (err) {
        console.error('Błąd wysyłania na Discorda:', err)
      }

      setFormData({
        title: '',
        activity_type: 'Statyk T8',
        min_ip: 1400,
        start_time: '19:00 UTC',
        server: 'Europa',
        description: '',
        max_tanks: 1,
        max_healers: 1,
        max_dps: 3,
        max_supports: 1
      })
      fetchExpeditions()
    }
  }

  const handleJoinExpedition = async (e) => {
    e.preventDefault()
    if (!user || !activeExpeditionForSignup) return

    const { error } = await supabase.from('expedition_signups').insert([
      {
        expedition_id: activeExpeditionForSignup.id,
        user_id: user.id,
        role_type: signupData.role_type,
        ingame_nick: signupData.ingame_nick.trim(),
        player_ip: parseInt(signupData.player_ip)
      }
    ])

    if (error) {
      alert(`Błąd zapisu: ${error.message}`)
    } else {
      setActiveExpeditionForSignup(null)
      fetchExpeditions()
    }
  }

  const handleLeaveExpedition = async (signupId) => {
    if (confirm('Czy na pewno chcesz opuścić tę drużynę?')) {
      const { error } = await supabase.from('expedition_signups').delete().eq('id', signupId)
      if (!error) fetchExpeditions()
    }
  }

  const handleDeleteExpedition = async (expeditionId) => {
    if (confirm('Czy na pewno chcesz odwołać tę wyprawę?')) {
      const { error } = await supabase.from('expeditions').delete().eq('id', expeditionId)
      if (!error) fetchExpeditions()
    }
  }

  return (
    <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1 z-10 text-sm">
      {/* POWRÓT */}
      <div>
        <Link href="/" className="inline-flex items-center gap-2 text-[#c59b27] hover:text-[#f0b73a] text-xs font-black tracking-widest uppercase transition group">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Powrót do Centrum Caerleon</span>
        </Link>
      </div>

      {/* NAGŁÓWEK */}
      <header className="bg-[#120a0c] border-2 border-[#c59b27]/80 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-[#c59b27]" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-100 uppercase tracking-wider font-serif">
              Wyprawy &amp; Karawany Handlowe (Party Finder)
            </h1>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">
              Zwołuj drużynę na statyki, grupy gankowe, Ava Dungeons lub bezpieczny transport do Caerleon
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* FORMULARZ TWORZENIA WYPRAWY */}
        <div className="lg:col-span-4">
          <div className="bg-[#120a0c] border border-[#3a1a1e] p-6 shadow-xl sticky top-6 space-y-4">
            <h2 className="text-sm font-black text-[#c59b27] uppercase tracking-wider font-serif border-b border-[#3a1a1e] pb-2 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>Zwołaj Wyprawę</span>
            </h2>

            {!user ? (
              <p className="text-xs text-gray-400 italic bg-[#080506] p-4 border border-[#2b181a]">
                Zaloguj się na stronie głównej, aby tworzyć nowe ogłoszenia.
              </p>
            ) : (
              <form onSubmit={handleCreateExpedition} className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase">Cel / Tytuł Wyprawy *</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.title} 
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                    className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 focus:border-[#c59b27] outline-none text-xs" 
                    placeholder="np. Statyk T8.2 Martlock + Chest" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase">Typ Aktywności</label>
                    <select 
                      value={formData.activity_type} 
                      onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })} 
                      className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-200 outline-none text-xs"
                    >
                      <option value="Statyk T8">Statyk / PvE</option>
                      <option value="Ochrona Karawany">Karawana do Caerleon</option>
                      <option value="Ava Dungeon">Ava Dungeon</option>
                      <option value="Roaming / Ganking">Ganking / Small Scale</option>
                      <option value="Hellgate 2v2 / 5v5">Hellgate</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase">Min. IP *</label>
                    <input 
                      type="number" 
                      required 
                      value={formData.min_ip} 
                      onChange={(e) => setFormData({ ...formData, min_ip: e.target.value })} 
                      className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 focus:border-[#c59b27] outline-none text-xs font-mono" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase">Czas (UTC) *</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.start_time} 
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} 
                      className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 focus:border-[#c59b27] outline-none text-xs font-mono" 
                      placeholder="np. 19:30 UTC" 
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase">Serwer</label>
                    <select 
                      value={formData.server} 
                      onChange={(e) => setFormData({ ...formData, server: e.target.value })} 
                      className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-200 outline-none text-xs"
                    >
                      <option value="Europa">Europa</option>
                      <option value="Ameryka">Ameryka</option>
                      <option value="Azja">Azja</option>
                    </select>
                  </div>
                </div>

                {/* SLOTY RÓL */}
                <div className="border-t border-[#2b181a] pt-3">
                  <label className="block text-[#c59b27] mb-2 font-bold uppercase tracking-wider">Liczba Poszukiwanych Ról</label>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <span className="text-[10px] text-gray-400 block font-bold">Tank</span>
                      <input type="number" min="0" max="5" value={formData.max_tanks} onChange={(e) => setFormData({ ...formData, max_tanks: e.target.value })} className="w-full bg-[#080506] border border-[#2b181a] p-1.5 text-center text-gray-100 font-mono text-xs" />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-bold">Heal</span>
                      <input type="number" min="0" max="5" value={formData.max_healers} onChange={(e) => setFormData({ ...formData, max_healers: e.target.value })} className="w-full bg-[#080506] border border-[#2b181a] p-1.5 text-center text-gray-100 font-mono text-xs" />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-bold">DPS</span>
                      <input type="number" min="0" max="20" value={formData.max_dps} onChange={(e) => setFormData({ ...formData, max_dps: e.target.value })} className="w-full bg-[#080506] border border-[#2b181a] p-1.5 text-center text-gray-100 font-mono text-xs" />
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block font-bold">Supp</span>
                      <input type="number" min="0" max="5" value={formData.max_supports} onChange={(e) => setFormData({ ...formData, max_supports: e.target.value })} className="w-full bg-[#080506] border border-[#2b181a] p-1.5 text-center text-gray-100 font-mono text-xs" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase">Opis / Miejsce Zbiórki</label>
                  <textarea 
                    rows="3" 
                    value={formData.description} 
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                    className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 focus:border-[#c59b27] outline-none resize-none text-xs" 
                    placeholder="np. Zbiórka w banku Martlock, komunikacja na Discordzie..." 
                  />
                </div>

                <button type="submit" className="w-full bg-gradient-to-r from-[#c59b27] to-[#a87a1e] hover:from-[#dca62b] text-black font-black py-2.5 uppercase tracking-widest font-serif transition text-xs">
                  Ogłoś Wyprawę
                </button>
                {formMessage && <p className="text-center font-bold text-amber-500 animate-pulse mt-2 text-xs">{formMessage}</p>}
              </form>
            )}
          </div>
        </div>

        {/* LISTA AKTYWNYCH WYPRAW */}
        <div className="lg:col-span-8 space-y-4">
          {loading ? (
            <p className="text-center py-8 text-gray-400 font-bold animate-pulse">Ładowanie aktywne wypraw...</p>
          ) : expeditions.length === 0 ? (
            <p className="text-center py-12 text-gray-500 italic bg-[#120a0c] border border-[#2b181a]">Brak aktywnych ogłoszeń wypraw. Zwołaj własną ekipę jako pierwszy!</p>
          ) : (
            expeditions.map((exp) => {
              const signups = exp.expedition_signups || []
              const tanksJoined = signups.filter(s => s.role_type === 'Tank')
              const healersJoined = signups.filter(s => s.role_type === 'Healer')
              const dpsJoined = signups.filter(s => s.role_type === 'DPS')
              const supportsJoined = signups.filter(s => s.role_type === 'Support')

              const mySignup = signups.find(s => s.user_id === user?.id)
              const isOwner = user?.id === exp.user_id

              return (
                <div key={exp.id} className="bg-[#120a0c] border border-[#3a1a1e] hover:border-[#c59b27]/60 p-5 shadow-xl transition space-y-4 relative">
                  
                  {/* HEADER KARTY */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3a1a1e] pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] bg-[#2b0d10] text-red-400 border border-red-900/60 px-2 py-0.5 font-bold uppercase">{exp.activity_type}</span>
                        <span className="text-[10px] bg-[#080506] text-purple-400 border border-purple-900/40 px-2 py-0.5 font-bold uppercase">[{exp.server}]</span>
                      </div>
                      <h3 className="text-lg font-black text-gray-100 font-serif tracking-wide">{exp.title}</h3>
                    </div>

                    <div className="flex items-center gap-3 text-xs font-mono">
                      <span className="flex items-center gap-1 text-amber-400 font-bold bg-[#080506] px-2.5 py-1 border border-[#2b181a]">
                        <Clock className="w-3.5 h-3.5" /> {exp.start_time}
                      </span>
                      <span className="bg-[#080506] px-2.5 py-1 border border-[#2b181a] text-gray-300 font-bold">
                        IP: <b className="text-emerald-400">{exp.min_ip}+</b>
                      </span>
                    </div>
                  </div>

                  {/* OPIS WYPRAWY */}
                  {exp.description && (
                    <p className="text-xs text-gray-300 bg-[#080506]/50 p-3 border border-[#2b181a]/60 leading-relaxed font-sans">
                      {exp.description}
                    </p>
                  )}

                  {/* PODSUMOWANIE RÓL I SKŁADU */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    
                    {/* TANKI */}
                    <div className="bg-[#080506] p-2.5 border border-[#2b181a] space-y-1">
                      <div className="flex justify-between items-center border-b border-[#2b181a] pb-1">
                        <span className="font-bold text-sky-400 flex items-center gap-1"><Shield className="w-3 h-3" /> Tank</span>
                        <span className="font-mono text-[11px]">{tanksJoined.length}/{exp.max_tanks}</span>
                      </div>
                      {tanksJoined.map(s => (
                        <div key={s.id} className="text-[11px] text-gray-300 flex justify-between items-center">
                          <span>{s.ingame_nick}</span>
                          <span className="text-gray-500 text-[9px] font-mono">{s.player_ip} IP</span>
                        </div>
                      ))}
                    </div>

                    {/* HEALERZY */}
                    <div className="bg-[#080506] p-2.5 border border-[#2b181a] space-y-1">
                      <div className="flex justify-between items-center border-b border-[#2b181a] pb-1">
                        <span className="font-bold text-emerald-400 flex items-center gap-1"><Heart className="w-3 h-3" /> Healer</span>
                        <span className="font-mono text-[11px]">{healersJoined.length}/{exp.max_healers}</span>
                      </div>
                      {healersJoined.map(s => (
                        <div key={s.id} className="text-[11px] text-gray-300 flex justify-between items-center">
                          <span>{s.ingame_nick}</span>
                          <span className="text-gray-500 text-[9px] font-mono">{s.player_ip} IP</span>
                        </div>
                      ))}
                    </div>

                    {/* DPS */}
                    <div className="bg-[#080506] p-2.5 border border-[#2b181a] space-y-1">
                      <div className="flex justify-between items-center border-b border-[#2b181a] pb-1">
                        <span className="font-bold text-red-400 flex items-center gap-1"><Swords className="w-3 h-3" /> DPS</span>
                        <span className="font-mono text-[11px]">{dpsJoined.length}/{exp.max_dps}</span>
                      </div>
                      {dpsJoined.map(s => (
                        <div key={s.id} className="text-[11px] text-gray-300 flex justify-between items-center">
                          <span>{s.ingame_nick}</span>
                          <span className="text-gray-500 text-[9px] font-mono">{s.player_ip} IP</span>
                        </div>
                      ))}
                    </div>

                    {/* SUPPORT */}
                    <div className="bg-[#080506] p-2.5 border border-[#2b181a] space-y-1">
                      <div className="flex justify-between items-center border-b border-[#2b181a] pb-1">
                        <span className="font-bold text-purple-400 flex items-center gap-1"><UserCheck className="w-3 h-3" /> Support</span>
                        <span className="font-mono text-[11px]">{supportsJoined.length}/{exp.max_supports}</span>
                      </div>
                      {supportsJoined.map(s => (
                        <div key={s.id} className="text-[11px] text-gray-300 flex justify-between items-center">
                          <span>{s.ingame_nick}</span>
                          <span className="text-gray-500 text-[9px] font-mono">{s.player_ip} IP</span>
                        </div>
                      ))}
                    </div>

                  </div>

                  {/* FOOTER KARTY I PRZYCISKI DOŁĄCZANIA */}
                  <div className="border-t border-[#3a1a1e] pt-3 flex flex-wrap justify-between items-center text-xs gap-3">
                    <span className="text-gray-500">
                      Lider Drużyny: <b className="text-gray-300 font-mono">{exp.profiles?.username || 'Gracz'}</b>
                    </span>

                    <div className="flex items-center gap-2">
                      {isOwner && (
                        <button onClick={() => handleDeleteExpedition(exp.id)} className="bg-red-950 hover:bg-red-900 border border-red-900 text-red-300 font-bold px-3 py-1.5 uppercase text-[11px] transition">
                          Odwołaj Wyprawę
                        </button>
                      )}

                      {mySignup ? (
                        <button onClick={() => handleLeaveExpedition(mySignup.id)} className="bg-[#2b0d10] hover:bg-red-900 text-red-200 border border-red-700/60 font-bold px-3 py-1.5 uppercase text-[11px] transition flex items-center gap-1">
                          <Trash2 className="w-3 h-3" /> Opuść Drużynę
                        </button>
                      ) : user ? (
                        <button onClick={() => setActiveExpeditionForSignup(exp)} className="bg-gradient-to-r from-[#c59b27] to-[#a87a1e] hover:from-[#dca62b] text-black font-black px-4 py-1.5 uppercase tracking-widest text-[11px] font-serif transition">
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

      {/* MODAL ZAPISU DO DRUŻYNY */}
      {activeExpeditionForSignup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
          <div className="w-full max-w-md bg-[#140c0e] border-2 border-[#c59b27] p-6 shadow-2xl space-y-4 text-gray-200">
            <h3 className="text-lg font-black text-[#c59b27] uppercase tracking-wider font-serif border-b border-[#3a1a1e] pb-2">
              Dołącz do Wyprawy: {activeExpeditionForSignup.title}
            </h3>

            <form onSubmit={handleJoinExpedition} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase">Twój Nick w grze *</label>
                <input 
                  type="text" 
                  required 
                  value={signupData.ingame_nick} 
                  onChange={(e) => setFormSignupData({ ...signupData, ingame_nick: e.target.value })} 
                  className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 focus:border-[#c59b27] outline-none text-xs" 
                  placeholder="np. alpha123" 
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase">Wybierz Rolę *</label>
                <select 
                  value={signupData.role_type} 
                  onChange={(e) => setFormSignupData({ ...signupData, role_type: e.target.value })} 
                  className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-200 outline-none text-xs"
                >
                  <option value="Tank">Tank (Ciężki pancerz / Kontrola)</option>
                  <option value="Healer">Healer (Leczenie)</option>
                  <option value="DPS">DPS (Obrażenia)</option>
                  <option value="Support">Support (Wsparcie / Debuff)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase">Twoje Deklarowane IP *</label>
                <input 
                  type="number" 
                  required 
                  value={signupData.player_ip} 
                  onChange={(e) => setFormSignupData({ ...signupData, player_ip: e.target.value })} 
                  className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 focus:border-[#c59b27] outline-none text-xs font-mono" 
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-gradient-to-r from-[#c59b27] to-[#a87a1e] text-black font-black py-2.5 uppercase font-serif tracking-wider">
                  Potwierdź Zgłoszenie
                </button>
                <button type="button" onClick={() => setActiveExpeditionForSignup(null)} className="bg-[#2b0d10] text-red-200 border border-red-900/60 font-bold px-4 py-2.5 uppercase">
                  Anuluj
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  )
}