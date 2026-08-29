BEGIN;

ALTER TABLE public.system_events
  DROP CONSTRAINT IF EXISTS system_events_source_check;

ALTER TABLE public.system_events
  ADD CONSTRAINT system_events_source_check
  CHECK (
    source IN (
      'frontend',
      'frontend_performance',
      'backend',
      'supabase',
      'discord',
      'albion_api',
      'market_api'
    )
  );

COMMIT;
