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

> **Przegląd jakości portalu — podstrona po podstronie**

Każdy widok przechodzi ten sam, krótki cykl: sprawdzenie desktopu i telefonu, przepływów użytkownika, stanów pustych/błędów, treści, dostępności i wydajności; następnie zapisujemy decyzje `zostawić / zmienić / dodać / usunąć`, wdrażamy zaakceptowany zakres i dopiero przechodzimy dalej.

- [x] **Wspólny shell: centrum powiadomień** — naprawić kolizje ikon i tekstu, przewijanie, pozycjonowanie mobilne oraz zamykanie klawiszem Escape
- [x] **Brama wejścia** — ekran powitalny, logowanie Discord, footer oraz Regulamin i Prywatność dostępne dla gościa
- [x] **Tawerna** — pierwsze wrażenie po zalogowaniu, hierarchia treści, czat i stany Realtime
- [x] **Gildie** — katalog, filtry, karta gildii, analiza starć i zgłoszenia
- [x] **Wyprawy i Kalendarz** — tworzenie, zapisy, role, terminy, wygasanie i Discord
- [x] **Kuźnia Buildów** — lista, kreator, szczegóły, komentarze, warianty i zapisane buildy
- [x] **Rynek i Skrzynka handlowa** — publikacja, wyszukiwanie, wycena, negocjacje, obserwowanie i cykl życia ofert
- [x] **Kalkulator Craftingu** — czytelność danych, źródła cen, scenariusze oraz obsługa błędów API
- [x] **Kroniki Walk** — wyszukiwanie między regionami, profil gracza, historia walk i wycena ekwipunku
- [x] **Podział Łupów i Timery** — szkice, udostępnianie, obliczenia, przypomnienia i synchronizacja konta
- [x] **Profil i Obserwowane** — weryfikacja postaci, statystyki, preferencje, zapisane elementy i usunięcie konta
- [x] **Panel administratora** — kolejka moderacji, role, stan usług, dziennik i komunikaty błędów
- [x] **Wspólne elementy portalu** — audyt nawigacji, dropdownów, formularzy, komunikatów, responsywności i spójności języka; pozostałe poprawki zapisano w podsumowaniu
- [x] **Podsumowanie przeglądu** — lista wykonanych zmian, pozostały dług techniczny, pomysły rozwojowe i rekomendowana kolejna faza

### Przegląd 01 — Brama wejścia

- **Zostawić:** dwuczęściowy hero z albionowym tłem, pergaminową kartę logowania, jeden główny CTA Discord oraz publiczny dostęp wyłącznie do bramy i dokumentów prawnych.
- **Zmieniono:** krótki ekran telefonu mieści przycisk logowania bez przewijania; mobilny nagłówek dokumentów ma pełną nazwę akcji; disclaimer pozostaje widoczny w obu stopkach.
- **Dodano:** czytelne stany anulowania OAuth i błędu wymiany kodu PKCE, aktualną informację w Polityce Prywatności oraz testy najmniejszego ekranu i obu ścieżek błędu.
- **Usunięto:** wewnętrzną notatkę roboczą z produkcyjnej Polityki Prywatności.
- **Do decyzji właściciela przed komercjalizacją:** wskazać pełne dane administratora i dedykowany adres kontaktowy zamiast kontaktu wyłącznie przez profil GitHub.

### Przegląd 02 — Tawerna

- **Zostawić:** forumową formę jednej wspólnej sali, odpowiedzi z cytatem i pingiem, wysyłanie przez `Enter`, nową linię przez `Shift+Enter`, ręczne wczytywanie starszych wpisów oraz statystyki społeczności.
- **Zmieniono:** historia rozmowy jest pobierana natychmiast po zamontowaniu Tawerny zamiast czekać na bezczynność przeglądarki; kronika pokazuje więcej wiadomości na desktopie i telefonie; stan awarii Realtime nazywa się teraz uczciwie „Tryb ręczny”, ponieważ odczyt i zapis przez API nadal działają. Po kontroli produkcyjnej usunięto również pusty pasek powitalny, wzmocniono nagłówek kroniki i przebudowano statystyki na czytelną tablicę 2×2.
- **Usunięto:** liczniki Gildii, Ofert i serwerów powtórzone w nagłówku oraz blok „Szybkie Akcje Gracza”, który duplikował odnośniki istniejące w panelu bocznym i mobilnej nawigacji.
- **Potwierdzono:** po pierwszym załadowaniu, odświeżeniu i wysłaniu własnej wiadomości kronika przewija się na dół; użytkownik czytający starsze wpisy nie jest wyrywany z miejsca przez nową wiadomość; chronione API ustala autora po stronie serwera i respektuje własność/moderację przy usuwaniu.
- **Dodano kontrolę regresji:** E2E obejmuje większą historię, start na dole kroniki, odpowiedź z `replyTo`, wysłanie przez `Enter`, nową linię przez `Shift+Enter` oraz brak powielonej sekcji nawigacyjnej.
- **Do obserwacji przy wzroście ruchu:** obecne `Postgres Changes` jest wystarczające dla jednej małej sali; przy większej liczbie jednoczesnych użytkowników należy przejść na prywatny Supabase Broadcast zgodnie z aktualnym zaleceniem skalowania Realtime.

