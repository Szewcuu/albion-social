'use client'
import { useState, useCallback } from 'react'
import { Search, X, Plus } from 'lucide-react'
import { itemImageUrl } from '@/lib/buildSlots'

export default function ItemPicker({ label, category, value, onChange, disabled = false, compact = false }) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [customId, setCustomId] = useState(value || '')

  const fetchItems = useCallback(async (query = '') => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (query) params.set('search', query)
      const res = await fetch(`/api/items?${params}`)
      const data = await res.json()
      if (Array.isArray(data.items)) {
        setItems(data.items)
      } else if (category && data[category]) {
        setItems(data[category])
      } else if (!category && typeof data === 'object') {
        const all = Object.values(data).flat().filter(i => i && 'id' in i)
        setItems(query ? all : all.slice(0, 30))
      } else {
        setItems([])
      }
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [category])

  const openPicker = () => {
    setIsOpen(true)
    setCustomId(value || '')
    fetchItems('')
  }

  const handleSearchChange = (event) => {
    const query = event.target.value
    setSearch(query)
    fetchItems(query)
  }

  const handleSelect = (itemId) => {
    onChange(itemId)
    setIsOpen(false)
    setSearch('')
  }

  if (disabled) {
    return (
      <div className={`${compact ? '' : 'space-y-1'}`}>
        {!compact && <span className="text-[9px] text-gray-500 font-mono uppercase">{label}</span>}
        <div className="bg-[#050204]/50 border border-[#260f16]/50 rounded-xl p-2 flex items-center justify-center opacity-40 cursor-not-allowed">
          <span className="text-[10px] text-gray-600 font-mono">Zablokowane (2H)</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={openPicker}
        className={`group w-full bg-[#050204] border border-[#260f16] hover:border-[#f3ba2f]/50 rounded-xl transition text-left ${
          compact ? 'p-1.5' : 'p-2.5'
        }`}
      >
        {!compact && (
          <span className="text-[9px] text-gray-500 font-mono uppercase block mb-1">{label}</span>
        )}
        <div className="flex items-center justify-center">
          {value ? (
            <img
              src={itemImageUrl(value)}
              alt=""
              className={`object-contain drop-shadow-lg group-hover:scale-110 transition-transform ${compact ? 'w-10 h-10' : 'w-12 h-12'}`}
              onError={(e) => { e.target.style.display = 'none' }}
            />
          ) : (
            <div className={`rounded-lg bg-[#15060b] border border-dashed border-[#3b131f] flex items-center justify-center text-gray-600 ${compact ? 'w-10 h-10' : 'w-12 h-12'}`}>
              <Plus className="w-4 h-4" />
            </div>
          )}
        </div>
        {value && !compact && (
          <span className="text-[8px] text-gray-500 font-mono truncate block mt-1 text-center" title={value}>{value}</span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setIsOpen(false)}>
          <div className="bg-[#0c0407] border border-[#3b131f] rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[#200d13] shrink-0">
              <h3 className="text-sm font-mono font-bold text-[#f3ba2f] uppercase tracking-wider flex items-center gap-2">
                <Search className="w-4 h-4" /> {label}
              </h3>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Zamknij wybór przedmiotu" className="text-gray-400 hover:text-white p-1.5 rounded-xl bg-[#1a070d]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-[#200d13] bg-[#050204] space-y-2 shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Szukaj przedmiotu..."
                  value={search}
                  onChange={handleSearchChange}
                  className="w-full bg-[#0c0407] border border-[#2b0e16] rounded-xl pl-10 pr-4 py-2.5 text-xs font-mono text-gray-100 outline-none focus:border-[#f3ba2f]"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Wpisz ID z gry (np. T8_2H_BOW)"
                  value={customId}
                  onChange={(e) => setCustomId(e.target.value.toUpperCase())}
                  className="flex-1 bg-[#0c0407] border border-[#2b0e16] rounded-xl p-2.5 text-xs font-mono text-gray-100 outline-none focus:border-[#f3ba2f]"
                />
                <button type="button" onClick={() => handleSelect(customId)} className="bg-[#f3ba2f] text-black font-extrabold px-4 rounded-xl text-xs uppercase shrink-0">
                  Użyj
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <p className="text-center text-gray-500 text-xs py-8">Ładowanie przedmiotów...</p>
              ) : items.length === 0 ? (
                <p className="text-center text-gray-500 text-xs py-8">Brak wyników. Wpisz ID ręcznie powyżej.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {items.filter(i => i.id !== undefined).map((item) => (
                    <button
                      key={item.id || 'empty'}
                      type="button"
                      onClick={() => handleSelect(item.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border transition text-left ${
                        value === item.id
                          ? 'bg-[#f3ba2f]/10 border-[#f3ba2f]'
                          : 'bg-[#050204] border-[#200d13] hover:border-[#f3ba2f]/50'
                      }`}
                    >
                      {item.id ? (
                        <img src={itemImageUrl(item.id)} alt="" className="w-8 h-8 object-contain shrink-0" onError={(e) => { e.target.style.display = 'none' }} />
                      ) : (
                        <div className="w-8 h-8 rounded bg-[#15060b] flex items-center justify-center text-gray-600 text-xs">—</div>
                      )}
                      <span className="font-mono text-[10px] text-gray-200 truncate">{item.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#200d13] flex justify-between items-center bg-[#050204] shrink-0">
              <button type="button" onClick={() => handleSelect('')} className="text-xs text-rose-400 hover:text-rose-300 font-mono uppercase">
                Wyczyść slot
              </button>
              <button type="button" onClick={() => setIsOpen(false)} className="bg-[#1a070d] hover:bg-[#2b0e16] text-gray-300 font-bold px-4 py-2 rounded-xl text-xs uppercase">
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
