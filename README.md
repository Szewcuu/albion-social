# Albion Online Polska Portal

Polski portal społecznościowy dla graczy Albion Online. Projekt łączy wyszukiwanie graczy i gildii, organizację wypraw, rynek ogłoszeń P2P, buildy społeczności, timery oraz narzędzia pomocnicze w jednym interfejsie inspirowanym światem Albionu.

Produkcja: [albion-social.vercel.app](https://albion-social.vercel.app/)

Repozytorium: [Szewcuu/albion-social](https://github.com/Szewcuu/albion-social)

## Stan projektu

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

## Najbliższy krok

> **P4.2: komentarze i zgłaszanie nadużyć pod buildami**

P4.1 jest wdrożone: publikacja prowadzi do publicznego URL-a buildu, głosowanie jest ograniczone do jednego rekordu użytkownika, a ulubione są prywatne i chronione przez RLS. Następny sprint rozbuduje stronę buildu o moderowalne komentarze i bezpieczne zgłoszenia nadużyć.

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
- [ ] dodać komentarze i zgłaszanie nadużyć pod buildami
- [ ] dodać wygasanie, odnawianie i archiwizację ofert rynkowych
- [ ] dodać szczegóły oferty i bezpieczny przepływ kontaktu ze sprzedawcą
- [ ] dodać publiczne strony gildii i kalendarz wydarzeń
- [ ] dodać centrum powiadomień w portalu
- [ ] dodać role moderatora i panel moderacji treści

### P5 — Supabase i bezpieczeństwo danych

- [ ] zapisać schemat bazy jako wersjonowane migracje w repozytorium
- [ ] przeprowadzić audyt RLS wszystkich tabel i polityk dostępu
- [ ] dodać indeksy dla najczęstszych filtrów, sortowania i relacji
- [ ] wymusić reguły własności rekordów po stronie bazy, nie tylko interfejsu
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
NEXT_PUBLIC_APP_URL
```

`SUPABASE_SERVICE_ROLE_KEY` i webhook Discorda są sekretami serwerowymi — nie wolno nadawać im prefiksu `NEXT_PUBLIC_` ani umieszczać ich w repozytorium.

## Kontrola jakości

Przed każdym wdrożeniem:

```bash
npm run lint
npm run build
```

Zmiany wdrażamy przez osobną gałąź, pull request i automatyczny deployment Vercel. Produkcja jest scalana dopiero po poprawnym buildzie i sprawdzeniu najważniejszych widoków.
