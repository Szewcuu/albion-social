// src/app/buildy/page.js
'use client'
import { supabase } from '@/lib/supabase'
import { ALBION_ITEMS, findItemByName, findItemsByName } from '@/lib/albionItems'
import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { ArrowLeft, Shield, Swords, Plus, ThumbsUp, User, Trash2, Check } from 'lucide-react'

const ALBION_CATEGORIES = ALBION_ITEMS

const getItemImageUrl = (itemId) => {
  if (!itemId || !itemId.trim()) return null
  let cleanId = itemId.trim()
  
  const upper = cleanId.toUpperCase()
  if (upper.includes('CURSESTAFF') || upper.includes('CURSED')) {
    cleanId = 'T8_2H_CURSESTAFF'
  }

  return `/api/item-image?id=${cleanId}`
}

const getItemIcon = (itemId) => {
  if (!itemId) return '⚔️'
  const cleanId = itemId.split('@')[0].toUpperCase()
  
  // Awaryjne mapowanie dla laski klątw – jeśli zawiedzie obrazek, funkcja zwraca idealnie pasujące emoji
  if (cleanId.includes('CURSESTAFF') || cleanId.includes('CURSED')) return '🪄'
  if (cleanId.includes('BAG')) return '🎒'
  if (cleanId.includes('HEAD') || cleanId.includes('HELM') || cleanId.includes('COWL') || cleanId.includes('HOOD')) return '🪖'
  if (cleanId.includes('ARMOR') || cleanId.includes('JACKET') || cleanId.includes('ROBE') || cleanId.includes('PLATE')) return '🛡️'
  if (cleanId.includes('SHOES') || cleanId.includes('BOOTS') || cleanId.includes('SANDALS')) return '👢'
  if (cleanId.includes('CAPE')) return '🧥'
  if (cleanId.includes('POTION') || cleanId.includes('HEAL') || cleanId.includes('CLEANSE')) return '🧪'
  if (cleanId.includes('MEAL') || cleanId.includes('OMELETTE') || cleanId.includes('STEW')) return '🍖'
  if (cleanId.includes('TOME') || cleanId.includes('OFF')) return '📖'
  if (cleanId.includes('STAFF') || cleanId.includes('WAND')) return '🪄'
  if (cleanId.includes('SWORD') || cleanId.includes('CLEAVER')) return '⚔️'
  if (cleanId.includes('AXE')) return '🪓'
  if (cleanId.includes('SPEAR') || cleanId.includes('HALBERD')) return '🗡️'
  if (cleanId.includes('HAMMER') || cleanId.includes('MACE')) return '🔨'
  if (cleanId.includes('BOW') || cleanId.includes('WARBOW')) return '🏹'
  if (cleanId.includes('CROSSBOW')) return '🔫'
  if (cleanId.includes('DAGGER') || cleanId.includes('KNIFE')) return '🗡️'
  if (cleanId.includes('BRAWLER')) return '🥊'
  return '⚔️'
}

