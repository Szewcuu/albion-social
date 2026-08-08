import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Coins,
  Package,
  Play,
  ShieldAlert,
  Sparkles,
  UserRound,
  Zap,
} from 'lucide-react'

import BuildDetailEquipment from '@/components/builds/BuildDetailEquipment'
import BuildStatsCalculator from '@/components/builds/BuildStatsCalculator'
import BuildComments from '@/components/builds/BuildComments'
import BuildSocialActions from '@/components/builds/BuildSocialActions'
import { EmptyState } from '@/components/ui/FeedbackState'
import { buildFromDbRow } from '@/lib/buildSlots'
import { getPublicBuild } from '@/lib/server/builds'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://albion-social.vercel.app'

const TAG_GROUPS = [
  ['activities', 'Aktywność'],
  ['roles', 'Rola'],
  ['locations', 'Lokacja'],
  ['zones', 'Strefa'],
  ['sizes', 'Skład'],
]

function safeYoutubeUrl(value) {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase().replace(/^www\./, '')
    return ['youtube.com', 'youtu.be'].includes(host) ? url.toString() : null
  } catch {
    return null
  }
}

function DetailList({ title, icon: Icon, items, tone }) {
  if (!items?.filter(Boolean).length) return null
  return (
    <section className="panel p-5 sm:p-6">
      <h2 className={`flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] ${tone}`}>
        <Icon className="h-4 w-4" aria-hidden="true" /> {title}
      </h2>
      <ul className="mt-4 space-y-2.5">
        {items.filter(Boolean).map((item, index) => (
          <li key={`${item}-${index}`} className="flex gap-3 text-sm leading-6 text-[#c5bfb5]">
            <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rotate-45 bg-current opacity-70" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export async function generateMetadata({ params }) {
  const { id } = await params
  const row = await getPublicBuild(id)

  if (!row) {
    return { title: 'Nie znaleziono buildu | Albion Online Polska' }
  }

  const description = (row.description || `Build ${row.title} przygotowany przez społeczność Albion Online Polska.`).slice(0, 155)
  const canonical = `${APP_URL}/buildy/${row.id}`

  return {
    title: `${row.title} | Build Albion Online`,
    description,
    alternates: { canonical },
    openGraph: {
      title: row.title,
      description,
      url: canonical,
      type: 'article',
      locale: 'pl_PL',
      images: [{ url: `${APP_URL}/albion-social-hero.webp`, width: 1536, height: 1024, alt: row.title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: row.title,
      description,
      images: [`${APP_URL}/albion-social-hero.webp`],
    },
  }
}

export default async function BuildDetailPage({ params }) {
  const { id } = await params
  const row = await getPublicBuild(id)
  if (!row) notFound()

  const build = buildFromDbRow(row)
  const author = row.profiles?.username || build.authorName || 'Anonimowy kowal'
  const votes = (row.build_votes || []).filter((vote) => vote.vote_type === 'up').length
  const videos = (build.youtubeVideos || []).map(safeYoutubeUrl).filter(Boolean)
  const publishedAt = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'long' }).format(new Date(row.created_at))

  return (
    <div className="page-content">
<div className="relative z-10 mx-auto flex w-full max-w-[1320px] flex-1 flex-col gap-5 p-4 sm:p-6 lg:p-8">
        <Link href="/buildy" className="group inline-flex min-h-11 w-fit items-center gap-2 rounded-lg pr-2 text-[10px] font-black uppercase tracking-[.2em] text-[var(--amber)] transition hover:text-[#f0cf77]">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
          Powrót do zbrojowni
        </Link>

        <header className="relative overflow-hidden rounded-[28px] border border-orange-300/20 bg-[radial-gradient(circle_at_82%_22%,rgba(198,79,28,.22),transparent_34%),linear-gradient(135deg,rgba(24,9,10,.98),rgba(5,3,4,.96))] p-6 shadow-[0_28px_90px_rgba(0,0,0,.48)] sm:p-9 lg:p-12">
          <div className="absolute -right-12 -top-16 h-64 w-64 rounded-full border border-orange-200/10 shadow-[0_0_90px_rgba(226,98,31,.14)]" aria-hidden="true" />
          <div className="relative max-w-4xl">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-orange-300/35 bg-orange-300/10 px-3 py-1 font-mono text-[9px] font-black uppercase tracking-[.14em] text-orange-100">{row.activity_type || 'Build'}</span>
              {build.budget && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/20 bg-amber-300/7 px-3 py-1 font-mono text-[9px] font-bold uppercase text-amber-100">
                  <Coins className="h-3 w-3" aria-hidden="true" /> {build.budget}
                </span>
              )}
            </div>

            <p className="mt-7 text-[10px] font-black uppercase tracking-[.24em] text-orange-200/60">Publiczna doktryna bojowa</p>
            <h1 className="font-display mt-2 max-w-3xl text-4xl font-black leading-[1.02] tracking-[-.025em] text-[#fffaf0] sm:text-5xl lg:text-6xl">{row.title}</h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-[#c9c3b8] sm:text-base">{row.description || 'Autor nie dodał jeszcze opisu taktycznego dla tego zestawu.'}</p>

            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/8 pt-5 text-[10px] uppercase tracking-[.1em] text-[#aaa49a]">
              <span className="inline-flex items-center gap-2"><UserRound className="h-4 w-4 text-orange-200" aria-hidden="true" /> {author}</span>
              <span className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4 text-orange-200" aria-hidden="true" /> {publishedAt}</span>
            </div>

            <div className="mt-6">
              <BuildSocialActions buildId={row.id} initialVotes={votes} />
            </div>
          </div>
        </header>

        <BuildDetailEquipment slots={build.slots} />

        <BuildStatsCalculator
          slots={build.slots}
          quality={build.quality || 1}
          specBonus={build.specBonus || 0}
        />

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            {(build.strengths?.length > 0 || build.weaknesses?.length > 0) && (
              <div className="grid gap-5 md:grid-cols-2">
                <DetailList title="Mocne strony" icon={CheckCircle2} items={build.strengths} tone="text-emerald-300" />
                <DetailList title="Ryzyka i słabości" icon={ShieldAlert} items={build.weaknesses} tone="text-rose-300" />
              </div>
            )}

            {build.skillCombos?.length > 0 && (
              <section className="panel p-5 sm:p-6" aria-labelledby="combos-title">
                <h2 id="combos-title" className="flex items-center gap-2 text-2xl font-black text-[#fff8e8]"><Zap className="h-5 w-5 text-amber-300" aria-hidden="true" /> Sekwencje umiejętności</h2>
                <div className="mt-5 space-y-3">
                  {build.skillCombos.map((combo, index) => (
                    <div key={`${combo.name}-${index}`} className="rounded-2xl border border-white/8 bg-black/20 p-4">
                      <p className="text-xs font-black uppercase tracking-[.12em] text-orange-100">{combo.name || `Combo ${index + 1}`}</p>
                      <p className="mt-2 font-mono text-xs leading-6 text-[#aaa49a]">{combo.description || 'Brak opisanej sekwencji.'}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {build.inventory?.length > 0 && (
              <section className="panel p-5 sm:p-6" aria-labelledby="inventory-title">
                <h2 id="inventory-title" className="flex items-center gap-2 text-2xl font-black text-[#fff8e8]"><Package className="h-5 w-5 text-orange-200" aria-hidden="true" /> Ekwipunek zapasowy</h2>
                <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                  {build.inventory.filter((item) => item.id).map((item, index) => (
                    <li key={`${item.id}-${index}`} className="flex items-center justify-between gap-4 rounded-xl border border-white/8 bg-black/20 px-4 py-3 font-mono text-[10px] text-[#c5bfb5]">
                      <span className="min-w-0 truncate">{item.id}</span><span className="shrink-0 text-orange-100">×{item.amount || 1}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <BuildComments buildId={row.id} />
          </div>

          <aside className="space-y-5">
            <section className="panel p-5" aria-labelledby="doctrine-title">
              <h2 id="doctrine-title" className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-orange-100"><BookOpen className="h-4 w-4" aria-hidden="true" /> Sygnatura doktryny</h2>
              <div className="mt-4 space-y-4">
                {TAG_GROUPS.map(([key, label]) => build.tags?.[key]?.length > 0 && (
                  <div key={key}>
                    <p className="mb-2 text-[9px] font-black uppercase tracking-[.15em] text-[var(--text-secondary)]">{label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {build.tags[key].map((tag) => (
                        <span key={tag} className="rounded-lg border border-orange-200/12 bg-orange-200/[.055] px-2.5 py-1 text-[10px] text-[#c9c3b8]">{tag}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel p-5" aria-labelledby="videos-title">
              <h2 id="videos-title" className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-orange-100"><Play className="h-4 w-4" aria-hidden="true" /> Materiały bojowe</h2>
              {videos.length > 0 ? (
                <div className="mt-4 space-y-2">
                  {videos.map((url, index) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer" className="group flex min-h-11 items-center justify-between gap-3 rounded-xl border border-white/8 bg-black/20 px-3 py-2.5 text-xs text-[#c5bfb5] transition hover:border-orange-300/25 hover:text-orange-100">
                      <span>Film taktyczny {index + 1}</span><Play className="h-4 w-4 transition group-hover:translate-x-0.5" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              ) : (
                <EmptyState icon={Play} title="Brak filmów" description="Autor nie dołączył materiału z rozgrywki." compact className="mt-4" />
              )}
            </section>

            <Link href="/buildy/create" className="btn btn-primary flex min-h-12 items-center justify-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-[.12em]">
              <Sparkles className="h-4 w-4" aria-hidden="true" /> Wykuj własny build
            </Link>
          </aside>
        </div>

      </div>

</div>
  )
}