### Przegląd 03 — Gildie

- **Zostawić:** filtrowanie po serwerze, mieście i doktrynie, osobny profil gildii, centrum dowodzenia, rekrutację oraz podgląd statystyk bojowych pobierany dopiero na żądanie.
- **Zmieniono:** katalog jest teraz główną treścią strony i zajmuje pełną szerokość; formularz lidera otwiera się w osobnym, responsywnym oknie; karty są krótsze i układają się w dwie kolumny na desktopie; informacja o Gameinfo została uproszczona i przeniesiona pod wyniki; wybór podobnie nazwanych gildii nie pokazuje zmyślonego `PvP Fame: 0`.
- **Dodano:** jawny stan awarii z ponowieniem, szkielety ładowania, zerowanie filtrów, licznik wyników, walidację adresów Discord i webhooków, instrukcję utworzenia webhooka krok po kroku, blokadę wielokrotnej publikacji oraz kontrolę regresji mobile dla katalogu i formularza.
- **Utwardzono backend:** odczyt i publikacja gildii przechodzą przez uwierzytelnione API, autor jest ustalany po stronie serwera, obowiązuje limit pięciu publikacji na dobę, a klient nie otrzymuje surowych błędów bazy.
- **Zabezpieczono Supabase:** role `anon` i `authenticated` utraciły możliwość odczytu `guilds.webhook_url`; test uprawnień potwierdził dostęp wyłącznie dla backendowego `service_role`, przy zachowaniu publicznego odczytu nazwy i pozostałych pól profilu.
- **Potwierdzono:** brak danych nie jest już mylony z awarią, wyszukiwarka ma prawidłowy odstęp dla ikony, statystyki bez sławy pokazują „Brak danych Fame” zamiast fałszywego `+0`, a zamknięta rekrutacja pozostaje jednoznacznie nieaktywna.
- **Do obserwacji:** ostrzeżenie doradcy Supabase dotyczące ochrony haseł nie dotyczy obecnego logowania wyłącznie przez Discord; niewykorzystanych indeksów nie usuwamy bez dłuższej historii ruchu produkcyjnego.

### Przegląd 04 — Wyprawy i Kalendarz

- **Zostawić:** podział składu na role, wymagane IP, integrację Discord, możliwość ponowienia publikacji, zapisy na wydarzenia gildii i przypomnienia w centrum powiadomień.
- **Zmieniono:** wyprawa ma teraz rzeczywisty termin zamiast tekstowej godziny; Discord wyświetla datę w strefie czasowej odbiorcy; ogłoszenie wygasa 12 godzin po terminie, a nie 72 godziny po utworzeniu; formularz organizatora otwiera się wyłącznie na żądanie również na desktopie; bazowa aktywność to neutralny „Statyk”, bez narzuconego tieru T8.
- **Dodano:** wyprawy graczy do globalnego Kalendarza, filtr „Wyprawy graczy”, bezpośrednie przejście z wydarzenia do właściwej karty wyprawy oraz indeks aktywnych terminów.
- **Usunięto:** wysoki pusty baner nadchodzących wypraw, przycinanie zawartości kart w panelu nadchodzących zbiórek oraz automatyczne montowanie ciężkiego formularza po bezczynności, które powodowało zmianę układu bez działania użytkownika.
- **Utwardzono backend:** klient nie otrzymuje identyfikatorów wiadomości Discord; API odrzuca terminy wcześniejsze niż 10 minut i późniejsze niż 30 dni; zapis do wygasłej wyprawy jest blokowany; cron usuwa rekordy według `expires_at`; migracja zgodności chroni już otwarte starsze sesje podczas publikacji nowego klienta.
- **Potwierdzono:** produkcyjny cron Vercel dla `/api/cron/expeditions` jest zaplanowany codziennie, przypomnienia wydarzeń gildii działają przez aktywny Supabase Cron co pięć minut, a doradca bezpieczeństwa nie wykrył nowego problemu z RLS po migracji.

### Przegląd 05 — Kuźnia Buildów

- **Zostawić:** układ ekwipunku zgodny z grą, enchanty `.0–.4`, kalkulator statystyk, porównywarkę zestawów, komentarze „Rada wojowników”, warianty przedmiotów oraz osobne moduły Meta 1v1 i planera 5v5.
- **Naprawiono planer:** buildy zachowują identyfikator, nazwę, rolę i autora; wyszukiwanie działa po nazwie i roli; błędy API są widoczne i można ponowić odczyt; eksport TXT używa prawidłowych danych; udostępniony link rzeczywiście odtwarza nazwę oraz pięć slotów składu.
- **Ujednolicono zapisane buildy:** gwiazdka na karcie i „Zapisz build” na szczegółach korzystają z jednego serwerowego mechanizmu `build_favorites`; lista pobiera stan zbiorczo w kontekście użytkownika i z zachowaniem RLS.
- **Zmieniono UX:** przy dwóch kartach Zbrojownia wykorzystuje pełną szerokość desktopu; etykiety aktywności i budżetu nie pokazują już surowych identyfikatorów `EXPLORATION` lub `medium`; na telefonie kreator prowadzi przez informacje, ekwipunek i kalkulator przed rozbudowanymi dodatkami.
- **Dodano kontrolę regresji:** testy obejmują normalizację danych planera, puste sloty i link udostępniania, spójność ulubionych po ponownym pobraniu listy, mobilną kolejność kreatora oraz odtworzenie składu 5v5.
- **Do obserwacji przy większej liczbie buildów:** planer świadomie pobiera do 12 najnowszych zestawów; kolejnym krokiem skalowania będzie wyszukiwanie serwerowe w oknie wyboru zamiast powiększania jednorazowego payloadu.

