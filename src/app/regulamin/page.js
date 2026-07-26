'use client'
import Link from 'next/link'
import { ArrowLeft, ShieldAlert } from 'lucide-react'

export default function Regulamin() {
  return (
    <div className="min-h-screen flex flex-col justify-between antialiased font-sans select-none relative bg-[#080506] text-[#bcbbc2]">
      <div className="fixed inset-0 bg-gradient-to-b from-[#1b0a0d] via-[#0d0708] to-[#050304] z-0 pointer-events-none"></div>

      <main className="max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1 z-10 text-sm">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 text-[#c59b27] hover:text-[#f0b73a] text-xs font-black tracking-widest uppercase transition group">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Powrót do Centrum Caerleon</span>
          </Link>
        </div>

        <header className="bg-[#120a0c] border-2 border-[#c59b27]/80 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-[#c59b27]" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-100 uppercase tracking-wider font-serif">
                Regulamin Portalowy Caerleon
              </h1>
              <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">
                Zasady panujące w polskim węźle społecznościowym Albion Online
              </p>
            </div>
          </div>
        </header>

        <div className="bg-[#120a0c] border border-[#3a1a1e] p-6 sm:p-8 shadow-xl space-y-6 text-gray-300 leading-relaxed text-xs sm:text-sm">
          <section className="space-y-2 border-b border-[#3a1a1e] pb-4">
            <h2 className="text-base font-black text-[#c59b27] uppercase font-serif">§1. Postanowienia Ogólne</h2>
            <p>1. Korzystanie z serwisu Albion Online Polska Portal (AOPP) jest równoznaczne z akceptacją niniejszego regulaminu.</p>
            <p>2. Portal ma charakter społecznościowy i nie jest powiązany bezpośrednio z firmą Sandbox Interactive GmbH.</p>
          </section>

          <section className="space-y-2 border-b border-[#3a1a1e] pb-4">
            <h2 className="text-base font-black text-[#c59b27] uppercase font-serif">§2. Zasady Społeczności i Czatu</h2>
            <p>1. Wszyscy użytkownicy zobowiązani są do zachowania kultury wypowiedzi na czacie miejskim oraz w ogłoszeniach.</p>
            <p>2. Zabrania się spamowania, reklamowania usług RMT (Real Money Trading) oraz oszustw handlowych.</p>
            <p>3. Inkwizytorzy (Administratori) mają prawo do usuwania treści naruszających dobre obyczaje oraz blokowania dostępu do platformy.</p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-black text-[#c59b27] uppercase font-serif">§3. Odpowiedzialność</h2>
            <p>1. Administracja nie ponosi odpowiedzialności za transakcje handlowe zawierane między graczami w grze na podstawie ogłoszeń z rynku.</p>
          </section>
        </div>
      </main>

      <footer className="w-full bg-[#050304] border-t border-[#3a1a1e] py-6 text-center text-xs text-gray-500 mt-8 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p>© {new Date().getFullYear()} <span className="text-[#c59b27] font-bold">Albion Online Polska - Portal</span>.</p>
          <div className="flex gap-4 text-xs font-mono text-gray-400">
            <Link href="/regulamin" className="hover:text-[#c59b27] transition">Regulamin</Link>
            <span>•</span>
            <Link href="/prywatnosc" className="hover:text-[#c59b27] transition">Polityka Prywatności</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}