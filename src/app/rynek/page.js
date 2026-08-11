'use client'

import { supabase } from '@/lib/supabase'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ShoppingBag, Plus, Search, MapPin, Trash2, Globe, Store, HandCoins, User, ExternalLink } from 'lucide-react'
import MarketIntelligence from '@/components/market/MarketIntelligence'
import LiveMarketPriceEstimator from '@/components/market/LiveMarketPriceEstimator'
import ContactSellerModal from '@/components/market/ContactSellerModal'
import CustomSelect from '@/components/ui/CustomSelect'

export default function Rynek() {
  const [offers, setOffers] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedOfferForContact, setSelectedOfferForContact] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterCity, setFilterCity] = useState('ALL')
  const [filterCategory, setFilterCategory] = useState('ALL')
  const [sortBy, setSortBy] = useState('newest')

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
      .select('*, profiles!market_items_user_id_fkey(username)')
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

    const contactVal = formData.contact_info?.trim() || 'W grze'
    const insertPayload = {
      title: formData.title.trim(),
      item_name: formData.item_name ? formData.item_name.trim().toUpperCase() : '',
      price: parseInt(formData.price),
      city: formData.city,
      category: formData.category,
      contact: contactVal,
      contact_info: contactVal,
      user_id: user.id,
    }

    const { error } = await supabase.from('market_items').insert([insertPayload])

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

  const filteredOffers = offers
    .filter(o => {
      const matchesSearch = (o.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (o.item_name || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchesCity = filterCity === 'ALL' || o.city === filterCity
      const matchesCategory = filterCategory === 'ALL' || o.category === filterCategory
      return matchesSearch && matchesCity && matchesCategory
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return Number(a.price) - Number(b.price)
      if (sortBy === 'price_desc') return Number(b.price) - Number(a.price)
      return new Date(b.created_at) - new Date(a.created_at)
    })

  const numericPrice = Number(formData.price) || 0
  const formattedPricePreview = numericPrice > 0
    ? numericPrice >= 1_000_000
      ? `${numericPrice.toLocaleString('pl-PL')} Silver (~${(numericPrice / 1_000_000).toFixed(1)}M)`
      : numericPrice >= 1_000
      ? `${numericPrice.toLocaleString('pl-PL')} Silver (~${(numericPrice / 1_000).toFixed(0)}k)`
      : `${numericPrice.toLocaleString('pl-PL')} Silver`
    : ''

  return (
    <div className="page-content">
      <div className="subpage-header">
        <h1>Rynek P2P</h1>
        <p>Przeglądaj i publikuj ogłoszenia handlowe w wybranym mieście Albionu.</p>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1400px] space-y-6 p-4 sm:p-6 lg:p-8 mt-2">
        <MarketIntelligence />

        <div className="mt-4 flex flex-col justify-between gap-3 border-b border-white/8 pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[.22em] text-sky-300">Ogłoszenia społeczności</p>
            <h2 className="font-display mt-1 text-2xl font-black text-[#fff]">Rynek ofert P2P</h2>
            <p className="mt-2 max-w-2xl text-xs leading-5 text-[var(--text-secondary)]">Oferty wystawiają gracze portalu. Nie są automatycznie powiązane z cenami skanowanymi przez Albion Online Data Project.</p>
          </div>
          <span className="w-fit rounded-lg border border-sky-400/20 bg-sky-400/8 px-3 py-2 text-[9px] font-black uppercase tracking-[.14em] text-sky-300">Kontakt i odbiór w grze</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEWA KOLUMNA: FORMULARZ OFERTY */}
          <div className="lg:col-span-4">
            <div className="panel sticky top-6 space-y-5 p-5 sm:p-6 relative z-30 !overflow-visible">
              <div className="border-b border-white/8 pb-4">
                <p className="mb-2 text-[9px] font-black uppercase tracking-[.22em] text-sky-300">Twoje stoisko</p>
                <h2 className="font-display flex items-center gap-2 text-xl font-black text-[#fff]">
                  <Plus className="h-4 w-4" />
                  <span>Wystaw ofertę</span>
                </h2>
                <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">Dodaj cenę, miejsce odbioru i sposób kontaktu. Ogłoszenie od razu trafi na tablicę.</p>
              </div>

              {!user ? (
                <p className="text-xs text-gray-400 italic bg-[var(--bg-elevated)] p-4 rounded-2xl border border-[var(--border-hover)]">
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
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl p-2.5 text-gray-100 focus:border-[var(--amber)] outline-none text-xs"
                      placeholder="np. Sprzedam Mamuta Transportowego T8" 
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">ID Przedmiotu (opcjonalnie do wyceny API)</label>
                    <input 
                      type="text" 
                      value={formData.item_name} 
                      onChange={e => setFormData({ ...formData, item_name: e.target.value })} 
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl p-2.5 text-amber-200 focus:border-[var(--amber)] outline-none text-xs font-mono uppercase"
                      placeholder="np. T8_BAG, T4_BAG, T8_MAIN_SWORD" 
                    />
                  </div>

                  <LiveMarketPriceEstimator
                    itemId={formData.item_name}
                    userPrice={formData.price}
                    server={formData.server}
                    onSelectPrice={(val) => setFormData(prev => ({ ...prev, price: String(val) }))}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">Cena (Silver) *</label>
                      <input 
                        type="number" 
                        required 
                        value={formData.price} 
                        onChange={e => setFormData({ ...formData, price: e.target.value })} 
                        className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl p-2.5 text-gray-100 focus:border-[var(--amber)] outline-none text-xs font-mono"
                        placeholder="150000000" 
                      />
                      {formattedPricePreview && (
                        <p className="mt-1 text-[10px] text-amber-300 font-mono">{formattedPricePreview}</p>
                      )}
                    </div>

                    <div>
                      <CustomSelect
                        label="Kategoria"
                        value={formData.category}
                        onChange={(val) => setFormData({ ...formData, category: val })}
                        options={['Ekwipunek', 'Wierzchowce', 'Surowce', 'Jedzenie & Potiony', 'Inne']}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <CustomSelect
                        label="Lokalizacja / Miasto"
                        value={formData.city}
                        onChange={(val) => setFormData({ ...formData, city: val })}
                        options={['Caerleon', 'Bridgewatch', 'Fort Sterling', 'Lymhurst', 'Martlock', 'Thetford', 'Brecilien']}
                      />
                    </div>

                    <div>
                      <CustomSelect
                        label="Serwer"
                        value={formData.server}
                        onChange={(val) => setFormData({ ...formData, server: val })}
                        options={['Europa', 'Ameryka', 'Azja']}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase font-mono text-[10px]">Kontakt w grze / Discord</label>
                    <input 
                      type="text" 
                      value={formData.contact_info} 
                      onChange={e => setFormData({ ...formData, contact_info: e.target.value })} 
                      className="w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl p-2.5 text-gray-100 focus:border-[var(--amber)] outline-none text-xs"
                      placeholder="np. Pisz na priv w grze lub Discord: SirLancelot#1234" 
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary w-full py-3 text-xs font-bold uppercase tracking-wider mt-2 flex items-center justify-center gap-2"
                  >
                    <Store className="w-4 h-4" /> Wystaw ofertę
                  </button>

                  {formMessage && (
                    <p className={`mt-2 text-center text-xs font-bold font-mono ${formMessage.includes('Błąd') ? 'text-rose-400' : 'text-amber-400'}`}>
                      {formMessage}
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>

          {/* PRAWA KOLUMNA: TABLICA OGŁOSZEŃ */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* WYSZUKIWARKA I FILTRY */}
            <div className="panel space-y-4 p-5 relative z-30 !overflow-visible">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-[.22em] text-sky-300">Tablica ogłoszeń</p>
                  <h2 className="font-display text-lg font-black text-[#fff]">Znajdź właściwy towar</h2>
                </div>
                <span className="text-[10px] font-mono text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">{filteredOffers.length} Ofert</span>
              </div>

              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
                <input 
                  type="text" 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  placeholder="Szukaj przedmiotów na rynku..." 
                  className="input-with-icon !pl-12 w-full bg-[var(--bg-elevated)] border border-[var(--border-hover)] rounded-xl py-2.5 pr-4 text-xs text-gray-100 focus:border-[var(--amber)] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <CustomSelect
                    label="Miasto"
                    value={filterCity}
                    onChange={(val) => setFilterCity(val)}
                    options={[
                      { value: 'ALL', label: 'Wszystkie Miasta' },
                      'Caerleon',
                      'Bridgewatch',
                      'Fort Sterling',
                      'Lymhurst',
                      'Martlock',
                      'Thetford',
                      'Brecilien',
                    ]}
                  />
                </div>

                <div>
                  <CustomSelect
                    label="Kategoria"
                    value={filterCategory}
                    onChange={(val) => setFilterCategory(val)}
                    options={[
                      { value: 'ALL', label: 'Wszystkie Kategorie' },
                      'Ekwipunek',
                      'Wierzchowce',
                      'Surowce',
                      'Jedzenie & Potiony',
                      'Inne',
                    ]}
                  />
                </div>

                <div>
                  <CustomSelect
                    label="Sortowanie"
                    value={sortBy}
                    onChange={(val) => setSortBy(val)}
                    options={[
                      { value: 'newest', label: 'Najnowsze' },
                      { value: 'price_asc', label: 'Cena: Najniższa' },
                      { value: 'price_desc', label: 'Cena: Najwyższa' },
                    ]}
                  />
                </div>
              </div>
            </div>

            {/* LISTA OFERT */}
            <div className="space-y-3">
              {loading ? (
                <p className="text-center py-12 text-gray-500 font-mono animate-pulse">Pobieranie ofert z rynku...</p>
              ) : filteredOffers.length === 0 ? (
                <div className="panel py-14 text-center">
                  <ShoppingBag className="mx-auto mb-4 h-8 w-8 text-sky-300/70" />
                  <p className="font-display text-lg font-bold text-[var(--text-primary)]">Stragany czekają na pierwszą ofertę.</p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">Zmień filtry albo wystaw własne ogłoszenie.</p>
                </div>
              ) : (
                filteredOffers.map(offer => {
                  const isOwner = user?.id === offer.user_id
                  const cleanItemName = offer.item_name ? offer.item_name.trim().toUpperCase() : ''

                  return (
                    <article key={offer.id} className="panel panel-interactive flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                      
                      <div className="flex min-w-0 gap-4 items-center">
                        <div className="h-14 w-14 shrink-0 flex items-center justify-center rounded-xl border border-amber-400/30 bg-[#090507] p-1 shadow-md overflow-hidden relative">
                          {cleanItemName.length >= 3 ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`https://render.albiononline.com/v1/item/${encodeURIComponent(cleanItemName)}.png?quality=1&size=64`}
                              alt={offer.title}
                              className="h-12 w-12 object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                if (e.currentTarget.nextElementSibling) {
                                  e.currentTarget.nextElementSibling.style.display = 'flex'
                                }
                              }}
                            />
                          ) : null}
                          <div className="h-full w-full flex items-center justify-center text-amber-400" style={{ display: cleanItemName.length >= 3 ? 'none' : 'flex' }}>
                            <ShoppingBag className="h-6 w-6" />
                          </div>
                        </div>

                        <div className="min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 font-mono text-[10px]">
                            <span className="bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase">{offer.category || 'Przedmiot'}</span>
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase flex items-center gap-1"><MapPin className="w-3 h-3" /> {offer.city}</span>
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold uppercase flex items-center gap-1"><Globe className="w-3 h-3" /> {offer.server || 'Europa'}</span>
                          </div>

                          <h3 className="font-display text-xl font-black leading-tight text-[#fff]">{offer.title}</h3>
                          
                          <div className="text-[10px] font-bold uppercase tracking-[.14em] text-[var(--text-secondary)] flex items-center gap-1.5 flex-wrap">
                            <span>Sprzedawca:</span>
                            <Link
                              href={`/profil/${offer.user_id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-400/50 text-amber-300 hover:text-white hover:bg-amber-500/35 hover:border-amber-400 hover:scale-[1.03] transition cursor-pointer font-bold text-xs normal-case shadow-[0_0_15px_rgba(245,158,11,0.15)] group"
                              title="Kliknij, aby otworzyć publiczny profil i karty przygód gracza"
                            >
                              <User className="w-3.5 h-3.5 text-amber-400 shrink-0 group-hover:text-amber-200 transition" />
                              <span className="underline underline-offset-2 decoration-amber-400/40 group-hover:decoration-amber-300">{(offer.profiles?.username || 'Gracz').replace(/#0$/, '')}</span>
                              <ExternalLink className="w-3 h-3 text-amber-400/80 group-hover:text-amber-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition shrink-0" />
                            </Link>
                          </div>
                          
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
                          <span className="font-display text-2xl font-black text-[var(--amber)]">
                            {parseInt(offer.price).toLocaleString('pl-PL')} <span className="text-xs font-normal text-gray-400">Silver</span>
                          </span>
                        </div>

                        {isOwner ? (
                          <button 
                            onClick={() => handleDeleteOffer(offer.id)} 
                            className="bg-rose-950/80 hover:bg-rose-900 border border-rose-900/60 text-rose-300 p-2 rounded-xl transition cursor-pointer flex items-center gap-1 text-[10px] font-mono font-bold"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Usuń
                          </button>
                        ) : (
                          <button
                            onClick={() => setSelectedOfferForContact(offer)}
                            className="btn btn-secondary btn-sm flex items-center gap-1.5"
                          >
                            <HandCoins className="w-3.5 h-3.5 text-[var(--gold)]" /> Kup / Kontakt
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

      <ContactSellerModal
        isOpen={!!selectedOfferForContact}
        onClose={() => setSelectedOfferForContact(null)}
        offer={selectedOfferForContact}
        currentUser={user}
      />
    </div>
  )
}
