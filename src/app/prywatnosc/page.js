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

export const metadata = {
  title: 'Polityka prywatności | Albion Online Polska Portal',
  description: 'Informacje o przetwarzaniu danych i prywatności użytkowników AOPP.',
}

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
      content: <><p><strong className="text-[#eee7d9]">Konto Discord:</strong> identyfikator konta, nazwa, awatar oraz adres e-mail, jeżeli Discord udostępni go w procesie logowania.</p><p><strong className="text-[#eee7d9]">Karta postaci:</strong> dobrowolnie wpisany nick w grze, serwer, gildia, rola i deklarowane Item Power.</p><p><strong className="text-[#eee7d9]">Treści społecznościowe:</strong> wiadomości czatu, ogłoszenia gildii i rynku P2P, wyprawy, zapisy, buildy, dane kontaktowe podane w ogłoszeniu oraz powiadomienia.</p><p><strong className="text-[#eee7d9]">Dane techniczne:</strong> dane sesji, podstawowe logi bezpieczeństwa i działania aplikacji oraz zagregowane pomiary wydajności.</p></>,
    },
    {
      id: 'purposes',
      title: 'Cele i podstawy przetwarzania',
      icon: KeyRound,
      content: <><p>Dane konta i sesji służą uwierzytelnianiu, utrzymaniu profilu i realizacji funkcji portalu. Podstawą jest wykonanie usługi udostępnionej użytkownikowi oraz działania podejmowane na jego żądanie.</p><p>Treści społecznościowe są przetwarzane w celu publikacji wybranej funkcji — np. oferty, buildu lub wyprawy. Logi bezpieczeństwa i moderacja służą uzasadnionemu interesowi operatora: ochronie portalu, użytkowników oraz zapobieganiu nadużyciom.</p><p>Elementy całkowicie opcjonalne, np. przekazanie własnego webhooka Discord, są uruchamiane wyłącznie po świadomym działaniu użytkownika.</p></>,
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
      content: <><p>Supabase wykorzystuje mechanizmy przeglądarki niezbędne do utrzymania bezpiecznej sesji logowania. Portal zapisuje lokalnie na urządzeniu m.in. ulubione przedmioty i progi cenowe, własne timery oraz szkic Loot Splitu.</p><p>Dane lokalne nie trafiają do Supabase, dopóki konkretna funkcja nie informuje o zapisie serwerowym. Można je usunąć przez przyciski czyszczenia w module albo ustawienia danych witryny w przeglądarce.</p></>,
    },
    {
      id: 'retention',
      title: 'Okres przechowywania',
      icon: Clock3,
      content: <><p>Dane konta są przechowywane przez czas korzystania z profilu i okres niezbędny do obsługi usunięcia konta lub roszczeń. Treści publiczne pozostają do ich usunięcia przez autora, moderatora albo do zakończenia celu, dla którego je opublikowano.</p><p>Logi techniczne są przechowywane zgodnie z konfiguracją i okresami retencji dostawców infrastruktury. Dane w pamięci lokalnej pozostają do czasu ich wyczyszczenia przez użytkownika.</p></>,
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

  return <LegalDocument type="privacy" eyebrow="Skarbiec danych • Prywatność" title="Twoje dane mają służyć Tobie," highlightedTitle="nie być ukrytym kosztem portalu." description="Przejrzyste podsumowanie informacji, które zapisujemy, powodów ich użycia oraz praw przysługujących użytkownikowi." icon={LockKeyhole} stats={[{ label: 'Aktualizacja', value: '1 sierpnia 2026' }, { label: 'Logowanie', value: 'Discord OAuth' }, { label: 'Baza danych', value: 'Supabase' }]} sections={sections} notice="Operator powinien przed dalszą komercjalizacją lub rozszerzeniem projektu uzupełnić pełną nazwę i adres kontaktowy administratora oraz zatwierdzić okresy retencji z ustawieniami Supabase i Vercel." />
}
