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
### Faza II — Nowe Moduły i Funkcje

- [x] **P31: 📈 Wykresy Historii Cen (Albion Data History API)** — interaktywny wykres cen z ostatnich 24h, 7d i 30d z trendami w kalkulatorze craftingu i na rynku.
- [x] **P32: 🗡️ Tierlista Meta & Stats 1v1** — ranking obserwacyjny z najnowszych publicznych pojedynków solo Gameinfo API, z ważeniem małych prób, jawną metodologią i stanem niedostępności bez danych zastępczych.
- [x] **P33: 📊 Rozszerzone Wykresy Kursu Złota (Gold API)** — rzeczywiste zakresy dat, walidacja notowań i świeżości, jawne stany awarii bez kursu zastępczego oraz niezależne działanie analizy rynku przy awarii Gold API.
- [x] **P34: 🔔 Centrum Powiadomień na Żywo (Header Bell)** — dzwonek powiadomień w nagłówku z licznikiem nieprzeczytanych wiadomości, dedykowanymi ikonami kategorii, oznaczaniem pojedynczych i zbiorczych powiadomień oraz subskrypcją Supabase Realtime.

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

## Bieżący etap

> **P39: lekka sesja portalu oraz mobilne Wyprawy i Killboard**

- [x] porównać pierwsze i ponowione próby Lighthouse obu tras oraz wskazać koszt pełnego klienta `supabase-js`
- [x] oddzielić lekką obsługę Auth od klienta PostgREST, Realtime, Storage i Functions; ciężki klient nie występuje już w początkowym HTML Wypraw ani Killboardu
- [x] przenieść początkowe dane konta i Wypraw za chronione Route Handlers bez osłabienia RLS ani autoryzacji
- [x] zachować logowanie Discord, role administratora, powiadomienia, zapisy, opuszczanie i tworzenie wypraw
- [x] potwierdzić lint, 53 testy jednostkowe, build, budżet JavaScript (`1699,8 KB / 1800 KB`), publiczne E2E oraz zalogowane E2E w CI
- [x] opublikować P39 i powtórzyć pełny produkcyjny Lighthouse — bramka `14/14` przeszła; Wyprawy mobile osiągnęły Performance `90`, TBT `390 ms`, LCP `1,1 s` i CLS `0`, a Killboard mobile `98`, `160 ms`, `1,2 s` i `0`; oba widoki desktopowe uzyskały Performance `100` i TBT `0 ms` ([audyt produkcyjny](https://github.com/Szewcuu/albion-social/actions/runs/32579248545), 22 sierpnia 2026)

### P38 — stabilny zimny start wspólnego shellu

- [x] porównać zimne i kontrolne próby Lighthouse ekranu gościa, Tawerny oraz kreatora buildu
- [x] sprawdzić wydzielenie nawigacji gościa i odrzucić wariant powielający zależności w chunkach Turbopacka
- [x] odroczyć PWA, telemetrię i usługi konta poza krytyczną ścieżkę pierwszego renderu
- [x] zachować natychmiastowe sprawdzanie sesji, ochronę tras, powiadomienia, rolę administratora i Realtime
- [x] potwierdzić lint, 53 testy jednostkowe, build, budżet JavaScript (`1696,0 KB / 1800 KB`) oraz publiczne i zalogowane E2E
- [x] opublikować P38 i powtórzyć pełny produkcyjny Lighthouse — bramka `14/14` przeszła, wszystkie widoki desktopowe osiągnęły Performance `100`, a pierwsza próba mobile dała: brama logowania `98` / TBT `100 ms` / LCP `2,0 s`, Tawerna `93` / `320 ms` / `1,1 s`, kreator buildu `93` / `310 ms` / `1,3 s`; CLS wszystkich trzech wynosi `0` ([audyt produkcyjny](https://github.com/Szewcuu/albion-social/actions/runs/32529368353), 21 sierpnia 2026)

### P37 — mobilny Killboard i koszt pustego startu

- [x] przeanalizować obie produkcyjne próby Lighthouse Killboardu oraz koszt początkowego pakietu i głównego wątku
- [x] oddzielić wyszukiwarkę od wyników, pełnego profilu, wycen ekwipunku i historii walk
- [x] ładować ciężkie moduły dopiero po znalezieniu lub wybraniu gracza, zachowując linki `?nick=` i wszystkie akcje
- [x] rozłożyć aktualizacje wyników i profilu na pracę współbieżną bez pogorszenia obsługi błędów API
- [x] potwierdzić lint, 51 testów jednostkowych, build, budżet JavaScript i publiczne oraz zalogowane E2E; początkowy pakiet `/killboard` zmalał z `790,3 KB` do `749,2 KB`
- [x] opublikować P37 i powtórzyć produkcyjny Lighthouse — pełna bramka `14/14` przeszła, a Killboard mobile już w pierwszej zimnej próbie osiągnął Performance `93`, TBT `314 ms`, LCP `1,0 s` i CLS `0` (poprzednio: próba kontrolna `88` / `475 ms`, zimna `83` / `706 ms`; [audyt produkcyjny](https://github.com/Szewcuu/albion-social/actions/runs/32526962521), 21 sierpnia 2026)

### P36 — mobilny Rynek i progresywna tablica ofert

- [x] przeanalizować produkcyjny raport Lighthouse Rynku i wskazać koszt hydracji poniżej pierwszego ekranu
- [x] wydzielić formularz, filtry i karty ofert do osobnych pakietów ładowanych progresywnie
- [x] zachować natychmiastowe otwieranie bezpośrednich linków do ofert oraz wszystkie akcje właściciela, ulubionych i obserwowania
- [x] rozłożyć aktualizację ofert na pracę współbieżną i ograniczyć koszt układu kart poza ekranem
- [x] potwierdzić lint, 51 testów jednostkowych, build, budżet JavaScript i publiczne oraz zalogowane E2E; początkowy pakiet `/rynek` zmalał z `783,8 KB` do `744,5 KB`
- [x] opublikować P36 i powtórzyć produkcyjny Lighthouse — pełna bramka `14/14` przeszła; oficjalna próba kontrolna Rynku mobile osiągnęła Performance `97`, TBT `190 ms`, LCP `1,3 s` i CLS `0`, a DOM pierwszego widoku zmalał z `506` do `293` elementów; pierwsza zimna próba miała wariancję `86` / `555 ms` ([audyt produkcyjny](https://github.com/Szewcuu/albion-social/actions/runs/32525024052), 21 sierpnia 2026)

### P35 — mobilna Tawerna i koszt startu zalogowanej aplikacji

- [x] przeanalizować produkcyjny raport Lighthouse Tawerny i wskazać główne zadania blokujące wątek UI
- [x] odroczyć niekrytyczne statystyki, pobieranie wiadomości oraz subskrypcje Realtime do czasu po pierwszym renderze
- [x] zachować natychmiastową obsługę sesji, działanie czatu, powiadomień i automatycznego przewijania
- [x] dodać współdzielony, testowalny harmonogram pracy wykonywanej w czasie bezczynności przeglądarki
- [x] potwierdzić lint, 51 testów jednostkowych, build, budżet JavaScript i publiczne oraz zalogowane E2E
- [x] opublikować P35 i powtórzyć produkcyjny Lighthouse — pełna bramka `14/14` przeszła; mobilna Tawerna wzrosła z `87` do `93`, TBT spadł z `510 ms` do `330 ms`, LCP wynosi `1,3 s`, a CLS `0` ([audyt produkcyjny](https://github.com/Szewcuu/albion-social/actions/runs/32502037434), 21 sierpnia 2026)

### P26 — mobilna wydajność Rynku i Zbrojowni

- [x] przeanalizować produkcyjne raporty Lighthouse dla `/rynek` i `/buildy`
- [x] rozdzielić ciężkie moduły Meta 1v1, planera składu i porównywarki buildów od początkowego pakietu Zbrojowni
- [x] uruchamiać analitykę rynku oraz porównywarkę buildów dopiero na wyraźne żądanie użytkownika
- [x] opóźnić obrazy przedmiotów spoza pierwszego ekranu Rynku
- [x] potwierdzić lint, 48 testów jednostkowych, build i budżet JavaScript; początkowy pakiet `/buildy` zmalał z `806,8 KB` do `768,1 KB`
- [x] opublikować P26 i powtórzyć produkcyjny Lighthouse — pełna bramka `14/14` przeszła; mobile: ekran gościa `95` (LCP `2,8 s`, CLS `0`), Rynek `91` (LCP `1,1 s`, TBT `390 ms`), Zbrojownia `91` (LCP `1,7 s`, TBT `370 ms`); wszystkie widoki desktopowe `100` (21 sierpnia 2026)

### P25 — pełny Lighthouse zalogowanego portalu i stabilny shell uwierzytelnienia

- [x] uruchomić na produkcji 14 audytów Lighthouse: ekran publiczny oraz sześć chronionych tras w profilach mobile i desktop
- [x] potwierdzić, że jednorazowa sesja Supabase działa również w audycie Lighthouse bez włączania logowania Email
- [x] zdiagnozować przekroczenie budżetu CLS na desktopowej stronie Wypraw
- [x] zastąpić pełnoekranowy stan sprawdzania sesji stabilnym szkieletem chronionego shellu bez ujawniania prywatnej treści
- [x] blokować pomiar strony logowania Vercel i obsłużyć opcjonalny sekret Automation Bypass dla chronionych Preview
- [x] powtórzyć pełny audyt po publikacji produkcyjnej — 14/14 widoków przeszło bramkę; Wyprawy: CLS `0,0005` mobile i `0` desktop (21 sierpnia 2026)

Zakres P5, Priorytety C–F, etapy E.1–E.6 oraz P31–P34 są ukończone. Portal posiada regionalne wyceny, porównanie buildów, Wartownię walk, automatyczny katalog przedmiotów, serwerową historię rynku z alertami cenowymi, wiarygodny kurs złota, monitoring jakości integracji, automatyczny audyt Lighthouse, macierz 96 inspekcji responsywności oraz opartą na rzeczywistych zdarzeniach tierlistę solo. P25 domyka pomiar chronionych ekranów po przejściu portalu na wyłącznie Discord OAuth.

### P5.0 — bezpieczeństwo i CI

- [x] usunąć publiczny `handle_build_vote`, który przyjmował dowolne `p_user_id`
- [x] odebrać rolom `anon` bezpośredni dostęp do funkcji `SECURITY DEFINER`
- [x] zabezpieczyć funkcje triggerów przez pusty `search_path`
- [x] zastąpić dwa workflow jednym pipeline na Node 22
- [x] usunąć wszystkie błędy i ostrzeżenia lint
- [x] wykonać lokalny build i publiczne testy E2E
- [x] potwierdzić zielony workflow GitHub Actions po publikacji gałęzi
- [x] dodać konto testowe i uruchomić pełne authenticated E2E

### P5.1 — spójność Supabase

- [x] dodać do produkcyjnego `profiles` brakujące pola weryfikacji i Fame
- [x] zastąpić nieskuteczne `CREATE TABLE IF NOT EXISTS` migracją opartą o `ALTER TABLE`
- [x] scalić duplikaty polityk profili, powiadomień i starych ofert
- [x] przepisać polityki `auth.uid()` na wydajniejsze InitPlan
- [x] dodać 18 brakujących indeksów kluczy obcych
- [x] ograniczyć publiczne odczyty moderowanych tabel do rekordów `visible`
- [x] wdrożyć i zweryfikować migracje P5 na produkcyjnym Supabase

### P5.2 — prawdziwe przepływy użytkownika

- [x] wdrożyć serwerowe usuwanie użytkownika z `auth.users` i danych zależnych
- [x] poprawić tekst Polityki Prywatności po wdrożeniu rzeczywistego usuwania
- [x] zabezpieczyć `/api/admin/health` rolą personelu i prawdziwie testować Discord
- [x] przenieść tworzenie powiadomień dla innych użytkowników do walidowanych endpointów serwerowych i odebrać klientom bezpośredni `INSERT`
- [x] jednoznacznie oznaczyć obecny moduł meta 1v1 jako demonstracyjny i usunąć fałszywą informację o danych live
- [x] usunąć ukryty kurs zastępczy złota i pokazywać jawny stan błędu
- [x] synchronizować przypomnienia, własne timery, obserwowane elementy i ulubione karty po stronie konta

### P5.3 — PWA, zależności i pełne QA

- [x] przygotować serwerowe RPC dla moderacji i zarządzania rolami, dostępne wyłącznie przez `service_role`
- [x] przełączyć endpointy panelu administratora na nowe RPC z jawnym identyfikatorem zweryfikowanego aktora
- [x] zablokować samodzielną zmianę `profiles.role` i `profiles.is_admin` przez zwykłe konto
- [x] przenieść zapis weryfikacji postaci i Fame z klienta do walidowanego endpointu serwerowego
- [x] usunąć lokalny fallback, który mógł prezentować nieweryfikowany nick jako zweryfikowaną postać
- [x] zweryfikować migrację na produkcyjnym schemacie w transakcji zakończonej `ROLLBACK`
- [x] zastosować migrację fazy 1 przed wdrożeniem kodu
- [x] po wdrożeniu odebrać `authenticated` dostęp do czterech starych RPC
- [x] rozszerzyć E2E o odmowę dostępu do API moderacji dla gościa i zwykłego użytkownika
- [x] dodać brakujący favicon i naprawić instalację cache service workera
- [x] nie cache'ować prywatnych stron użytkownika strategią cache-first
- [x] zaktualizować podatne zależności wskazane przez `npm audit`
- [x] przenieść fonty do lokalnych assetów, aby build nie wymagał Google Fonts
- [x] oblewać testy przy nieoczekiwanym błędzie konsoli lub odpowiedzi `4xx/5xx`
- [x] powtórzyć Lighthouse desktop/mobile bez rozszerzeń, jako gość i użytkownik

### P5.4 — Lighthouse mobile, dostępność i odporność UI

#### P5.4A — jakość i regresje

- [x] powiązać etykiety z polami kreatora buildu i formularzy wypraw
- [x] poprawić hierarchię nagłówków kreatora buildu i widżetu wypraw
- [x] podnieść kontrast opisu ekwipunku oraz poprawić dostępną nazwę marki w sidebarze
- [x] nadać selektorowi regionu rynku złota dostępną nazwę
- [x] zastąpić bezpośrednie obrazy ofert rynku bezpiecznym proxy z odpowiedzią zastępczą zamiast `404`
- [x] dodać automatyczne wykrywanie błędów konsoli, `pageerror`, nieudanych żądań oraz odpowiedzi `4xx/5xx` w Playwright
- [x] rozszerzyć E2E o weryfikację dostępnych etykiet i fallbacku nieprawidłowego ID przedmiotu

#### P5.4B — wydajność mobile

- [x] usunąć podwójne klienckie sprawdzanie sesji na stronie głównej i w `AppShell`
- [x] renderować statyczny szkielet portalu i nagłówek administratora bez oczekiwania na dane Supabase
- [x] opóźnić ładowanie czatu, statystyk, wykresów i kalkulatorów do czasu wyświetlenia podstawowej treści
- [x] ograniczyć początkowy DOM rynku i liczbę elementów wykresu SVG
- [x] powtórzyć 14 raportów Lighthouse w czystym profilu Chrome; utrzymywać cel Performance `90`, twardą podłogę mobile `85` oraz limity LCP ≤ `3 s`, TBT ≤ `600 ms` i CLS ≤ `0,1`

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

- [x] uruchomić pełne testy E2E zalogowanego użytkownika po dodaniu dedykowanego konta `E2E_USER_*` do GitHub Actions
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
- [x] wykonać produkcyjny smoke test po wdrożeniu gałęzi

### Priorytet C — funkcje społecznościowe

- [x] dodać publiczne profile graczy z przypiętą postacią Albionu, opcjonalnie udostępnianymi ulubionymi buildami i chronologiczną aktywnością
- [x] rozbudować strony gildii o role, rekrutację, wydarzenia, skład i historię aktywności
  - [x] dodać centrum gildii z manifestem, publicznym składem, wydarzeniami i kroniką
  - [x] dodać panel dowodzenia lidera/oficera, trwałą rekrutację i powiadomienia kandydatów
  - [x] wdrożyć atomowe przyjmowanie podań, RLS, jawne granty i indeksy na produkcyjnym Supabase
- [x] dodać kalendarz wydarzeń oraz zapisy z przypomnieniami w centrum powiadomień
  - [x] dodać globalny kalendarz z filtrami serwera, typu wydarzenia i własnych zapisów
  - [x] dodać role, limit miejsc, kolejkę rezerwową oraz wydarzenia publiczne i tylko dla gildii
  - [x] wysyłać przypomnienia i informacje o odwołaniu przez centrum powiadomień
- [x] dodać obserwowanie buildów, gildii, ofert i graczy oraz powiadomienia o zmianach
  - [x] dodać trwałą Wartownię obserwowanych elementów i przyciski w czterech typach treści
  - [x] powiadamiać o nowych buildach i ofertach graczy, komentarzach buildów, wydarzeniach gildii i zmianach ofert
  - [x] zabezpieczyć obserwacje RLS, jawnymi grantami, walidacją encji i ochroną przed obserwowaniem własnych treści
- [x] rozbudować komentarze o odpowiedzi, edycję własnej treści i sortowanie
  - [x] dodać wątki odpowiedzi z podglądem komentowanej treści, kotwicami i powiadomieniem autora
  - [x] naprawić RLS edycji własnego komentarza oraz ograniczyć granty do dozwolonych kolumn
  - [x] sortować całe wątki według aktywności, daty najnowszej lub najstarszej
  - [x] zachować odpowiedzi po usunięciu komentarza nadrzędnego i ograniczyć głębokość wątku w bazie
- [x] dodać bezpieczny przepływ kontaktu kupujący–sprzedający bez publikowania danych prywatnych
  - [x] zastąpić publiczne pola Discord/kontakt prywatnym wątkiem powiązanym z ofertą
  - [x] dodać skrzynkę handlową, historię odpowiedzi, licznik nieprzeczytanych oraz zamykanie i wznawianie rozmów
  - [x] zabezpieczyć rozmowy i wiadomości RLS, jawnymi grantami service-only, kontrolą uczestników i trwałym rate limitingiem
  - [x] odciąć klientowi dostęp do historycznych pól kontaktowych i ograniczyć rynek do bezpiecznych kolumn

### Priorytet D — dane Albionu i narzędzia

- [x] wyceniać utracony ekwipunek w Killboardzie na podstawie wybranego regionu i aktualności ceny
  - [x] pobierać ceny wyposażenia ofiary z właściwego hosta Europa, Ameryka lub Azja i grupować zapytania w bezpieczne paczki
  - [x] preferować najświeższą klasę ofert sprzedaży, używać ceny kupna tylko jako jawnego fallbacku i raportować pokrycie zestawu
  - [x] prezentować łączną wartość strat, miasto skanu, wiek danych oraz status świeże / starsze / nieaktualne
  - [x] objąć logikę wyceny testami jednostkowymi i przepływ Killboardu testem E2E
  - [x] odróżniać brak postaci od czasowej awarii regionalnego Gameinfo i wskazywać niedostępny serwer
  - [x] zabezpieczyć podgląd ekwipunku przed niepełnymi historycznymi danymi buildów oraz oznaczać stare logi jako historyczne
- [x] dodać porównanie buildów, umiejętności przedmiotów oraz koszt zestawu w wybranych miastach
  - [x] zastąpić heurystyczne ceny zapytaniami do Albion Online Data Project dla Europy, Ameryki i Azji
  - [x] wyceniać oba buildy równolegle w dwóch wybranych miastach z pokryciem i wiekiem skanów
  - [x] porównywać układ 10 slotów, estymowane IP oraz rotacje zapisane przez autora buildu
  - [x] sumować stosy mikstur i jedzenia, rozróżniać jakość oraz używać ceny kupna tylko jako jawnego fallbacku
  - [x] nie wskazywać tańszego zestawu, jeśli wycena któregokolwiek buildu jest niepełna
  - [x] objąć konwersję buildów, porcjowanie zapytań i wycenę testami jednostkowymi
- [x] umożliwić zapis obserwowanych postaci i automatyczne podsumowania ich nowych walk
  - [x] pozwolić obserwować dowolną postać bez wymagania konta w portalu i zapisać jej region
  - [x] zainicjalizować kursor historią już znanych walk, aby pierwsza obserwacja nie tworzyła fałszywych alertów
  - [x] grupować obserwacje tej samej postaci i pobierać jej historię tylko raz podczas synchronizacji
  - [x] wysyłać jedno idempotentne podsumowanie nowych zabójstw, zgonów i Fame zamiast serii powiadomień
  - [x] dodać ręczne odświeżanie Wartowni z limitem oraz automatyczną kontrolę w istniejącym zadaniu cron
  - [x] objąć wykrywanie nowych zdarzeń testami jednostkowymi, a obserwowanie i Wartownię testami E2E
- [x] aktualizować katalog przedmiotów automatycznie z wersjonowanym fallbackiem lokalnym
  - [x] generować zweryfikowany snapshot z polskimi i angielskimi nazwami na podstawie commita `ao-data/ao-bin-dumps`
  - [x] zapisywać hash treści, commit źródłowy, datę wersji i liczbę rekordów
  - [x] usunąć pobieranie i parsowanie wielomegabajtowego katalogu z ruchu użytkowników
  - [x] odświeżać snapshot co tydzień przez GitHub Actions i tworzyć osobny PR tylko przy realnej zmianie
  - [x] zatrzymać aktualizację przy uszkodzonym źródle, zbyt małym katalogu, niespójnym hashu lub błędnym rekordzie oraz bezpiecznie deduplikować identyfikatory
  - [x] wyszukiwać po polskiej nazwie, angielskiej nazwie oraz identyfikatorze przedmiotu
  - [x] walidować snapshot w CI oraz testować normalizację, kategorie i kontrakt API
- [x] dodać historię zmian cen i alerty cenowe przechowywane po stronie serwera
  - [x] zapisywać godzinowe próbki zleceń sprzedaży i kupna dla analizowanych oraz obserwowanych przedmiotów
  - [x] utrzymywać alert osobno dla przedmiotu, regionu, miasta, jakości i strony rynku
  - [x] wysyłać idempotentne powiadomienie dopiero przy wejściu ceny w warunek alertu
  - [x] sprawdzać aktywne alerty w istniejącym zadaniu cron i umożliwić bezpieczne odświeżenie po analizie
  - [x] usuwać próbki starsze niż 90 dni i deduplikować wiele skanów w tej samej godzinie
  - [x] chronić alerty właścicielskim RLS, a historię udostępniać wyłącznie przez uwierzytelnione API serwera
  - [x] wyświetlać zapisany trend portalu obok historii transakcji Albion Data Project
  - [x] objąć progi testami jednostkowymi oraz pełny cykl alertu testem E2E

### Priorytet E — wydajność, SEO i jakość UI

- [x] podzielić najcięższe komponenty klienckie i ograniczyć liczbę równoległych zapytań po wejściu na stronę
  - [x] zastąpić sześć zapytań statystyk Tawerny jednym uwierzytelnionym podsumowaniem z agregacją w Postgresie
  - [x] ładować Wywiad rynkowy dopiero przed wejściem sekcji w viewport i Kurs złota dopiero po wybraniu zakładki
  - [x] nie pobierać modułu wyceny oferty ani modalu kontaktu, zanim użytkownik faktycznie ich nie potrzebuje
- [x] dodać paginację lub wirtualizację długich list: czat, buildy, rynek, komentarze i zgłoszenia
  - [x] zastosować stabilny kursor `created_at + id`, deduplikację rekordów oraz jawne przyciski wczytywania kolejnych stron
  - [x] dodać indeksy z tie-breakerem `id` dla czatu, buildów, rynku, komentarzy i kolejki zgłoszeń
  - [x] oddzielić stronicowaną kolejkę zgłoszeń od lekkiego podsumowania panelu administratora
- [x] przygotować unikalne metadata, Open Graph, sitemapę i canonical URL dla publicznych treści
  - [x] ujednolicić canonicale, Open Graph, Twitter Cards i tytuły przez wspólny generator SEO
  - [x] indeksować wyłącznie publiczną bramę, regulamin i politykę prywatności
  - [x] oznaczyć chronione moduły jako `noindex` i usunąć je z publicznej sitemapy
  - [x] dodać dynamiczne metadata dla buildów, gildii i profili graczy bez ujawniania ich w sitemapie
- [x] mierzyć Core Web Vitals oraz budżet rozmiaru JavaScript w CI
  - [x] zachować Vercel Speed Insights jako pełny pomiar rzeczywistych użytkowników
  - [x] rejestrować w monitoringu portalu wyłącznie słabe wyniki LCP, INP i CLS
  - [x] blokować CI po przekroczeniu budżetu całego JavaScript, pojedynczego chunku lub najcięższej trasy
  - [x] publikować raport budżetu jako artefakt każdego workflow Quality
- [x] przeprowadzić ponowny Lighthouse dla mobile i desktop po wdrożeniu obecnej gałęzi
- [x] zautomatyzować 14 pomiarów w GitHub Actions, zachować raporty prób kontrolnych i blokować przekroczenia budżetu stabilności
- [x] uzupełnić testy wizualne dla 360, 390, 430, 768, 1280 i 1920 px
  - [x] objąć macierzą 3 strony publiczne i 13 najważniejszych ekranów po zalogowaniu
  - [x] wykrywać poziomy overflow i dołączać pełny zrzut strony do raportu Playwright

## Roadmapa / TODO

Kolejność poniżej jest proponowaną kolejnością realizacji. Kończymy i odhaczamy jeden etap przed rozpoczęciem następnego.

### P0 — fundament techniczny API

- [x] utworzyć wspólny adapter regionów: Europa, Ameryka i Azja
- [x] dodać timeout, kontrolowane ponowienia i zunifikowane komunikaty błędów
- [x] dodać cache po stronie Next.js dla danych, które nie muszą być pobierane przy każdym wejściu
- [x] dodać rate limiting do publicznych tras `/api/albion/*` i `/api/prices`
- [x] walidować identyfikatory przedmiotów, miast, regionów i parametrów paginacji
- [x] zwracać informację o źródle danych i czasie ostatniej aktualizacji
- [x] dodać testy adapterów z mockami odpowiedzi zewnętrznych API
  - [x] objąć testami sukces, retry po `429`, brak retry po `404`, timeout i nieprawidłowy JSON
- [x] przygotować monitoring błędów integracji i czasu odpowiedzi
  - [x] zapisywać osobny status, kod HTTP i opóźnienie dla każdego regionu Gameinfo oraz Albion Data
  - [x] pokazywać diagnostykę regionów bezpośrednio w panelu administratora
  - [x] rejestrować zmianę stanu integracji wraz z poprzednim statusem i diagnostyką regionów

### P1 — Killboard 2.0

- [x] przebudować UI Killboardu zgodnie z systemem wizualnym AOPP
- [x] rozdzielić wyszukiwanie gracza od pobierania pełnego profilu
- [x] dodać wybór wyniku, gdy API zwróci kilka podobnych nicków
- [x] wyświetlać PvP Fame, PvE Fame, Gathering, Crafting i Fame Ratio
- [x] dodać ostatnie zabójstwa i zgony z wyposażeniem uczestników
- [x] wyceniać utracony ekwipunek na podstawie Albion Online Data Project
  - [x] rozróżniać pełną wycenę od minimalnej wartości przy częściowym pokryciu cen
  - [x] pokazywać źródło, miasto, świeżość i fallback ceny kupna dla każdego slotu
- [x] dodać filtrowanie historii po typie zdarzenia i regionie
- [x] dodać profil gildii: podstawowe statystyki i lista członków
- [x] umożliwić przypięcie postaci Albionu do profilu portalu
  - [x] zagwarantować jedno przypięcie postaci w obrębie regionu i blokować bezpośrednie fałszowanie statusu
  - [x] umożliwić zmianę oraz odłączenie postaci z poziomu profilu
  - [x] odróżnić przypięcie rekordu API od potwierdzenia własności konta w grze
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
- [x] dodać wygasanie, odnawianie i archiwizację ofert rynkowych
- [x] dodać szczegóły oferty i bezpieczny przepływ kontaktu ze sprzedawcą
- [x] dodać publiczne strony gildii i kalendarz wydarzeń
- [x] dodać centrum powiadomień w portalu
- [x] dodać podstawowy panel administratora i moderację zgłoszonych komentarzy
- [x] rozszerzyć panel o role moderatora i pozostałe typy treści

### P5 — Supabase i bezpieczeństwo danych

- [x] zapisać schemat bazy jako wersjonowane migracje w repozytorium
- [x] przeprowadzić audyt RLS wszystkich tabel i polityk dostępu
- [x] dodać indeksy dla najczęstszych filtrów, sortowania i relacji
- [x] wymusić reguły własności rekordów po stronie bazy, nie tylko interfejsu
- [x] dodać tabele głosów, ulubionych, zgłoszeń i powiadomień
- [x] określić retencję danych i procedurę usunięcia konta
- [x] sprawdzić logi pod kątem wycieku danych użytkownika lub sekretów

### P6 — jakość, SEO i wydajność

- [x] dodać testy end-to-end kluczowych przepływów
- [x] dodać automatyczny lint i build w GitHub Actions
- [x] usunąć ostrzeżenia `no-img-element` tam, gdzie optymalizacja Next Image jest bezpieczna
- [x] dodać unikalne metadata, Open Graph i canonical URL dla podstron
- [x] przygotować sitemapę i robots.txt
- [x] dodać PWA: manifest, ikony i podstawowy tryb offline
- [x] dodać pomiar błędów frontendowych i Core Web Vitals
- [x] wykonać ponowny audyt Lighthouse po zakończeniu głównych ekranów

### Etap P7 — Wycena Ekwipunku Killboarda & Kalendarz Wydarzeń

- [x] Automatyczne przeliczanie wartości utraconego ekwipunku graczy w walkach na Killboardzie na podstawie cen z rynków królewskich.
- [x] Wyświetlanie sumarycznej wartości zniszczonego sprzętu (z podziałem na zwycięzcę i pokonanego) w monetach Silver (~1.5M Silver).
- [x] Kalendarz nadchodzących wydarzeń gildyjnych i wypraw z opcją zapisów i powiadomień.

### Etap P8 / D.2 — Porównywarka Buildów & Kalkulator Kosztów Zestawów

- [x] Narzędzie do porównywania 2 zestawów side-by-side: układ ekwipunku, zapisane rotacje, szacowane IP i różnice slotów.
- [x] Kalkulator kosztu obu buildów w dwóch wybranych miastach, oparty na rzeczywistych skanach Albion Online Data Project zamiast cen heurystycznych.

### Etap P9 — Kalkulator Bonusu Miast & Podatku Stoiska Rzemieślniczego

- [x] Automatyczne dobieranie wskaźnika zwrotu surowców (RRR %) dla każdego miasta (Martlock, Lymhurst, Fort Sterling, Bridgewatch, Thetford, Caerleon, Brecilien).
- [x] Uwzględnianie opłaty odżywczej stoiska gracza (Nutrition Tax Fee / 100 Nutrition) w wyliczeniu czystego zysku rzemieślniczego.

### Etap P10 — Dynamiczna Mapa Witryny (Sitemap.xml), Robots.txt & Metadata Open Graph

- [x] Utworzenie dynamicznego generowania mapy witryny (`src/app/sitemap.js`) rejestrującego podstrony i trasy dynamiczne.
- [x] Utworzenie pliku `src/app/robots.js` z regułami indeksowania wyszukiwarek.
- [x] Dodanie unikalnych metadanych SEO, tytułów, opisów oraz kart Open Graph (og:image, og:title, og:description) dla podstron i kart w mediach społecznościowych.

### Etap P11 — System Obserwowania & Centrum Powiadomień Portalu

- [x] Przycisk „Obserwuj” zapisuje subskrypcje na koncie w `entity_follows`, dzięki czemu wracają po odświeżeniu, ponownym logowaniu i zmianie urządzenia.
  - [x] Obserwacje są odseparowane per użytkownik przez RLS i udostępnione zalogowanym wyłącznie do odczytu; walidowany zapis i usuwanie wykonuje chronione API.
  - [x] Buildy, gildie, oferty, profile portalu i postacie Albionu korzystają z jednego mechanizmu oraz wspólnej Wartowni `/obserwowane`.
  - [x] Usunięto nieużywany lokalny magazyn obserwacji i dawną atrapę centrum powiadomień.
- [x] Centrum Powiadomień w górnym pasku korzysta z rzeczywistych rekordów Supabase oraz Realtime dla nowych wypraw, ofert, komentarzy i zmian obserwowanych elementów.

### Etap P12 — PWA Offline Service Worker, Manifest & Wydajność Web Vitals

- [x] Service Worker instaluje jawny cache publicznych assetów, nie zapisuje prywatnych dokumentów ani API i pokazuje bezpieczny ekran offline.
- [x] Konfiguracja powiadomień diagnostycznych wydajności (Speed Insights / Core Web Vitals) dla ulepszenia czasy ładowania na urządzeniach mobilnych.

### Etap P13 — Unikalne Metadane SEO & Open Graph dla Wszystkich Podstron Portalu

- [x] Dodanie indywidualnych wywołań `export const metadata` dla podstron: `/buildy`, `/gildie`, `/rynek`, `/killboard`, `/kalkulator-craftingu`, `/timery`, `/wyprawy`, `/loot-split`.
- [x] Precyzyjne tytuły, opisy i słowa kluczowe SEO dla kart podglądu społecznościowego na Discordzie i w wyszukiwarkach.

### Etap P14 — Automatyzacja CI/CD GitHub Actions Workflow

- [x] Jeden przepływ GitHub Actions (`.github/workflows/quality.yml`) uruchamiający lint, build i Playwright na Node 22 przy pushu oraz Pull Requescie do `main`.
- [x] Potwierdzenie zielonego przebiegu na GitHubie po publikacji gałęzi P5.

### Etap P15 — Zestaw Testów End-to-End (E2E Integration Test Suite)

- [x] Publiczne i zalogowane scenariusze Playwright znajdują się w aktywnym katalogu `tests/e2e`.
- [x] Publiczna bramka, Regulamin, Prywatność i chronione endpointy przechodzą 10/10 testów.
- [x] Zalogowane testy korzystają z dedykowanego konta `E2E_USER_*` w sekretach GitHub.

### Etap P16 — Wygasanie, Odnawianie & Archiwizacja Ofert Rynkowych

- [x] Automatyczne obliczanie czasu ważności ogłoszeń rynkowych P2P (standardowo 7 dni aktywności).
- [x] Wskaźniki stanu oferty ("Aktywna", "Wymaga odnowienia", "Wygasła / Zarchiwizowana") z opcją 1-klikowego odnowienia oferty przez sprzedawcę.

### Etap P17 — Procedura Usunięcia Konta & Retencja Danych RODO

- [x] Interfejs przycisku i modalu usunięcia konta w zakładce Ustawień Profilu (`/profil`).
- [x] Serwerowe usunięcie `auth.users`, profilu i danych zależnych wraz z obsługą błędów oraz anonimizacją audytu.
- [x] Zapisanie zasad retencji danych osobowych i procedur anonimizacji w Polityce Prywatności (`/prywatnosc`).

### Etap P18 — Wersjonowane Migracje Supabase & Indeksy Wydajnościowe

- [x] Dodanie idempotentnej migracji P5 synchronizującej istniejący schemat przez `ALTER TABLE`.
- [x] Utworzenie indeksów B-Tree pokrywających wszystkie produkcyjne klucze obce wskazane przez Supabase Advisor.
- [x] Uporządkowanie historycznych migracji `001`–`008` względem rejestru migracji produkcyjnych.
  - [x] Skrypty sprzed uruchomienia rejestru przeniesiono do `supabase/legacy-migrations`, aby CLI nie próbował wykonywać ich na produkcji.
  - [x] Aktywne pliki otrzymały timestampy zgodne z `supabase_migrations.schema_migrations`, a migrację Priority B rozdzielono zgodnie z dwoma wpisami produkcyjnymi.
  - [x] Dodano snapshot historii i walidator CI blokujący brakujące, zdublowane oraz błędnie nazwane migracje.

### Etap P23 — Utwardzenie Auth i prywatnego limitera

- [x] Przenieść techniczne buckety limitera z eksponowanego schematu `public` do `private` oraz usunąć bezpośrednie granty klienta.
- [x] Ograniczyć `SECURITY DEFINER` limitera pustym `search_path` i zweryfikować działanie RPC po migracji.
- [x] Wyłączyć nieużywany provider Email, pozostawiając Discord OAuth jako jedyną metodę logowania.
- [x] Ponownie uruchomić Supabase Security Advisor i obowiązkową bramkę CI.
  - Pozostaje jedno zaakceptowane ostrzeżenie `auth_leaked_password_protection`: ochrona haseł nie dotyczy portalu, ponieważ provider Email i logowanie hasłem są wyłączone, a plan projektu nie udostępnia tej funkcji.
- [x] Zastąpić historyczny fixture authenticated E2E oparty o Email i hasło jednorazową sesją dedykowanego konta członkowskiego, generowaną wyłącznie po stronie CI przez `service_role`; produkcyjnym wejściem użytkownika pozostaje Discord OAuth.

### Etap P19 — Statystyki Portalu & Analityka Aktywności Graczy

- [x] Widżet analityki żywej aktywności na stronie głównej Tawerny (`/`): liczba zweryfikowanych graczy, łączny rozegrany PvP/PvE Fame, aktywne oferty P2P oraz zbiórki na wyprawy.

### Etap P20 — Eksport & Import Buildów (Kody Udostępniania & Kopiowanie Zestawów)

- [x] Funkcja eksportu buildu do zwięzłego kodu udostępniania (Share Code / JSON) oraz przycisk 1-klikowego kopiowania linku w Kreatorze i podglądzie zestawu.
- [x] Funkcja importu buildu z podanego kodu udostępniania w Kreatorze Buildów (`/buildy/create`).

### Etap P21 — System Ulubionych / Zakładek dla Buildów & Ofert Rynkowych

- [x] Przycisk "Do Ulubionych" (`[ ⭐ Ulubione ]`) przy zestawach w Zbrojowni i ofertach na Rynku z zapisem w profilu gracza (`favoriteSystem.js`).
- [x] Szybki filtr "Tylko Ulubione" na podstronach `/buildy` oraz `/rynek`.

### Etap P22 — System Oceniania & Recenzowania Gildii (Guild Ratings & Reviews)

- [x] Wprowadzenie ocen gwiazdkowych (1-5 ⭐) oraz opinii dla gildii z zapisem recenzji społeczności.
- [x] Średnia ocena gildii i podgląd opinii w Rejestrze Gildii i na podstronie gildii (`/gildie/[id]`).

### Etap P23 — Kalkulator Arbitrażu Handlowego Miast Królewskich (Trade Arbitrage Calculator)

- [x] Dedykowany kalkulator arbitrażu na Rynku P2P (`TradeArbitrageCalculator.jsx`) porównujący ceny zakupu i sprzedaży przedmiotu pomiędzy 6 miastami królewskimi i Caerleon.
- [x] Wyliczanie czystego zysku po odliczeniu podatku rynkowego i opłaty za transport surowców.

### Etap P24 — Monitorowanie Stanu Usług Portalu (System Health & Audit API)

- [x] Endpoint weryfikacji zdrowia `/api/admin/health` sprawdzający opóźnienia i status Supabase, Albion Data Project oraz Gameinfo API.
- [x] Panel diagnostyczny i dziennik audytów w Panelu Administratora (`/admin`).

### Etap P25 — Kalkulator Zysku z Uszlachetniania Surowców (Refining Profit Calculator)

- [x] Narzędzie kalkulacji zysku z przeliczania surowców surowych na przetworzone (Ore -> Ingot, Hide -> Leather, Wood -> Planks, Fiber -> Cloth, Stone -> Block) dla tierów T4-T8.
- [x] Uwzględnianie wskaźnika zwrotu surowców miasta (RRR %), opłat przetwórczych oraz bonusa Skupienia (Focus).

### Etap P26 — Przelicznik Kursu Złota i Srebra (Gold to Silver Live Exchange & Converter)

- [x] Pobieranie aktualnego kursu wymiany Gold / Silver z API Albion Data Project (`/api/v2/stats/gold.json`).
- [x] Przelicznik walut na żywo i wskaźnik trendów 24h (`GoldExchangeWidget.jsx`) zintegrowany z Rynkiem P2P i Kalkulatorem.

### Etap P27 — Generator Raportów Wypraw i Podziału Łupów (Loot Split PDF/Text Export)

- [x] Eksport raportu rozliczenia srebra i przedmiotów z wyprawy drużynowej do pliku tekstowego oraz gotowego do wydruku podsumowania dla skarbnika gildii.

### Etap P28 — System Zgłaszania Nadłużyć & Kolejka Moderacyjna (Report & Moderation Queue)

- [x] Przycisk zgłaszania treści (`[ 🚩 Zgłoś nadużycie ]`) pod buildami, ofertami rynkowymi i wiadomościami z zapisem w Supabase `reports`.
- [x] Dedykowany moduł moderacyjny w Panelu Administratora (`/admin`) z opcją zatwierdzania i ukrywania treści.

### Etap P29 — Integracja Przelicznika Złota na Rynku P2P (Live Gold Rates on Market)

- [x] Integracja widżetu kursu złota `GoldExchangeWidget` na podstronie Rynku P2P (`/rynek`) ułatwiająca wycenę przedmiotów wartościowych.

### Etap P30 — Końcowy Audyt Gotowości Wdrożeniowej (Production Build & CI Verification)

- [x] Audyt statyczny, lokalny build, GitHub Actions, bezpieczny Service Worker oraz pełny Lighthouse mobile/desktop są gotowe.

## Audyt dostępnych API Albion Online

Stan zweryfikowany: **1 sierpnia 2026**. Endpointy zostały dodatkowo sprawdzone bezpośrednimi zapytaniami dla serwera europejskiego.

| Źródło | Dostępne dane | Status w projekcie | Decyzja |
| --- | --- | --- | --- |
| [Albion Online Data Project](https://www.albion-online-data.com/api/) | aktualne buy/sell orders, historia cen sprzedaży, kurs złota; regiony Europe/Americas/Asia | używamy podstawowego endpointu cen | główne źródło danych ekonomicznych |
| Gameinfo API Albion Online | wyszukiwanie, profile graczy, kill/death events, wydarzenia, gildie i członkowie | używamy wyszukiwarki i profilu gracza | używać przez własny adapter, cache i fallback; API jest nieudokumentowane i bez gwarancji stabilności |
| [Render Service](https://wiki.albiononline.com/wiki/API%3ARender_service) | ikony przedmiotów, zaklęć, wardrobe, Destiny Board i logotypy gildii | używamy ikon przedmiotów | rozszerzyć o skille i elementy profilu gildii |
| [ao-bin-dumps](https://github.com/ao-data/ao-bin-dumps/tree/master/formatted) | identyfikatory oraz polskie i angielskie nazwy przedmiotów | wersjonowany snapshot 3663 przedmiotów aktualizowany co tydzień | każdą zmianę źródła walidować i publikować przez osobny PR |
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
```

`SUPABASE_SERVICE_ROLE_KEY` i webhook Discorda są sekretami serwerowymi — nie wolno nadawać im prefiksu `NEXT_PUBLIC_` ani umieszczać ich w repozytorium.

`E2E_USER_EMAIL` wskazuje dedykowane konto członkowskie bez roli personelu. Setup CI używa `SUPABASE_SERVICE_ROLE_KEY` tylko w procesie Node do utworzenia i natychmiastowej wymiany jednorazowego tokenu; odrzuca profile moderatorów i administratorów, a klucz serwisowy ani token jednorazowy nie trafiają do przeglądarki, artefaktów ani logów. Fixture nie zmienia produkcyjnej metody logowania — użytkownicy nadal wchodzą wyłącznie przez Discord OAuth.

## Kontrola jakości

Przed każdym wdrożeniem:

```bash
npm run lint
npm run build
npm run test:e2e:public
```

Pakiet zalogowanego użytkownika uruchamia `npm run test:e2e:auth` po skonfigurowaniu `E2E_USER_EMAIL`, publicznych zmiennych Supabase oraz serwerowego `SUPABASE_SERVICE_ROLE_KEY`.

Zmiany wdrażamy przez osobną gałąź, pull request i automatyczny deployment Vercel. Produkcja jest scalana dopiero po poprawnym buildzie i sprawdzeniu najważniejszych widoków.