function ItemCustomInput({ label, value, enchantValue, onValueChange, onEnchantChange }) {
  // Bezpieczne wyciąganie nazwy przedmiotu na podstawie ID
  const getInitialName = (id) => {
    if (!id) return ''
    const cleanId = id.split('@')[0]
    for (const cat of Object.values(ALBION_ITEMS)) {
      const found = cat.find(i => i.id === cleanId)
      if (found) return found.name
    }
    return id // Fallback do ID, jeśli nie znajdzie nazwy
  }

  const [inputValue, setInputValue] = useState(() => getInitialName(value))
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const containerRef = useRef(null)

  // Synchronizacja inputValue, gdy zmienia się zewnętrzne value (np. reset formularza)
  useEffect(() => {
    setInputValue(getInitialName(value))
  }, [value])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (text) => {
    setInputValue(text)
    if (!text || text.trim() === '') {
      onValueChange('')
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    const found = findItemsByName(text)
    setSuggestions(found)
    setShowSuggestions(found.length > 0)
  }

  const handleSelectSuggestion = (item) => {
    onValueChange(item.id)
    setInputValue(item.name)
    setShowSuggestions(false)
  }

  const handleClear = () => {
    onValueChange('')
    setInputValue('')
    setSuggestions([])
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-gray-400 mb-1 font-bold text-[11px] uppercase">{label}</label>
      
      <div className="flex gap-1.5 w-full">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => inputValue && setSuggestions(findItemsByName(inputValue))}
          placeholder="Wpisz nazwę itemu..."
          className="flex-1 bg-[#080506] border border-[#2b181a] focus:border-[#c59b27] p-2 text-left text-gray-200 text-xs outline-none transition"
        />

        {value !== '' && (
          <>
            <select
              value={enchantValue}
              onChange={(e) => onEnchantChange(e.target.value)}
              className="w-14 bg-[#080506] border border-[#2b181a] hover:border-[#c59b27] p-1.5 text-amber-400 font-bold text-xs text-center outline-none transition font-mono shrink-0"
            >
              <option value="0">.0</option>
              <option value="1">.1</option>
              <option value="2">.2</option>
              <option value="3">.3</option>
              <option value="4">.4</option>
            </select>
            <button
              type="button"
              onClick={handleClear}
              className="px-2 bg-[#c59b27]/20 border border-[#c59b27]/50 text-[#c59b27] text-xs rounded hover:bg-[#c59b27]/40 transition shrink-0"
            >
              ✕
            </button>
          </>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-[#140c0e] border-2 border-[#c59b27] shadow-2xl rounded-sm p-1 max-h-60 overflow-y-auto">
          {suggestions.map((item, idx) => (
            <button
              key={`${item.id}-${idx}`}
              type="button"
              onClick={() => handleSelectSuggestion(item)}
              className="w-full text-left p-2 text-xs flex items-center gap-2 hover:bg-[#2b181a] transition text-gray-200"
            >
              <span>{getItemIcon(item.id)}</span>
              <span className="flex-1">{item.name}</span>
              {item.id === value && <Check className="w-3.5 h-3.5 text-[#c59b27]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function InventorySlotCard({ slot }) {
  // Bezkompromisowe podmienianie ID w locie przed wysłaniem do API
  const getSafeId = (id) => {
    if (!id) return ''
    const upper = id.toUpperCase()
    if (upper.includes('CURSESTAFF') || upper.includes('CURSED')) {
      return '' // Zwracamy pusty string, dzięki czemu komponent od razu wyświetli emoji różdżki bez odpytywania API o nieistniejący plik
    }
    if (upper.includes('POTION_HEAL')) {
      return 'T4_POTION_HEAL'
    }
    return id.trim()
  }

  const safeSlotId = getSafeId(slot.id)
  const [imgSrc, setImgSrc] = useState(getItemImageUrl(safeSlotId))
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fixedId = getSafeId(slot.id)
    setImgSrc(getItemImageUrl(fixedId))
    setHasError(false)
    setIsLoading(!!fixedId)

    const timer = setTimeout(() => setIsLoading(false), 5000)
    return () => clearTimeout(timer)
  }, [slot.id])

  const handleImageLoad = () => setIsLoading(false)
  const handleImageError = () => {
    setHasError(true)
    setIsLoading(false)
  }

  const findItemName = (id) => {
    if (!id) return slot.emptyLabel
    const cleanId = id.split('@')[0]
    for (const cat of Object.values(ALBION_CATEGORIES)) {
      const found = cat.find(i => i.id === cleanId)
      if (found) {
        const enchant = id.includes('@') ? ` .${id.split('@')[1]}` : ''
        return `${found.name}${enchant}`
      }
    }
    return id
  }

  const displayName = findItemName(slot.id)

  return (
    <div 
      title={displayName}
      className="w-20 h-20 sm:w-24 sm:h-24 bg-[#140c0e] border-2 border-[#3a1a1e] p-1 flex flex-col items-center justify-center text-center rounded relative group hover:border-[#c59b27] transition-all shadow-md cursor-pointer"
    >
      <span className="text-[8px] text-gray-500 font-bold uppercase tracking-tighter absolute top-1 left-1.5 pointer-events-none z-10">
        {slot.label}
      </span>

      {slot.id && isLoading && !hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#140c0e]/95 z-10 rounded">
          <div className="w-4 h-4 border-2 border-[#c59b27] border-t-transparent rounded-full animate-spin mb-1"></div>
          <span className="text-[7px] text-[#c59b27] font-bold uppercase font-mono">Ładowanie</span>
        </div>
      )}

      {imgSrc && !hasError ? (
        <img 
          src={imgSrc} 
          alt={displayName} 
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={`w-14 h-14 sm:w-16 sm:h-16 object-contain my-auto drop-shadow-md group-hover:scale-110 transition-transform ${
            isLoading ? 'opacity-0' : 'opacity-100'
          }`} 
        />
      ) : (
        <div className="w-14 h-14 sm:w-16 sm:h-16 flex flex-col items-center justify-center rounded border border-[#3a1a1e] bg-[#0d0708] my-auto">
          <span className="text-2xl">{getItemIcon(slot.id)}</span>
          <span className="text-[7px] text-gray-500 uppercase mt-0.5">{slot.emptyLabel}</span>
        </div>
      )}
      
      {slot.id && !isLoading && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-[#1b0d10] text-[#c59b27] border border-[#c59b27] text-[10px] font-bold py-1 px-2.5 rounded shadow-2xl z-50 whitespace-nowrap pointer-events-none font-mono">
          {displayName}
        </div>
      )}
    </div>
  )
}

export default function Buildy() {
  const [builds, setBuilds] = useState([])
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  const [formData, setFormData] = useState({
    title: '',
    activity_type: 'PvP Solo / Corrupted',
    bag: 'T8_BAG', bagEnch: '0',
    weapon: 'T8_MAIN_CURSESTAFF', weaponEnch: '0',
    offhand: '', offhandEnch: '0',
    head: 'T8_HEAD_LEATHER_SET3', headEnch: '0',
    armor: 'T8_ARMOR_LEATHER_SET1', armorEnch: '0',
    shoes: 'T8_SHOES_CLOTH_SET2', shoesEnch: '0',
    cape: 'T8_CAPEITEM_FW_CAERLEON', capeEnch: '0',
    potion: 'T8_POTION_HEAL', potionEnch: '0',
    food: 'T7_MEAL_OMELETTE', foodEnch: '0',
    description: ''
  })
  const [formMessage, setFormMessage] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) checkAdminStatus(u.id)
    })
    fetchBuilds()
  }, [])

  const checkAdminStatus = async (userId) => {
    const { data } = await supabase.from('profiles').select('is_admin').eq('id', userId).single()
    setIsAdmin(data?.is_admin ?? false)
  }

  const fetchBuilds = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('builds')
      .select(`
        *,
        profiles(username),
        build_upvotes(user_id)
      `)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setBuilds(data)
    }
    setLoading(false)
  }

  const formatItemIdWithEnchant = (itemId, enchant) => {
    if (!itemId) return ''
    const cleanId = itemId.split('@')[0]
    return parseInt(enchant) > 0 ? `${cleanId}@${enchant}` : cleanId
  }

