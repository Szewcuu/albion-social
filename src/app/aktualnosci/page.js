import { BookOpenText, ExternalLink, Newspaper, ScrollText } from 'lucide-react'

import { getAlbionNews } from '@/lib/server/albionNews'
import { createPageMetadata } from '@/lib/seo'
import { EmptyState } from '@/components/ui/FeedbackState'

export const revalidate = 1800

export const metadata = createPageMetadata({
  title: 'Goniec Królewski | Wieści i patch notes Albion Online',
  description: 'Aktualności, komunikaty i patch notes ze świata Albion Online w jednym miejscu.',
  path: '/aktualnosci',
})

function NewsCard({ item }) {
  const patch = item.category === 'patch'
  return (
    <article className={`panel panel-interactive flex min-h-52 flex-col p-5 ${patch ? 'border-sky-300/20' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <span className={`badge ${patch ? 'badge-sky' : 'badge-amber'}`}>{patch ? 'Patch notes' : 'Wieści'}</span>
        <time className="font-mono text-[9px] text-[var(--text-muted)]" dateTime={item.publishedAt || undefined}>
          {item.publishedAt ? new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium' }).format(new Date(item.publishedAt)) : 'Niedawno'}
        </time>
      </div>
      <h2 className="font-display mt-4 text-xl font-black leading-tight text-white">{item.title}</h2>
      <p className="mt-3 line-clamp-3 text-xs leading-6 text-[var(--text-secondary)]">{item.summary}</p>
      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <span className="truncate text-[9px] font-bold uppercase tracking-[.12em] text-[var(--text-muted)]">{item.source}</span>
        <a href={item.link} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-2 text-[10px] font-black uppercase text-[var(--amber)] hover:text-amber-200">Czytaj <ExternalLink className="h-3.5 w-3.5" /></a>
      </div>
    </article>
  )
}

export default async function NewsPage() {
  const { items, partial } = await getAlbionNews()
  const patchNotes = items.filter((item) => item.category === 'patch')
  const news = items.filter((item) => item.category !== 'patch')

  return (
    <div className="page-content">
      <div className="subpage-header">
        <h1><Newspaper className="h-5 w-5 text-[var(--amber)]" /> Goniec Królewski</h1>
        <p>Oficjalne wieści, komunikaty i patch notes Albion Online — bez szukania po kilku stronach.</p>
      </div>

      {partial && <p className="mb-5 rounded-xl border border-amber-300/20 bg-amber-300/7 px-4 py-3 text-xs text-amber-100">Jeden z gońców chwilowo nie dotarł. Pokazujemy wszystkie dostępne wiadomości.</p>}

      {!items.length ? (
        <EmptyState icon={BookOpenText} title="Kurierzy są jeszcze w drodze" description="Odśwież stronę za chwilę. Reszta portalu działa normalnie." className="panel" />
      ) : (
        <div className="space-y-8">
          {patchNotes.length > 0 && <section><div className="mb-4 flex items-center gap-3"><ScrollText className="h-5 w-5 text-sky-300" /><h2 className="font-display text-2xl font-black text-white">Patch notes i zmiany gry</h2><div className="h-px flex-1 bg-white/8" /></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{patchNotes.map((item) => <NewsCard key={item.id} item={item} />)}</div></section>}
          {news.length > 0 && <section><div className="mb-4 flex items-center gap-3"><Newspaper className="h-5 w-5 text-amber-300" /><h2 className="font-display text-2xl font-black text-white">Najnowsze wieści</h2><div className="h-px flex-1 bg-white/8" /></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{news.map((item) => <NewsCard key={item.id} item={item} />)}</div></section>}
        </div>
      )}
    </div>
  )
}
