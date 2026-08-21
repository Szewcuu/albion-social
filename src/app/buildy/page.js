'use client'
import { supabase } from '@/lib/supabase'
import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Shield, Swords, Plus, ThumbsUp, Trash2, Anvil, Flame, ArrowRightLeft } from 'lucide-react'
import { EquipmentPreview } from '@/components/builds/EquipmentGrid'
import { buildFromDbRow } from '@/lib/buildSlots'
import FavoriteButton from '@/components/ui/FavoriteButton'
import { usePortalSession } from '@/contexts/PortalSessionContext'

const BuildComparator = dynamic(() => import('@/components/builds/BuildComparator'), {
  loading: () => <div className="panel mb-6 min-h-32 animate-pulse" aria-label="Ładowanie porównywarki buildów" />,
})
const SquadCompBuilder = dynamic(() => import('@/components/builds/SquadCompBuilder'), {
  loading: () => <div className="panel min-h-72 animate-pulse" aria-label="Ładowanie planera składu" />,
})
const Meta1v1Tierlist = dynamic(() => import('@/components/builds/Meta1v1Tierlist'), {
  loading: () => <div className="panel min-h-72 animate-pulse" aria-label="Ładowanie tierlisty Meta 1v1" />,
})

const ALBION_CATEGORIES = [
  { id: 'all', name: 'Wszystkie Buildy', icon: Swords },
  { id: 'pvp', name: 'PvP & ZvZ', icon: Shield },
  { id: 'pve', name: 'PvE & Statyki', icon: Swords },
  { id: 'ganking', name: 'Ganking & Mists', icon: Plus },
]
const BUILDS_PAGE_SIZE = 12

