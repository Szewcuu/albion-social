import Link from 'next/link'
import { ArrowLeft, ScrollText, ShieldAlert } from 'lucide-react'

export default function Regulamin() {
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
          <ScrollText className="w-8 h-8 text-[#c59b27]" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-100 uppercase tracking-wider font-serif">
              Regulamin Portalu
            </h1>
            <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">
              Zasady i dekrety obowiązujące w naszej społeczności
            </p>
          </div>
        </div>
      </header>

      <div className="bg-[#120a0c]/80 border border-[#3a1a1e] p-6 sm:p-8 shadow-xl backdrop-blur-md space-y-6 leading-relaxed">
        <section className="space-y-2">
          <h2 className="text-base font-black text-[#c59b27] uppercase tracking-wider font-serif border-b border-[#3a1a1e] pb-2">
            § 1. Postanowienia Ogólne
          </h2>
          <p className="text-gray-300">
            1. Portal Albion Online Polska jest niezależnym serwisem społecznościowym stworzonym dla graczy.
          </p>
          <p className="text-gray-300">
            2. Korzystanie z portalu, w tym rejestracja gildii oraz dodawanie ofert na rynku, jest całkowicie darmowe.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-[#c59b27] uppercase tracking-wider font-serif border-b border-[#3a1a1e] pb-2">
            § 2. Zasady Zachowania i Czat
          </h2>
          <p className="text-gray-300">
            1. Zabrania się publikowania treści obraźliwych, rasistowskich, zawierających mowę nienawiści oraz spamu.
          </p>
          <p className="text-gray-300">
            2. Handel na czacie publicznym i rynku powinien dotyczyć wyłącznie przedmiotów z gry Albion Online. Surowo zakazuje się handlu za realne pieniądze (RMT).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-black text-[#c59b27] uppercase tracking-wider font-serif border-b border-[#3a1a1e] pb-2">
            § 3. Rejestr Gildii i Aplikacje
          </h2>
          <p className="text-gray-300">
            1. Liderzy gildii ponoszą pełną odpowiedzialność za treść opublikowanych manifestów oraz poprawność linków Webhook.
          </p>
          <p className="text-gray-300">
            2. Ogłoszenia wprowadzające graczy w błąd lub zawierające wulgarne nazwy będą usuwane przez administrację.
          </p>
        </section>

        <div className="p-4 bg-[#2b0d10]/40 border border-red-900/50 rounded-sm flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-xs text-red-200">
            Nieprzestrzeganie powyższych zasad może skutkować zablokowaniem konta na portalu oraz usunięciem wpisów z rejestru gildii.
          </p>
        </div>
      </div>
    </main>
  )
}