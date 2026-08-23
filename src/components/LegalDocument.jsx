import Link from 'next/link'
import { AlertTriangle, ExternalLink, ScrollText, ShieldCheck } from 'lucide-react'

export default function LegalDocument({
  type,
  eyebrow,
  title,
  highlightedTitle,
  description,
  icon,
  stats = [],
  sections = [],
  notice,
}) {
  const HeroIcon = icon || ScrollText

  return (
    <div className="page-content legal-page">
      <header className="subpage-header legal-hero">
        <div className="legal-hero-copy">
          <span className="legal-eyebrow"><HeroIcon aria-hidden="true" /> {eyebrow}</span>
          <h1>{title}<br /><em className={type === 'privacy' ? 'privacy' : ''}>{highlightedTitle}</em></h1>
          <p>{description}</p>
        </div>
        <dl className="legal-stats">
          {stats.map((stat) => <div key={stat.label}><dt>{stat.label}</dt><dd>{stat.value}</dd></div>)}
        </dl>
      </header>

      <div className="legal-layout">
        <aside className="legal-aside">
          <nav className="panel legal-toc" aria-label="Spis treści dokumentu">
            <p>Spis treści</p>
            {sections.map((section, index) => (
              <a key={section.id} href={`#${section.id}`}>
                <span>{String(index + 1).padStart(2, '0')}</span>{section.title}
              </a>
            ))}
          </nav>
          <div className="legal-advisory"><ShieldCheck aria-hidden="true" /><p>Dokument opisuje faktyczne funkcje portalu i jego integracje. Nie zastępuje indywidualnej porady prawnej.</p></div>
        </aside>

        <main className="legal-main">
          {notice && <div className="legal-notice"><AlertTriangle aria-hidden="true" /><p>{notice}</p></div>}
          {sections.map((section, index) => {
            const SectionIcon = section.icon || ScrollText
            return (
              <section key={section.id} id={section.id} className="panel legal-section">
                <header>
                  <span className="legal-section-icon"><SectionIcon aria-hidden="true" /></span>
                  <div><p>Rozdział {String(index + 1).padStart(2, '0')}</p><h2>{section.title}</h2></div>
                </header>
                <div className="legal-content">{section.content}</div>
              </section>
            )
          })}
        </main>
      </div>

      <footer className="legal-footer">
        <p>© {new Date().getFullYear()} Albion Online Polska Portal · nieoficjalny projekt społecznościowy. Albion Online jest własnością Sandbox Interactive GmbH.</p>
        <nav aria-label="Dokumenty i kontakt">
          <Link href="/regulamin">Regulamin</Link>
          <Link href="/prywatnosc">Prywatność</Link>
          <a href="https://github.com/Szewcuu/albion-social" target="_blank" rel="noreferrer">Kontakt przez GitHub <ExternalLink aria-hidden="true" /></a>
        </nav>
      </footer>
    </div>
  )
}