function applyOlderThan(query, cursor) {
  if (!cursor) return query
  return query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`)
}

export default function BuildyPage() {
  const { user } = usePortalSession()
  const [builds, setBuilds] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [totalBuilds, setTotalBuilds] = useState(0)
  const [comparatorReady, setComparatorReady] = useState(false)
  const cursorRef = useRef(null)

  const fetchBuilds = useCallback(async ({ append = false } = {}) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    setLoadError('')
    try {
      let query = supabase
        .from('builds')
        .select('*, profiles!builds_user_id_fkey(username, avatar_url), build_votes(id, vote_type)', { count: append ? undefined : 'exact' })
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(BUILDS_PAGE_SIZE + 1)

      if (activeCategory !== 'all') query = query.ilike('activity_type', `%${activeCategory}%`)
      const { data, error, count } = await applyOlderThan(query, append ? cursorRef.current : null)

      if (error) throw error
      const hasNextPage = (data || []).length > BUILDS_PAGE_SIZE
      const page = (data || []).slice(0, BUILDS_PAGE_SIZE)
      const oldest = page.at(-1)
      cursorRef.current = oldest ? { created_at: oldest.created_at, id: oldest.id } : null
      setHasMore(hasNextPage)
      if (!append) setTotalBuilds(count || 0)
      setBuilds((current) => append ? [...current, ...page.filter((row) => !current.some((item) => item.id === row.id))] : page)
    } catch (err) {
      console.error('Błąd pobierania buildów:', err)
      if (!append) setBuilds([])
      setLoadError('Nie udało się wczytać Zbrojowni. Odśwież stronę lub spróbuj ponownie za chwilę.')
    } finally {
      if (append) setLoadingMore(false)
      else setLoading(false)
    }
  }, [activeCategory])

  useEffect(() => {
    void Promise.resolve().then(fetchBuilds)
  }, [fetchBuilds])

  const handleDeleteBuild = async (id) => {
    if (!confirm('Czy na pewno chcesz usunąć ten zestaw?')) return
    const { error } = await supabase.from('builds').delete().eq('id', id)
    if (!error) fetchBuilds()
  }

  const filteredBuilds = builds

  const totalVotes = builds.reduce((sum, build) => sum + (build.build_votes || []).filter((vote) => vote.vote_type === 'up').length, 0)

  const [mainTab, setMainTab] = useState('catalog') // 'catalog' | 'meta' | 'squad'

  return (
    <div className="page-content">
      {/* Header */}
      <div className="subpage-header">
        <h1><Anvil className="w-5 h-5 text-[var(--amber)]" /> Kuźnia Buildów</h1>
        <p>Przeglądaj sprawdzone kompozycje graczy, odkrywaj synergie ekwipunku, analizuj Meta 1v1 i buduj skład zespołowy.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="stat-card">
          <span className="stat-card-label">Buildy w kategorii</span>
          <span className="stat-card-value amber">{totalBuilds}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Wczytane</span>
          <span className="stat-card-value">{filteredBuilds.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Polubienia wczytanych</span>
          <span className="stat-card-value emerald">{totalVotes}</span>
        </div>
      </div>

      {/* MAIN TAB SWITCHER */}
      <div className="panel mb-6 p-2 flex flex-wrap gap-2 font-mono text-xs">
        <button
          onClick={() => setMainTab('catalog')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
            mainTab === 'catalog'
              ? 'bg-amber-500/20 border border-amber-400/50 text-amber-300 shadow-md'
              : 'bg-black/30 border border-white/5 text-gray-400 hover:text-white'
          }`}
        >
          <Swords className="w-4 h-4 text-amber-400" />
          <span>Zbrojownia Buildów</span>
        </button>

        <button
          onClick={() => setMainTab('meta')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
            mainTab === 'meta'
              ? 'bg-amber-500/20 border border-amber-400/50 text-amber-300 shadow-md'
              : 'bg-black/30 border border-white/5 text-gray-400 hover:text-white'
          }`}
        >
          <Flame className="w-4 h-4 text-amber-400" />
          <span>Meta 1v1 & Tierlisty</span>
        </button>

        <button
          onClick={() => setMainTab('squad')}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition cursor-pointer ${
            mainTab === 'squad'
              ? 'bg-amber-500/20 border border-amber-400/50 text-amber-300 shadow-md'
              : 'bg-black/30 border border-white/5 text-gray-400 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4 text-sky-400" />
          <span>Planer Składu (5v5)</span>
        </button>
      </div>

      {mainTab === 'meta' && <Meta1v1Tierlist />}

      {mainTab === 'squad' && <SquadCompBuilder />}

      {mainTab === 'catalog' && (
        <>
          {/* Filters + Create */}
          <div className="panel mb-6">
            <div className="panel-body flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {ALBION_CATEGORIES.map((cat) => {
                  const IconComponent = cat.icon
                  const isActive = activeCategory === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`chip ${isActive ? 'active' : ''}`}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                      <span>{cat.name}</span>
                    </button>
                  )
                })}
              </div>
              <Link href="/buildy/create" className="btn btn-primary btn-sm">
                <Flame className="h-4 w-4" /> Stwórz Build
              </Link>
            </div>
          </div>

          {builds.length >= 2 && (
            comparatorReady ? (
              <BuildComparator builds={builds} initialOpen />
            ) : (
              <section className="panel mb-6" aria-labelledby="build-comparator-launcher-title">
                <div className="panel-body flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-amber-300">
                      <ArrowRightLeft className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[.2em] text-amber-300">Analityka na żądanie</p>
                      <h2 id="build-comparator-launcher-title" className="font-display text-xl font-black text-white">Porównaj dwa buildy</h2>
                      <p className="mt-1 text-[11px] text-[var(--text-muted)]">Moduł cen i statystyk uruchomi się dopiero, gdy będzie potrzebny.</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setComparatorReady(true)} className="btn btn-secondary btn-sm shrink-0">
                    <ArrowRightLeft className="h-4 w-4" /> Rozpocznij porównanie
                  </button>
                </div>
              </section>
            )
          )}

          {/* Builds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <p className="text-[var(--text-muted)] italic col-span-full text-center py-10">Pobieranie buildów...</p>
        ) : loadError ? (
          <div className="panel col-span-full text-center py-16" role="alert">
            <div className="panel-body space-y-4">
              <Anvil className="mx-auto h-9 w-9 text-rose-300" />
              <p className="text-lg font-bold text-white">Zbrojownia jest chwilowo niedostępna.</p>
              <p className="text-sm text-[var(--text-secondary)]">{loadError}</p>
              <button type="button" onClick={() => fetchBuilds()} className="btn btn-ghost btn-sm inline-flex">Spróbuj ponownie</button>
            </div>
          </div>
        ) : filteredBuilds.length === 0 ? (
          <div className="panel col-span-full text-center py-16">
            <div className="panel-body space-y-4">
              <Anvil className="mx-auto h-9 w-9 text-[var(--amber)]" />
              <p className="text-lg font-bold text-white">Zbrojownia jest pusta.</p>
              <Link href="/buildy/create" className="btn btn-ghost btn-sm inline-flex">
                <Plus className="w-4 h-4" /> Stwórz pierwszy build
              </Link>
            </div>
          </div>
        ) : (
          filteredBuilds.map((b) => {
            const parsed = buildFromDbRow(b)
            const hasExtended = b.build_data && Object.keys(b.build_data).length > 0
            const voteCount = Math.max(
              (b.build_votes || []).filter((vote) => vote.vote_type === 'up').length,
              b.votes_count || 0,
            )

            return (
              <article key={b.id} className="panel panel-interactive group relative flex flex-col justify-between overflow-hidden">
                <Link
                  href={`/buildy/${b.id}`}
                  aria-label={`Otwórz build: ${b.title}`}
                  className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--amber)]"
                />
                <div className="pointer-events-none relative z-0 p-5">
                  <div className="flex justify-between items-start mb-3">
                    <span className="badge badge-amber">{b.activity_type}</span>
                    <div className="flex items-center gap-2 pointer-events-auto">
                      <FavoriteButton id={b.id} title={b.title} type="build" />
                      <span className="text-[11px] text-[var(--text-muted)] font-mono">
                        {new Date(b.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-white leading-tight group-hover:text-[var(--amber)] transition">{b.title}</h3>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 text-[var(--text-secondary)]">{b.description || 'Brak opisu taktycznego.'}</p>

                  {hasExtended && parsed.tags?.activities?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {parsed.tags.activities.slice(0, 3).map(tag => (
                        <span key={tag} className="px-1.5 py-0.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-[9px] font-mono text-[var(--text-muted)]">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pointer-events-none relative z-0 mx-5 mb-3 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-3">
                  <div className="mb-2 text-center text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Ekwipunek</div>
                  <EquipmentPreview slots={parsed.slots} size="card" />
                </div>

                <div className="relative z-20 flex items-center justify-between px-5 pb-4 pt-3 border-t border-[var(--border)]">
                  <Link href={`/profil/${b.user_id || b.profiles?.username}`} className="flex items-center gap-2 hover:opacity-80 transition" title="Zobacz publiczny profil gracza">
                    <div className="w-6 h-6 rounded-md bg-[var(--bg-hover)] flex items-center justify-center text-[var(--amber)] text-[10px] font-bold">
                      {(b.profiles?.username || parsed.authorName || 'G').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[11px] text-[var(--text-secondary)] font-mono">{b.profiles?.username || parsed.authorName || 'Gracz'}</span>
                  </Link>

                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[var(--bg-elevated)] border border-[var(--border)] text-xs font-bold text-[var(--amber)]" title="Polubienia">
                      <ThumbsUp className="w-3 h-3" />
                      {voteCount}
                    </span>

                    {user && user.id === b.user_id && (
                      <button
                        onClick={() => handleDeleteBuild(b.id)}
                        aria-label={`Usuń build: ${b.title}`}
                        className="btn-icon text-[var(--rose)]"
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
      {!loading && !loadError && hasMore && (
        <div className="mt-5 flex justify-center">
          <button type="button" className="btn btn-secondary" disabled={loadingMore} onClick={() => fetchBuilds({ append: true })}>
            {loadingMore ? 'Wczytywanie…' : 'Wczytaj kolejne buildy'}
          </button>
        </div>
      )}
        </>
      )}
    </div>
  )
}