### Przegląd 06 — Rynek i Skrzynka handlowa

- **Zostawić:** prywatne negocjacje w portalu, migawkę ceny i tytułu oferty w rozmowie, ręczne zamykanie i wznawianie wątku, obserwowanie sprzedawcy/oferty oraz narzędzia wyceny uruchamiane na żądanie.
- **Naprawiono cykl życia i wyszukiwanie:** główna tablica pokazuje wyłącznie oferty aktywne przez siedem dni; właściciel ma osobny widok „Moje ogłoszenia” z aktywnymi i wygasłymi wpisami; fraza, miasto i kategoria filtrują pełny zbiór po stronie API zamiast tylko pierwszej wczytanej strony; wygasłej oferty nie można już negocjować; odnowienie i zakończenie mają blokadę wielokrotnego kliknięcia oraz widoczny komunikat obok karty.
- **Zmieniono publikację:** formularz nie zajmuje automatycznie pierwszego ekranu także na desktopie; serwer domyślny to neutralne „Wszystkie serwery”; surowe pole ID zastąpił katalog przedmiotów z enchantami, obrazem i wyszukiwaniem; formularz można jawnie zamknąć.
- **Usprawniono skrzynkę:** rozmowy można wyszukać po graczu, ofercie lub wiadomości i filtrować na aktywne/zamknięte; `Enter` wysyła, a `Shift+Enter` dodaje wiersz; puste wyniki filtrów mają osobny stan i szybkie zerowanie.
- **Utwardzono backend i dostępność:** API odrzuca kontakt do wygasłej oferty, a funkcja Supabase powtarza tę kontrolę w bazie; modal negocjacji obsługuje Escape, kliknięcie tła, powrót fokusu i semantykę dialogu; API potwierdza własność przy usuwaniu i zwraca rzeczywistą liczbę ofert.
- **Potwierdzono:** lint, 64 testy jednostkowe i produkcyjny build są zielone; po migracji doradca Supabase nie wykrył nowego problemu bezpieczeństwa ani wydajności. Ostrzeżenie o ochronie haseł nie dotyczy logowania wyłącznie przez Discord, a historycznych nieużywanych indeksów nie usuwamy bez wiarygodnej próbki ruchu.

### Przegląd 07 — Kalkulator Rafinacji

- **Usunięto fałszywą precyzję:** koszt materiałów nie jest już zakładany jako 70% ceny produktu, a wynik nie pojawia się przy brakujących cenach. Ręczna trasa arbitrażowa nie startuje z przykładowym „zyskiem” wyglądającym jak dane rynkowe.
- **Naprawiono model gry:** każda receptura T4–T8 zawiera właściwą liczbę surowców `2/3/4/5/5` oraz jeden przetworzony materiał tieru niżej; enchantowane surowce używają identyfikatorów AODP `_LEVELn@n`; T4 korzysta ze zwykłego materiału T3, a bloki kamienne nie udają przedmiotów `.1–.4`.
- **Naprawiono miasta i zwrot:** drewno otrzymało prawidłowy bonus Fort Sterling, tkanina Lymhurst, skóra Martlock, metal Thetford, a kamień Bridgewatch. Presety rozróżniają rafinację w mieście specjalizacji i poza nim oraz Focus, pozostawiając RRR do ręcznej korekty.
- **Dodano pełny rachunek:** osobne ceny wejściowe i wyjściowe dla wskazanych miast, zużycie i zwrot każdego składnika, koszt stanowiska zależny od odżywiania, łączne opłaty sprzedaży, przychód netto, ROI oraz ostrzeżenia po 12 godzinach od skanu.
- **Zmieniono hierarchię strony:** właściwy kalkulator jest pierwszym i głównym narzędziem; historia ceny, kurs złota i ręczny scenariusz transportu są ładowane dopiero na żądanie.
- **Potwierdzono:** reguły receptur i miast z oficjalnym przewodnikiem Albion Online, format enchantowanych surowców bezpośrednim zapytaniem AODP oraz obliczenia zestawem testów jednostkowych. Zalogowany E2E obejmuje pełną recepturę i szerokość 390 px; lokalne uruchomienie wymaga sekretów CI i jest wykonywane w GitHub Actions.

### Przegląd 08 — Kroniki Walk

