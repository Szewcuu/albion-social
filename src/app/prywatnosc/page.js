import {
  Clock3,
  Cookie,
  Database,
  EyeOff,
  Gavel,
  KeyRound,
  LockKeyhole,
  Network,
  UserRoundCheck,
} from 'lucide-react'
import LegalDocument from '@/components/LegalDocument'
import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Polityka prywatności | Albion Online Polska Portal',
  description: 'Informacje o przetwarzaniu danych i prywatności użytkowników AOPP.',
  path: '/prywatnosc',
  index: true,
})

export default function PrivacyPage() {
  const sections = [
    {
      id: 'administrator',
      title: 'Administrator i kontakt',
      icon: UserRoundCheck,
      content: <><p>Administratorem danych jest operator projektu Albion Online Polska Portal, działający pod profilem GitHub <strong className="text-[#eee7d9]">Szewcuu</strong>. Kontakt w sprawach prywatności jest możliwy przez repozytorium projektu: <a href="https://github.com/Szewcuu/albion-social" className="font-bold text-sky-300 hover:text-sky-200">github.com/Szewcuu/albion-social</a>.</p><p>Portal nie wyznaczył inspektora ochrony danych. Jeżeli zakres projektu lub obowiązki prawne się zmienią, informacja zostanie zaktualizowana.</p></>,
    },
    {
      id: 'data',
      title: 'Jakie dane przetwarzamy',
      icon: Database,
      content: <><p><strong className="text-[#eee7d9]">Konto Discord:</strong> identyfikator konta, nazwa, awatar oraz adres e-mail, jeżeli Discord udostępni go w procesie logowania.</p><p><strong className="text-[#eee7d9]">Karta postaci:</strong> dobrowolnie wpisany nick w grze, serwer, gildia, rola i deklarowane Item Power.</p><p><strong className="text-[#eee7d9]">Treści społecznościowe:</strong> wiadomości czatu, ogłoszenia gildii i rynku P2P, prywatne rozmowy kupującego ze sprzedającym, wyprawy, zapisy, buildy oraz powiadomienia. Prywatne rozmowy są widoczne wyłącznie dla ich uczestników.</p><p><strong className="text-[#eee7d9]">Preferencja rozwoju portalu:</strong> jeden edytowalny wybór obszaru powiązany technicznie z kontem, aby zapobiec wielokrotnemu głosowaniu. Portal pokazuje wyłącznie wyniki zbiorcze, bez listy osób.</p><p><strong className="text-[#eee7d9]">Dane techniczne:</strong> dane sesji, podstawowe logi bezpieczeństwa i działania aplikacji, zagregowane pomiary wydajności oraz dzienna liczba wyszukań w Killboardzie według serwera. Licznik użycia nie zapisuje nicku, identyfikatora konta ani adresu IP.</p></>,
    },
    {
      id: 'purposes',
      title: 'Cele i podstawy przetwarzania',
      icon: KeyRound,
      content: <><p>Dane konta i sesji służą uwierzytelnianiu, utrzymaniu profilu i realizacji funkcji portalu. Podstawą jest wykonanie usługi udostępnionej użytkownikowi oraz działania podejmowane na jego żądanie.</p><p>Treści społecznościowe są przetwarzane w celu publikacji wybranej funkcji — np. oferty, buildu lub wyprawy. Logi bezpieczeństwa i moderacja służą uzasadnionemu interesowi operatora: ochronie portalu, użytkowników oraz zapobieganiu nadużyciom.</p><p>Opcjonalny wybór kierunku rozwoju służy ograniczeniu dalszych prac do potrzeb społeczności. Można go zmienić, a wraz z usunięciem konta rekord jest automatycznie usuwany.</p><p>Elementy całkowicie opcjonalne, np. przekazanie własnego webhooka Discord, są uruchamiane wyłącznie po świadomym działaniu użytkownika.</p></>,
    },
    {
      id: 'providers',
      title: 'Dostawcy i odbiorcy danych',
      icon: Network,
      content: <><p>Portal korzysta z <strong className="text-[#eee7d9]">Supabase</strong> do bazy danych i uwierzytelniania, <strong className="text-[#eee7d9]">Vercel</strong> do hostingu i pomiarów wydajności oraz <strong className="text-[#eee7d9]">Discord</strong> do logowania i opcjonalnych powiadomień webhook.</p><p>Dane rynkowe i statystyki Albionu są pobierane z publicznych API. Portal nie powinien przekazywać do tych źródeł danych profilu użytkownika. Dostawcy infrastruktury mogą przetwarzać dane techniczne zgodnie ze swoimi warunkami i mechanizmami transferu danych.</p></>,
    },
    {
      id: 'local-storage',
      title: 'Cookies i pamięć lokalna',
      icon: Cookie,
      content: <><p>Supabase wykorzystuje mechanizmy przeglądarki niezbędne do utrzymania bezpiecznej sesji logowania. Portal zapisuje lokalnie na urządzeniu m.in. progi cenowe i szkic Loot Splitu.</p><p>Ulubione karty, obserwowane elementy, własne timery i przypomnienia są dodatkowo synchronizowane z kontem użytkownika w Supabase, aby działały na różnych urządzeniach. Lokalne kopie można usunąć w ustawieniach danych witryny, a kopia konta jest usuwana razem z użytkownikiem.</p></>,
    },
    {
      id: 'retention',
      title: 'Okres przechowywania & Procedura Usunięcia Konta (RODO)',
      icon: Clock3,
      content: <><p>Dane konta są przechowywane przez czas korzystania z profilu. Użytkownik może w dowolnym momencie trwale usunąć konto i powiązane dane, z zastrzeżeniem zanonimizowanych zapisów, które operator musi zachować ze względów bezpieczeństwa lub prawnych.</p><p>Techniczne zdarzenia aplikacji są przechowywane przez 30 dni, pomiary dostępności integracji przez 90 dni, a anonimowe dzienne liczniki użycia funkcji przez maksymalnie 400 dni. Dziennik decyzji moderacyjnych jest zachowywany w celu rozliczalności; po usunięciu konta identyfikator autora zostaje odłączony.</p><p><strong className="text-[#eee7d9]">Procedura usunięcia konta:</strong> w ustawieniach profilu należy wybrać opcję usunięcia konta i potwierdzić ją frazą <strong className="text-rose-300 font-mono">&quot;USUŃ KONTO&quot;</strong>. Portal usuwa użytkownika z Supabase Auth, profil, treści i dane zależne oraz lokalne ustawienia tej witryny. Historia działań moderacyjnych pozostaje bez identyfikatora usuniętego konta.</p></>,
    },
    {
      id: 'rights',
      title: 'Prawa użytkownika',
      icon: Gavel,
      content: <><p>W zależności od podstawy i okoliczności przetwarzania użytkownik może żądać dostępu do danych, ich sprostowania, usunięcia, ograniczenia, przeniesienia oraz wnieść sprzeciw. Zgodę można wycofać bez wpływu na zgodność wcześniejszego przetwarzania.</p><p>Użytkownik ma również prawo wnieść skargę do Prezesa Urzędu Ochrony Danych Osobowych. Żądanie dotyczące danych należy przesłać kanałem kontaktowym wskazanym w pierwszym rozdziale.</p></>,
    },
    {
      id: 'automation',
      title: 'Automatyzacja i zmiany dokumentu',
      icon: EyeOff,
      content: <><p>Portal nie wykorzystuje danych użytkownika do podejmowania decyzji wywołujących skutki prawne ani do profilowania reklamowego. Automatyczne kalkulatory mają charakter narzędzi pomocniczych.</p><p>Polityka może zostać zmieniona wraz z rozwojem funkcji lub integracji. Data aktualizacji i istotne zmiany powinny być komunikowane w portalu.</p></>,
    },
  ]

  return <LegalDocument type="privacy" eyebrow="Skarbiec danych • Prywatność" title="Twoje dane mają służyć Tobie," highlightedTitle="nie być ukrytym kosztem portalu." description="Przejrzyste podsumowanie informacji, które zapisujemy, powodów ich użycia oraz praw przysługujących użytkownikowi." icon={LockKeyhole} stats={[{ label: 'Aktualizacja', value: '30 sierpnia 2026' }, { label: 'Logowanie', value: 'Discord OAuth' }, { label: 'Baza danych', value: 'Supabase' }]} sections={sections} notice="Portal działa jako niezależny projekt społecznościowy prowadzony pod profilem GitHub Szewcuu. W sprawach dostępu, poprawienia lub usunięcia danych skorzystaj z kanału kontaktowego wskazanego w pierwszym rozdziale." />
}
