'use client'
import Link from 'next/link'

export default function Regulamin() {
  return (
    <main className="min-h-screen bg-[#0f0a0a] text-[#bcbbc2] p-6 max-w-4xl mx-auto space-y-6 font-sans">
      <header className="border-b border-[#c59b27] pb-4">
        <h1 className="text-3xl font-black text-[#c59b27] font-serif">REGULAMIN SERWISU</h1>
        <p className="text-xs text-gray-400 mt-1">Ostatnia aktualizacja: Lipiec 2026 r.</p>
      </header>

      <section className="space-y-4 text-sm leading-relaxed">
        <h2 className="text-lg font-bold text-gray-100">§ 1. Postanowienia Ogólne</h2>
        <p>1. Serwis Albion Online Polska Portal jest niekomercyjnym projektem społecznościowym tworzonym niezależnie przez graczy dla graczy gry Albion Online.</p>
        <p>2. Serwis nie jest powiązany, sponsorowany ani popierany przez studio Sandbox Interactive GmbH.</p>
        <p>3. Korzystanie z serwisu jest całkowicie bezpłatne.</p>

        <h2 className="text-lg font-bold text-gray-100">§ 2. Zasady Korzystania i Czat</h2>
        <p>1. Użytkownik zobowiązuje się do kulturalnego zachowania na czacie oraz w publikowanych ogłoszeniach.</p>
        <p>2. Zabrania się publikowania treści:</p>
        <ul className="list-disc pl-6 space-y-1 text-gray-300">
          <li>Wulgarnych, obraźliwych, nawołujących do nienawiści lub dyskryminacji.</li>
          <li>Należących do kategorycznie zakazanego handlu za realne pieniądze (tzw. RMT – Real Money Trading).</li>
          <li>Spamu, reklamy zewnętrznych usług niezwiązanych z grą Albion Online oraz złośliwych linków.</li>
        </ul>

        <h2 className="text-lg font-bold text-gray-100">§ 3. Moderacja i Uprawnienia Administracji</h2>
        <p>1. Administratorzy (Inkwizytorzy) zastrzegają sobie prawo do natychmiastowego usuwania wiadomości na czacie, ogłoszeń rynkowych oraz dekrety gildii, które naruszają postanowienia niniejszego regulaminu.</p>
        <p>2. W przypadku rażącego łamania zasad administracja ma prawo zablokować dostęp danego konta do serwisu.</p>
      </section>

      <div className="pt-6 border-t border-[#23232c]">
        <Link href="/" className="text-xs font-bold text-[#c59b27] hover:underline uppercase">
          ← Powrót do Tablicy Miejskiej
        </Link>
      </div>
    </main>
  )
}