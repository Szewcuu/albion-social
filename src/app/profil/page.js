'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, User, Shield, Swords, Save, Check, ShoppingBag, Server, Globe, Award } from 'lucide-react'

export default function ProfilePage() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Formularz danych postaci
  const [formData, setFormData] = useState({
    ingame_nick: '',
    main_server: 'Europa',
    guild_name: '',
    main_role: 'DPS',
    avg_ip: 1400
  })

  // Moje aktywności
  const [myExpeditions, setMyExpeditions] = useState([])
  const [myOffers, setMyOffers] = useState([])

  const fetchProfileData = useCallback(async (userId) => {
    // 1. Pobranie danych profilu
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (profile) {
      setFormData({
        ingame_nick: profile.ingame_nick || '',
        main_server: profile.main_server || 'Europa',
        guild_name: profile.guild_name || '',
        main_role: profile.main_role || 'DPS',
        avg_ip: profile.avg_ip || 1400
      })
    }

    // 2. Pobranie moich wypraw
    const { data: exp } = await supabase
      .from('expeditions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (exp) setMyExpeditions(exp)

    // 3. Pobranie moich ofert z rynku
    const { data: mkt } = await supabase
      .from('market_items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (mkt) setMyOffers(mkt)

    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      if (currentUser) {
        fetchProfileData(currentUser.id)
      } else {
        setLoading(false)
      }
    })
  }, [fetchProfileData])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setSavedSuccess(false)

    const { error } = await supabase
      .from('profiles')
      .update({
        ingame_nick: formData.ingame_nick.trim(),
        main_server: formData.main_server,
        guild_name: formData.guild_name.trim(),
        main_role: formData.main_role,
        avg_ip: parseInt(formData.avg_ip) || 0
      })
      .eq('id', user.id)

    setSaving(false)
    if (!error) {
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#050305] text-mono">
        <div className="w-10 h-10 border-4 border-[#f3ba2f] border-t-transparent rounded-full animate-spin"></div>
      </main>
    )
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#050305] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-gray-400 font-mono">Musisz być zalogowany, aby zobaczyć swój profil.</p>
          <Link href="/" className="inline-block bg-[#f3ba2f] text-black font-extrabold px-6 py-3 rounded-xl uppercase text-xs">
            Wróć na Stronę Główną
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#050305] text-gray-300 p-4 sm:p-6 lg:p-8 relative">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* POWRÓT */}
        <div className="flex items-center justify-between border-b border-[#200d13] pb-4">
          <Link href="/" className="flex items-center gap-2 text-xs font-mono font-bold text-gray-400 hover:text-[#f3ba2f] transition">
            <ArrowLeft className="w-4 h-4" /> Powrót do Portalu
          </Link>
          <span className="text-xs font-mono font-bold text-[#f3ba2f] uppercase tracking-wider">Karta Postaci Gracza</span>
        </div>

        {/* KARTA PROFILU */}
        <div className="bg-[#0c0407] border border-[#2c1219] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-8 relative overflow-hidden">
          
          <div className="flex flex-col sm:flex-row items-center gap-6 border-b border-[#200d13] pb-6">
            <div className="relative shrink-0">
              <img 
                src={user.user_metadata?.avatar_url || '/logo.png'} 
                alt="Avatar" 
                className="w-24 h-20 rounded-2xl object-cover border-2 border-[#f3ba2f] shadow-[0_0_20px_rgba(243,186,47,0.3)]"
              />
              <span className="absolute -bottom-2 -right-2 bg-emerald-500 text-black text-[9px] font-mono font-black px-2 py-0.5 rounded-full border border-[#0c0407]">
                ONLINE
              </span>
            </div>

            <div className="space-y-1 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-black text-white font-serif tracking-wide">
                {(user.user_metadata?.full_name || 'Gracz').replace(/#0$/, '')}
              </h1>
              <p className="text-xs text-gray-400 font-mono">{user.email}</p>
              <div className="pt-1 flex flex-wrap justify-center sm:justify-start gap-2">
                <span className="text-[10px] font-mono font-bold bg-[#1c0a10] border border-[#3d1823] text-[#f3ba2f] px-2.5 py-1 rounded-lg">
                  {formData.guild_name ? `Gildia: ${formData.guild_name}` : 'Bez Gildii'}
                </span>
                <span className="text-[10px] font-mono font-bold bg-purple-950/60 border border-purple-800/40 text-purple-300 px-2.5 py-1 rounded-lg">
                  Serwer: {formData.main_server}
                </span>
              </div>
            </div>
          </div>

          {/* FORMULARZ EDYCJI DANYCH W GRZE */}
          <form onSubmit={handleSaveProfile} className="space-y-6">
            <h2 className="text-sm font-mono font-bold text-[#f3ba2f] uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4" /> Dane Postaci z Albion Online
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-mono">
              <div>
                <label className="block text-gray-400 mb-1.5 uppercase">Nick w grze (IGN)</label>
                <input 
                  type="text" 
                  placeholder="np. Szewczykos"
                  value={formData.ingame_nick}
                  onChange={e => setFormData({ ...formData, ingame_nick: e.target.value })}
                  className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-gray-100 outline-none focus:border-[#f3ba2f]"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1.5 uppercase">Serwer</label>
                <select 
                  value={formData.main_server}
                  onChange={e => setFormData({ ...formData, main_server: e.target.value })}
                  className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-gray-100 outline-none focus:border-[#f3ba2f] cursor-pointer"
                >
                  <option value="Europa">Europa (Albion EU)</option>
                  <option value="Ameryka">Ameryka (Albion NA)</option>
                  <option value="Azja">Azja (Albion Asia)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-1.5 uppercase">Nazwa Gildii</label>
                <input 
                  type="text" 
                  placeholder="np. Polish Hussars"
                  value={formData.guild_name}
                  onChange={e => setFormData({ ...formData, guild_name: e.target.value })}
                  className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-gray-100 outline-none focus:border-[#f3ba2f]"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1.5 uppercase">Główna Rola</label>
                <select 
                  value={formData.main_role}
                  onChange={e => setFormData({ ...formData, main_role: e.target.value })}
                  className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-gray-100 outline-none focus:border-[#f3ba2f] cursor-pointer"
                >
                  <option value="Tank">🛡️ Tank</option>
                  <option value="Healer">💚 Healer</option>
                  <option value="DPS">⚔️ DPS</option>
                  <option value="Support">✨ Support / Utility</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 mb-1.5 uppercase">Średnie Item Power (IP)</label>
                <input 
                  type="number" 
                  placeholder="1400"
                  value={formData.avg_ip}
                  onChange={e => setFormData({ ...formData, avg_ip: e.target.value })}
                  className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-3 text-gray-100 outline-none focus:border-[#f3ba2f]"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-2">
              <button 
                type="submit" 
                disabled={saving}
                className="bg-gradient-to-r from-[#f3ba2f] to-[#d9981e] hover:from-[#fcd053] text-black font-extrabold px-6 py-3 rounded-xl uppercase text-xs tracking-wider transition cursor-pointer flex items-center gap-2 shadow-lg"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Zapisywanie...' : 'Zapisz Kartę Postaci'}</span>
              </button>

              {savedSuccess && (
                <span className="text-emerald-400 text-xs font-mono font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4" /> Zapisano pomyślnie!
                </span>
              )}
            </div>
          </form>
        </div>

        {/* MOJE AKTYWNOŚCI */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* MOJE WYPRAWY */}
          <div className="bg-[#0c0407] border border-[#281017] rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#200d13] pb-3">
              <span className="text-xs font-mono font-bold text-purple-400 uppercase flex items-center gap-2">
                <Shield className="w-4 h-4" /> Stworzone przeze mnie Wyprawy ({myExpeditions.length})
              </span>
              <Link href="/wyprawy" className="text-[10px] text-gray-400 hover:text-white font-mono">Przejdź &rarr;</Link>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
              {myExpeditions.length === 0 ? (
                <p className="text-gray-500 italic text-center py-6">Nie utworzyłeś jeszcze żadnej wyprawy.</p>
              ) : (
                myExpeditions.map(e => (
                  <div key={e.id} className="bg-[#050204] border border-[#220e14] p-3 rounded-xl flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-white">{e.title}</h4>
                      <p className="text-[10px] text-gray-400 font-mono">{e.activity_type} • Start: {e.start_time}</p>
                    </div>
                    <span className="text-[10px] font-mono bg-purple-950 text-purple-300 px-2 py-0.5 rounded border border-purple-800/40">Aktywna</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* MOJE OFERTY RYNKU */}
          <div className="bg-[#0c0407] border border-[#281017] rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#200d13] pb-3">
              <span className="text-xs font-mono font-bold text-sky-400 uppercase flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" /> Moje Oferty Handlowe ({myOffers.length})
              </span>
              <Link href="/rynek" className="text-[10px] text-gray-400 hover:text-white font-mono">Przejdź &rarr;</Link>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
              {myOffers.length === 0 ? (
                <p className="text-gray-500 italic text-center py-6">Nie masz aktywnych ofert na rynku.</p>
              ) : (
                myOffers.map(o => (
                  <div key={o.id} className="bg-[#050204] border border-[#220e14] p-3 rounded-xl flex justify-between items-center">
                    <div>
                      <h4 className="font-bold text-white">{o.title || o.item_name}</h4>
                      <p className="text-[10px] text-[#f3ba2f] font-mono">{parseInt(o.price).toLocaleString('pl-PL')} Silver</p>
                    </div>
                    <span className="text-[10px] font-mono bg-sky-950 text-sky-300 px-2 py-0.5 rounded border border-sky-800/40">{o.city || 'Rynek'}</span>
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