# Migracje Supabase

Katalog `migrations/` odzwierciedla wersje zapisane w produkcyjnej tabeli
`supabase_migrations.schema_migrations`. Nazwa aktywnego pliku zawsze ma format:

```text
YYYYMMDDHHMMSS_nazwa_migracji.sql
```

`production-migration-history.json` jest zweryfikowanym snapshotem rejestru
projektu produkcyjnego. Walidator dopuszcza nowe lokalne migracje o wersji
późniejszej niż snapshot, ale wymaga niezmienionej obecności wszystkich już
zastosowanych wersji.

## Nowa zmiana schematu

1. Utwórz plik poleceniem `supabase migration new nazwa_zmiany`.
2. Dodaj możliwie krótką, transakcyjną i bezpieczną zmianę SQL.
3. Uruchom lokalny reset lub migrację na gałęzi deweloperskiej Supabase.
4. Po wdrożeniu uaktualnij snapshot produkcyjnej historii na podstawie
   `supabase migration list` lub API Supabase.
5. Uruchom `npm run migrations:validate`.

Nie zmieniaj timestampu ani treści migracji, która została już wdrożona.
Nie uruchamiaj skryptów z `legacy-migrations/` — są zachowane wyłącznie dla
audytu okresu sprzed uruchomienia rejestru migracji.

Aktywna historia zaczyna się od pierwszej migracji zapisanej w produkcyjnym
rejestrze i nie stanowi kompletnego bootstrapu pustej bazy. Świeże środowisko
lokalne lub testowe należy zainicjalizować zweryfikowanym baseline'em pobranym
na odizolowanym projekcie deweloperskim. Nigdy nie wykonuj `db reset` na
projekcie produkcyjnym.