const handleSubmit = async (e) => {
    e.preventDefault()
    setFormMessage('')

    if (!user) {
      setFormMessage('Musisz być zalogowany, aby dodać build!')
      return
    }

    const finalBag = formatItemIdWithEnchant(formData.bag, formData.bagEnch)
    let finalWeapon = formatItemIdWithEnchant(formData.weapon, formData.weaponEnch)
    
    // Awaryjna korekta ID broni przed zapisem do bazy danych
    if (finalWeapon.toUpperCase().includes('CURSESTAFF') || finalWeapon.toUpperCase().includes('CURSED')) {
      finalWeapon = 'T8_2H_CURSESTAFF'
    }
    const finalOffhand = formatItemIdWithEnchant(formData.offhand, formData.offhandEnch)
    const finalHead = formatItemIdWithEnchant(formData.head, formData.headEnch)
    const finalArmor = formatItemIdWithEnchant(formData.armor, formData.armorEnch)
    const finalShoes = formatItemIdWithEnchant(formData.shoes, formData.shoesEnch)
    const finalCape = formatItemIdWithEnchant(formData.cape, formData.capeEnch)
    const finalPotion = formatItemIdWithEnchant(formData.potion, formData.potionEnch)
    const finalFood = formatItemIdWithEnchant(formData.food, formData.foodEnch)

    const { error } = await supabase.from('builds').insert([
      {
        title: formData.title.trim(),
        activity_type: formData.activity_type,
        bag: finalBag,
        weapon: finalWeapon,
        offhand: finalOffhand,
        head: finalHead,
        helmet: finalHead,
        armor: finalArmor,
        shoes: finalShoes,
        cape: finalCape,
        potion: finalPotion,
        food: finalFood,
        description: formData.description.trim(),
        user_id: user.id
      }
    ])

    if (error) {
      setFormMessage(`Błąd: ${error.message}`)
    } else {
      setFormMessage('Build został pomyślnie opublikowany!')
      setFormData({
        title: '',
        activity_type: 'PvP Solo / Corrupted',
        bag: 'T8_BAG', bagEnch: '0',
        weapon: 'T8_MAIN_CURSESTAFF', weaponEnch: '0',
        offhand: '', offhandEnch: '0',
        head: 'T8_HEAD_LEATHER_SET3', headEnch: '0',
        armor: 'T8_ARMOR_LEATHER_SET1', armorEnch: '0',
        shoes: 'T8_SHOES_CLOTH_SET2', shoesEnch: '0',
        cape: 'T8_CAPEITEM_FW_CAERLEON', capeEnch: '0',
        potion: 'T8_POTION_HEAL', potionEnch: '0',
        food: 'T7_MEAL_OMELETTE', foodEnch: '0',
        description: ''
      })
      fetchBuilds()
    }
  }

  const handleToggleLike = async (buildId, hasLiked) => {
    if (!user) {
      alert('Musisz być zalogowany, aby oceniać zestawy!')
      return
    }

    if (hasLiked) {
      await supabase.from('build_upvotes').delete().eq('build_id', buildId).eq('user_id', user.id)
    } else {
      await supabase.from('build_upvotes').insert([{ build_id: buildId, user_id: user.id }])
    }

    fetchBuilds()
  }

  const handleDeleteBuild = async (buildId) => {
    if (confirm('Czy na pewno chcesz usunąć ten zestaw uzbrojenia?')) {
      const { error } = await supabase.from('builds').delete().eq('id', buildId)
      if (!error) fetchBuilds()
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-between antialiased font-sans select-none relative bg-[#080506] text-[#bcbbc2]">
      <div className="fixed inset-0 bg-gradient-to-b from-[#1b0a0d] via-[#0d0708] to-[#050304] z-0 pointer-events-none"></div>
      
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1 z-10 text-sm">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-[#c59b27] hover:text-[#f0b73a] text-xs font-black tracking-widest uppercase transition group">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Powrót do Centrum Caerleon</span>
          </Link>
        </div>

        <header className="bg-[#120a0c] border-2 border-[#c59b27]/80 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-[#c59b27]" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-100 uppercase tracking-wider font-serif">
                Królewska Zbrojownia (Kreator Buildów)
              </h1>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">
                Kreator z dedykowanymi, sprawdzonymi listami broni, pancerzy i ekwipunku
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* FORMULARZ */}
          <div className="lg:col-span-4">
            <div className="bg-[#120a0c] border border-[#3a1a1e] p-5 sm:p-6 shadow-xl sticky top-6 space-y-4 w-full overflow-hidden">
              <h2 className="text-sm font-black text-[#c59b27] uppercase tracking-wider font-serif border-b border-[#3a1a1e] pb-2 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>Stwórz Zestaw Bojowy</span>
              </h2>

              {!user ? (
                <p className="text-xs text-gray-400 italic bg-[#080506] p-4 border border-[#2b181a]">
                  Zaloguj się na stronie głównej, aby dodawać własne zestawy.
                </p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3 text-xs w-full">
                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase">Nazwa Zestawu *</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.title} 
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })} 
                      className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 focus:border-[#c59b27] outline-none text-xs" 
                      placeholder="np. Solo Corrupted Curse Staff" 
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase">Typ Aktywności *</label>
                    <select 
                      value={formData.activity_type} 
                      onChange={(e) => setFormData({ ...formData, activity_type: e.target.value })} 
                      className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-200 outline-none text-xs"
                    >
                      <option value="PvP Solo / Corrupted">PvP Solo / Corrupted</option>
                      <option value="ZvZ / Wojny">ZvZ / Wojny Gildii</option>
                      <option value="Gank / Small Scale">Ganking / Small Scale</option>
                      <option value="PvE / Statyki / HCE">PvE / Statyki / HCE</option>
                      <option value="Hellgate 2v2 / 5v5">Hellgate</option>
                    </select>
                  </div>

                  <div className="border-t border-[#2b181a] pt-3 space-y-3 w-full">
                    <span className="block text-[#c59b27] font-bold uppercase text-[11px] tracking-wider">
                      Wybierz Ekwipunek
                    </span>

                    <ItemCustomInput label="Główna Broń *" value={formData.weapon} enchantValue={formData.weaponEnch} onValueChange={(val) => setFormData({ ...formData, weapon: val })} onEnchantChange={(ench) => setFormData({ ...formData, weaponEnch: ench })} />
                    <ItemCustomInput label="Druga Ręka" value={formData.offhand} enchantValue={formData.offhandEnch} onValueChange={(val) => setFormData({ ...formData, offhand: val })} onEnchantChange={(ench) => setFormData({ ...formData, offhandEnch: ench })} />
                    <ItemCustomInput label="Głowa *" value={formData.head} enchantValue={formData.headEnch} onValueChange={(val) => setFormData({ ...formData, head: val })} onEnchantChange={(ench) => setFormData({ ...formData, headEnch: ench })} />
                    <ItemCustomInput label="Pancerz *" value={formData.armor} enchantValue={formData.armorEnch} onValueChange={(val) => setFormData({ ...formData, armor: val })} onEnchantChange={(ench) => setFormData({ ...formData, armorEnch: ench })} />
                    <ItemCustomInput label="Buty *" value={formData.shoes} enchantValue={formData.shoesEnch} onValueChange={(val) => setFormData({ ...formData, shoes: val })} onEnchantChange={(ench) => setFormData({ ...formData, shoesEnch: ench })} />

                    <div className="grid grid-cols-2 gap-2">
                      <ItemCustomInput label="Torba" value={formData.bag} enchantValue={formData.bagEnch} onValueChange={(val) => setFormData({ ...formData, bag: val })} onEnchantChange={(ench) => setFormData({ ...formData, bagEnch: ench })} />
                      <ItemCustomInput label="Peleryna" value={formData.cape} enchantValue={formData.capeEnch} onValueChange={(val) => setFormData({ ...formData, cape: val })} onEnchantChange={(ench) => setFormData({ ...formData, capeEnch: ench })} />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <ItemCustomInput label="Mikstura" value={formData.potion} enchantValue={formData.potionEnch} onValueChange={(val) => setFormData({ ...formData, potion: val })} onEnchantChange={(ench) => setFormData({ ...formData, potionEnch: ench })} />
                      <ItemCustomInput label="Jedzenie" value={formData.food} enchantValue={formData.foodEnch} onValueChange={(val) => setFormData({ ...formData, food: val })} onEnchantChange={(ench) => setFormData({ ...formData, foodEnch: ench })} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-400 mb-1 font-bold uppercase">Opis / Poradnik Rotacji</label>
                    <textarea 
                      rows="3" 
                      value={formData.description} 
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })} 
                      className="w-full bg-[#080506] border border-[#2b181a] p-2.5 text-gray-100 focus:border-[#c59b27] outline-none resize-none text-xs" 
                      placeholder="Wytłumacz kombosy, zasady pvp..." 
                    />
                  </div>

                  <button type="submit" className="w-full bg-gradient-to-r from-[#c59b27] to-[#a87a1e] hover:from-[#dca62b] text-black font-black py-2.5 uppercase tracking-widest font-serif transition text-xs">
                    Opublikuj Build
                  </button>
                  {formMessage && <p className="text-center font-bold text-amber-500 animate-pulse mt-2 text-xs">{formMessage}</p>}
                </form>
              )}
            </div>
          </div>

          {/* LISTA BUILDÓW Z SIATKĄ 3x3 */}
          <div className="lg:col-span-8 space-y-4">
            {loading ? (
              <p className="text-center py-8 text-gray-400 font-bold animate-pulse">Ładowanie zbrojowni...</p>
            ) : builds.length === 0 ? (
              <p className="text-center py-12 text-gray-500 italic bg-[#120a0c] border border-[#2b181a]">Brak opublikowanych zestawów.</p>
            ) : (
              builds.map((build) => {
                const upvotes = build.build_upvotes || []
                const likesCount = upvotes.length
                const hasLiked = upvotes.some(u => u.user_id === user?.id)
                const isOwner = user?.id === build.user_id

                const bagId = build.bag || build.bag_id || ''
                const headId = build.head || build.helmet || build.head_id || ''
                let weaponId = build.weapon || build.main_hand || build.weapon_id || ''
                if (weaponId.toUpperCase().includes('CURSESTAFF') || weaponId.toUpperCase().includes('CURSED')) {
                  weaponId = 'T8_2H_CURSESTAFF'
                }
                const armorId = build.armor || build.armor_id || ''
                const shoesId = build.shoes || build.boots || build.shoes_id || ''
                const offhandId = build.offhand || build.second_hand || build.offhand_id || ''
                const capeId = build.cape || build.cape_id || ''
                const potionId = build.potion || build.potions || build.potion_id || ''
                const foodId = build.food || build.meal || build.food_id || ''

                const gridSlots = [
                  { label: 'Torba', id: bagId, emptyLabel: 'Torba' },
                  { label: 'Głowa', id: headId, emptyLabel: 'Głowa' },
                  { label: 'Peleryna', id: capeId, emptyLabel: 'Peleryna' },
                  
                  { label: 'Broń', id: weaponId, emptyLabel: 'Broń' },
                  { label: 'Pancerz', id: armorId, emptyLabel: 'Pancerz' },
                  { label: 'Druga Ręka', id: offhandId, emptyLabel: '2. Ręka' },

                  { label: 'Mikstura', id: potionId, emptyLabel: 'Potka' },
                  { label: 'Buty', id: shoesId, emptyLabel: 'Buty' },
                  { label: 'Jedzenie', id: foodId, emptyLabel: 'Jedzenie' },
                ]

                return (
                  <div key={build.id} className="bg-[#120a0c] border border-[#3a1a1e] hover:border-[#c59b27]/60 p-5 shadow-xl transition space-y-4 relative">
                    
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#3a1a1e] pb-3">
                      <h3 className="text-lg font-black text-gray-100 font-serif tracking-wide flex items-center gap-2">
                        <Swords className="w-5 h-5 text-[#c59b27]" />
                        <span>{build.title}</span>
                      </h3>
                      <span className="text-[10px] bg-[#2b0d10] text-red-400 border border-red-900/60 px-2.5 py-1 font-bold uppercase tracking-wider">
                        {build.activity_type}
                      </span>
                    </div>

                    {/* SIATKA 3x3 */}
                    <div className="bg-[#080506] p-4 border border-[#2b181a] flex flex-col items-center">
                      <span className="text-[10px] text-[#c59b27] font-bold uppercase tracking-wider block mb-3 font-serif">
                        Siatka Uzbrojenia Postaci
                      </span>

                      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 p-3 bg-[#0d0708] border border-[#2b181a] shadow-inner rounded-sm">
                        {gridSlots.map((slot, idx) => (
                          <InventorySlotCard key={idx} slot={slot} />
                        ))}
                      </div>
                    </div>

                    {build.description && (
                      <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap font-sans bg-[#080506]/50 p-3 border border-[#2b181a]/60">
                        {build.description}
                      </p>
                    )}

                    <div className="text-xs text-gray-500 border-t border-[#3a1a1e] pt-3 flex flex-wrap justify-between items-center gap-2">
                      <span className="flex items-center gap-1.5 text-gray-400">
                        <User className="w-3.5 h-3.5 text-[#c59b27]" />
                        <span>Autor: <b className="text-gray-200 font-mono">{build.profiles?.username || 'Gracz'}</b></span>
                      </span>

                      <div className="flex items-center gap-2 ml-auto">
                        {(isOwner || isAdmin) && (
                          <button
                            onClick={() => handleDeleteBuild(build.id)}
                            className="bg-red-950 hover:bg-red-900 text-red-300 border border-red-900/60 font-bold px-3 py-1.5 uppercase text-[11px] transition flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Usuń</span>
                          </button>
                        )}

                        <button 
                          onClick={() => handleToggleLike(build.id, hasLiked)}
                          className={`flex items-center gap-2 px-3.5 py-1.5 border font-bold text-xs uppercase transition shadow-sm ${
                            hasLiked 
                              ? 'bg-[#c59b27] text-black border-[#4a3a1d] font-black' 
                              : 'bg-[#080506] hover:bg-[#1a0c0e] text-[#c59b27] border-[#3a1a1e]'
                          }`}
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 ${hasLiked ? 'fill-black' : ''}`} />
                          <span>{hasLiked ? 'Polecasz' : 'Polecam'} ({likesCount})</span>
                        </button>
                      </div>
                    </div>

                  </div>
                )
              })
            )}
          </div>

        </div>
      </main>

      <footer className="w-full bg-[#050304] border-t border-[#3a1a1e] py-6 text-center text-xs text-gray-500 mt-8 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© {new Date().getFullYear()} <span className="text-[#c59b27] font-bold">Albion Online Polska Portal</span>.</p>
          <div className="flex gap-4 text-xs font-mono text-gray-400">
            <Link href="/regulamin" className="hover:text-[#c59b27] transition">Regulamin</Link>
            <span>•</span>
            <Link href="/prywatnosc" className="hover:text-[#c59b27] transition">Polityka Prywatności</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}