- **Zostawić:** profil wojownika z podziałem fame, przełącznik zabójstw i zgonów, pełne zestawy obu stron starcia, kontekst gildii, obserwowanie gracza oraz regionalną wycenę utraconego ekwipunku z jawnym pokryciem i świeżością cen.
- **Zmieniono wyszukiwanie:** wybrany serwer odpowiada jako pierwszy, a przy braku wyniku pozostałe regiony są sprawdzane równolegle z krótszym limitem odpowiedzi; każdy wynik pokazuje własny serwer, a częściowa awaria nie ukrywa danych zwróconych przez pozostałe regiony.
- **Naprawiono wiarygodność danych:** brak Fame wydarzenia jest oznaczany jako „Brak danych”, nie jako prawdziwe zero; Fishing i Farming Fame są czytane z rzeczywistej struktury `LifetimeStatistics`; IP wyliczone z ostatnich walk ma precyzyjną etykietę.
- **Dodano:** widoczny status sprawdzania wszystkich regionów, ponowienie po awarii, bezpośredni fallback do KillBoard#1 dla niedostępnego serwera oraz przejście z karty starcia prosto do kroniki przeciwnika.
- **Potwierdzono produkcyjnie przed zmianą:** Europa zwraca profil, historię i wycenę z pokryciem cen, natomiast endpoint Gameinfo Ameryki odpowiada `502`; portal nie udaje wtedy braku gracza i wyjaśnia awarię zewnętrznego źródła.
- **Do obserwacji:** Gameinfo jest niewspieranym publicznie interfejsem strony Albionu i okresowo traci dostępność regionu Ameryki; nie wolno zastępować brakujących danych fikcyjnymi statystykami. Dalsza odporność wymagałaby własnego, okresowo zasilanego archiwum zdarzeń.

### Przegląd 09 — Podział Łupów i Timery

- **Zostawić:** czterostopniowy przepływ rozliczenia, regeary finansowane z puli po podatku, jawną pozostałość po zaokrągleniu, wersje raportów na koncie, regionalne zegary UTC oraz odnośnik do kalendarza z niezawodnymi przypomnieniami portalowymi.
- **Naprawiono obliczenia i działania:** srebro jest liczone wyłącznie w pełnych jednostkach; uczestnicy są deduplikowani bez względu na wielkość liter; raport, eksport i udostępnianie są zablokowane do czasu poprawnego rozliczenia; wielokrotne kliknięcie nie tworzy kilku wersji; błędny identyfikator raportu kończy się odpowiedzią `400`.
- **Dodano udostępnianie:** gotowy raport można przekazać systemowym arkuszem udostępniania, a na urządzeniach bez tej funkcji portal kopiuje tekst gotowy do wklejenia na Discordzie.
- **Naprawiono timery:** interfejs uczciwie pokazuje stan synchronizacji konta i tryb offline, nie zgłasza sukcesu po nieudanym zapisie, odrzuca duplikaty i przeszłe daty, nie usuwa po cichu najstarszego wpisu po przekroczeniu limitu oraz pozwala zbiorczo wyczyścić zakończone timery.
- **Zabezpieczono synchronizację:** starsza lokalna lista timerów nie jest już nadpisywana pustym rekordem konta, payload timerów jest ograniczony do wymaganych pól, a niezmienne wersje raportów utraciły przypadkowe uprawnienie `UPDATE` dla roli `authenticated`.
- **Decyzja o przypomnieniach:** własne timery pozostają osobistymi licznikami synchronizowanymi między urządzeniami; przypomnienia działające również przy zamkniętej stronie są realizowane przez zapisy w Kalendarzu i centrum powiadomień, zamiast obiecywać zawodny alarm przeglądarkowy.
- **Potwierdzono:** oba widoki mieszczą się w szerokości 390 px; RLS i jawne granty chronią szkice, wersje oraz preferencje per użytkownik; testy jednostkowe obejmują podatek, regeary, deficyt, duplikaty, pozostałość i sanitację timerów, a E2E przywracanie szkicu, blokady działań i widok telefonu.

### Przegląd 10 — Profil i Obserwowane

- **Zostawić:** przypięcie postaci przez publiczne API Albionu z wyborem regionu, unikalność postaci między kontami, prywatne zapisane buildy z opcjonalnym udostępnieniem, obserwowanie pięciu typów elementów oraz trwałe usunięcie konta po wpisaniu frazy potwierdzającej.
- **Naprawiono profil:** nowy użytkownik nie jest już automatycznie przypisywany do Europy; karta odróżnia dane deklarowane od statystyk pobranych z API; publiczny profil przekazuje region przypiętej postaci do Killboardu zamiast zawsze otwierać Europę; formularz pobiera jawnie tylko potrzebne kolumny.
- **Przebudowano Wartownię:** surowy klucz regionu zastąpiła polska nazwa, dodano podsumowanie postaci, buildów, gildii, ofert i profili, a każdy typ ma widoczną drogę do modułu również wtedy, gdy kolekcja jest pusta.
- **Utwardzono uprawnienia:** anonimowy klient może odczytać wyłącznie publiczne kolumny profilu; zalogowany klient może aktualizować tylko `ingame_nick`, `main_server`, `guild_name`, `main_role`, `avg_ip`, `bio` i `favorite_builds_public`, bez dostępu do `role`, `is_admin` ani pól przypięcia postaci.
- **Sprawdzono usuwanie konta:** wszystkie zależne dane użytkownika mają `ON DELETE CASCADE`, audyt moderacyjny anonimizuje autora przez `SET NULL`, ostatni administrator jest chroniony, a dialog wymaga dokładnej frazy, wspiera Escape i ma semantykę dostępnego `alertdialog`.
- **Potwierdzono:** produkcyjny Supabase nie nadaje już domyślnego regionu, anonimowy `SELECT` całej tabeli jest odebrany, granty kolumnowe odpowiadają formularzowi, a doradca nie wykrył nowego problemu RLS. Pozostaje globalne ostrzeżenie o ochronie haseł, które nie wpływa na obecne logowanie wyłącznie przez Discord OAuth.

