'use client'
import { supabase } from '@/lib/supabase'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Shield, Swords, Plus, ThumbsUp, Trash2, Anvil, Flame, Star } from 'lucide-react'
import { EquipmentPreview } from '@/components/builds/EquipmentGrid'
import { buildFromDbRow } from '@/lib/buildSlots'
import BuildComparator from '@/components/builds/BuildComparator'
import FavoriteButton from '@/components/ui/FavoriteButton'
import SquadCompBuilder from '@/components/builds/SquadCompBuilder'

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
  const [loadError, setLoadError] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')

  const fetchBuilds = useCallback(async () => {
    setLoadError('')
    try {
      const { data, error } = await supabase
        .from('builds')
        .select('*, profiles!builds_user_id_fkey(username, avatar_url), build_votes(id, vote_type)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setBuilds(data || [])
    } catch (err) {
      console.error('Błąd pobierania buildów:', err)
      setBuilds([])
      setLoadError('Nie udało się wczytać Zbrojowni. Odśwież stronę lub spróbuj ponownie za chwilę.')
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

  const filteredBuilds = activeCategory === 'all'
    ? builds
    : builds.filter(b => b.activity_type?.toLowerCase().includes(activeCategory))

  const totalVotes = builds.reduce((sum, build) => sum + (build.build_votes || []).filter((vote) => vote.vote_type === 'up').length, 0)

  return (
    <div className="page-content">
      {/* Header */}
      <div className="subpage-header">
        <h1><Anvil className="w-5 h-5 text-[var(--amber)]" /> Kuźnia Buildów</h1>
        <p>Przeglądaj sprawdzone kompozycje graczy, odkrywaj synergie ekwipunku i publikuj własne doktryny.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="stat-card">
          <span className="stat-card-label">Zapisane buildy</span>
          <span className="stat-card-value amber">{builds.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Widoczne</span>
          <span className="stat-card-value">{filteredBuilds.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Polubienia</span>
          <span className="stat-card-value emerald">{totalVotes}</span>
        </div>
      </div>

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

      <SquadCompBuilder />

      <BuildComparator builds={builds} />

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
              <button type="button" onClick={fetchBuilds} className="btn btn-ghost btn-sm inline-flex">Spróbuj ponownie</button>
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
    </div>
  )
}
