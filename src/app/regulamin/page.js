import {
  AlertOctagon,
  BadgeCheck,
  Ban,
  Copyright,
  DatabaseZap,
  Handshake,
  Scale,
  ShieldAlert,
  Store,
} from 'lucide-react'
import LegalDocument from '@/components/LegalDocument'
import { createPageMetadata } from '@/lib/seo'

export const metadata = createPageMetadata({
  title: 'Regulamin | Albion Online Polska Portal',
  description: 'Zasady korzystania z funkcji społecznościowych AOPP.',
  path: '/regulamin',
  index: true,
})

export default function TermsPage() {
  const sections = [
    { id: 'scope', title: 'Charakter i zakres portalu', icon: BadgeCheck, content: <><p>Albion Online Polska Portal (AOPP) jest nieoficjalnym, społecznościowym projektem dla graczy Albion Online. Nie jest częścią Sandbox Interactive GmbH ani oficjalną usługą gry.</p><p>Korzystając z portalu, użytkownik zobowiązuje się przestrzegać niniejszych zasad, prawa oraz warunków usług zewnętrznych, z których korzysta — w szczególności Discord i Albion Online.</p></> },
    { id: 'accounts', title: 'Konta i bezpieczeństwo', icon: ShieldAlert, content: <><p>Logowanie odbywa się przez Discord. Użytkownik odpowiada za bezpieczeństwo swojego konta, urządzenia i sesji oraz za działania wykonane z jego profilu.</p><p>Nie wolno podszywać się pod inne osoby, obchodzić zabezpieczeń, automatyzować nadużyć ani próbować uzyskać dostępu do danych lub funkcji bez uprawnienia.</p></> },
    { id: 'content', title: 'Treści społecznościowe', icon: Handshake, content: <><p>Autor odpowiada za publikowane wiadomości, ogłoszenia, buildy, wyprawy i nazwy. Publikowane treści powinny być zgodne z prawem, rzeczowe i związane ze społecznością Albion Online.</p><p>Zabronione są m.in. oszustwa, phishing, RMT, spam, groźby, treści nienawistne, ujawnianie cudzych danych, złośliwe linki oraz materiały naruszające prawa innych osób. Skrzynka handlowa nie służy do przesyłania haseł ani danych płatniczych.</p></> },
    { id: 'market', title: 'Rynek P2P i rozliczenia', icon: Store, content: <><p>Portal jest tablicą kontaktową i nie uczestniczy w transakcjach zawieranych w grze. Strony samodzielnie weryfikują przedmiot, cenę, tożsamość kontrahenta i bezpieczeństwo miejsca wymiany.</p><p>Kalkulatory cen, marży i Loot Splitu są narzędziami pomocniczymi. Przed przekazaniem silvera lub przedmiotów należy sprawdzić wynik, dane wejściowe i uzgodnienia grupy.</p></> },
    { id: 'data', title: 'Dane zewnętrzne i dostępność', icon: DatabaseZap, content: <><p>Ceny, historie rynku i statystyki mogą pochodzić z projektów społecznościowych i publicznych API. Mogą być opóźnione, niepełne lub niedostępne i nie stanowią gwarantowanego obrazu gry na żywo.</p><p>Portal jest rozwijany bez gwarancji ciągłej dostępności. Funkcje mogą być czasowo ograniczane ze względów technicznych, bezpieczeństwa lub zmian w usługach zewnętrznych.</p></> },
    { id: 'moderation', title: 'Moderacja i zgłoszenia', icon: Ban, content: <><p>Operator może ukrywać lub usuwać treści naruszające zasady, ograniczać funkcje konta oraz zabezpieczać dowody nadużyć w zakresie niezbędnym do ochrony społeczności.</p><p>Decyzje powinny być proporcjonalne do naruszenia. Zastrzeżenia lub zgłoszenia można przekazać przez kanał kontaktowy projektu wskazany w stopce.</p></> },
    { id: 'rights', title: 'Prawa do treści i oznaczeń', icon: Copyright, content: <><p>Użytkownik zachowuje prawa do własnych treści, udzielając portalowi niewyłącznej zgody na ich wyświetlanie w zakresie potrzebnym do działania wybranej funkcji.</p><p>Albion Online oraz powiązane nazwy, grafiki i oznaczenia należą do ich właścicieli. Portal wykorzystuje je w kontekście nieoficjalnego projektu fanowskiego.</p></> },
    { id: 'liability', title: 'Odpowiedzialność i zmiany', icon: Scale, content: <><p>Operator nie odpowiada za decyzje w grze, utracony ekwipunek, wynik transportu, transakcje między graczami ani szkody wynikające z polegania na nieaktualnych danych zewnętrznych, w granicach dopuszczonych przez prawo.</p><p>Regulamin może być aktualizowany wraz z rozwojem portalu. Dalsze korzystanie po opublikowaniu zmian oznacza akceptację aktualnej wersji, o ile prawo nie wymaga odrębnej zgody.</p></> },
  ]

  return <LegalDocument type="terms" eyebrow="Kodeks społeczności • Zasady" title="Wspólny portal wymaga" highlightedTitle="jasnych reguł gry." description="Zasady publikowania treści, bezpieczeństwa transakcji oraz korzystania z narzędzi społeczności Albion Online Polska Portal." icon={AlertOctagon} stats={[{ label: 'Aktualizacja', value: '1 sierpnia 2026' }, { label: 'Charakter', value: 'Projekt fanowski' }, { label: 'Jurysdykcja', value: 'Polska / UE' }]} sections={sections} />
}
