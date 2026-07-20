'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

export default function Buildy() {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [builds, setBuilds] = useState([])
  const [userVotes, setUserVotes] = useState({})
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
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(buildsChannel) }
  }, [])

  const fetchAdminStatus = async (userId) => {
    const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).single()
    if (data) setIsAdmin(data.is_admin)
  }

  const fetchBuilds = async (currentUser) => {
    const { data: buildsData } = await supabase
      .from('builds')
      .select('*, profiles(username)')
      .order('votes_count', { ascending: false })
    
    if (buildsData) setBuilds(buildsData)

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
    if (!user) return
    const { data: newTotal, error } = await supabase.rpc('handle_build_vote', {
      p_build_id: buildId,
      p_user_id: user.id,
      p_vote_type: type
    })

    if (!error) {
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
    }
  }

  const handleDeleteBuild = async (buildId) => {
    if (!isAdmin) return
    if (confirm('Czy na pewno chcesz spalić ten rynsztunek i usunąć go z rejestrów zbrojowni?')) {
      const { error } = await supabase.from('builds').delete().eq('id', buildId)
      if (!error) setBuilds(prev => prev.filter(b => b.id !== buildId))
    }
  }

  const filteredBuilds = activeFilter === 'ALL' ? builds : builds.filter(b => b.activity_type === activeFilter)

  return (
    <main className="min-h-screen bg-[#121216] text-gray-300 p-6 flex flex-col items-center font-sans text-base">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&display=swap');
        .font-albion-title { font-family: 'Cinzel', serif; }
      `}</style>

      <div className="max-w-5xl w-full space-y-6">
        <header className="flex justify-between items-center bg-[#141419] border-2 border-[#c59b27] p-5 shadow-xl">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-100 font-albion-title tracking-wider">🛡️ KRÓLEWSKA ZBROJOWNIA BUILDÓW</h1>
            <p className="text-sm text-gray-400 uppercase tracking-widest font-bold mt-1">Taktyki zatwierdzone przez Radę Wojenną</p>
          </div>
          <Link href="/" className="text-sm bg-[#1d1d24] border border-[#2c2c38] hover:border-[#c59b27] text-gray-300 px-4 py-2.5 font-bold uppercase tracking-wider transition">🏰 Powrót</Link>
        </header>

        <div className="flex flex-wrap gap-2 border-b border-[#23232c] pb-4 text-sm font-bold uppercase tracking-wider">
          {['ALL', 'PvP Solo', 'ZvZ', 'PvE / HCE', 'Ganking'].map((filter) => (
            <button key={filter} onClick={() => setActiveFilter(filter)} className={`px-4 py-2 border transition ${activeFilter === filter ? 'bg-[#c59b27] text-black border-[#4a3a1d] font-black' : 'text-gray-400 border-transparent hover:text-gray-200 bg-[#141419]'}`}>{filter}</button>
          ))}
          {user && (
            <button onClick={() => setShowForm(!showForm)} className="ml-auto bg-gradient-to-b from-[#dca62b] to-[#a87a1e] text-black px-5 py-2.5 border border-[#4a3a1d] font-black transition uppercase">{showForm ? '🛡️ Zamknij Kuźnię' : '⚒️ Wykuj Nowy Build'}</button>
          )}
        </div>

        {showForm && user && (
          <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleCreateBuild} className="bg-[#141419] border-2 border-[#c59b27] p-6 shadow-2xl grid grid-cols-1 md:grid-cols-3 gap-6 text-sm sm:text-base">
            <div className="space-y-4 md:col-span-2">
              <div>
                <label className="block text-sm text-gray-300 font-bold uppercase mb-2">Nazwa Zestawu Taktycznego</label>
                <input type="text" required value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-[#0b0b0d] border border-[#23232c] p-3 text-white focus:outline-none focus:border-[#c59b27] text-base" />
              </div>
              <div>
                <label className="block text-sm text-gray-300 font-bold uppercase mb-2">Opis taktyki walki i rotacji czarów</label>
                <textarea rows="6" value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-[#0b0b0d] border border-[#23232c] p-3 text-white focus:outline-none focus:border-[#c59b27] resize-none text-base" />
              </div>
            </div>

            <div className="space-y-3 bg-[#0b0b0d] p-4 border border-[#23232c] grid grid-cols-2 gap-3 h-fit">
              <div className="col-span-2">
                <label className="block text-sm text-[#c59b27] font-bold uppercase mb-1.5">Przeznaczenie</label>
                <select value={activity} onChange={e => setActivity(e.target.value)} className="w-full bg-[#141419] border border-[#23232c] p-2.5 text-white text-base"><option value="PvP Solo">PvP Solo</option><option value="ZvZ">ZvZ (Wojny Gildii)</option><option value="PvE / HCE">PvE / HCE</option><option value="Ganking">Ganking</option></select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-gray-400 font-bold uppercase mb-1">⚔️ Broń</label>
                <select value={weapon} onChange={e => setWeapon(e.target.value)} className="w-full bg-[#141419] p-2 text-white border border-gray-800 text-sm"><option value="T4_MAIN_CURSESTAFF">Kostur Przekleństwa</option><option value="T4_MAIN_SPEAR">Włócznia</option><option value="T4_MAIN_AXE">Topór</option></select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-gray-400 font-bold uppercase mb-1">🛡️ Druga ręka</label>
                <select value={offhand} onChange={e => setOffhand(e.target.value)} className="w-full bg-[#141419] p-2 text-white border border-gray-800 text-sm"><option value="Brak">Brak</option><option value="T4_OFF_SHIELD">Tarcza</option><option value="T4_OFF_BOOK">Księga Zaklęć</option></select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-gray-400 font-bold uppercase mb-1">🪖 Kaptur</label>
                <select value={helmet} onChange={e => setHelmet(e.target.value)} className="w-full bg-[#141419] p-2 text-white border border-gray-800 text-sm"><option value="T4_HEAD_CLOTH_SET1">Kaptur Uczonego</option><option value="T4_HEAD_LEATHER_SET2">Kaptur Łowcy</option></select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-gray-400 font-bold uppercase mb-1">🧥 Kurtka/Zbroja</label>
                <select value={armor} onChange={e => setArmor(e.target.value)} className="w-full bg-[#141419] p-2 text-white border border-gray-800 text-sm"><option value="T4_ARMOR_LEATHER_SET3">Kurtka Najemnika</option><option value="T4_ARMOR_PLATE_SET1">Zbroja Żołnierza</option></select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-gray-400 font-bold uppercase mb-1">🥾 Buty</label>
                <select value={shoes} onChange={e => setShoes(e.target.value)} className="w-full bg-[#141419] p-2 text-white border border-gray-800 text-sm"><option value="T4_SHOES_PLATE_SET1">Buty Żołnierza</option><option value="T4_SHOES_LEATHER_SET2">Buty Łowcy</option></select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm text-gray-400 font-bold uppercase mb-1">🧥 Peleryna</label>
                <select value={cape} onChange={e => setCape(e.target.value)} className="w-full bg-[#141419] p-2 text-white border border-gray-800 text-sm"><option value="T4_CAPE">Zwykła Peleryna</option><option value="T4_CAPE_MARTLOCK">Peleryna Martlock</option></select>
              </div>
              <div className="col-span-2 pt-3">
                <button type="submit" className="w-full bg-gradient-to-b from-[#dca62b] to-[#a87a1e] text-black font-black py-3.5 uppercase border border-[#4a3a1d] text-base">Zapisz w Rejestrze Królestwa</button>
              </div>
            </div>
          </motion.form>
        )}

        <div className="space-y-4">
          {loading ? (
            <p className="text-center text-gray-400 italic py-8 text-lg animate-pulse">Otwieranie planów zbrojowni...</p>
          ) : filteredBuilds.map((build) => {
            const hasUpvoted = userVotes[build.id] === 'UP';
            const hasDownvoted = userVotes[build.id] === 'DOWN';

            return (
              <motion.div key={build.id} layout className="bg-[#141419] border border-[#23232c] p-6 flex gap-6 items-start shadow-md text-base">
                <div className="flex flex-col items-center bg-[#0b0b0d] border border-[#23232c] p-3.5 rounded-sm min-w-[55px]">
                  <button onClick={() => handleVote(build.id, 'UP')} className={`text-xl font-bold transition ${hasUpvoted ? 'text-emerald-400 scale-125' : 'text-gray-500 hover:text-emerald-500'}`}>▲</button>
                  <span className={`text-base font-mono font-black my-2 ${hasUpvoted ? 'text-emerald-400' : hasDownvoted ? 'text-red-500' : 'text-[#c59b27]'}`}>{build.votes_count || 0}</span>
                  <button onClick={() => handleVote(build.id, 'DOWN')} className={`text-xl font-bold transition ${hasDownvoted ? 'text-red-500 scale-125' : 'text-gray-500 hover:text-red-500'}`}>▼</button>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm bg-[#c59b27]/10 text-[#c59b27] border border-[#c59b27]/30 px-2.5 py-0.5 font-bold uppercase font-mono">{build.activity_type}</span>
                    <h3 className="text-lg font-bold text-gray-100">{build.title}</h3>
                    <div className="ml-auto flex items-center gap-4 text-sm">
                      <span className="text-gray-400">Autor: <span className="text-sky-400 font-semibold">{build.profiles?.username || 'Nieznany'}</span></span>
                      {isAdmin && <button onClick={() => handleDeleteBuild(build.id)} className="bg-red-950/80 hover:bg-red-900 border border-red-900/40 text-red-400 text-sm font-black uppercase tracking-wider px-3 py-1.5 transition">🗑️ Usunięcie</button>}
                    </div>
                  </div>
                  <p className="text-base text-gray-300 leading-relaxed whitespace-pre-line">{build.description}</p>
                  <div className="flex flex-wrap gap-2.5 text-sm font-mono text-gray-300 pt-1">
                    <span className="bg-[#0b0b0d] px-3 py-1.5 border border-[#1f1f26]">⚔️ {build.weapon.replace('T4_', '')}</span>
                    {build.offhand && <span className="bg-[#0b0b0d] px-3 py-1.5 border border-[#1f1f26]">🛡️ {build.offhand.replace('T4_', '')}</span>}
                    <span className="bg-[#0b0b0d] px-3 py-1.5 border border-[#1f1f26]">🪖 {build.helmet.replace('T4_', '')}</span>
                    <span className="bg-[#0b0b0d] px-3 py-1.5 border border-[#1f1f26]">🧥 {build.armor.replace('T4_', '')}</span>
                    <span className="bg-[#0b0b0d] px-3 py-1.5 border border-[#1f1f26]">🥾 {build.shoes.replace('T4_', '')}</span>
                    <span className="bg-[#0b0b0d] px-3 py-1.5 border border-[#1f1f26]">🧥 {build.cape.replace('T4_', '')}</span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </main>
  )
}