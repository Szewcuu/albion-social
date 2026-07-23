'use client'
import Link from 'next/link'

export default function Prywatnosc() {
  return (
    <main className="min-h-screen bg-[#0f0a0a] text-[#bcbbc2] p-6 max-w-4xl mx-auto space-y-6 font-sans">
      <header className="border-b border-[#c59b27] pb-4">
        <h1 className="text-3xl font-black text-[#c59b27] font-serif">POLITYKA PRYWATNOŚCI (RODO)</h1>
        <p className="text-xs text-gray-400 mt-1">Ostatnia aktualizacja: Lipiec 2026 r.</p>
      </header>

      <section className="space-y-4 text-sm leading-relaxed">
        <h2 className="text-lg font-bold text-gray-100">1. Administrator Danych</h2>
        <p>Administratorem danych osobowych przetwarzanych w ramach serwisu jest twórca projektu Albion Online Polska Portal. W sprawach związanych z danymi można kontaktować się poprzez profil administracyjny na platformie Discord.</p>

        <h2 className="text-lg font-bold text-gray-100">2. Jakie dane zbieramy?</h2>
        <p>Podczas logowania za pośrednictwem usługi Discord OAuth pobieramy i przechowujemy w bezpiecznej bazie danych Supabase jedynie niezbędne informacje identyfikacyjne:</p>
        <ul className="list-disc pl-6 space-y-1 text-gray-300">
          <li>Unikalny identyfikator konta Discord (User ID).</li>
          <li>Nazwę użytkownika (Username / Nick).</li>
          <li>Adres URL publicznego awatara Discord.</li>
          <li>Treści wiadomości wysyłanych na czacie oraz ogłoszeń tworzonych w serwisie.</li>
        </ul>

        <h2 className="text-lg font-bold text-gray-100">3. Cel przetwarzania danych</h2>
        <p>Dane są przetwarzane wyłącznie w celu świadczenia usług społecznościowych (autoryzacja użytkownika, wyświetlanie wiadomości na czacie oraz publikacja ogłoszeń gildii i rynku).</p>

        <h2 className="text-lg font-bold text-gray-[#bcbbc2]">4. Pliki Cookies i Pamięć Lokalna</h2>
        <p>Serwis używa mechanizmów `localStorage` oraz niezbędnych technicznych plików cookies dostarczanych przez infrastrukturę Supabase w celu utrzymania poprawnej sesji zalogowanego użytkownika.</p>

        <h2 className="text-lg font-bold text-gray-100">5. Prawa Użytkownika</h2>
        <p>Każdy użytkownik ma prawo do wglądu w swoje dane, ich poprawiania oraz zażądania całkowitego usunięcia swojego konta i związanych z nim wiadomości z bazy danych serwisu.</p>
      </section>

      <div className="pt-6 border-t border-[#23232c]">
        <Link href="/" className="text-xs font-bold text-[#c59b27] hover:underline uppercase">
          ← Powrót do Tablicy Miejskiej
        </Link>
      </div>
    </main>
  )
}