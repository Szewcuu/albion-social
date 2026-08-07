-- P4.4: Rozszerzenie tabeli profiles o zweryfikowane dane postaci z oficjalnego API Albionu
-- Uruchom w Supabase SQL Editor

BEGIN;

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS verified_player_id TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS verified_server TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS pvp_fame BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS pve_fame BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_verified_player_id
ON public.profiles (verified_player_id)
WHERE is_verified = TRUE;

COMMIT;
