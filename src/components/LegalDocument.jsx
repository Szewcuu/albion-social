import Link from 'next/link'
import { AlertTriangle, ExternalLink, ScrollText, ShieldCheck } from 'lucide-react'
import PortalSubpageHeader from '@/components/PortalSubpageHeader'

export default function LegalDocument({ type, eyebrow, title, highlightedTitle, description, icon, stats, sections, notice }) {
  return (
    <main className="aopp-shell min-h-screen text-[#d5d0c6]">
      <div className="aopp-world-bg" />
      <div className="aopp-grain" />
      <div className="relative z-10 mx-auto w-full max-w-[1180px] space-y-7 p-4 sm:p-6 lg:p-8">
        <PortalSubpageHeader
          eyebrow={eyebrow}
          title={<>{title}<br /><span className={type === 'privacy' ? 'text-emerald-300' : 'text-[#e5bb55]'}>{highlightedTitle}</span></>}
          description={description}
          icon={icon}
          tone={type === 'privacy' ? 'sky' : 'gold'}
          stats={stats}
          imagePosition="72% center"
        />

        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
            <nav className="aopp-panel rounded-[24px] p-4" aria-label="Spis treści dokumentu">
              <p className="mb-3 px-2 text-[9px] font-black uppercase tracking-[.2em] text-[#e5bb55]">Spis treści</p>
              {sections.map((section, index) => (
                <a key={section.id} href={`#${section.id}`} className="flex min-h-11 items-center gap-2 rounded-xl px-2 py-2.5 text-[10px] leading-4 text-[#b8b1a7] transition hover:bg-white/5 hover:text-[#fff8e8]"><span className="font-mono text-[#e5bb55]">{String(index + 1).padStart(2, '0')}</span><span>{section.title}</span></a>
              ))}
            </nav>

            <div className="rounded-2xl border border-sky-400/18 bg-sky-400/6 p-4 text-[10px] leading-5 text-sky-100/75"><ShieldCheck className="mb-2 h-4 w-4 text-sky-300" /><p>Dokument opisuje faktyczne funkcje portalu i jego główne integracje. Nie zastępuje indywidualnej porady prawnej.</p></div>
          </aside>

          <div className="space-y-4">
            {notice && <div className="flex items-start gap-3 rounded-2xl border border-amber-400/22 bg-amber-400/7 p-4 text-[10px] leading-5 text-amber-100/80"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /><p>{notice}</p></div>}

            {sections.map((section, index) => {
              const Icon = section.icon || ScrollText
              return (
                <section key={section.id} id={section.id} className="aopp-panel scroll-mt-6 rounded-[24px] p-5 sm:p-7">
                  <div className="flex items-start gap-4 border-b border-white/8 pb-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#e5bb55]/18 bg-[#e5bb55]/7 text-[#e5bb55]"><Icon className="h-4 w-4" /></span><div><p className="text-[8px] font-black uppercase tracking-[.18em] text-[#918b82]">Rozdział {String(index + 1).padStart(2, '0')}</p><h2 className="font-display mt-1 text-xl font-black text-[#fff8e8]">{section.title}</h2></div></div>
                  <div className="mt-5 space-y-3 text-xs leading-6 text-[#b8b1a7]">{section.content}</div>
                </section>
              )
            })}
          </div>
        </div>

        <footer className="flex flex-col gap-3 border-t border-white/8 py-6 text-[10px] text-[#9b958b] sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} Albion Online Polska Portal · dokument informacyjny AOPP</p><div className="flex flex-wrap gap-x-4 gap-y-1"><Link href="/regulamin" className="inline-flex min-h-6 items-center hover:text-[#e5bb55]">Regulamin</Link><Link href="/prywatnosc" className="inline-flex min-h-6 items-center hover:text-[#e5bb55]">Prywatność</Link><a href="https://github.com/Szewcuu/albion-social" target="_blank" rel="noreferrer" className="inline-flex min-h-6 items-center gap-1 hover:text-sky-300">Kontakt przez GitHub <ExternalLink className="h-3 w-3" /></a></div></footer>
      </div>
    </main>
  )
}
