'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function Buildy() {
  const [user, setUser] = useState(null)
  const [builds, setBuilds] = useState([])
  const [userVotes, setUserVotes] = useState({}) // [NOWE] Przechowuje głosy użytkownika: { build_id: 'UP' | 'DOWN' }
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('ALL')

  // Formularz nowego buildu
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [activity, setActivity] = useState('PvP Solo')
  const [weapon, setWeapon] = useState('T4_MAIN_CURSESTAFF')
  const [offhand, setOffhand] = useState('Brak')
  const [helmet, setHelmet] = useState('T4_HEAD_CLOTH_SET1')
  const [armor, setArmor] = useState('T4_ARMOR_LEATHER_SET3')
  const [shoes, setShoes] = useState('T4_SHOES_PLATE_SET1')
  const [cape, setCape] = useState('T4_CAPE')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      fetchBuilds(currentUser)
      if (currentUser) fetchAdminStatus(currentUser.id)
    })

    const buildsChannel = supabase
      .channel('builds-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'builds' }, () => {
        supabase.auth.getSession().then(({ data: { session } }) => {
          const currentUser = session?.user ?? null
          fetchBuilds(currentUser)
          if (currentUser) fetchAdminStatus(currentUser.id)
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(buildsChannel) }
  }, [])

  const fetchBuilds = async (currentUser) => {
    const { data: buildsData } = await supabase
      .from('builds')
      .select('*, profiles(username)')
      .order('votes_count', { ascending: false })
    
    if (buildsData) setBuilds(buildsData)

    // Pobieramy głosy zalogowanego gracza, aby podświetlić ikonki
    if (currentUser) {
      const { data: votesData } = await supabase
        .from('build_votes')
        .select('build_id, vote_type')
        .eq('user_id', currentUser.id)
      
      if (votesData) {
        const votesMap = {}
        votesData.forEach(v => { votesMap[v.build_id] = v.vote_type })
        setUserVotes(votesMap)
      }
    }
    setLoading(false)
  }

  const fetchAdminStatus = async (userId) => {
    const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).single()
    if (data) setIsAdmin(data.is_admin)
  }

  const handleCreateBuild = async (e) => {
    e.preventDefault()
    if (!title.trim() || !user) return

    const { error } = await supabase.from('builds').insert([
      {
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        activity_type: activity,
        weapon,
        offhand: offhand === 'Brak' ? null : offhand,
        helmet,
        armor,
        shoes,
        cape
      }
    ])

    if (!error) {
      setTitle('')
      setDescription('')
      setShowForm(false)
      fetchBuilds(user)
    }
  }

  const handleVote = async (buildId, type) => {
    if (!user) {
      alert('Musisz być zalogowany, aby oddać głos wojowniku!')
      return
    }

    // Wywołujemy naszą bezpieczną funkcję RPC w bazie danych
    const { data: newTotal, error } = await supabase.rpc('handle_build_vote', {
      p_build_id: buildId,
      p_user_id: user.id,
      p_vote_type: type
    })

    if (!error) {
      // Optymistyczna aktualizacja lokalnego stanu dla natychmiastowej reakcji UI
      setUserVotes(prev => {
        const currentVote = prev[buildId]
        if (currentVote === type) {
          const updated = { ...prev }
          delete updated[buildId]
          return updated
        }
        return { ...prev, [buildId]: type }
      })
      
      setBuilds(prev => prev.map(b => b.id === buildId ? { ...b, votes_count: newTotal } : b))
    } else {
      console.error("Błąd głosowania:", error)
    }
  }

  const handleDeleteBuild = async (buildId) => {
    if (!isAdmin) return
    
    if (confirm('Czy na pewno chcesz spalić ten plan rynsztunku i usunąć go ze zbrojowni?')) {
      const { error } = await supabase
        .from('builds')
        .delete()
        .eq('id', buildId)

      if (!error) {
        setBuilds(prev => prev.filter(b => b.id !== buildId))
      } else {
        console.error("Błąd usuwania buildu:", error)
        alert(`Nie udało się usunąć buildu: ${error.message}`)
      }
    }
  }

  const filteredBuilds = activeFilter === 'ALL' 
    ? builds 
    : builds.filter(b => b.activity_type === activeFilter)

  return (
    <main className="min-h-screen bg-[#050507] text-[#bcbbc2] p-4 sm:p-6 antialiased font-sans flex flex-col items-center relative overflow-hidden">
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Inter:wght@400;500;700;800&display=swap');
        .font-albion-title { font-family: 'Cinzel', serif; }
      `}</style>

      <div className="max-w-6xl w-full space-y-5 z-10">
        
        {/* NAGŁÓWEK KREATORA */}
        <header className="flex justify-between items-center bg-[#141419] border-2 border-[#c59b27] p-4 shadow-2xl">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-100 font-albion-title tracking-wider">
              🛡️ KRÓLEWSKA ZBROJOWNIA BUILDÓW (BETA)
            </h1>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest font-bold mt-0.5">Strategie i rynsztunek zatwierdzone przez Radę Wojenną</p>
          </div>
          <Link href="/" className="text-[10px] bg-[#1d1d24] border border-[#2c2c38] hover:border-[#c59b27] text-gray-300 px-3 py-2 font-bold transition uppercase tracking-wider">
            🏰 Powrót
          </Link>
        </header>

        {/* NAWIGACJA / FILTRY */}
        <div className="flex flex-wrap gap-2 border-b border-[#23232c] pb-3 text-[10px] font-bold uppercase tracking-wider">
          {['ALL', 'PvP Solo', 'ZvZ', 'PvE / HCE', 'Ganking'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1.5 border transition ${
                activeFilter === filter 
                  ? 'bg-[#c59b27] text-black border-[#4a3a1d] font-black' 
                  : 'text-gray-500 border-transparent hover:text-gray-300 bg-[#141419]'
              }`}
            >
              {filter}
            </button>
          ))}
          
          {user && (
            <button 
              onClick={() => setShowForm(!showForm)}
              className="ml-auto bg-gradient-to-b from-[#dca62b] to-[#a87a1e] hover:from-[#f0b73a] hover:to-[#be8c27] text-black px-4 py-1.5 border border-[#4a3a1d] font-black transition uppercase"
            >
              {showForm ? '🛡️ Zamknij Kuźnię' : '⚒️ Wykuj Nowy Build'}
            </button>
          )}
        </div>

        {/* FORMULARZ TWORZENIA NOWEGO ZESTAWU */}
        {showForm && user && (
          <motion.form 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleCreateBuild}
            className="bg-[#141419] border-2 border-[#c59b27] p-5 shadow-2xl grid grid-cols-1 md:grid-cols-3 gap-4 text-xs"
          >
            <div className="space-y-3 md:col-span-2">
              <div>
                <label className="block text-[9px] text-gray-500 font-bold uppercase mb-1">Nazwa Zestawu Taktycznego</label>
                <input type="text" required placeholder="np. Przeklęty Kostur pod Solo Corrupted" value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-[#0b0b0d] border border-[#23232c] p-2 text-white focus:outline-none focus:border-[#c59b27]" />
              </div>
              <div>
                <label className="block text-[9px] text-gray-500 font-bold uppercase mb-1">Opis taktyki walki i rotacji czarów</label>
                <textarea rows="6" placeholder="Opisz jak grać tym zestawem, jakie jedzenie brać i na co uważać..." value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-[#0b0b0d] border border-[#23232c] p-2 text-white focus:outline-none focus:border-[#c59b27] resize-none" />
              </div>
            </div>

            <div className="space-y-2 bg-[#0b0b0d] p-3 border border-[#23232c] grid grid-cols-2 gap-2 h-fit">
              <div className="col-span-2">
                <label className="block text-[9px] text-[#c59b27] font-bold uppercase mb-1">Przeznaczenie</label>
                <select value={activity} onChange={e => setActivity(e.target.value)} className="w-full bg-[#141419] border border-[#23232c] p-1.5 text-white">
                  <option value="PvP Solo">PvP Solo</option>
                  <option value="ZvZ">ZvZ (Wojny Gildii)</option>
                  <option value="PvE / HCE">PvE / HCE</option>
                  <option value="Ganking">Ganking</option>
                </select>
              </div>
              <div>
                <label className="block text-[8px] text-gray-500 font-bold uppercase">⚔️ Broń</label>
                <select value={weapon} onChange={e => setWeapon(e.target.value)} className="w-full bg-[#141419] p-1 text-white border border-gray-800"><option value="T4_MAIN_CURSESTAFF">Kostur Przekleństwa</option><option value="T4_MAIN_SPEAR">Włócznia</option><option value="T4_MAIN_AXE">Topór</option></select>
              </div>
              <div>
                <label className="block text-[8px] text-gray-500 font-bold uppercase">🛡️ Druga ręka</label>
                <select value={offhand} onChange={e => setOffhand(e.target.value)} className="w-full bg-[#141419] p-1 text-white border border-gray-800"><option value="Brak">Brak (Dwuręczna)</option><option value="T4_OFF_SHIELD">Tarcza</option><option value="T4_OFF_BOOK">Księga Zaklęć</option></select>
              </div>
              <div>
                <label className="block text-[8px] text-gray-500 font-bold uppercase">🪖 Kaptur</label>
                <select value={helmet} onChange={e => setHelmet(e.target.value)} className="w-full bg-[#141419] p-1 text-white border border-gray-800"><option value="T4_HEAD_CLOTH_SET1">Kaptur Uczonego</option><option value="T4_HEAD_LEATHER_SET2">Kaptur Łowcy</option></select>
              </div>
              <div>
                <label className="block text-[8px] text-gray-500 font-bold uppercase">🧥 Kurtka/Zbroja</label>
                <select value={armor} onChange={e => setArmor(e.target.value)} className="w-full bg-[#141419] p-1 text-white border border-gray-800"><option value="T4_ARMOR_LEATHER_SET3">Kurtka Najemnika</option><option value="T4_ARMOR_PLATE_SET1">Zbroja Żołnierza</option></select>
              </div>
              <div>
                <label className="block text-[8px] text-gray-500 font-bold uppercase">🥾 Buty</label>
                <select value={shoes} onChange={e => setShoes(e.target.value)} className="w-full bg-[#141419] p-1 text-white border border-gray-800"><option value="T4_SHOES_PLATE_SET1">Buty Żołnierza</option><option value="T4_SHOES_LEATHER_SET2">Buty Łowcy</option></select>
              </div>
              <div>
                <label className="block text-[8px] text-gray-500 font-bold uppercase">🧥 Peleryna</label>
                <select value={cape} onChange={e => setCape(e.target.value)} className="w-full bg-[#141419] p-1 text-white border border-gray-800"><option value="T4_CAPE">Zwykła Peleryna</option><option value="T4_CAPE_MARTLOCK">Peleryna Martlock</option></select>
              </div>
              <div className="col-span-2 pt-2">
                <button type="submit" className="w-full bg-gradient-to-b from-[#dca62b] to-[#a87a1e] hover:from-[#f0b73a] hover:to-[#be8c27] text-black font-black py-2 uppercase border border-[#4a3a1d] transition">Zapisz w Rejestrze Królestwa</button>
              </div>
            </div>
          </motion.form>
        )}

        {/* LISTA ZAPISANYCH BUILDÓW */}
        <div className="space-y-4">
          {loading ? (
            <p className="text-center text-gray-600 italic py-8 animate-pulse">Otwieranie planów zbrojowni...</p>
          ) : filteredBuilds.length === 0 ? (
            <p className="text-center text-gray-600 italic py-8 bg-[#141419] border border-[#23232c]">Brak wpisów w tej kategorii strategicznej.</p>
          ) : (
            filteredBuilds.map((build) => {
              const hasUpvoted = userVotes[build.id] === 'UP';
              const hasDownvoted = userVotes[build.id] === 'DOWN';

              return (
                <motion.div 
                  key={build.id}
                  layout
                  className="bg-[#141419] border border-[#23232c] p-4 flex gap-4 items-start shadow-md hover:border-[#c59b27]/40 transition"
                >
                  {/* PANEL GŁOSOWANIA */}
                  <div className="flex flex-col items-center bg-[#0b0b0d] border border-[#23232c] p-2 rounded-sm min-w-[45px]">
                    <button 
                      onClick={() => handleVote(build.id, 'UP')} 
                      className={`text-sm font-bold transition ${hasUpvoted ? 'text-emerald-400 scale-125' : 'text-gray-600 hover:text-emerald-500'}`}
                    >
                      ▲
                    </button>
                    <span className={`text-xs font-mono font-black my-1 ${
                      hasUpvoted ? 'text-emerald-400 font-extrabold' : 
                      hasDownvoted ? 'text-red-500 font-extrabold' : 'text-[#c59b27]'
                    }`}>
                      {build.votes_count || 0}
                    </span>
                    <button 
                      onClick={() => handleVote(build.id, 'DOWN')} 
                      className={`text-sm font-bold transition ${hasDownvoted ? 'text-red-500 scale-125' : 'text-gray-600 hover:text-red-500'}`}
                    >
                      ▼
                    </button>
                  </div>

                  {/* DANE I PRZEGLĄD RYNSIUNKU */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[8px] bg-[#c59b27]/10 text-[#c59b27] border border-[#c59b27]/30 px-1.5 py-0.5 font-bold uppercase rounded-sm font-mono">
                        {build.activity_type}
                      </span>
                      <h3 className="text-sm font-bold text-gray-200">{build.title}</h3>
                      <div className="ml-auto flex items-center gap-3">
                        <span className="text-[10px] text-gray-600 font-medium">
                          Autor: <span className="text-sky-400 font-semibold">{build.profiles?.username || 'Nieznany'}</span>
                        </span>
                        {isAdmin && (
                          <button 
                            onClick={() => handleDeleteBuild(build.id)}
                            className="bg-red-950/80 hover:bg-red-900 border border-red-900/40 text-red-400 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-sm transition"
                          >
                            🗑️ Usuń Build
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-gray-400 leading-relaxed max-w-3xl whitespace-pre-line">{build.description}</p>
                    
                    {/* MINI PRZEGLĄD EKWIPUNKU */}
                    <div className="flex flex-wrap gap-1.5 text-[9px] font-mono text-gray-500 pt-1">
                      <span className="bg-[#0b0b0d] px-2 py-0.5 border border-[#1f1f26]">⚔️ {build.weapon.replace('T4_', '')}</span>
                      {build.offhand && <span className="bg-[#0b0b0d] px-2 py-0.5 border border-[#1f1f26]">🛡️ {build.offhand.replace('T4_', '')}</span>}
                      <span className="bg-[#0b0b0d] px-2 py-0.5 border border-[#1f1f26]">🪖 {build.helmet.replace('T4_', '')}</span>
                      <span className="bg-[#0b0b0d] px-2 py-0.5 border border-[#1f1f26]">🧥 {build.armor.replace('T4_', '')}</span>
                      <span className="bg-[#0b0b0d] px-2 py-0.5 border border-[#1f1f26]">🥾 {build.shoes.replace('T4_', '')}</span>
                      <span className="bg-[#0b0b0d] px-2 py-0.5 border border-[#1f1f26]">🧥 {build.cape.replace('T4_', '')}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

      </div>
    </main>
  )
}