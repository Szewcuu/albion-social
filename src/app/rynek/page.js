'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ShoppingBag, Plus, Search, Tag, MapPin, Coins, Trash2, Globe } from 'lucide-react'

export default function Rynek() {
  const [offers, setOffers] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterCity, setFilterCity] = useState('ALL')
  const [filterCategory, setFilterCategory] = useState('ALL')

  const [formData, setFormData] = useState({
    title: '',
    item_name: '',
    price: '',
    city: 'Caerleon',
    category: 'Ekwipunek',
    server: 'Europa',
    contact_info: ''
  })
  const [formMessage, setFormMessage] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    fetchOffers()
  }, [])

  const fetchOffers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('market_items')
      .select('*, profiles(username)')
      .order('created_at', { ascending: false })

    if (!error && data) setOffers(data)
    setLoading(false)
  }

  const handleCreateOffer = async (e) => {
    e.preventDefault()
    setFormMessage('')

    if (!user) {
      setFormMessage('Musisz być zalogowany!')
      return
    }

    if (!formData.title.trim() || !formData.price) {
      setFormMessage('Uzupełnij wymagane pola!')
      return
    }

    const { error } = await supabase.from('market_items').insert([
      {
        ...formData,
        price: parseInt(formData.price),
        user_id: user.id
      }
    ])

    if (error) {
      setFormMessage(`Błąd: ${error.message}`)
    } else {
      setFormMessage('Oferta została wystawiona na rynku!')
      setFormData({
        title: '',
        item_name: '',
        price: '',
        city: 'Caerleon',
        category: 'Ekwipunek',
        server: 'Europa',
        contact_info: ''
      })
      fetchOffers()
    }
  }

  const handleDeleteOffer = async (id) => {
    if (confirm('Czy na pewno chcesz usunąć tę ofertę z rynku?')) {
      const { error } = await supabase.from('market_items').delete().eq('id', id)
      if (!error) fetchOffers()
    }
  }

  const filteredOffers = offers.filter(o => {
    const matchesSearch = (o.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (o.item_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCity = filterCity === 'ALL' || o.city === filterCity
    const matchesCategory = filterCategory === 'ALL' || o.category === filterCategory
    return matchesSearch && matchesCity && matchesCategory
  })

  return (
    <main className="min-h-screen bg-[#050305] text-gray-300 flex flex-col justify-between antialiased font-sans select-none relative">
      
      {/* TŁO */}
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
          <div className="w-16 h-16 rounded-2xl bg-[#1c0a10] border border-[#3d1823] flex items-center justify-center text-sky-400 shrink-0 shadow-[0_0_15px_rgba(56,189,248,0.2)]">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wider font-serif">
              Czarny Rynek &amp; Tablica Handlowa
            </h1>
            <p className="text-xs text-gray-400 font-mono mt-1">
              Kupuj, sprzedawaj i wymieniaj ekwipunek, surowce oraz Mamuty bezpośrednio od graczy
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEWA KOLUMNA: FORMULARZ OFERTY */}
          <div className="lg:col-span-4">
            <div className="bg-[#0c0407] border border-[#281017] p-6 rounded-3xl shadow-2xl sticky top-6 space-y-4">
              <h2 className="text-sm font-black text-[#f3ba2f] uppercase tracking-wider font-serif border-b border-[#200d13] pb-3 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>Wystaw Ofertę</span>
              </h2>

              {!user ? (
                <p className="text-xs text-gray-400 italic bg-[#050204] p-4 rounded-2xl border border-[#200d13]">
                  Zaloguj się na stronie głównej, aby dodawać własne oferty na rynku.
                </p>
              ) : (
                <form onSubmit={handleCreateOffer} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">Tytuł Oferty *</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.title} 
                      onChange={e => setFormData({ ...formData, title: e.target.value })} 
                      className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-2.5 text-gray-100 focus:border-[#f3ba2f] outline-none text-xs" 
                      placeholder="np. Sprzedam Mamuta Transportowego T8" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">Cena (Silver) *</label>
                      <input 
                        type="number" 
                        required 
                        value={formData.price} 
                        onChange={e => setFormData({ ...formData, price: e.target.value })} 
                        className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-2.5 text-gray-100 focus:border-[#f3ba2f] outline-none text-xs font-mono" 
                        placeholder="150000000" 
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">Kategoria</label>
                      <select 
                        value={formData.category} 
                        onChange={e => setFormData({ ...formData, category: e.target.value })} 
                        className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-2.5 text-gray-200 outline-none text-xs cursor-pointer"
                      >
                        <option value="Ekwipunek">Ekwipunek / Bronie</option>
                        <option value="Wierzchowce">Wierzchowce</option>
                        <option value="Surowce">Surowce / Materialy</option>
                        <option value="Jedzenie &amp; Potiony">Jedzenie &amp; Mikstury</option>
                        <option value="Inne">Inne</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">Lokalizacja / Miasto</label>
                      <select 
                        value={formData.city} 
                        onChange={e => setFormData({ ...formData, city: e.target.value })} 
                        className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-2.5 text-gray-200 outline-none text-xs cursor-pointer"
                      >
                        <option value="Caerleon">Caerleon</option>
                        <option value="Martlock">Martlock</option>
                        <option value="Lymhurst">Lymhurst</option>
                        <option value="Bridgewatch">Bridgewatch</option>
                        <option value="Fort Sterling">Fort Sterling</option>
                        <option value="Thetford">Thetford</option>
                        <option value="Brecilien">Brecilien</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">Serwer</label>
                      <select 
                        value={formData.server} 
                        onChange={e => setFormData({ ...formData, server: e.target.value })} 
                        className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-2.5 text-gray-200 outline-none text-xs cursor-pointer"
                      >
                        <option value="Europa">Europa</option>
                        <option value="Ameryka">Ameryka</option>
                        <option value="Azja">Azja</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">Kontakt / Nick w grze</label>
                    <input 
                      type="text" 
                      value={formData.contact_info} 
                      onChange={e => setFormData({ ...formData, contact_info: e.target.value })} 
                      className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-2.5 text-gray-100 focus:border-[#f3ba2f] outline-none text-xs" 
                      placeholder="np. Pisz na priv w grze lub Discord: Szewczykos" 
                    />
                  </div>

                  <button type="submit" className="w-full bg-gradient-to-r from-[#f3ba2f] to-[#d9981e] hover:from-[#fcd053] text-black font-extrabold py-3.5 rounded-xl uppercase tracking-wider transition text-xs cursor-pointer shadow-md">
                    Wystaw Ofertę
                  </button>
                  {formMessage && <p className="text-center font-bold text-amber-400 mt-2 text-xs font-mono">{formMessage}</p>}
                </form>
              )}
            </div>
          </div>

          {/* PRAWA KOLUMNA: LISTA OFERT */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* PASEK WYSZUKIWANIA */}
            <div className="bg-[#0c0407] border border-[#281017] p-4 rounded-3xl shadow-xl space-y-3 font-mono text-xs">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
                <input 
                  type="text" 
                  placeholder="Szukaj przedmiotów na rynku..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="w-full bg-[#050204] border border-[#220e14] rounded-xl pl-9 pr-4 py-2.5 text-xs text-gray-100 focus:border-[#f3ba2f] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Miasto</label>
                  <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-2 text-gray-300 outline-none cursor-pointer">
                    <option value="ALL">Wszystkie Miasta</option>
                    <option value="Caerleon">Caerleon</option>
                    <option value="Martlock">Martlock</option>
                    <option value="Lymhurst">Lymhurst</option>
                    <option value="Bridgewatch">Bridgewatch</option>
                    <option value="Fort Sterling">Fort Sterling</option>
                    <option value="Thetford">Thetford</option>
                    <option value="Brecilien">Brecilien</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-gray-400 font-bold uppercase mb-1">Kategoria</label>
                  <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="w-full bg-[#050204] border border-[#220e14] rounded-xl p-2 text-gray-300 outline-none cursor-pointer">
                    <option value="ALL">Wszystkie Kategorie</option>
                    <option value="Ekwipunek">Ekwipunek</option>
                    <option value="Wierzchowce">Wierzchowce</option>
                    <option value="Surowce">Surowce</option>
                    <option value="Jedzenie &amp; Potiony">Jedzenie &amp; Potiony</option>
                    <option value="Inne">Inne</option>
                  </select>
                </div>
              </div>
            </div>

            {/* LISTA OFERT */}
            <div className="space-y-3">
              {loading ? (
                <p className="text-center py-12 text-gray-500 font-mono animate-pulse">Pobieranie ofert z rynku...</p>
              ) : filteredOffers.length === 0 ? (
                <p className="text-center py-12 text-gray-500 italic bg-[#0c0407] border border-[#281017] rounded-3xl">Brak aktywnych ofert na rynku.</p>
              ) : (
                filteredOffers.map(offer => {
                  const isOwner = user?.id === offer.user_id

                  return (
                    <div key={offer.id} className="bg-[#0c0407] border border-[#281017] hover:border-[#f3ba2f]/40 p-5 rounded-3xl shadow-xl transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          <span className="bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase">{offer.category || 'Przedmiot'}</span>
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase flex items-center gap-1"><MapPin className="w-3 h-3" /> {offer.city}</span>
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase flex items-center gap-1"><Globe className="w-3 h-3" /> {offer.server || 'Europa'}</span>
                        </div>

                        <h3 className="text-base font-black text-white font-serif">{offer.title}</h3>
                        
                        {offer.contact_info && (
                          <p className="text-xs text-gray-400 font-mono">
                            Kontakt: <span className="text-gray-200">{offer.contact_info}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex sm:flex-col items-end justify-between w-full sm:w-auto gap-2 border-t sm:border-t-0 border-[#200d13] pt-2 sm:pt-0">
                        <div className="text-right font-mono">
                          <span className="text-[10px] text-gray-500 block uppercase">Cena</span>
                          <span className="text-lg font-black text-[#f3ba2f]">
                            {parseInt(offer.price).toLocaleString('pl-PL')} <span className="text-xs font-normal text-gray-400">Silver</span>
                          </span>
                        </div>

                        {isOwner && (
                          <button 
                            onClick={() => handleDeleteOffer(offer.id)} 
                            className="bg-rose-950/80 hover:bg-rose-900 border border-rose-900/60 text-rose-300 p-2 rounded-xl transition cursor-pointer flex items-center gap-1 text-[10px] font-mono font-bold"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Usuń
                          </button>
                        )}
                      </div>

                    </div>
                  )
                })
              )}
            </div>

          </div>

        </div>
      </div>

      <footer className="w-full bg-[#030102] border-t border-[#200d13] py-6 text-center text-xs text-gray-500 mt-12 relative z-10">
        <div className="max-w-[1600px] mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© {new Date().getFullYear()} <span className="text-[#f3ba2f] font-bold">Albion Online Polska Portal</span>.</p>
          <p className="font-mono text-[10px] text-gray-600">Giełda Handlowa &amp; Czarny Rynek</p>
        </div>
      </footer>
    </main>
  )
}