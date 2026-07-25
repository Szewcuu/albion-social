'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Shield, Swords, Plus, ThumbsUp, User, Sparkles } from 'lucide-react'

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

      <header className="bg-[#120a0c] border-2 border-[#c59b27]/80 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-[#c59b27]" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-100 uppercase tracking-wider font-serif">
              Kreator &amp; Zestawy Bojowe (Builds)
            </h1>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">
              Baza sprawdzonych zestawów uzbrojenia tworzona przez społeczność
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* FORMULARZ */}
        <div className="lg:col-span-4">
          <div className="bg-[#120a0c] border border-[#3a1a1e] p-6 shadow-xl sticky top-6 space-y-4">
            <h2 className="text-sm font-black text-[#c59b27] uppercase tracking-wider font-serif border-b border-[#3a1a1e] pb-2 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>Opublikuj Zestaw</span>
            </h2>

            {!user ? (
              <p className="text-xs text-gray-400 italic bg-[#080506] p-4 border border-[#2b181a]">
                Zaloguj się na stronie głównej, aby dodawać zestawy.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase">Nazwa Zestawu *</label>
                  <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 focus:border-[#c59b27] outline-none text-xs" placeholder="np. Solo Corrupted Curse" />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase">Typ Aktywności *</label>
                  <select value={formData.activity_type} onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-200 outline-none text-xs">
                    <option value="PvP Solo / Corrupted">PvP Solo / Corrupted</option>
                    <option value="ZvZ / Wojny">ZvZ / Wojny</option>
                    <option value="Gank / Small Scale">Gank / Small Scale</option>
                    <option value="PvE / Statyki / HCE">PvE / Statyki / HCE</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase">Główna Broń *</label>
                  <input type="text" required value={formData.weapon} onChange={(e) => setFormData({ ...formData, weapon: e.target.value })} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 focus:border-[#c59b27] outline-none text-xs" placeholder="np. Cursed Staff / przeklęta laska" />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase">Pancerz i Dodatki *</label>
                  <input type="text" required value={formData.armor} onChange={(e) => setFormData({ ...formData, armor: e.target.value })} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 focus:border-[#c59b27] outline-none text-xs" placeholder="np. Stalker Jacket, Cultist Cowl" />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase">Opis Rotacji</label>
                  <textarea rows="4" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 focus:border-[#c59b27] outline-none resize-none text-xs" placeholder="Jak grać tym zestawem..." />
                </div>

                <button type="submit" className="w-full bg-gradient-to-r from-[#c59b27] to-[#a87a1e] hover:from-[#dca62b] text-black font-black py-2.5 uppercase tracking-widest font-serif transition text-xs">
                  Dodaj Build
                </button>
                {formMessage && <p className="text-center font-bold text-amber-500 animate-pulse mt-2 text-xs">{formMessage}</p>}
              </form>
            )}
          </div>
        </div>

        {/* LISTA KART BUILDÓW */}
        <div className="lg:col-span-8 space-y-4">
          {loading ? (
            <p className="text-center py-8 text-gray-400 font-bold animate-pulse">Ładowanie zestawów bojowych...</p>
          ) : builds.length === 0 ? (
            <p className="text-center py-12 text-gray-500 italic bg-[#120a0c] border border-[#2b181a]">Brak opublikowanych zestawów.</p>
          ) : (
            builds.map((build) => (
              <div key={build.id} className="bg-[#120a0c] border border-[#3a1a1e] hover:border-[#c59b27]/60 p-5 shadow-xl transition space-y-4 relative">
                
                {/* NAGŁÓWEK KARTY */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3a1a1e] pb-3">
                  <h3 className="text-lg font-black text-gray-100 font-serif tracking-wide flex items-center gap-2">
                    <Swords className="w-4 h-4 text-[#c59b27]" />
                    <span>{build.title}</span>
                  </h3>
                  <span className="text-[10px] bg-[#2b0d10] text-red-400 border border-red-900/60 px-2.5 py-1 font-bold uppercase tracking-wider">
                    {build.activity_type}
                  </span>
                </div>

                {/* SIATKA SPRZĘTU */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#080506] p-3 border border-[#2b181a]">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Główna Broń</span>
                    <span className="text-sm font-bold text-amber-400">{build.weapon}</span>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Pancerz i Wyposażenie</span>
                    <span className="text-sm font-bold text-gray-200">{build.armor}</span>
                  </div>
                </div>

                {/* OPIS BUILD'U */}
                {build.description && (
                  <p className="text-xs sm:text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-sans bg-[#080506]/40 p-3 border border-[#2b181a]/50">
                    {build.description}
                  </p>
                )}

                {/* FOOTER KARTY */}
                <div className="text-xs text-gray-500 border-t border-[#3a1a1e] pt-3 flex justify-between items-center">
                  <span className="flex items-center gap-1.5 text-gray-400">
                    <User className="w-3.5 h-3.5 text-[#c59b27]" />
                    <span>Autor: <b className="text-gray-200 font-mono">{build.profiles?.username || 'Gracz'}</b></span>
                  </span>
                  <button className="flex items-center gap-1.5 text-[#c59b27] hover:text-amber-300 font-bold text-xs uppercase transition">
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