### Przegląd 11 — Panel administratora

- **Zostawić:** jedną kolejkę zgłoszeń, zbiorczą moderację wszystkich modułów, ręczną kontrolę integracji, trwały dziennik decyzji oraz rozdzielenie uprawnień moderatora i administratora.
- **Naprawiono monitoring i audyt:** po potwierdzeniu roli personelu wewnętrzne dane są pobierane wyłącznie przez backendowy klient `service_role`; panel nie zależy już od bezpośredniego odczytu chronionych tabel przez przeglądarkę. Powtarzające się zdarzenia są grupowane z licznikiem, a techniczne przerwanie strumienia po anulowanym renderze nie jest rejestrowane jako awaria. Dziennik pokazuje czytelną nazwę autora, rolę i polską nazwę obiektu zamiast technicznego identyfikatora konta.
- **Przebudowano role:** lista ma wyszukiwarkę po nicku, licznik personelu, oznaczenie własnego konta i jawny przycisk „Zapisz”; sam wybór pozycji w dropdownie nie zmienia już natychmiast uprawnień. Surowe UUID użytkowników usunięto z interfejsu.
- **Poprawiono dostępność i stany działania:** zakładki mają powiązane panele ARIA, filtry informują o aktywnym stanie, checkboxy treści mają etykiety, a przyciski odświeżania są blokowane i animowane podczas zapytania.
- **Utwardzono Supabase:** `anon` i `authenticated` nie mają już żadnych grantów do `integration_checks`, `system_events` ani `moderation_audit_log`; `service_role` otrzymuje wyłącznie `SELECT` i `INSERT`, a istniejące RLS pozostaje dodatkową warstwą ochrony.
- **Potwierdzono:** produkcyjna baza zawiera historię czterech integracji i dziennik systemowy; uprzywilejowane funkcje `service_*` nie są wykonywalne przez `anon` ani `authenticated`, mają pusty `search_path`, a doradca bezpieczeństwa nie zgłasza nowej luki. Ostrzeżenie o ochronie haseł nadal nie dotyczy logowania wyłącznie przez Discord OAuth.

### Podsumowanie przeglądu portalu — 29 sierpnia 2026

- **Pokrycie funkcjonalne:** wszystkie 20 plików stron jest przypisanych do jednego z 11 przeglądów. Obejmuje to bramę i dokumenty prawne, 14 pozycji nawigacji portalu, panel administratora oraz szczegóły buildów, gildii i profili. Skrzynka handlowa została sprawdzona razem z Rynkiem, Timery z Podziałem Łupów, Kalendarz z Wyprawami, a Wartownia z Profilem — nie są pominiętymi modułami.
- **Pokrycie techniczne:** portal ma 39 tras API, 23 pliki testów jednostkowych z 82 zielonymi przypadkami oraz macierz wizualną 18 tras zalogowanych i 3 publicznych na szerokościach `360/390/430/768/1280/1920 px`. Produkcyjna historia Supabase zawiera 39 zsynchronizowanych migracji, a CI sprawdza lint, testy, build, katalog przedmiotów, migracje, E2E i budżet JavaScript.
- **Najważniejsze zakończone prace:** serwerowa sesja i blokada prywatnych tras, moderacja i trwały rate limiting, stabilne wyprawy z Discordem, pełny rynek i prywatne negocjacje, buildy z enchantami i komentarzami, wieloregionowy Killboard, profile i obserwacje, kalendarz, alerty cenowe, monitoring integracji oraz responsywny albionowy interfejs.
- **Domknięta warstwa wspólna (F1.1):** wszystkie dropdowny korzystają ze wspólnej stylistyki portalu, dziewięć ryzykownych akcji ma dostępne okno potwierdzenia, a błędy zapisów na Wyprawy są pokazywane przy formularzu zamiast w systemowym `alert()`. `CustomSelect` obsługuje strzałki, Home/End, Enter, Escape, stan aktywny i powiązane etykiety; mobilna „Tawerna” jest spójna językowo z resztą portalu.
- **Domknięta regresja wizualna (F1.2):** macierz obejmuje również `/admin`, `/kalkulator-craftingu` oraz dynamiczne szczegóły `/buildy/[id]`, `/gildie/[id]` i `/profil/[id]`. Każdy z 21 widoków jest sprawdzany na sześciu szerokościach, z deterministycznymi odpowiedziami sieciowymi, kontrolowanym rekordem buildu i asercją gotowego nagłówka przed wykonaniem zrzutu.
- **Dług operacyjny:** budżet JavaScript ma mały zapas (`1723,5 / 1800 KB`, największy chunk `224,3 / 240 KB`, najcięższa trasa `909,6 / 960 KB`). W bazie pozostaje historyczny szum monitoringu grupowany w panelu, Gameinfo Ameryki jest okresowo niedostępne, a przed ewentualną komercjalizacją trzeba podać pełne dane administratora i dedykowany kontakt prywatności.

