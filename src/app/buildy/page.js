'use client'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Shield, Swords, Plus, ThumbsUp, Trash2, Hammer as Anvil, Flame, ArrowRightLeft, Search, ArrowUpDown, X, LayoutGrid, Rows3 } from 'lucide-react'
import EquipmentPreview from '@/components/builds/EquipmentPreview'
import BuildFavoriteButton from '@/components/builds/BuildFavoriteButton'
import { buildFromDbRow } from '@/lib/buildSlots'
import { getBuildLabel } from '@/lib/buildPresentation'
import { usePortalSession } from '@/contexts/PortalSessionContext'
import { authenticatedFetch } from '@/lib/authenticatedFetch'
import { useConfirmDialog } from '@/components/ui/ConfirmDialog'
import CustomSelect from '@/components/ui/CustomSelect'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/FeedbackState'

const BuildComparator = dynamic(() => import('@/components/builds/BuildComparator'), {
  loading: () => <LoadingState label="Ładowanie porównywarki buildów…" compact className="panel mb-6" />,
})
const SquadCompBuilder = dynamic(() => import('@/components/builds/SquadCompBuilder'), {
  loading: () => <LoadingState label="Ładowanie planera składu…" className="panel" />,
})
const Meta1v1Tierlist = dynamic(() => import('@/components/builds/Meta1v1Tierlist'), {
  loading: () => <LoadingState label="Ładowanie tierlisty Meta 1v1…" className="panel" />,
})

const ALBION_CATEGORIES = [
  { id: 'all', name: 'Wszystkie Buildy', icon: Swords },
  { id: 'pvp', name: 'PvP & ZvZ', icon: Shield },
  { id: 'pve', name: 'PvE & Statyki', icon: Swords },
  { id: 'ganking', name: 'Ganking & Mists', icon: Plus },
]
const BUILDS_PAGE_SIZE = 12
const BUILD_SORT_OPTIONS = ['latest', 'popular', 'likes']

function BuildSearchInput({ value, onSearch }) {
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    const nextSearch = draft.trim()
    if (nextSearch === value) return undefined
    const timer = window.setTimeout(() => onSearch(nextSearch), 300)
    return () => window.clearTimeout(timer)
  }, [draft, onSearch, value])

  const clearSearch = () => {
    setDraft('')
    onSearch('')
  }

  return (
    <label className="relative min-w-0 flex-1">
      <span className="sr-only">Szukaj buildów</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--gold-dim)]" />
      <input value={draft} onChange={(event) => setDraft(event.target.value)} className="input w-full pl-10 pr-10" placeholder="Szukaj po nazwie, przedmiocie, autorze lub tagu…" />
      {draft && <button type="button" onClick={clearSearch} aria-label="Wyczyść wyszukiwanie" className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded text-[var(--text-muted)] hover:text-white"><X className="h-4 w-4" /></button>}
    </label>
  )
}

