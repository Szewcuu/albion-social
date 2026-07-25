'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Shield, Swords, Plus, ThumbsUp } from 'lucide-react'

export default function Buildy() {
  const [builds, setBuilds] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    title: '',
    activity_type: 'PvP Solo',
    weapon: '',
    armor: '',
    description: ''
  })
  const [formMessage, setFormMessage] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    fetchBuilds()
  }, [])

  const fetchBuilds = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('builds')
      .select(`*, profiles(username)`)
      .order('created_at', { ascending: false })

    if (!error && data) setBuilds(data)
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormMessage('')

    if (!user) {
      setFormMessage('Musisz być zalogowany!')
      return
    }

    const { error } = await supabase.from('builds').insert([
      {
        ...formData,
        user_id: user.id
      }
    ])

    if (error) {
      setFormMessage(`Błąd: ${error.message}`)
    } else {
      setFormMessage('Build został opublikowany!')
      setFormData({ title: '', activity_type: 'PvP Solo', weapon: '', armor: '', description: '' })
      fetchBuilds()
    }
  }

  return (
    <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1 z-10 text-sm">
      <div>
        <Link href="/" className="inline-flex items-center gap-2 text-[#c59b27] hover:text-[#f0b73a] text-xs font-black tracking-widest uppercase transition group">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Powrót do Centrum</span>
        </Link>
      </div>

      <header className="bg-[#120a0c]/90 border-2 border-[#c59b27]/80 p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-[#c59b27]" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-100 uppercase tracking-wider font-serif">
              Kreator &amp; Zestawy Bojowe (Builds)
            </h1>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">
              Baza sprawdzonych zestawów uzbrojenia tworzona przez graczy
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* FORMULARZ DODAWCZY */}
        <div className="lg:col-span-4">
          <div className="bg-[#120a0c]/80 border border-[#3a1a1e] p-6 shadow-xl sticky top-6 backdrop-blur-md space-y-4">
            <h2 className="text-base font-black text-[#c59b27] uppercase tracking-wider font-serif border-b border-[#3a1a1e] pb-2 flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#c59b27]" />
              <span>Opublikuj Zestaw</span>
            </h2>

            {!user ? (
              <p className="text-xs text-gray-400 italic bg-[#080506] p-4 border border-[#2b181a]">
                Zaloguj się na stronie głównej, aby udostępniać własne zestawy.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase">Nazwa Zestawu *</label>
                  <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 focus:border-[#c59b27] outline-none" placeholder="np. Solo Corrupted Cursed Staff" />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase">Typ Aktywności *</label>
                  <select value={formData.activity_type} onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-200 outline-none">
                    <option value="PvP Solo">PvP Solo / Corrupted</option>
                    <option value="ZvZ">ZvZ / Wojnami</option>
                    <option value="Gank">Ganking / Small Scale</option>
                    <option value="PvE / Static">PvE / Statyki / HCE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase">Główna Broń *</label>
                  <input type="text" required value={formData.weapon} onChange={(e) => setFormData({ ...formData, weapon: e.target.value })} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 focus:border-[#c59b27] outline-none" placeholder="np. Shadowcaller / 1H Dagger" />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase">Pancerz i Dodatki *</label>
                  <input type="text" required value={formData.armor} onChange={(e) => setFormData({ ...formData, armor: e.target.value })} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 focus:border-[#c59b27] outline-none" placeholder="np. Stalker Jacket, Cultist Cowl..." />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase">Opis / Poradnik Rotacji</label>
                  <textarea rows="4" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 focus:border-[#c59b27] outline-none resize-none" placeholder="Wyjaśnij jak grać tym zestawem..." />
                </div>

                <button type="submit" className="w-full bg-gradient-to-r from-[#c59b27] to-[#a87a1e] hover:from-[#dca62b] text-black font-black py-2.5 uppercase tracking-widest font-serif transition">
                  Dodaj Build
                </button>
                {formMessage && <p className="text-center font-bold text-amber-500 animate-pulse mt-2">{formMessage}</p>}
              </form>
            )}
          </div>
        </div>

        {/* LISTA BUILDÓW */}
        <div className="lg:col-span-8 space-y-4">
          {loading ? (
            <p className="text-center py-8 text-gray-400 font-bold animate-pulse">Wczytywanie zestawów bojowych...</p>
          ) : builds.length === 0 ? (
            <p className="text-center py-12 text-gray-500 italic bg-[#120a0c]/40 border border-[#2b181a]">Brak opublikowanych zestawów.</p>
          ) : (
            builds.map((build) => (
              <div key={build.id} className="bg-[#120a0c]/90 border border-[#2b181a] hover:border-[#c59b27]/60 p-5 shadow-xl backdrop-blur-md transition space-y-3">
                <div className="flex items-center justify-between border-b border-[#2b181a] pb-2">
                  <h3 className="text-lg font-bold text-gray-100 font-serif">{build.title}</h3>
                  <span className="text-[10px] bg-[#2b0d10] text-red-400 border border-red-900/50 px-2.5 py-0.5 font-bold uppercase">{build.activity_type}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-[#080506] p-3 border border-[#2b181a]">
                  <div><span className="text-gray-500 uppercase font-bold">Broń:</span> <span className="text-amber-400 font-bold">{build.weapon}</span></div>
                  <div><span className="text-gray-500 uppercase font-bold">Pancerz:</span> <span className="text-gray-300">{build.armor}</span></div>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{build.description}</p>

                <div className="text-[11px] text-gray-500 border-t border-[#2b181a] pt-2 flex justify-between items-center">
                  <span>Autor: <b className="text-gray-400 font-mono">{build.profiles?.username || 'Gracz'}</b></span>
                  <button className="flex items-center gap-1 text-[#c59b27] hover:underline font-bold">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>Polecam</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  )
}