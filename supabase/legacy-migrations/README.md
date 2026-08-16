# Historyczne skrypty SQL

Ten katalog przechowuje skrypty `001`–`007` oraz dawny plik
`20260811000000_schema_and_indexes.sql`, które były wykonywane ręcznie przed
włączeniem rejestru `supabase_migrations.schema_migrations`.

Pliki są zachowane wyłącznie jako materiał audytowy. Nie są aktywnymi
migracjami Supabase i nie wolno przenosić ich z powrotem do `migrations/` ani
uruchamiać na istniejącym projekcie.

Historyczny skrypt `008_priority_b_stability.sql` został odwzorowany na dwie
wersje zapisane przez produkcyjny Supabase:

- `20260808191640_priority_b_stability.sql`
- `20260808191815_priority_b_rpc_privileges.sql`

Źródłem prawdy dla aktywnej historii jest
`../production-migration-history.json`.
