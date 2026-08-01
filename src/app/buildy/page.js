'use client'
import { supabase } from '@/lib/supabase'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Shield, Swords, Plus, ThumbsUp, Trash2, Anvil, Flame } from 'lucide-react'
import PortalSubpageHeader from '@/components/PortalSubpageHeader'
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

  const fetchBuilds = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      fetchBuilds()
    })
  }, [fetchBuilds])

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
        <Image
          src={itemImageUrl(itemName)}
          alt={itemName}
          width={48}
          height={48}
          unoptimized
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
    <main className="aopp-shell flex min-h-screen flex-col justify-between text-[#d5d0c6]">
      <div className="aopp-world-bg" />
      <div className="aopp-grain" />

      <div className="relative z-10 mx-auto flex w-full max-w-[1480px] flex-1 flex-col gap-7 p-4 sm:p-6 lg:p-8">
        <PortalSubpageHeader
          eyebrow="Kuźnia doktryn • Buildy społeczności"
          title={<>Wykuj zestaw,<br /><span className="text-orange-200">który przetrwa bitwę.</span></>}
          description="Przeglądaj sprawdzone kompozycje graczy, odkrywaj synergie ekwipunku i publikuj własne doktryny dla PvP, PvE oraz polowań."
          icon={Anvil}
          tone="ember"
          stats={[
            { label: 'Zapisane buildy', value: builds.length },
            { label: 'Widoczne zestawy', value: filteredBuilds.length },
            { label: 'Głosy społeczności', value: builds.reduce((sum, build) => sum + (build.likes || 0), 0) },
          ]}
          imagePosition="68% center"
        />

        <section className="aopp-panel flex w-full flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex flex-wrap gap-2">
            {ALBION_CATEGORIES.map((cat) => {
            const IconComponent = cat.icon
            const isActive = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-[.12em] transition-all ${
                  isActive
                    ? 'border border-orange-300/40 bg-orange-300 text-[#160b05] shadow-[0_0_20px_rgba(251,146,60,.16)]'
                    : 'border border-white/8 bg-black/20 text-[#9d978d] hover:border-orange-300/25 hover:text-orange-100'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{cat.name}</span>
              </button>
            )
            })}
          </div>
          <Link href="/buildy/create" className="aopp-primary-button inline-flex shrink-0 items-center justify-center gap-2 px-5 py-3 text-[10px] font-black uppercase tracking-[.12em]">
            <Flame className="h-4 w-4" /> Rozpal kuźnię
          </Link>
        </section>

        <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <p className="text-gray-500 italic col-span-full text-center py-10">Pobieranie rejestru zbrojowni...</p>
          ) : filteredBuilds.length === 0 ? (
            <div className="aopp-panel col-span-full space-y-4 py-16 text-center">
              <Anvil className="mx-auto h-9 w-9 text-orange-200/70" />
              <p className="font-display text-lg font-bold text-[#d8d2c8]">W tej części zbrojowni jest jeszcze pusto.</p>
              <Link
                href="/buildy/create"
                className="aopp-ghost-button inline-flex items-center gap-2 px-5 py-3 text-[10px] font-black uppercase tracking-[.12em]"
              >
                <Plus className="w-4 h-4" /> Stwórz pierwszy build
              </Link>
            </div>
          ) : (
            filteredBuilds.map((b) => {
              const parsed = buildFromDbRow(b)
              const hasExtended = b.build_data && Object.keys(b.build_data).length > 0

              return (
                <article key={b.id} className="aopp-list-card group flex flex-col justify-between space-y-5 overflow-hidden p-5 sm:p-6">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-[#f3ba2f]/10 text-[#f3ba2f] border border-[#f3ba2f]/30 text-[10px] font-mono font-bold uppercase">
                        {b.activity_type}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">
                        {new Date(b.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-display mt-3 text-xl font-black leading-tight text-[#fff8e8] transition group-hover:text-orange-100">{b.title}</h3>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#99938a]">{b.description || 'Brak opisu taktycznego.'}</p>

                    {hasExtended && parsed.tags?.activities?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {parsed.tags.activities.slice(0, 3).map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 bg-[#050204] border border-[#200d13] rounded text-[9px] font-mono text-gray-500">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-orange-200/10 bg-[radial-gradient(circle_at_50%_35%,rgba(193,91,36,.12),rgba(0,0,0,.25)_70%)] p-3 shadow-inner">
                    <div className="mb-3 text-center text-[9px] font-black uppercase tracking-[.2em] text-orange-200/60">Ekwipunek zestawu</div>

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
                </article>
              )
            })
          )}
        </div>
      </div>

      <footer className="relative z-10 mt-12 w-full border-t border-[#d8ad4a]/10 bg-black/20 py-6 text-center text-xs text-[#716d66]">
        <div className="mx-auto flex max-w-[1480px] flex-col items-center justify-between gap-3 px-6 sm:flex-row">
          <p>© {new Date().getFullYear()} <span className="text-[#f3ba2f] font-bold">Albion Online Polska - Portal</span>.</p>
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
