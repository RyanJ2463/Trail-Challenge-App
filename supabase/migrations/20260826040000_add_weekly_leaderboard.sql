-- ============================================================
-- Global weekly leaderboard: total miles per user over the trailing
-- 7 days (today and the 6 days before it), across all activity.
--
-- daily_activity itself stays private (RLS: owner-only reads) -- this
-- exposes only the aggregated weekly total plus each user's already-
-- public profile fields (display_name/username, readable by any
-- authenticated user per the existing users SELECT policy), never
-- raw per-day rows. A SECURITY DEFINER function is required rather
-- than a plain view: a normal view would still apply the querying
-- user's own RLS to daily_activity, so it would only ever see that
-- user's own rows, not the whole leaderboard.
-- ============================================================

CREATE FUNCTION public.weekly_leaderboard()
RETURNS TABLE (
    user_id UUID,
    display_name TEXT,
    username TEXT,
    total_miles NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT
        u.id,
        u.display_name,
        u.username,
        SUM(da.distance_miles) AS total_miles
    FROM public.daily_activity da
    JOIN public.users u ON u.id = da.user_id
    WHERE da.activity_date >= CURRENT_DATE - INTERVAL '6 days'
    GROUP BY u.id, u.display_name, u.username
    HAVING SUM(da.distance_miles) > 0
    ORDER BY total_miles DESC
    LIMIT 100;
$$;

REVOKE ALL ON FUNCTION public.weekly_leaderboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.weekly_leaderboard() TO authenticated;
