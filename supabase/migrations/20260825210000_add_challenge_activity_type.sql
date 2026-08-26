-- ============================================================
-- Adds an activity type to challenges (hiking, walking, running,
-- cycling, steps), chosen when a challenge is created. Not yet wired
-- into progress calculation -- daily_activity has no activity_type of
-- its own since the HealthKit/Health Connect sync that would populate
-- it per-type hasn't been built (see README "Not yet built"). Until
-- then this is descriptive only; every challenge still sums the same
-- merged daily_activity.distance_miles regardless of its activity_type.
-- ============================================================

ALTER TABLE public.challenges
    ADD COLUMN activity_type TEXT NOT NULL DEFAULT 'hiking'
    CHECK (activity_type IN ('hiking', 'walking', 'running', 'cycling', 'steps'));

ALTER TABLE public.challenges ALTER COLUMN activity_type DROP DEFAULT;
