# Albion Online Polska Portal

Polski portal społecznościowy dla graczy Albion Online. Projekt łączy wyszukiwanie graczy i gildii, organizację wypraw, rynek ogłoszeń P2P, buildy społeczności, timery oraz narzędzia pomocnicze w jednym interfejsie inspirowanym światem Albionu.

Produkcja: [albion-social.vercel.app](https://albion-social.vercel.app/)

Repozytorium: [Szewcuu/albion-social](https://github.com/Szewcuu/albion-social)

## Stan projektu

### Rebuild UI/UX — Albion War Table (sierpień 2026)

- [x] przeanalizować zmiany Antigravity i zachować wszystkie działające moduły
- [x] odbudować ekran powitalny z mocnym motywem Albion Online i logowaniem Discord
- [x] wprowadzić wspólną nawigację, typografię, kolory oraz komponenty inspirowane stołem wojennym gildii
- [x] przebudować stronę główną bez usuwania danych Supabase, czatu i kalkulatora marży
- [x] objąć nowym systemem wizualnym istniejące podstrony i widoki mobilne
- [x] poprawić etykiety formularzy, kontrast oraz politykę Content Security Policy wskazane przez Lighthouse
- [x] wykonać lint, produkcyjny build oraz testy desktop/mobile najważniejszych tras
- [ ] opublikować gałąź, sprawdzić preview Vercel i wykonać końcowy smoke test produkcji

Gotowe i wdrożone:

- [x] audyt pierwszej wersji projektu i podstawowe utwardzenie backendu
- [x] nowy ekran główny i wspólny system wizualny AOPP
- [x] przebudowa modułów Gildie i Wyprawy
- [x] przebudowa Rynku, katalogu Buildów i kreatora buildu
- [x] logowanie Discord przez Supabase
- [x] integracja ogłoszeń gildii, wypraw, rynku i buildów z Supabase
- [x] powiadomienia Discord dla wypraw i zgłoszeń
- [x] podstawowe wyszukiwanie gracza Albion Online
- [x] podstawowe pobieranie cen przedmiotów
- [x] wspólna, zabezpieczona warstwa Gameinfo dla trzech regionów
- [x] Killboard 2.0 z wyborem gracza, historią PvP, wyposażeniem i kontekstem gildii
- [x] Market Intelligence z pełnym katalogiem, porównaniem miast, trendami i kalkulatorami
- [x] nowe ekrany Profilu, Timerów, Loot Splitu, Regulaminu i Prywatności

## Najbliższy etap

> **Priorytet B: stabilność kluczowych przepływów — implementacja gotowa do wdrożenia**

P4.2 i Priorytet A są wdrożone. Gałąź Priorytetu B dodaje testy przeglądarkowe, monitoring błędów i zależności, status usług w panelu personelu oraz trwałe szkice i wersje raportów Loot Splitu. Migracja `008_priority_b_stability.sql` została wdrożona i zweryfikowana na produkcyjnym projekcie Supabase, a `CRON_SECRET` jest skonfigurowany w Preview i Production Vercela. Do zamknięcia etapu pozostają produkcyjny smoke test oraz pełne testy zalogowanego użytkownika z osobnym kontem E2E w sekretach GitHub.

### Zakończony Priorytet A

- [x] dodać role member, moderator i admin z rozdzielonym zakresem uprawnień
- [x] objąć wspólną moderacją czat, buildy, rynek, gildie, wyprawy i komentarze
- [x] dodać ukrywanie, przywracanie i logiczne usuwanie pojedynczych oraz wielu rekordów
- [x] dodać zbiorczą obsługę zgłoszeń z transakcyjnym zapisem decyzji
- [x] zapisywać nieusuwalny z poziomu klienta dziennik akcji personelu
- [x] przeprowadzić audyt RLS i ograniczyć bezpośrednie uprawnienia do tabel technicznych
- [x] zastąpić pamięciowy limiter trwałymi kubełkami Supabase oraz triggerami zapisów treści
- [x] zweryfikować migrację, wszystkie kolejki panelu, lint i build produkcyjny

### Zakończony sprint P4.2

- [x] dodać wersjonowaną migrację `build_comments` i `build_reports`
- [x] ograniczyć odczyt komentarzy do treści widocznych i zgłoszeń do właściciela lub moderatora przez RLS
- [x] dodać walidowane i limitowane API publikacji oraz usuwania własnych komentarzy
- [x] dodać prywatne zgłoszenia buildu lub konkretnego komentarza z deduplikacją
- [x] przygotować responsywny UI komentarzy, pustych stanów, potwierdzeń i dostępnego dialogu zgłoszenia
- [x] dodać chroniony panel administratora z kolejką zgłoszeń i akcjami moderacji komentarzy
- [x] wykonać lint i pełny build produkcyjny wszystkich tras
- [x] scalić PR, sprawdzić preview Vercel i wykonać końcowy smoke test produkcji

### Zakończony sprint P4.1

- [x] dodać dynamiczną trasę `/buildy/[id]` z pełnym wyposażeniem i opisem doktryny
- [x] połączyć katalog i kreator z publicznym URL-em zapisanego buildu
- [x] dodać wersjonowaną migrację `build_votes` i `build_favorites` z RLS
- [x] zabezpieczyć jeden głos użytkownika unikalnym indeksem w bazie
- [x] dodać API oraz dostępne klawiaturą kontrolki głosu, ulubionych i udostępniania
- [x] przetestować pełny przepływ, wdrożyć PR i wykonać smoke test produkcji

### Zakończony sprint P3.2

- [x] wyrenderować wszystkie publiczne trasy przy 360, 390 i 430 px
- [x] usunąć poziomy overflow, ucięte treści i kolizje kontrolek
- [x] zweryfikować kontrast tekstu i kontrolek według WCAG AA
- [x] przejść klawiaturą przez nawigację, formularze i dialog potwierdzenia
- [x] sprawdzić czytelność stanów ładowania, pustych, błędów i sukcesu
- [x] wykonać lint, build, ponowny audyt i wdrożenie produkcyjne

### Zakończony sprint P3.1

- [x] dodać wspólne komponenty pustych stanów, komunikatów i potwierdzeń akcji
- [x] poprawić krytyczne układy i kontrolki dla szerokości 360, 390 i 430 px
- [x] sprawdzić kod pod kątem nawigacji klawiaturą, fokusu, etykiet formularzy i stanów ARIA
- [x] usunąć pozostałe ostrzeżenia `no-img-element` bez pogorszenia wydajności
- [x] wykonać lint, build i lokalny test wszystkich publicznych tras
- [x] wdrożyć sprint przez GitHub/Vercel i wykonać końcowy test produkcji

## Audyt rozwoju — rekomendowane następne prace

Lista została zaktualizowana po wdrożeniu podstawowego panelu administratora, naprawie lokalnego szkicu podziału łupów i korekcie wyszukiwarki Killboardu. Kolejność uwzględnia wpływ na bezpieczeństwo, stabilność i wygodę użytkowników.

### Priorytet A — bezpieczeństwo i moderacja

- [x] rozszerzyć panel administratora o moderację czatu, buildów, ofert rynku, gildii i wypraw
- [x] dodać osobną rolę moderatora z mniejszym zakresem uprawnień niż administrator
- [x] zapisywać dziennik akcji administracyjnych: kto, co i kiedy ukrył, usunął lub przywrócił
- [x] dodać możliwość przywrócenia ukrytego komentarza oraz zbiorcze akcje na zgłoszeniach
- [x] przeprowadzić pełny audyt RLS i uprawnień `GRANT` dla każdej tabeli Supabase
- [x] dodać ochronę antyspamową opartą o trwały magazyn zamiast pamięci pojedynczej instancji Vercel

### Priorytet B — stabilność kluczowych przepływów

- [ ] uruchomić pełne testy E2E zalogowanego użytkownika po dodaniu dedykowanego konta `E2E_USER_*` do GitHub Actions
  - [x] dodać Playwright, test logowania i testy kluczowych ekranów: czat, build, wyprawa, rynek oraz Loot Split
  - [x] dodać publiczne testy bramki logowania, Regulaminu i Prywatności
  - [x] uruchamiać lint, build i publiczne E2E automatycznie w CI
- [x] dodać monitoring błędów frontend/backend oraz rejestr zdarzeń w Supabase
- [x] monitorować Supabase, Discord oraz API Albionu i rynku dla Europy, Ameryki i Azji
- [x] dodać codzienny test integracji zgodny z limitem Vercel Hobby i czytelny status usług w panelu personelu
- [x] przenieść szkice podziału łupów do kont użytkownika, pozostawiając `localStorage` jako tryb offline
- [x] dodać wersjonowanie, historię konta oraz eksport TXT raportów podziału łupów
- [x] dodać kontrolowane ponowienie publikacji wyprawy na Discordzie bez ponownego tworzenia ogłoszenia
- [x] wdrożyć i zweryfikować migrację `supabase/migrations/008_priority_b_stability.sql` na produkcyjnym Supabase
- [x] zweryfikować `CRON_SECRET` dla środowisk Preview i Production Vercela
- [ ] wykonać produkcyjny smoke test po wdrożeniu gałęzi

### Priorytet C — funkcje społecznościowe

- [ ] dodać publiczne profile graczy z przypiętą postacią Albionu, ulubionymi buildami i aktywnością
- [ ] rozbudować strony gildii o role, rekrutację, wydarzenia, skład i historię aktywności
- [ ] dodać kalendarz wydarzeń oraz zapisy z przypomnieniami w centrum powiadomień
- [ ] dodać obserwowanie buildów, gildii, ofert i graczy oraz powiadomienia o zmianach
- [ ] rozbudować komentarze o odpowiedzi, edycję własnej treści i sortowanie
- [ ] dodać bezpieczny przepływ kontaktu kupujący–sprzedający bez publikowania danych prywatnych

### Priorytet D — dane Albionu i narzędzia

- [ ] wyceniać utracony ekwipunek w Killboardzie na podstawie wybranego regionu i aktualności ceny
- [ ] dodać porównanie buildów, umiejętności przedmiotów oraz koszt zestawu w wybranych miastach
- [ ] umożliwić zapis obserwowanych postaci i automatyczne podsumowania ich nowych walk
- [ ] aktualizować katalog przedmiotów automatycznie z wersjonowanym fallbackiem lokalnym
- [ ] dodać historię zmian cen i alerty cenowe przechowywane po stronie serwera

### Priorytet E — wydajność, SEO i jakość UI

- [ ] podzielić najcięższe komponenty klienckie i ograniczyć liczbę równoległych zapytań po wejściu na stronę
- [ ] dodać paginację lub wirtualizację długich list: czat, buildy, rynek, komentarze i zgłoszenia
- [ ] przygotować unikalne metadata, Open Graph, sitemapę i canonical URL dla publicznych treści
- [ ] mierzyć Core Web Vitals oraz budżet rozmiaru JavaScript w CI
- [ ] przeprowadzić ponowny Lighthouse dla mobile i desktop po wdrożeniu obecnej gałęzi
- [ ] uzupełnić testy wizualne dla 360, 390, 430, 768, 1280 i 1920 px

## Roadmapa / TODO

Kolejność poniżej jest proponowaną kolejnością realizacji. Kończymy i odhaczamy jeden etap przed rozpoczęciem następnego.

### P0 — fundament techniczny API

- [x] utworzyć wspólny adapter regionów: Europa, Ameryka i Azja
- [x] dodać timeout, kontrolowane ponowienia i zunifikowane komunikaty błędów
- [x] dodać cache po stronie Next.js dla danych, które nie muszą być pobierane przy każdym wejściu
- [x] dodać rate limiting do publicznych tras `/api/albion/*` i `/api/prices`
- [x] walidować identyfikatory przedmiotów, miast, regionów i parametrów paginacji
- [x] zwracać informację o źródle danych i czasie ostatniej aktualizacji
- [ ] dodać testy adapterów z mockami odpowiedzi zewnętrznych API
- [ ] przygotować monitoring błędów integracji i czasu odpowiedzi

### P1 — Killboard 2.0

- [x] przebudować UI Killboardu zgodnie z systemem wizualnym AOPP
- [x] rozdzielić wyszukiwanie gracza od pobierania pełnego profilu
- [x] dodać wybór wyniku, gdy API zwróci kilka podobnych nicków
- [x] wyświetlać PvP Fame, PvE Fame, Gathering, Crafting i Fame Ratio
- [x] dodać ostatnie zabójstwa i zgony z wyposażeniem uczestników
- [ ] wyceniać utracony ekwipunek na podstawie Albion Online Data Project
- [x] dodać filtrowanie historii po typie zdarzenia i regionie
- [x] dodać profil gildii: podstawowe statystyki i lista członków
- [ ] umożliwić przypięcie postaci Albionu do profilu portalu
- [x] przygotować czytelne stany: ładowanie, brak danych, timeout i awaria źródła

### P2 — Market Intelligence

- [x] rozszerzyć `/api/prices` o region, wiele miast, jakość i wiele przedmiotów
- [x] dodać wyszukiwarkę pełnego katalogu przedmiotów zamiast krótkiej listy lokalnej
- [x] pokazywać sell price, buy price oraz czas ostatniego odczytu danych
- [x] ostrzegać, gdy cena jest nieaktualna lub nie ma wystarczających danych
- [x] dodać porównanie cen pomiędzy miastami
- [x] dodać historię ceny: 24 godziny, 7 dni i 30 dni
- [x] dodać kurs złota i prosty wykres zmian
- [x] dodać kalkulator marży po podatku i opłacie za wystawienie
- [x] dodać kalkulator transportu/arbitrażu pomiędzy miastami
- [x] umożliwić zapis ulubionych przedmiotów i obserwowanych cen
- [x] połączyć wyceny API z ofertami P2P bez sugerowania, że dane są rzeczywistym live marketem

### P3 — kolejne ekrany UI/UX

- [x] przebudować Profil gracza
- [x] przebudować Timery
- [x] przebudować Loot Split i poprawić przepływ rozliczenia grupy
- [x] dopracować strony Regulamin i Prywatność
- [x] wykonać pełny przegląd mobile 360–430 px
- [x] ujednolicić skeletony, komunikaty błędów, puste stany i potwierdzenia akcji
- [x] przeprowadzić audyt dostępności klawiatury, kontrastu i etykiet formularzy

### P4 — funkcje społecznościowe

- [x] dodać osobną stronę szczegółów buildu z linkiem publicznym
- [x] zabezpieczyć głosowanie na build: jeden głos użytkownika na build
- [x] dodać zapisywanie buildów do ulubionych
- [x] dodać komentarze i zgłaszanie nadużyć pod buildami
- [ ] dodać wygasanie, odnawianie i archiwizację ofert rynkowych
- [ ] dodać szczegóły oferty i bezpieczny przepływ kontaktu ze sprzedawcą
- [ ] dodać publiczne strony gildii i kalendarz wydarzeń
- [ ] dodać centrum powiadomień w portalu
- [x] dodać podstawowy panel administratora i moderację zgłoszonych komentarzy
- [x] rozszerzyć panel o role moderatora i pozostałe typy treści

### P5 — Supabase i bezpieczeństwo danych

- [ ] zapisać schemat bazy jako wersjonowane migracje w repozytorium
- [x] przeprowadzić audyt RLS wszystkich tabel i polityk dostępu
- [ ] dodać indeksy dla najczęstszych filtrów, sortowania i relacji
- [x] wymusić reguły własności rekordów po stronie bazy, nie tylko interfejsu
- [ ] dodać tabele głosów, ulubionych, zgłoszeń i powiadomień
- [ ] określić retencję danych i procedurę usunięcia konta
- [ ] sprawdzić logi pod kątem wycieku danych użytkownika lub sekretów

### P6 — jakość, SEO i wydajność

- [ ] dodać testy end-to-end kluczowych przepływów
- [ ] dodać automatyczny lint i build w GitHub Actions
- [x] usunąć ostrzeżenia `no-img-element` tam, gdzie optymalizacja Next Image jest bezpieczna
- [ ] dodać unikalne metadata, Open Graph i canonical URL dla podstron
- [ ] przygotować sitemapę i robots.txt
- [ ] dodać PWA: manifest, ikony i podstawowy tryb offline
- [ ] dodać pomiar błędów frontendowych i Core Web Vitals
- [ ] wykonać ponowny audyt Lighthouse po zakończeniu głównych ekranów

### Etap P7 — Wycena Ekwipunku Killboarda & Kalendarz Wydarzeń

- [x] Automatyczne przeliczanie wartości utraconego ekwipunku graczy w walkach na Killboardzie na podstawie cen z rynków królewskich.
- [x] Wyświetlanie sumarycznej wartości zniszczonego sprzętu (z podziałem na zwycięzcę i pokonanego) w monetach Silver (~1.5M Silver).
- [x] Kalendarz nadchodzących wydarzeń gildyjnych i wypraw z opcją zapisów i powiadomień.

### Etap P8 — Porównywarka Buildów & Kalkulator Kosztów Zestawów

- [x] Narzędzie do porównywania 2 zestawów bojowych side-by-side (ekwipunek, spelle, szacowane IP i koszty).
- [x] Kalkulator łącznego kosztu zakupu całego buildu w miastach królewskich na podstawie danych cenowych z API.

### Etap P9 — Kalkulator Bonusu Miast & Podatku Stoiska Rzemieślniczego

- [x] Automatyczne dobieranie wskaźnika zwrotu surowców (RRR %) dla każdego miasta (Martlock, Lymhurst, Fort Sterling, Bridgewatch, Thetford, Caerleon, Brecilien).
- [x] Uwzględnianie opłaty odżywczej stoiska gracza (Nutrition Tax Fee / 100 Nutrition) w wyliczeniu czystego zysku rzemieślniczego.

### Etap P10 — Dynamiczna Mapa Witryny (Sitemap.xml), Robots.txt & Metadata Open Graph

- [x] Utworzenie dynamicznego generowania mapy witryny (`src/app/sitemap.js`) rejestrującego podstrony i trasy dynamiczne.
- [x] Utworzenie pliku `src/app/robots.js` z regułami indeksowania wyszukiwarek.
- [x] Dodanie unikalnych metadanych SEO, tytułów, opisów oraz kart Open Graph (og:image, og:title, og:description) dla podstron i kart w mediach społecznościowych.

### Etap P11 — System Obserwowania & Centrum Powiadomień Portalu

- [x] Przycisk "Obserwuj" dla graczy, gildii i buildów zapisuący subskrypcje powiadomień w profilu użytkownika.
- [x] Komponent Centrum Powiadomień (`NotificationCenterModal.jsx`) z powiadomieniami o nowych wyprawach, ofertach rynkowych i aktualizacjach obserwowanych gildii.

### Etap P12 — PWA Offline Service Worker, Manifest & Wydajność Web Vitals

- [x] Rejestracja Service Workera dla aplikacji PWA umożliwiająca zapisywanie w pamięci podręcznej i działanie w trybie offline.
- [x] Konfiguracja powiadomień diagnostycznych wydajności (Speed Insights / Core Web Vitals) dla ulepszenia czasy ładowania na urządzeniach mobilnych.

### Etap P13 — Unikalne Metadane SEO & Open Graph dla Wszystkich Podstron Portalu

- [x] Dodanie indywidualnych wywołań `export const metadata` dla podstron: `/buildy`, `/gildie`, `/rynek`, `/killboard`, `/kalkulator-craftingu`, `/timery`, `/wyprawy`, `/loot-split`.
- [x] Precyzyjne tytuły, opisy i słowa kluczowe SEO dla kart podglądu społecznościowego na Discordzie i w wyszukiwarkach.

## Audyt dostępnych API Albion Online

Stan zweryfikowany: **1 sierpnia 2026**. Endpointy zostały dodatkowo sprawdzone bezpośrednimi zapytaniami dla serwera europejskiego.

| Źródło | Dostępne dane | Status w projekcie | Decyzja |
| --- | --- | --- | --- |
| [Albion Online Data Project](https://www.albion-online-data.com/api/) | aktualne buy/sell orders, historia cen sprzedaży, kurs złota; regiony Europe/Americas/Asia | używamy podstawowego endpointu cen | główne źródło danych ekonomicznych |
| Gameinfo API Albion Online | wyszukiwanie, profile graczy, kill/death events, wydarzenia, gildie i członkowie | używamy wyszukiwarki i profilu gracza | używać przez własny adapter, cache i fallback; API jest nieudokumentowane i bez gwarancji stabilności |
| [Render Service](https://wiki.albiononline.com/wiki/API%3ARender_service) | ikony przedmiotów, zaklęć, wardrobe, Destiny Board i logotypy gildii | używamy ikon przedmiotów | rozszerzyć o skille i elementy profilu gildii |
| [ao-bin-dumps](https://github.com/ao-data/ao-bin-dumps/tree/master/formatted) | identyfikatory oraz metadane przedmiotów i świata | mamy lokalny, ograniczony katalog | przygotować okresowo aktualizowany katalog wyszukiwania |
| [OpenAlbion](https://openalbion.com/) | bronie, pancerze, akcesoria, consumables, statystyki i spelle | brak integracji | opcjonalne wzbogacenie kreatora buildów; nie uzależniać od niego krytycznych funkcji |
| MurderLedger / społecznościowe kill API | przetworzone dane PvP i matchupy | brak integracji | na razie nie używać jako fundamentu; stabilność i świeżość bywają zależne od Gameinfo |

### Potwierdzone endpointy, które możemy wykorzystać

#### Albion Online Data Project

```text
GET https://{region}.albion-online-data.com/api/v2/stats/prices/{item_ids}.json
GET https://{region}.albion-online-data.com/api/v2/stats/history/{item_ids}.json
GET https://{region}.albion-online-data.com/api/v2/stats/gold.json
```

Hosty regionów: `europe`, `west`, `east`. Dokumentacja podaje limity 180 zapytań/minutę i 300 zapytań/5 minut oraz limit długości URL 4096 znaków. Dane pochodzą od społeczności korzystającej z klienta AODP, dlatego każda cena musi pokazywać timestamp i nie może być przedstawiana jako gwarantowana cena live.

#### Gameinfo

```text
Europa:  https://gameinfo-ams.albiononline.com/api/gameinfo
Ameryka: https://gameinfo.albiononline.com/api/gameinfo
Azja:    https://gameinfo-sgp.albiononline.com/api/gameinfo

GET /search?q={name}
GET /players/{player_id}
GET /players/{player_id}/kills
GET /players/{player_id}/deaths
GET /events?limit={limit}&offset={offset}
GET /events/{event_id}
GET /guilds/{guild_id}
GET /guilds/{guild_id}/members
GET /guilds/{guild_id}/data
```

Te ścieżki odpowiadały podczas audytu. Niektóre inne, spotykane w starych bibliotekach i poradnikach (`matches`, wybrane `battles`, stare rankingi gildii), zwracały błędy 404. Nie dodajemy ich do produktu bez osobnego adaptera eksperymentalnego i fallbacku.

#### Render Service

```text
GET https://render.albiononline.com/v1/item/{identifier}.png
GET https://render.albiononline.com/v1/spell/{identifier}.png
GET https://render.albiononline.com/v1/wardrobe/{identifier}.png
GET https://render.albiononline.com/v1/destiny/{identifier}.png
```

Obsługuje m.in. parametry `quality`, `size` i `locale`. Ikony zawsze powinny mieć lokalny fallback, ponieważ nie każdy historyczny lub nowy identyfikator musi być dostępny.

## Architektura

- Next.js 16 / React 19
- Tailwind CSS 4
- Supabase: PostgreSQL, Auth i RLS
- Vercel: hosting i automatyczne wdrożenia
- Discord OAuth i webhooki
- Albion Online Data Project, Gameinfo i Render Service

## Uruchomienie lokalne

```bash
npm install
npm run dev
```

Następnie otwórz [http://localhost:3000](http://localhost:3000).

Wymagane zmienne środowiskowe opisuje `.env.example`:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
DISCORD_EXPEDITIONS_WEBHOOK_URL
CRON_SECRET
NEXT_PUBLIC_APP_URL
E2E_USER_EMAIL
E2E_USER_PASSWORD
```

`SUPABASE_SERVICE_ROLE_KEY` i webhook Discorda są sekretami serwerowymi — nie wolno nadawać im prefiksu `NEXT_PUBLIC_` ani umieszczać ich w repozytorium.

Zmienne `E2E_USER_EMAIL` i `E2E_USER_PASSWORD` są opcjonalne lokalnie. W GitHub Actions powinny wskazywać osobne konto testowe bez roli moderatora lub administratora.

## Kontrola jakości

Przed każdym wdrożeniem:

```bash
npm run lint
npm run build
npm run test:e2e:public
```

Pełny pakiet zalogowanego użytkownika uruchamia `npm run test:e2e:auth` po skonfigurowaniu konta `E2E_USER_*`.

Zmiany wdrażamy przez osobną gałąź, pull request i automatyczny deployment Vercel. Produkcja jest scalana dopiero po poprawnym buildzie i sprawdzeniu najważniejszych widoków.
