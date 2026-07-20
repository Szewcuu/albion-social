'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function Rynek() {
  const [posts, setPosts] = useState([])
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Filtry
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('ALL')
  const [filterServer, setFilterServer] = useState('ALL')

  // Formularz
  const [formData, setFormData] = useState({
    item_name: '',
    tier: 'T8',
    enchantment: '.0',
    quality: 'Znakomita',
    price_value: '',
    price_unit: 'm',
    post_type: 'SELL',
    server: 'Europa',
    description: ''
  })
  const [formMessage, setFormMessage] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    fetchMarketPosts()
  }, [])

  const fetchMarketPosts = async () => {
    loading(true)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data, error } = await supabase
      .from('market_posts')
      .select('*, profiles(username)')
      .gt('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })

    if (!error && data) setPosts(data)
    setLoading(false)
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormMessage('')

    if (!user) {
      setFormMessage('Musisz być zalogowany!')
      return
    }

    const cleanItemName = formData.item_name.trim()
    const cleanDescription = formData.description.trim()
    const priceNum = parseFloat(formData.price_value)

    if (cleanItemName.length < 2 || cleanItemName.length > 40) {
      setFormMessage('Nazwa przedmiotu musi mieć od 2 do 40 znaków.')
      return
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setFormMessage('Cena musi być większa od zera.')
      return
    }

    const enchantmentStr = formData.enchantment === '.0' ? '' : formData.enchantment
    const combinedItemName = `${formData.tier}${enchantmentStr} ${cleanItemName} (${formData.quality})`
    const combinedPrice = `${formData.price_value}${formData.price_unit}`

    const { error } = await supabase.from('market_posts').insert([
      {
        item_name: combinedItemName,
        price: combinedPrice,
        post_type: formData.post_type,
        server: formData.server,
        description: cleanDescription || null,
        user_id: user.id
      }
    ])

    if (error) {
      setFormMessage(`Błąd: ${error.message}`)
    } else {
      setFormMessage('Oferta dodana!')
      setFormData(prev => ({ ...prev, item_name: '', price_value: '', description: '' }))
      fetchMarketPosts()
    }
  }

  const handleDelete = async (postId) => {
    const { error } = await supabase.from('market_posts').delete().eq('id', postId)
    if (!error) fetchMarketPosts()
  }

  const formatPostDate = (dateString) => {
    const postDate = new Date(dateString)
    return postDate.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', ' o godz.')
  }

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.item_name.toLowerCase().includes(searchTerm.toLowerCase()) || (post.description && post.description.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesType = filterType === 'ALL' || post.post_type === filterType
    const matchesServer = filterServer === 'ALL' || post.server === filterServer
    return matchesSearch && matchesType && matchesServer
  })

  return (
    <main className="min-h-screen animate-bg-drift text-[#bcbbc2] p-4 sm:p-6 flex flex-col items-center antialiased font-albion-ui select-none relative overflow-hidden text-base">
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=Inter:wght@400;500;700;800&display=swap');
        .font-albion-title { font-family: 'Cinzel', serif; }
        .font-albion-ui { font-family: 'Inter', sans-serif; }

        @keyframes bgDrift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-bg-drift {
          background: linear-gradient(-45deg, #121216, #1a191f, #221c15, #16151a);
          background-size: 300% 300%;
          animation: bgDrift 35s ease infinite;
        }

        @keyframes floatEmber {
          0% { transform: translateY(105vh) translateX(0px) scale(0.6); opacity: 0; }
          15% { opacity: 0.35; filter: blur(1px); }
          50% { transform: translateY(45vh) translateX(25px) scale(1.3); opacity: 0.50; filter: blur(2px); }
          85% { opacity: 0.20; }
          100% { transform: translateY(-5vh) translateX(-15px) scale(0.8); opacity: 0; }
        }

        @keyframes fogPulse {
          0% { transform: scale(1) translate(0px, 0px); opacity: 0.15; }
          50% { transform: scale(1.15) translate(20px, -10px); opacity: 0.28; }
          100% { transform: scale(1) translate(0px, 0px); opacity: 0.15; }
        }

        .ember-particle {
          position: absolute;
          background: radial-gradient(circle, rgba(243,169,59,0.85) 0%, rgba(197,155,39,0.2) 60%, transparent 100%);
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          box-shadow: 0 0 10px rgba(243,169,59,0.3);
        }

        .magic-fog {
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(147,51,234,0.08) 0%, rgba(197,155,39,0.04) 50%, transparent 80%);
          pointer-events: none;
          filter: blur(40px);
          z-index: 0;
        }
      `}</style>

      {/* SUBTELNA MGŁA I DROBINKI OGNIA */}
      <div className="magic-fog top-[-100px] left-[-100px]" style={{ animation: 'fogPulse 20s ease-in-out infinite' }}></div>
      <div className="magic-fog top-[-100px] left-[-100px]" style={{ animation: 'fogPulse 20s ease-in-out infinite' }}></div>
      <div className="magic-fog bottom-[-150px] right-[-100px]" style={{ animation: 'fogPulse 25s ease-in-out infinite', animationDelay: '-5s' }}></div>
      {/* Dodano 2 nowe płomyki pośrednie */}
      <div className="ember-particle w-3 h-3" style={{ left: '10%', animation: 'floatEmber 20s linear infinite' }}></div>
      <div className="ember-particle w-2 h-2" style={{ left: '28%', animation: 'floatEmber 25s linear infinite', animationDelay: '-8s' }}></div>
      <div className="ember-particle w-4 h-4" style={{ left: '50%', animation: 'floatEmber 28s linear infinite', animationDelay: '-6s' }}></div>
      <div className="ember-particle w-3 h-3" style={{ left: '68%', animation: 'floatEmber 22s linear infinite', animationDelay: '-12s' }}></div>
      <div className="ember-particle w-2 h-2" style={{ left: '85%', animation: 'floatEmber 18s linear infinite', animationDelay: '-3s' }}></div>          
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.55)_100%)] pointer-events-none z-0"></div>

      <div className="max-w-7xl w-full space-y-5 z-10">
        <div className="mb-2">
          <Link href="/" className="text-[#c59b27] hover:underline text-sm font-bold tracking-wider uppercase font-albion-title">← Zamknij tablicę rynkową</Link>
        </div>

        <header className="bg-[#141419] border-2 border-[#c59b27] p-5 shadow-2xl">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-100 font-albion-title tracking-wider">💰 REJESTR TRANSAKCJI I ZLECEŃ RYNKOWYCH</h1>
          <p className="text-sm text-gray-400 uppercase tracking-widest font-bold mt-1">Wszystkie publiczne wpisy wygasają samoistnie po 7 cyklach dobowych</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          
          {/* LEWA STRONA: FORMULARZ DODAWANIA */}
          <div className="lg:col-span-4">
            <div className="bg-[#141419] border border-[#23232c] p-6 shadow-xl sticky top-6">
              <h2 className="text-sm sm:text-base font-black mb-4 text-[#c59b27] uppercase tracking-widest border-b border-[#23232c] pb-2 font-albion-title">Wystaw Nowe Zlecenie</h2>
              
              {!user ? (
                <p className="text-gray-400 text-sm italic bg-[#0b0b0d] p-5 border border-[#23232c]">Brama autoryzacji zamknięta. Zaloguj się na panelu głównym.</p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4 text-sm">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">Kierunek Kontraktu</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setFormData(p => ({ ...p, post_type: 'SELL' }))} className={`py-2.5 font-bold uppercase tracking-wider border transition text-sm ${formData.post_type === 'SELL' ? 'bg-[#c59b27] text-black border-[#4a3a1d]' : 'bg-[#1d1d24] text-gray-400 border-[#2c2c38]'}`}>Sprzedam</button>
                      <button type="button" onClick={() => setFormData(p => ({ ...p, post_type: 'BUY' }))} className={`py-2.5 font-bold uppercase tracking-wider border transition text-sm ${formData.post_type === 'BUY' ? 'bg-blue-900 text-blue-200 border-blue-700' : 'bg-[#1d1d24] text-gray-400 border-[#2c2c38]'}`}>Kupię</button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">Świat / Serwer Gry</label>
                    <select name="server" value={formData.server} onChange={handleInputChange} className="w-full bg-[#0b0b0d] border border-[#23232c] p-2.5 text-white font-medium cursor-pointer focus:border-[#c59b27] focus:outline-none text-sm">
                      <option value="Europa">Europa (Europe)</option>
                      <option value="Ameryka">Ameryka (Americas)</option>
                      <option value="Azja">Azja (Asia)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">Nazwa Przedmiotu</label>
                    <input type="text" name="item_name" required value={formData.item_name} onChange={handleInputChange} className="w-full bg-[#0b0b0d] border border-[#23232c] p-2.5 text-white focus:outline-none focus:border-[#c59b27] text-sm" placeholder="Np. Carving Sword" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">Stopień (Tier)</label>
                      <select name="tier" value={formData.tier} onChange={handleInputChange} className="w-full bg-[#0b0b0d] border border-[#23232c] p-2.5 text-white cursor-pointer focus:border-[#c59b27] focus:outline-none text-sm">
                        {['T1','T2','T3','T4','T5','T6','T7','T8'].map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">Zaklęcie</label>
                      <select name="enchantment" value={formData.enchantment} onChange={handleInputChange} className="w-full bg-[#0b0b0d] border border-[#23232c] p-2.5 text-white cursor-pointer focus:border-[#c59b27] focus:outline-none text-sm">
                        {['.0','.1','.2','.3','.4'].map(e => <option key={e} value={e}>{e}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">Jakość Wykonania</label>
                    <select name="quality" value={formData.quality} onChange={handleInputChange} className="w-full bg-[#0b0b0d] border border-[#23232c] p-2.5 text-white cursor-pointer focus:border-[#c59b27] focus:outline-none text-sm">
                      <option value="Normalna">Normalna</option>
                      <option value="Dobra">Dobra</option>
                      <option value="Wybitna">Wybitna</option>
                      <option value="Znakomita">Znakomita</option>
                      <option value="Arcydzieło">Arcydzieło</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5 font-bold uppercase tracking-wider">Wartość Srebra</label>
                    <div className="flex gap-2 w-full">
                      <input type="number" name="price_value" required min="0" step="any" value={formData.price_value} onChange={handleInputChange} className="flex-1 bg-[#0b0b0d] border border-[#23232c] p-2.5 text-white font-mono focus:outline-none focus:border-[#c59b27] text-sm" placeholder="15" />
                      <select name="price_unit" value={formData.price_unit} onChange={handleInputChange} className="w-32 bg-[#0b0b0d] border border-[#23232c] p-2.5 text-[#c59b27] font-bold cursor-pointer focus:border-[#c59b27] focus:outline-none text-sm">
                        <option value="m">m (kk)</option>
                        <option value="k">k (tys)</option>
                        <option value=" Srebra">czyste</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <textarea name="description" rows="3" maxLength="250" value={formData.description} onChange={handleInputChange} className="w-full bg-[#0b0b0d] border border-[#23232c] p-2.5 text-white focus:outline-none focus:border-[#c59b27] resize-none text-sm" placeholder="Notatki dodatkowe (np. strefa odbioru)..." />
                  </div>

                  <button type="submit" className="w-full bg-gradient-to-b from-[#dca62b] to-[#a87a1e] hover:from-[#f0b73a] hover:to-[#be8c27] text-black font-black py-3 px-5 uppercase tracking-widest border border-[#4a3a1d] font-albion-title text-sm transition">Pieczętuj Kontrakt</button>
                  {formMessage && <p className="text-center font-bold text-amber-500 animate-pulse mt-3 text-sm">{formMessage}</p>}
                </form>
              )}
            </div>
          </div>

          {/* PRAWA STRONA: LISTOWANIE I FILTROWANIE */}
          <div className="lg:col-span-8 space-y-4">
            
            <div className="bg-[#141419] border border-[#23232c] p-4 flex flex-col sm:flex-row gap-4 shadow-md items-center">
              <input type="text" placeholder="Filtruj towary po nazwie..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full sm:flex-1 bg-[#0b0b0d] border border-[#23232c] p-2.5 text-sm text-white focus:outline-none focus:border-[#c59b27]" />
              
              <select value={filterServer} onChange={(e) => setFilterServer(e.target.value)} className="w-full sm:w-auto bg-[#0b0b0d] border border-[#23232c] p-2.5 text-sm text-[#c59b27] font-bold cursor-pointer focus:outline-none focus:border-[#c59b27]">
                <option value="ALL">Wszystkie Światy</option>
                <option value="Europa">Europa</option>
                <option value="Ameryka">Ameryka</option>
                <option value="Azja">Azja</option>
              </select>

              <div className="flex bg-[#0b0b0d] p-1 border border-[#23232c] text-sm w-full sm:w-auto justify-center">
                {['ALL', 'SELL', 'BUY'].map((t) => (
                  <button key={t} type="button" onClick={() => setFilterType(t)} className={`px-4 py-1.5 font-bold uppercase transition text-sm ${filterType === t ? 'bg-[#c59b27] text-black' : 'text-gray-400 hover:text-white'}`}>
                    {t === 'ALL' ? 'Wszystko' : t === 'SELL' ? 'Sprzedaż' : 'Kupno'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {loading ? (
                <p className="text-gray-400 font-bold animate-pulse font-mono text-sm sm:text-base py-4">Przeszukiwanie miejskich skarbców...</p>
              ) : filteredPosts.length === 0 ? (
                <p className="text-gray-500 italic text-center bg-[#141419]/40 border border-[#23232c]/60 p-8 text-sm sm:text-base">Brak aktywnych zleceń handlowych spełniających te kryteria.</p>
              ) : (
                filteredPosts.map((post) => (
                  <div key={post.id} className="bg-[#141419] border border-[#23232c] hover:border-[#c59b27]/40 p-5 shadow-md flex justify-between items-center gap-5 transition duration-150 text-sm sm:text-base">
                    <div className="flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`text-[10px] font-black px-2 py-0.5 border ${post.post_type === 'SELL' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>{post.post_type}</span>
                        <span className="text-[10px] font-bold bg-[#0b0b0d] border border-[#23232c] text-purple-400 px-2 py-0.5 uppercase tracking-wide">{post.server}</span>
                        <h3 className="text-base sm:text-lg font-black text-gray-200 font-mono tracking-tight">{post.item_name}</h3>
                      </div>
                      {post.description && <p className="text-gray-300 text-sm mb-2.5 leading-relaxed">{post.description}</p>}
                      <p className="text-xs text-gray-500">Sygnatura: <span className="text-gray-400 font-medium">{post.profiles?.username || 'Nieznany Wojownik'}</span> • <span className="italic text-gray-500/80">Złożono {formatPostDate(post.created_at)}</span></p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-2.5 min-w-[120px]">
                      <p className="text-lg sm:text-xl font-black text-[#c59b27] font-mono">{post.price}</p>
                      {user && user.id === post.user_id && <button onClick={() => handleDelete(post.id)} className="text-xs text-red-400 hover:text-red-300 font-bold uppercase tracking-wider border border-red-950/40 bg-red-950/20 px-2 py-1 rounded-sm transition">Wycofaj</button>}
                    </div>
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