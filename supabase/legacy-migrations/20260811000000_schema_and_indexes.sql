-- ALBION ONLINE POLSKA PORTAL - SUPABASE DATABASE MIGRATION & INDEXES
-- Generated: 2026-08-11

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT,
  ingame_nick TEXT,
  main_server TEXT DEFAULT 'Europa',
  guild_name TEXT,
  main_role TEXT DEFAULT 'DPS',
  avg_ip INT DEFAULT 1200,
  is_admin BOOLEAN DEFAULT FALSE,
  role TEXT DEFAULT 'user',
  is_verified BOOLEAN DEFAULT FALSE,
  verified_player_id TEXT,
  verified_server TEXT,
  pvp_fame BIGINT DEFAULT 0,
  pve_fame BIGINT DEFAULT 0,
  verified_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Builds Table
CREATE TABLE IF NOT EXISTS public.builds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  activity_type TEXT DEFAULT 'PVP',
  description TEXT,
  weapon TEXT,
  offhand TEXT,
  armor TEXT,
  head TEXT,
  shoes TEXT,
  cape TEXT,
  bag TEXT,
  potion TEXT,
  food TEXT,
  build_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Market Items Table
CREATE TABLE IF NOT EXISTS public.market_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  item_name TEXT,
  price BIGINT NOT NULL,
  city TEXT NOT NULL DEFAULT 'Caerleon',
  category TEXT DEFAULT 'Ekwipunek',
  server TEXT DEFAULT 'Europa',
  contact_info TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Expeditions Table
CREATE TABLE IF NOT EXISTS public.expeditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  activity_type TEXT DEFAULT 'Statyk',
  min_ip INT DEFAULT 1300,
  event_time TIMESTAMPTZ NOT NULL,
  server TEXT DEFAULT 'Europa',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ----------------------------------------------------
-- PERFORMANCE INDEXES (B-Tree)
-- ----------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_market_items_created_at ON public.market_items (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_market_items_city ON public.market_items (city);
CREATE INDEX IF NOT EXISTS idx_market_items_user_id ON public.market_items (user_id);

CREATE INDEX IF NOT EXISTS idx_builds_user_id ON public.builds (user_id);
CREATE INDEX IF NOT EXISTS idx_builds_activity_type ON public.builds (activity_type);
CREATE INDEX IF NOT EXISTS idx_builds_created_at ON public.builds (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_expeditions_event_time ON public.expeditions (event_time);
CREATE INDEX IF NOT EXISTS idx_expeditions_user_id ON public.expeditions (user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON public.notifications (user_id, is_read);