function BuildyPageContent() {
  const { user } = usePortalSession()
  const { requestConfirmation, confirmationDialog } = useConfirmDialog()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentQuery = searchParams.toString()
  const categoryParam = searchParams.get('category')
  const activeCategory = ALBION_CATEGORIES.some((category) => category.id === categoryParam) ? categoryParam : 'all'
  const sortParam = searchParams.get('sort')
  const sort = BUILD_SORT_OPTIONS.includes(sortParam) ? sortParam : 'latest'
  const view = searchParams.get('view') === 'list' ? 'list' : 'grid'
  const search = (searchParams.get('q') || '').slice(0, 80)
  const [builds, setBuilds] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [totalBuilds, setTotalBuilds] = useState(0)
  const [searchTruncated, setSearchTruncated] = useState(false)
  const [comparatorReady, setComparatorReady] = useState(false)
  const cursorRef = useRef(null)
  const offsetRef = useRef(0)

  const updateFilters = useCallback((changes) => {
    const params = new URLSearchParams(currentQuery)
    Object.entries(changes).forEach(([key, value]) => {
      const isDefault = (key === 'category' && value === 'all') || (key === 'sort' && value === 'latest') || (key === 'view' && value === 'grid')
      if (!value || isDefault) params.delete(key)
      else params.set(key, value)
    })
    params.delete('cursor')
    params.delete('offset')
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [currentQuery, pathname, router])

  const handleSearch = useCallback((value) => updateFilters({ q: value }), [updateFilters])

  const fetchBuilds = useCallback(async ({ append = false } = {}) => {
    if (append) setLoadingMore(true)
    else setLoading(true)
    setLoadError('')
    try {
      const params = new URLSearchParams({ category: activeCategory, limit: String(BUILDS_PAGE_SIZE), sort })
      if (search) params.set('search', search)
      if (append && (search || sort !== 'latest')) params.set('offset', String(offsetRef.current))
      else if (append && cursorRef.current) params.set('cursor', cursorRef.current)
      const response = await authenticatedFetch(`/api/builds?${params}`, { cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Nie udało się pobrać buildów.')

      const page = result.builds || []
      cursorRef.current = result.nextCursor || null
      offsetRef.current = result.nextOffset || 0
      setHasMore(result.hasMore === true)
      if (!append) setTotalBuilds(result.total || 0)
      if (!append) setSearchTruncated(result.searchTruncated === true)
      setBuilds((current) => append ? [...current, ...page.filter((row) => !current.some((item) => item.id === row.id))] : page)
    } catch {
      if (!append) setBuilds([])
      setLoadError('Nie udało się wczytać Zbrojowni. Odśwież stronę lub spróbuj ponownie za chwilę.')
    } finally {
      if (append) setLoadingMore(false)
      else setLoading(false)
    }
  }, [activeCategory, search, sort])

  useEffect(() => {
    void Promise.resolve().then(fetchBuilds)
  }, [fetchBuilds])

  const handleDeleteBuild = async (id) => {
    const accepted = await requestConfirmation({
      title: 'Usunąć build?',
      description: 'Build zniknie ze Zbrojowni. Tej operacji nie można cofnąć.',
      confirmLabel: 'Usuń build',
    })
    if (!accepted) return
    try {
      const response = await authenticatedFetch('/api/builds', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'Nie udało się usunąć buildu.')
      await fetchBuilds()
    } catch (error) {
      setLoadError(error.message || 'Nie udało się usunąć buildu.')
    }
  }

  const filteredBuilds = builds

  const totalVotes = builds.reduce((sum, build) => sum + (build.build_votes || []).filter((vote) => vote.vote_type === 'up').length, 0)

  const [mainTab, setMainTab] = useState('catalog') // 'catalog' | 'meta' | 'squad'

  return (
    <div className="page-content">
      {confirmationDialog}
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
          <span>Planer Składu</span>
        </button>
      </div>

      {mainTab === 'meta' && <Meta1v1Tierlist />}

      {mainTab === 'squad' && <SquadCompBuilder />}

      {mainTab === 'catalog' && (
        <>
          {/* Filters + Create */}
          <div className="panel mb-6">
            <div className="panel-body grid gap-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                <BuildSearchInput key={search} value={search} onSearch={handleSearch} />
                <div className="flex min-w-[220px] items-center gap-2">
                  <ArrowUpDown className="h-4 w-4 shrink-0 text-[var(--gold-dim)]" />
                  <CustomSelect value={sort} onChange={(value) => updateFilters({ sort: value })} label="Sortuj buildy" className="flex-1" options={[{ value: 'latest', label: 'Najnowsze' }, { value: 'popular', label: 'Popularne teraz' }, { value: 'likes', label: 'Najwięcej polubień' }]} />
                </div>
                <div className="flex shrink-0 rounded-lg border border-[var(--border)] bg-black/20 p-1" role="group" aria-label="Sposób wyświetlania buildów">
                  <button type="button" onClick={() => updateFilters({ view: 'grid' })} aria-label="Widok kafelków" aria-pressed={view === 'grid'} className={`grid h-8 w-9 place-items-center rounded-md transition ${view === 'grid' ? 'bg-[var(--amber)] text-black shadow-sm' : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-white'}`}>
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => updateFilters({ view: 'list' })} aria-label="Widok listy" aria-pressed={view === 'list'} className={`grid h-8 w-9 place-items-center rounded-md transition ${view === 'list' ? 'bg-[var(--amber)] text-black shadow-sm' : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-white'}`}>
                    <Rows3 className="h-4 w-4" />
                  </button>
                </div>
                <Link href="/buildy/create" className="btn btn-primary btn-sm shrink-0"><Flame className="h-4 w-4" /> Stwórz Build</Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {ALBION_CATEGORIES.map((cat) => {
                  const IconComponent = cat.icon
                  const isActive = activeCategory === cat.id
                  return (
                    <button
                      key={cat.id}
                      onClick={() => updateFilters({ category: cat.id })}
                      aria-pressed={isActive}
                      className={`chip ${isActive ? 'active' : ''}`}
                    >
                      <IconComponent className="w-3.5 h-3.5" />
                      <span>{cat.name}</span>
                    </button>
                  )
                })}
              </div>
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

          {searchTruncated && <p role="status" className="mb-4 text-xs text-amber-200">Katalog przekracza 500 buildów. Wyniki obejmują najnowsze 500 wpisów — zawęź wyszukiwanie, aby szybciej znaleźć zestaw.</p>}

          {/* Build results */}
      <div data-view={view} className={view === 'list' ? 'grid grid-cols-1 gap-2' : 'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4'}>
        {loading ? (
          <LoadingState label="Pobieranie buildów…" description="Przeszukujemy publiczną Zbrojownię." className="panel col-span-full" />
        ) : loadError ? (
          <ErrorState icon={Anvil} title="Zbrojownia jest chwilowo niedostępna" description={loadError} onRetry={() => fetchBuilds()} className="panel col-span-full" />
        ) : filteredBuilds.length === 0 ? (
          <EmptyState icon={Anvil} title={search ? 'Nie znaleziono pasujących buildów' : 'Zbrojownia jest pusta'} description={search ? 'Zmień wyszukiwaną frazę lub aktywne filtry.' : 'Opublikuj pierwszy zestaw i rozpocznij katalog doktryn.'} action={<Link href="/buildy/create" className="btn btn-ghost btn-sm inline-flex"><Plus className="h-4 w-4" /> Stwórz build</Link>} className="panel col-span-full" />
        ) : (
          filteredBuilds.map((b) => {
            const parsed = buildFromDbRow(b)
            const hasExtended = b.build_data && Object.keys(b.build_data).length > 0
            const voteCount = Math.max(
              (b.build_votes || []).filter((vote) => vote.vote_type === 'up').length,
              b.votes_count || 0,
            )

            return (
              <article key={b.id} className={`panel panel-interactive group relative overflow-hidden ${view === 'list' ? 'sm:grid sm:grid-cols-[minmax(0,1fr)_170px] lg:grid-cols-[minmax(0,1fr)_180px_250px] lg:items-stretch' : 'flex flex-col justify-between'}`}>
                <Link
                  href={`/buildy/${b.id}`}
                  aria-label={`Otwórz build: ${b.title}`}
                  className="absolute inset-0 z-10 rounded-[inherit] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-[var(--amber)]"
                />
                <div className={`pointer-events-none relative z-0 p-4 ${view === 'list' ? 'self-center' : 'pb-3'}`}>
                  <div className="flex justify-between items-start mb-3">
                    <span className="badge badge-amber">{getBuildLabel(b.activity_type)}</span>
                    <div className="flex items-center gap-2 pointer-events-auto">
                      <BuildFavoriteButton buildId={b.id} title={b.title} initialFavorite={b.is_favorite === true} />
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
                        <span key={tag} className="px-1.5 py-0.5 bg-[var(--bg-elevated)] border border-[var(--border)] rounded text-[9px] font-mono text-[var(--text-muted)]">{getBuildLabel(tag)}</span>
                      ))}
                    </div>
                  )}
                </div>

                <div className={`pointer-events-none relative z-0 rounded-lg border border-[var(--border)] bg-[var(--bg-elevated)] p-2 ${view === 'list' ? 'mx-4 mb-3 self-center sm:mx-3 sm:my-3' : 'mx-4 mb-3'}`}>
                  <div className="mb-1.5 text-center text-[8px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Ekwipunek</div>
                  <EquipmentPreview slots={parsed.slots} itemNames={parsed.itemNames} size={view === 'list' ? 'list' : 'catalog'} />
                </div>

                <div className={`relative z-20 flex items-center justify-between border-[var(--border)] px-4 pb-3 pt-3 ${view === 'list' ? 'border-t sm:col-span-2 lg:col-span-1 lg:border-l lg:border-t-0 lg:self-stretch' : 'border-t'}`}>
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

export default function BuildyPage() {
  return (
    <Suspense fallback={<div className="page-content"><LoadingState label="Ładowanie Kuźni Buildów…" className="panel" /></div>}>
      <BuildyPageContent />
    </Suspense>
  )
}
