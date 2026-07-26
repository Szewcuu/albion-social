'use client'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Shield, Swords, Plus, ThumbsUp, Trash2 } from 'lucide-react'
import PageBanner from '@/components/PageBanner'
import { EquipmentPreview } from '@/components/builds/EquipmentGrid'
import { buildFromDbRow, itemImageUrl } from '@/lib/buildSlots'

const ALBION_CATEGORIES = [
  { id: 'all', name: 'Wszystkie Buildy', icon: Swords },
  { id: 'pvp', name: 'PvP & ZvZ', icon: Shield },
  { id: 'pve', name: 'PvE & Statyki', icon: Swords },
  { id: 'ganking', name: 'Ganking & Mists', icon: Plus },
]

export default function BuildyPage() {
  const [user, setUser] = useState(null)
  const [builds, setBuilds] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('all')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
    fetchBuilds()
  }, [])

  const fetchBuilds = async () => {
    try {
      const { data, error } = await supabase
        .from('builds')
        .select('*, profiles(username, avatar_url)')
        .order('created_at', { ascending: false })

      if (!error && data) setBuilds(data)
    } catch (err) {
      console.error('Błąd pobierania buildów:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteBuild = async (id) => {
    if (!confirm('Czy na pewno chcesz usunąć ten zestaw?')) return
    const { error } = await supabase.from('builds').delete().eq('id', id)
    if (!error) fetchBuilds()
  }

  const handleUpvote = async (id, currentLikes) => {
    if (!user) return
    const { error } = await supabase
      .from('builds')
      .update({ likes: (currentLikes || 0) + 1 })
      .eq('id', id)
    if (!error) fetchBuilds()
  }

  const filteredBuilds = activeCategory === 'all'
    ? builds
    : builds.filter(b => b.activity_type?.toLowerCase().includes(activeCategory))

  const renderItemSlot = (itemName, label) => (
    <div className="flex flex-col items-center bg-[#050204] border border-[#260f16] rounded-2xl p-2 text-center relative group shadow-inner">
      <span className="text-[9px] text-gray-500 font-mono uppercase mb-1">{label}</span>
      {itemName ? (
        <img
          src={itemImageUrl(itemName)}
          alt={itemName}
          className="w-12 h-12 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)] transition-transform group-hover:scale-110"
          title={itemName}
          onError={(e) => { e.target.style.display = 'none' }}
        />
      ) : (
        <div className="w-12 h-12 flex items-center justify-center text-[10px] text-gray-700 font-mono">-</div>
      )}
    </div>
  )

  return (
    <main className="min-h-screen flex flex-col justify-between antialiased font-sans select-none relative bg-[#050305] text-gray-300">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#1d0b12] via-[#050305] to-[#020102] z-0 pointer-events-none" />
      <div className="fixed inset-0 opacity-10 bg-[radial-gradient(#f3ba2f_1px,transparent_1px)] [background-size:24px_24px] z-0 pointer-events-none" />

      <div className="w-full flex-1 flex flex-col items-center p-4 sm:p-6 lg:p-8 z-10 max-w-[1600px] mx-auto space-y-8">

        <div className="w-full flex justify-between items-center">
          <Link href="/" className="inline-flex items-center gap-2 text-[#f3ba2f] hover:text-[#fcd053] text-xs font-mono font-black tracking-widest uppercase transition group">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Powrót do Centrum Caerleon</span>
          </Link>
          <Link
            href="/buildy/create"
            className="flex items-center gap-2 bg-gradient-to-r from-[#f3ba2f] to-[#d9981e] hover:from-[#fcd053] text-black font-extrabold px-5 py-2.5 rounded-xl uppercase text-xs tracking-wider shadow transition"
          >
            <Plus className="w-4 h-4" />
            Stwórz Build
          </Link>
        </div>

        <div className="w-full">
          <PageBanner
            title="Królewska Zbrojownia"
            subtitle="Przeglądaj i dziel się buildami społeczności Albion Online Polska"
            icon={Shield}
          />
        </div>

        <div className="w-full flex flex-wrap gap-3">
          {ALBION_CATEGORIES.map((cat) => {
            const IconComponent = cat.icon
            const isActive = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-mono font-bold uppercase transition-all ${
                  isActive
                    ? 'bg-[#f3ba2f] text-black shadow-[0_0_15px_rgba(243,186,47,0.3)]'
                    : 'bg-[#0c0407] hover:bg-[#15060b] text-gray-400 border border-[#281017]'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{cat.name}</span>
              </button>
            )
          })}
        </div>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <p className="text-gray-500 italic col-span-full text-center py-10">Pobieranie rejestru zbrojowni...</p>
          ) : filteredBuilds.length === 0 ? (
            <div className="col-span-full text-center py-16 space-y-4">
              <p className="text-gray-500 italic">Brak opublikowanych zestawów w tej kategorii.</p>
              <Link
                href="/buildy/create"
                className="inline-flex items-center gap-2 bg-[#0c0407] hover:bg-[#15060b] border border-[#281017] text-[#f3ba2f] px-6 py-3 rounded-xl text-xs font-mono font-bold uppercase transition"
              >
                <Plus className="w-4 h-4" /> Stwórz pierwszy build
              </Link>
            </div>
          ) : (
            filteredBuilds.map((b) => {
              const parsed = buildFromDbRow(b)
              const hasExtended = b.build_data && Object.keys(b.build_data).length > 0

              return (
                <div key={b.id} className="bg-[#0c0407] border border-[#281017] rounded-3xl p-6 flex flex-col justify-between space-y-4 shadow-xl">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#f3ba2f]/10 text-[#f3ba2f] border border-[#f3ba2f]/30 text-[10px] font-mono font-bold uppercase">
                        {b.activity_type}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">
                        {new Date(b.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-serif font-black text-white text-lg">{b.title}</h3>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{b.description || 'Brak opisu taktycznego.'}</p>

                    {hasExtended && parsed.tags?.activities?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {parsed.tags.activities.slice(0, 3).map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 bg-[#050204] border border-[#200d13] rounded text-[9px] font-mono text-gray-500">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-[#050204] border border-[#200d13] rounded-2xl p-3 space-y-2">
                    <div className="text-[10px] font-mono text-gray-500 text-center uppercase tracking-wider mb-1">Ekwipunek Zestawu</div>

                    {hasExtended ? (
                      <EquipmentPreview slots={parsed.slots} size="sm" />
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-2">
                          {renderItemSlot(b.main_weapon, 'Broń')}
                          {renderItemSlot(b.armor, 'Zbroja')}
                          {renderItemSlot(b.helmet, 'Hełm')}
                        </div>
                        <div className="grid grid-cols-2 gap-2 w-2/3 mx-auto">
                          {renderItemSlot(b.boots, 'Buty')}
                          {renderItemSlot(b.cape, 'Peleryna')}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[#200d13]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#1c080e] border border-[#3b131f] flex items-center justify-center text-[#f3ba2f] text-xs font-bold">
                        {(b.profiles?.username || parsed.authorName || 'G').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs text-gray-400 font-mono">{b.profiles?.username || parsed.authorName || 'Gracz'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpvote(b.id, b.likes)}
                        className="flex items-center gap-1 bg-[#1a070d] hover:bg-[#280c14] border border-[#3b131f] text-amber-400 px-3 py-1.5 rounded-xl text-xs font-bold transition"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{b.likes || 0}</span>
                      </button>

                      {user && user.id === b.user_id && (
                        <button
                          onClick={() => handleDeleteBuild(b.id)}
                          className="bg-rose-950/60 hover:bg-rose-900 text-rose-300 p-2 rounded-xl transition"
                          title="Usuń build"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <footer className="w-full bg-[#030102] border-t border-[#200d13] py-6 text-center text-xs text-gray-500 mt-12 relative z-10">
        <div className="max-w-[1600px] mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© {new Date().getFullYear()} <span className="text-[#f3ba2f] font-bold">Albion Online Polska Portal</span>.</p>
          <div className="flex gap-4 text-xs font-mono text-gray-400">
            <Link href="/regulamin" className="hover:text-[#f3ba2f] transition">Regulamin</Link>
            <span>•</span>
            <Link href="/prywatnosc" className="hover:text-[#f3ba2f] transition">Polityka Prywatności</Link>
          </div>
        </div>
      </footer>
    </main>
  )
}