#### Rekomendowana kolejna faza — F1 „Final Polish”

1. [x] **Spójne kontrolki i dostępność:** zastąpić natywne dropdowny, `confirm()` i `alert()` wspólnymi komponentami; dodać pełną obsługę klawiatury, fokus i powiązane etykiety; ujednolicić polskie nazwy w nawigacji.
2. [x] **Pełna regresja wizualna:** dodać pięć brakujących tras do macierzy sześciu viewportów z deterministycznymi fixture'ami dla stron dynamicznych i roli administratora.
3. [ ] **Zapas wydajności:** zejść poniżej `1650 KB` całego JavaScript i `880 KB` najcięższej trasy przez dalsze odroczenie paneli administracyjnych, kalkulatorów i narzędzi stron szczegółowych.
4. [ ] **Porządek operacyjny:** ustalić retencję zdarzeń monitoringu, obserwować stabilność Gameinfo per region i przygotować własne archiwum walk dopiero wtedy, gdy rzeczywisty ruch uzasadni koszt.
5. [ ] **Decyzja produktowa:** po F1 wykonać krótki test z kilkoma graczami Albion Online i na podstawie ich zachowania wybrać rozwój społeczności, rynku albo narzędzi gildyjnych zamiast dodawać kolejny szeroki moduł.

### P46 — stabilna mobilna Zbrojownia buildów i Rynek

