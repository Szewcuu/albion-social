REVOKE ALL ON FUNCTION public.save_loot_split_report(TEXT, JSONB, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_loot_split_report(TEXT, JSONB, TEXT) TO authenticated;
