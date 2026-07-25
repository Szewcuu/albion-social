'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ShoppingBag, Tag, Search, Plus, ExternalLink, MapPin } from 'lucide-react'

export default function Rynek() {
  const [items, setItems] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('ALL')

  const [formData, setFormData] = useState({
    title: '',
    price: '',
    city: 'Caerleon',
    category: 'Ekwipunek',
    description: '',
    contact: ''
  })
  const [formMessage, setFormMessage] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    fetchMarketItems()
  }, [])

  const fetchMarketItems = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('market_items')
      .select(`*, profiles(username)`)
      .order('created_at', { ascending: false })

    if (!error && data) setItems(data)
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormMessage('')

    if (!user) {
      setFormMessage('Musisz być zalogowany!')
      return
    }

    const { error } = await supabase.from('market_items').insert([
      {
        ...formData,
        user_id: user.id
      }
    ])

    if (error) {
      setFormMessage(`Błąd: ${error.message}`)
    } else {
      setFormMessage('Oferta została wystawiona!')
      setFormData({ title: '', price: '', city: 'Caerleon', category: 'Ekwipunek', description: '', contact: '' })
      fetchMarketItems()
    }
  }

  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) || item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'ALL' || item.category === filterCategory
    return matchesSearch && matchesCategory
  })

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
          <ShoppingBag className="w-8 h-8 text-[#c59b27]" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-100 uppercase tracking-wider font-serif">
              Rynek Handlowy Caerleon
            </h1>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">
              Kupuj i sprzedawaj wyposażenie, surowce i wierzchowce
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
              <span>Wystaw Ofertę</span>
            </h2>

            {!user ? (
              <p className="text-xs text-gray-400 italic bg-[#080506] p-4 border border-[#2b181a]">
                Zaloguj się na stronie głównej, aby dodawać oferty na rynku.
              </p>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase">Przedmiot / Tytuł *</label>
                  <input type="text" required value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 focus:border-[#c59b27] outline-none" placeholder="np. Młot Zniszczenia T8.3" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase">Cena (Srebro) *</label>
                    <input type="text" required value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 focus:border-[#c59b27] outline-none" placeholder="np. 2,500,000" />
                  </div>
                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase">Miasto *</label>
                    <select value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-200 outline-none">
                      <option value="Caerleon">Caerleon</option>
                      <option value="Martlock">Martlock</option>
                      <option value="Lymhurst">Lymhurst</option>
                      <option value="Bridgewatch">Bridgewatch</option>
                      <option value="Fort Sterling">Fort Sterling</option>
                      <option value="Thetford">Thetford</option>
                      <option value="Brecilien">Brecilien</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase">Kategoria *</label>
                  <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-200 outline-none">
                    <option value="Ekwipunek">Ekwipunek / Broń</option>
                    <option value="Wierzchowce">Wierzchowce</option>
                    <option value="Surowce">Surowce / Materialy</option>
                    <option value="Inne">Inne</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase">Kontakt w grze / Discord *</label>
                  <input type="text" required value={formData.contact} onChange={(e) => setFormData({ ...formData, contact: e.target.value })} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 focus:border-[#c59b27] outline-none" placeholder="Nick w grze lub Discord ID" />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase">Opis / Jakość</label>
                  <textarea rows="3" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 focus:border-[#c59b27] outline-none resize-none" placeholder="Opisz jakość, stopień zaklinania..." />
                </div>

                <button type="submit" className="w-full bg-gradient-to-r from-[#c59b27] to-[#a87a1e] hover:from-[#dca62b] text-black font-black py-2.5 uppercase tracking-widest font-serif transition">
                  Wystaw na Rynek
                </button>
                {formMessage && <p className="text-center font-bold text-amber-500 animate-pulse mt-2">{formMessage}</p>}
              </form>
            )}
          </div>
        </div>

        {/* LISTA OFERT */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-[#120a0c]/80 border border-[#3a1a1e] p-4 shadow-xl backdrop-blur-md flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-500" />
              <input type="text" placeholder="Szukaj przedmiotu..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-[#080506] border border-[#2b181a] pl-9 pr-4 py-2 text-xs text-gray-100 focus:border-[#c59b27] outline-none" />
            </div>
            <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="bg-[#080506] border border-[#2b181a] p-2 text-xs text-gray-300 outline-none">
              <option value="ALL">Wszystkie Kategorię</option>
              <option value="Ekwipunek">Ekwipunek</option>
              <option value="Wierzchowce">Wierzchowce</option>
              <option value="Surowce">Surowce</option>
              <option value="Inne">Inne</option>
            </select>
          </div>

          <div className="space-y-3">
            {loading ? (
              <p className="text-center py-8 text-gray-400 font-bold animate-pulse">Ładowanie ofert z rynku...</p>
            ) : filteredItems.length === 0 ? (
              <p className="text-center py-12 text-gray-500 italic bg-[#120a0c]/40 border border-[#2b181a]">Brak dostępnych ofert.</p>
            ) : (
              filteredItems.map((item) => (
                <div key={item.id} className="bg-[#120a0c]/90 border border-[#2b181a] hover:border-[#c59b27]/60 p-4 shadow-xl backdrop-blur-md transition flex flex-col sm:flex-row justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-[#080506] text-[#c59b27] border border-[#c59b27]/30 px-2 py-0.5 font-bold uppercase">{item.category}</span>
                      <h3 className="text-base font-bold text-gray-100">{item.title}</h3>
                    </div>
                    <p className="text-xs text-gray-300">{item.description}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 pt-1">
                      <span className="flex items-center gap-1 text-amber-400"><MapPin className="w-3 h-3" /> {item.city}</span>
                      <span>Kontakt: <b className="text-gray-300 font-mono">{item.contact}</b></span>
                    </div>
                  </div>
                  <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 border-[#2b181a] pt-2 sm:pt-0">
                    <span className="text-base font-black text-[#c59b27] font-mono">{item.price} Silver</span>
                    <span className="text-[10px] text-gray-500">Sprzedawca: {item.profiles?.username || 'Gracz'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  )
}