- [x] rozłożyć koszt startowy mobilnej Zbrojowni i Rynku na skrypty własne, współdzielone zależności, obrazy oraz pracę po hydratacji — Zbrojownia ładowała klienta PostgREST i interaktywny picker przedmiotów do samego podglądu kart, a Rynek montował formularz oraz narzędzia analityczne przed użyciem
- [x] odroczyć elementy poniżej pierwszego ekranu i niekrytyczne obliczenia bez pogorszenia interakcji, dostępności ani widoku desktopowego — podgląd ekwipunku ma osobny lekki komponent, Zbrojownia pobiera sześć kart przez API, a mobilny Rynek pokazuje najpierw oferty i uruchamia formularz oraz wybrane narzędzie na żądanie
- [x] ograniczyć zmienność mobilnej Zbrojowni (Performance `87–100`, TBT `80–530 ms`) i utrzymać Rynek co najmniej na obecnym poziomie (Performance `90–92`, TBT `350–420 ms`) — w dwóch zielonych próbach Zbrojownia osiągnęła `93` i `88` oraz TBT `330 ms` i `470 ms`, a Rynek `99` i `96` oraz TBT `100 ms` i `220 ms`
- [x] objąć zmienione ścieżki testami E2E i utrzymać budżet JavaScript, historię migracji oraz katalog przedmiotów — publiczne testy blokują anonimowy odczyt i usuwanie, a zalogowany pakiet sprawdza paginację, właściciela, RLS, mobilny układ ofert oraz narzędzia na żądanie; JavaScript builda spadł do `1689,6 KB / 1800 KB`
- [x] wdrożyć P46 i potwierdzić wynik co najmniej dwiema pełnymi produkcyjnymi bramkami Lighthouse `14/14` — wszystkie profile miały Accessibility i Best Practices `100`, a obie trasy P46 utrzymały LCP `1,0–1,4 s` i CLS poniżej `0,03` ([pierwszy zielony audyt](https://github.com/Szewcuu/albion-social/actions/runs/32637104991), [próba diagnostyczna](https://github.com/Szewcuu/albion-social/actions/runs/32637362684), [drugi zielony audyt](https://github.com/Szewcuu/albion-social/actions/runs/32637655859), 23 sierpnia 2026)

### P45 — stabilne mobilne Wyprawy i Kreator buildu

- [x] porównać długie zadania głównego wątku i koszt startowy mobilnych Wypraw oraz Kreatora w trzech produkcyjnych próbach P44 — TBT wahało się odpowiednio `320–730 ms` i `340–620 ms`, a Kreator ładował `798,4 KB` JavaScript
- [x] rozdzielić ciężkie formularze, selektory i obliczenia od pierwszego renderu, zachowując pełną funkcjonalność po interakcji — mobilny formularz Wypraw i 18 pickerów alternatyw jest montowanych na żądanie, a karty poza ekranem pomijają koszt layoutu
- [x] ograniczyć zmienność TBT obu tras bez pogorszenia LCP, CLS, dostępności i obsługi klawiatury — publikacja buildu trafia do uwierzytelnionego API, a startowy pakiet Kreatora zmalał o `136,6 KB` do `661,8 KB`
- [x] objąć krytyczne fragmenty testami E2E oraz utrzymać budżet JavaScript, historię migracji i katalog przedmiotów — dodano test mobilnego odsłaniania formularza, wariantów ekwipunku oraz rzeczywistej publikacji i sprzątania buildu
- [x] wdrożyć P45 i potwierdzić wynik co najmniej dwiema pełnymi produkcyjnymi bramkami Lighthouse `14/14` — Wyprawy mobile osiągnęły Performance `100` i `97`, LCP `1,2 s` w obu próbach, TBT `80 ms` i `210 ms` oraz CLS `0`; Kreator buildu osiągnął Performance `99` i `92`, LCP `1,3 s` w obu próbach, TBT `100 ms` i `360 ms` oraz CLS `0` ([pierwszy zielony audyt](https://github.com/Szewcuu/albion-social/actions/runs/32635462449), [drugi zielony audyt](https://github.com/Szewcuu/albion-social/actions/runs/32635703903), 23 sierpnia 2026)

### P44 — serwerowa sesja i lżejszy start chronionego portalu

- [x] opisać obecny przepływ sesji `localStorage` i wybrać zgodną z Next.js 16 oraz Supabase strategię sesji odczytywanej na serwerze — cookies, PKCE, `getClaims()` i Proxy z jednorazową migracją istniejących sesji
- [x] usunąć podwójny render brama → shell → Tawerna dla zalogowanego użytkownika, bez ujawnienia chronionej treści gościom
- [x] przenieść blokadę prywatnych tras na serwer, pozostawiając publiczne wyłącznie `/`, `/regulamin` i `/prywatnosc`
- [x] ograniczyć koszt klienta Auth w krytycznej ścieżce, zachowując Discord OAuth, odświeżanie sesji, wylogowanie i uwierzytelnione API — lekki `auth-js` współdzieli format cookies z `@supabase/ssr`, bez startowego PostgREST, Realtime, Storage i Functions
- [x] potwierdzić pełne CI, wdrożyć P44 i porównać co najmniej dwie produkcyjne próby mobilnej Tawerny w bramce `14/14` — dwie pełne bramki przeszły, a Tawerna mobile osiągnęła Performance `99` i `94`, LCP `1,1 s` i `1,5 s`, TBT `110 ms` i `290 ms` oraz CLS `0`; próba diagnostyczna również potwierdziła Tawernę (`93`, `1,5 s`, `310 ms`, `0`), lecz ujawniła zmienność TBT Wypraw i Kreatora zaplanowaną do P45 ([pierwszy zielony audyt](https://github.com/Szewcuu/albion-social/actions/runs/32590147553), [próba diagnostyczna](https://github.com/Szewcuu/albion-social/actions/runs/32590410947), [drugi zielony audyt](https://github.com/Szewcuu/albion-social/actions/runs/32590893998), 22 sierpnia 2026)

### P43 — stabilna Tawerna mobile i rozdzielony runtime strony głównej

- [x] porównać zmienność zalogowanej Tawerny mobile między P40 i P42 — TBT zmieniało się od `190 ms` do `580 ms`, mimo małego chunku strony (`9,3 KB`), a koszt pochodził głównie ze wspólnego uruchamiania sesji i usług runtime
- [x] rozdzielić kod bramy publicznej od właściwej Tawerny, zachowując natychmiastowy i bezpieczny wybór widoku po sesji
- [x] ograniczyć pracę głównego wątku po zalogowaniu bez utraty czatu, statystyk i szybkich akcji — usunięto martwy katalog modułów, a Web Vitals, PWA i Speed Insights są uruchamiane dopiero w czasie bezczynności
- [x] potwierdzić lint, 53 testy jednostkowe, build, 30 migracji, katalog `3663`, budżet JavaScript (`1702,6 KB / 1800 KB`) oraz publiczne i zalogowane E2E
- [x] opublikować P43 i powtórzyć pełną produkcyjną bramkę Lighthouse `14/14` — próba kontrolna Tawerny mobile osiągnęła Performance `90`, LCP `1,0 s`, TBT `420 ms` i CLS `0`, a ekran wejścia `99`, `1,7 s`, `90 ms` i `0`; wcześniejsza próba Tawerny (`84`, TBT `620 ms`) potwierdziła zmienność wspólnego bootstrapu React/Next/Auth i wyznaczyła zakres P44 ([zielony audyt](https://github.com/Szewcuu/albion-social/actions/runs/32587692355), [próba diagnostyczna](https://github.com/Szewcuu/albion-social/actions/runs/32587301049), 22 sierpnia 2026)

### P42 — stabilny i szybszy publiczny ekran wejścia

- [x] wskazać element LCP oraz porównać obie produkcyjne próby ekranu logowania — nagłówek hero był ponownie malowany po późnym odkryciu tła; dwie próby zakończyły się LCP `3,2 s` i `3,1 s`
- [x] skrócić krytyczną ścieżkę bez utraty obecnej oprawy — mobilny wariant tego samego tła waży `24,6 KB` zamiast `163 KB`, a dekoracyjne `albion-bg.webp` i logo nie konkurują już w kolejce globalnych preloadów
- [x] dodać test E2E potwierdzający, że telefon pobiera wyłącznie lekki wariant hero, a dwie pełne próby produkcyjne pozostają kontrolą zmienności pomiaru
- [x] potwierdzić lint, 53 testy jednostkowe, build, 30 migracji, katalog, budżet JavaScript (`1700,8 KB / 1800 KB`) oraz publiczne i zalogowane E2E
- [x] opublikować P42 i przejść pełną produkcyjną bramkę Lighthouse `14/14` — ekran wejścia mobile osiągnął Performance `98`, LCP `2,0 s`, TBT `130 ms` i CLS `0` zamiast wcześniejszych LCP `3,2 s` oraz `3,1 s`; desktop osiągnął Performance `100`, LCP `0,5 s`, TBT `0 ms` i CLS `0,029` ([audyt produkcyjny](https://github.com/Szewcuu/albion-social/actions/runs/32585146872), 22 sierpnia 2026)

### P41 — lekki Rynek i serwerowy cykl życia ofert

- [x] przeanalizować produkcyjny Lighthouse Rynku i wskazać pełnego klienta Supabase w krytycznej ścieżce strony
- [x] przenieść odczyt oraz paginację ofert za chroniony Route Handler z zachowaniem RLS i indeksu kursorowego
- [x] przenieść publikację, odnawianie i usuwanie ofert do walidowanego API z limitami operacji i serwerowym właścicielem
- [x] naprawić odnawianie ofert po wcześniejszym odebraniu klientom uprawnienia `UPDATE`; uprzywilejowana zmiana następuje dopiero po sprawdzeniu właściciela
- [x] zachować filtry, bezpośrednie linki, formularz, prywatny kontakt, polubienia i obserwowanie ofert
- [x] potwierdzić lint, 53 testy jednostkowe, build, 30 migracji, budżet JavaScript (`1700,8 KB / 1800 KB`) oraz publiczne i zalogowane E2E; test zalogowany rzeczywiście tworzy, odczytuje, odnawia i usuwa ofertę
- [x] opublikować P41 i dwukrotnie powtórzyć pełny produkcyjny Lighthouse — Rynek mobile osiągnął kontrolnie Performance `92`, TBT `340 ms`, LCP `1,0 s` i CLS `0`, a desktop `100`, `40 ms`, `0,4 s` i `0`; boot-up JavaScript spadł z `683 ms` do `606 ms`, LCP w pierwszej próbie z `1,6 s` do `1,1 s`, a pakiet startowy trasy zmalał o około `120,5 KB`. Globalną bramkę w obu próbach zatrzymał wyłącznie publiczny ekran logowania z LCP `3,2 s` oraz `3,1 s` przy limicie `3,0 s`, co przechodzi do P42 ([pierwszy audyt](https://github.com/Szewcuu/albion-social/actions/runs/32583665749), [próba kontrolna](https://github.com/Szewcuu/albion-social/actions/runs/32583950266), 22 sierpnia 2026)

### P40 — lekka Tawerna i odroczony Realtime

- [x] porównać pierwszą i kontrolną próbę Lighthouse strony głównej oraz wskazać koszt pełnego klienta Supabase dołączanego przez czat
- [x] przenieść odczyt, publikację i usuwanie wiadomości za chroniony Route Handler z zachowaniem RLS
- [x] wymuszać autora i właściciela wiadomości po stronie serwera oraz objąć zapis limitem żądań
- [x] naprawić usuwanie wiadomości przez personel przez istniejące RPC moderacji i dziennik audytowy
- [x] zachować wątki odpowiedzi, automatyczne przewijanie, odświeżanie, Enter/Shift+Enter i paginację
- [x] odroczyć klienta Realtime poza krytyczne pierwsze sekundy, zachowując późniejszą synchronizację na żywo
- [x] potwierdzić lint, 53 testy jednostkowe, build, budżet JavaScript (`1700,0 KB / 1800 KB`), 30 migracji oraz publiczne i zalogowane E2E
- [x] opublikować P40 i powtórzyć pełny produkcyjny Lighthouse — bramka `14/14` przeszła; Tawerna mobile osiągnęła Performance `97`, TBT `190 ms`, LCP `1,4 s` i CLS `0` (P39: kontrolnie `88` / `470 ms`, pierwsza próba `82` / `750 ms`), a desktop Performance `100`, TBT `50 ms`, LCP `0,4 s` i CLS `0` ([audyt produkcyjny](https://github.com/Szewcuu/albion-social/actions/runs/32582693522), 22 sierpnia 2026)

### P39 — lekka sesja portalu oraz mobilne Wyprawy i Killboard

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
  - [x] objąć macierzą 3 strony publiczne i wszystkie 18 ekranów po zalogowaniu, w tym panel administratora, kalkulator oraz szczegóły buildu, gildii i profilu
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
