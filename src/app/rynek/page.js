'use client'
import { supabase } from '@/lib/supabase'
import { useCallback, useEffect, useState } from 'react'
import { ShoppingBag, Plus, Search, MapPin, Trash2, Globe, Store, HandCoins } from 'lucide-react'
import PortalSubpageHeader from '@/components/PortalSubpageHeader'
import MarketIntelligence from '@/components/market/MarketIntelligence'

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

  const fetchOffers = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('market_items')
      .select('*, profiles(username)')
      .order('created_at', { ascending: false })

    if (!error && data) setOffers(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      fetchOffers()
    })
  }, [fetchOffers])

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
    <main className="aopp-shell flex min-h-screen flex-col justify-between text-[#d5d0c6]">
      <div className="aopp-world-bg" />
      <div className="aopp-grain" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-7 p-4 text-sm sm:p-6 lg:p-8">
        <PortalSubpageHeader
          eyebrow="Plac targowy • Handel P2P"
          title={<>Dobry interes zaczyna się<br /><span className="text-sky-300">od właściwej oferty.</span></>}
          description="Przeglądaj ogłoszenia poszukiwaczy przygód, porównuj ceny i umawiaj bezpieczne transakcje w wybranym mieście Albionu."
          icon={Store}
          tone="sky"
          stats={[
            { label: 'Aktywne oferty', value: offers.length },
            { label: 'Pasujące wyniki', value: filteredOffers.length },
            { label: 'Region', value: filterCity === 'ALL' ? 'Cały Albion' : filterCity },
          ]}
          imagePosition="76% center"
        />

        <MarketIntelligence />

        <div className="mt-4 flex flex-col justify-between gap-3 border-b border-white/8 pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.22em] text-sky-300">Ogłoszenia społeczności</p>
            <h2 className="font-display mt-1 text-2xl font-black text-[#fff8e8]">Rynek ofert P2P</h2>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-[#8f8a81]">Oferty wystawiają gracze portalu. Nie są automatycznie powiązane z cenami skanowanymi przez Albion Online Data Project.</p>
          </div>
          <span className="w-fit rounded-lg border border-sky-400/20 bg-sky-400/8 px-3 py-2 text-[9px] font-black uppercase tracking-[.14em] text-sky-300">Kontakt i odbiór w grze</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEWA KOLUMNA: FORMULARZ OFERTY */}
          <div className="lg:col-span-4">
            <div className="aopp-panel sticky top-6 space-y-5 p-5 sm:p-6">
              <div className="border-b border-white/8 pb-4">
                <p className="mb-2 text-[9px] font-black uppercase tracking-[.22em] text-sky-300">Twoje stoisko</p>
                <h2 className="font-display flex items-center gap-2 text-xl font-black text-[#fff8e8]">
                  <Plus className="h-4 w-4" />
                  <span>Wystaw ofertę</span>
                </h2>
                <p className="mt-2 text-xs leading-5 text-[#8f8a81]">Dodaj cenę, miejsce odbioru i sposób kontaktu. Ogłoszenie od razu trafi na tablicę.</p>
              </div>

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

                  <button type="submit" className="aopp-primary-button w-full justify-center py-3.5">
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
            <div className="aopp-panel space-y-4 p-4 text-xs sm:p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.22em] text-sky-300">Tablica ogłoszeń</p>
                  <h2 className="font-display mt-1 text-xl font-black text-[#fff8e8]">Znajdź właściwy towar</h2>
                </div>
                <span className="rounded-lg border border-white/10 bg-black/25 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.14em] text-[#a9a49b]">{filteredOffers.length} ofert</span>
              </div>
              <div className="relative">
                <label htmlFor="market-offer-search" className="sr-only">Szukaj przedmiotów na rynku</label>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input 
                  id="market-offer-search"
                  type="text" 
                  placeholder="Szukaj przedmiotów na rynku..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="min-h-11 w-full rounded-xl border border-[#220e14] bg-[#050204] pl-9 pr-4 text-xs text-gray-100 outline-none focus:border-[#f3ba2f]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label htmlFor="market-city-filter" className="mb-1 block text-[10px] font-bold uppercase text-gray-300">Miasto</label>
                  <select id="market-city-filter" value={filterCity} onChange={e => setFilterCity(e.target.value)} className="min-h-11 w-full cursor-pointer rounded-xl border border-[#220e14] bg-[#050204] p-2 text-gray-200 outline-none">
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
                  <label htmlFor="market-category-filter" className="mb-1 block text-[10px] font-bold uppercase text-gray-300">Kategoria</label>
                  <select id="market-category-filter" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="min-h-11 w-full cursor-pointer rounded-xl border border-[#220e14] bg-[#050204] p-2 text-gray-200 outline-none">
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
                <div className="aopp-panel py-14 text-center">
                  <ShoppingBag className="mx-auto mb-4 h-8 w-8 text-sky-300/70" />
                  <p className="font-display text-lg font-bold text-[#d8d2c8]">Stragany czekają na pierwszą ofertę.</p>
                  <p className="mt-1 text-xs text-[#918b82]">Zmień filtry albo wystaw własne ogłoszenie.</p>
                </div>
              ) : (
                filteredOffers.map(offer => {
                  const isOwner = user?.id === offer.user_id

                  return (
                    <article key={offer.id} className="aopp-list-card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                      
                      <div className="flex min-w-0 gap-4">
                        <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-400/8 text-sky-300 sm:flex">
                          <ShoppingBag className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 space-y-2">
                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          <span className="bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase">{offer.category || 'Przedmiot'}</span>
                          <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase flex items-center gap-1"><MapPin className="w-3 h-3" /> {offer.city}</span>
                          <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase flex items-center gap-1"><Globe className="w-3 h-3" /> {offer.server || 'Europa'}</span>
                        </div>

                        <h3 className="font-display text-xl font-black leading-tight text-[#fff8e8]">{offer.title}</h3>
                        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#918b82]">Sprzedawca: <span className="text-[#b8b1a7]">{(offer.profiles?.username || 'Gracz').replace(/#0$/, '')}</span></p>
                        
                        {offer.contact_info && (
                          <p className="text-xs text-gray-400 font-mono">
                            Kontakt: <span className="text-gray-200">{offer.contact_info}</span>
                          </p>
                        )}
                        </div>
                      </div>

                      <div className="flex w-full items-end justify-between gap-3 border-t border-white/8 pt-4 sm:w-auto sm:min-w-[190px] sm:flex-col sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
                        <div className="text-right font-mono">
                          <span className="text-[10px] text-gray-500 block uppercase">Cena</span>
                          <span className="font-display text-2xl font-black text-[#e5bb55]">
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

                    </article>
                  )
                })
              )}
            </div>

          </div>

        </div>
      </div>

      <footer className="relative z-10 mt-12 w-full border-t border-[#d8ad4a]/10 bg-black/20 py-6 text-center text-xs text-[#918b82]">
        <div className="mx-auto flex max-w-[1480px] flex-col items-center justify-between gap-3 px-6 sm:flex-row">
          <p>© {new Date().getFullYear()} <span className="text-[#f3ba2f] font-bold">Albion Online Polska Portal</span>.</p>
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.16em] text-[#918b82]"><HandCoins className="h-3.5 w-3.5" /> Giełda Handlowa &amp; Czarny Rynek</p>
        </div>
      </footer>
    </main>
  )
}
