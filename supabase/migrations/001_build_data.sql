-- Migracja Supabase: rozszerzenie tabeli builds o pełne dane kreatora
-- Uruchom w Supabase SQL Editor

ALTER TABLE builds
ADD COLUMN IF NOT EXISTS build_data JSONB DEFAULT NULL;

-- Opcjonalny indeks do wyszukiwania po tagach
CREATE INDEX IF NOT EXISTS idx_builds_build_data ON builds USING GIN (build_data);
