import Link from 'next/link'
import { ArrowLeft, Lock, EyeOff } from 'lucide-react'

export default function Prywatnosc() {
  return (
    <main className="max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1 z-10 text-sm">
      <div>
        <Link href="/" className="inline-flex items-center gap-2 text-[#c59b27] hover:text-[#f0b73a] text-xs font-black tracking-widest uppercase transition group">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>Powrót do Centrum</span>
        </Link>
      </div>

      <header className="bg-[#120a0c]/90 border-2 border-[#c59b27]/80 p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Lock className="w-8 h-8 text-[#c59b27]" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-100 uppercase tracking-wider font-serif">
              Polityka Prywatności
            </h1>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">
              Jak chronimy dane graczy naszej społeczności
            </p>
          </div>
        </div>
      </header>

      <div className="bg-[#120a0c]/80 border border-[#3a1a1e] p-6 sm:p-8 shadow-xl backdrop-blur-md space-y-6 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-black text-[#c59b27] uppercase tracking-wider font-serif border-b border-[#3a1a1e] pb-2">
            1. Gromadzone Dane
          </h2>
          <p className="text-gray-300">
            W ramach logowania przez aplikację Discord zapisujemy jedynie podstawowe dane profilowe, takie jak identyfikator Discord (ID), nazwę użytkownika oraz awatar, wymagane do autoryzacji na stronie.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-[#c59b27] uppercase tracking-wider font-serif border-b border-[#3a1a1e] pb-2">
            2. Aplikacje do Gildii
          </h2>
          <p className="text-gray-300">
            Dane wprowadzane w formularzu rekrutacyjnym (Nick z gry, Fame, Rola) są przekazywane bezpośrednio na serwer Discord wybranej gildii za pośrednictwem bezpiecznego Webhooka oraz szyfrowanej bazy danych.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-[#c59b27] uppercase tracking-wider font-serif border-b border-[#3a1a1e] pb-2">
            3. Bezpieczeństwo i Pliki Cookie
          </h2>
          <p className="text-gray-300">
            Portal wykorzystuje wyłącznie niezbędne pliki cookie obsługujące sesję logowania użytkownika (Supabase Auth). Nie odprzedajemy ani nie udostępniamy Twoich danych podmiotom trzecim.
          </p>
        </section>

        <div className="p-4 bg-[#080506] border border-[#2b181a] rounded-sm flex items-center gap-3 text-xs text-gray-400">
          <EyeOff className="w-5 h-5 text-[#c59b27] shrink-0" />
          <p>
            Wszystkie połączenia z naszą witryną są szyfrowane protokołem SSL. Możesz w każdej chwili usunąć swoje konto i powiązane z nim wpisy.
          </p>
        </div>
      </div>
    </main>
  )
}