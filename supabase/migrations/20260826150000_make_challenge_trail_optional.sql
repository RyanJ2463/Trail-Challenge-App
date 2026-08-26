-- ============================================================
-- Lets a challenge be created without a trail -- an "open goal" that
-- just tracks total distance against daily_activity, with no map or
-- route progress. Nothing else in the schema references trail_id in a
-- way that assumes it's non-null: challenge_progress.current_trail_point_id
-- is already nullable, and no RLS policy touches trail_id.
-- ============================================================

ALTER TABLE public.challenges ALTER COLUMN trail_id DROP NOT NULL;
