-- ============================================================
-- PROFILE: visibility + per-stat show/hide, plus a stats function.
--
-- profile_visibility controls who can open the profile at all:
--   'private' -- only the owner
--   'friends' -- owner + accepted friends
--   'public'  -- any signed-in user
-- The show_* flags then control which stat groups a NON-owner viewer
-- sees once they're allowed to view the profile at all -- the owner
-- always sees their own full stats regardless of these flags (they
-- only gate what OTHERS see).
-- ============================================================

ALTER TABLE public.users
    ADD COLUMN profile_visibility TEXT NOT NULL DEFAULT 'friends'
        CHECK (profile_visibility IN ('private', 'friends', 'public')),
    ADD COLUMN show_lifetime_miles BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN show_lifetime_steps BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN show_monthly_stats BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN show_records BOOLEAN NOT NULL DEFAULT true;

-- ============================================================
-- get_profile: resolves a profile plus its computed stats, enforcing
-- profile_visibility/friendship and the per-stat show_* flags server
-- side (never trust a client to just not render a hidden field).
-- Returns zero rows if the caller isn't allowed to view the profile
-- at all -- deliberately indistinguishable from "user doesn't exist",
-- so a private profile's existence isn't leaked either.
--
-- SECURITY DEFINER is required to read the target's daily_activity
-- (owner-only RLS) when computing stats for a friend/public viewer;
-- same pattern as weekly_leaderboard/friends_weekly_leaderboard.
-- ============================================================
CREATE FUNCTION public.get_profile(p_user_id UUID)
RETURNS TABLE (
    user_id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    is_owner BOOLEAN,
    profile_visibility TEXT,
    show_lifetime_miles BOOLEAN,
    show_lifetime_steps BOOLEAN,
    show_monthly_stats BOOLEAN,
    show_records BOOLEAN,
    lifetime_miles NUMERIC,
    lifetime_steps BIGINT,
    current_month_miles NUMERIC,
    current_month_steps BIGINT,
    best_day_miles NUMERIC,
    best_day_date DATE,
    best_week_miles NUMERIC,
    best_week_start DATE,
    best_month_miles NUMERIC,
    best_month TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    WITH target AS (
        SELECT u.*, (u.id = (select auth.uid())) AS owner
        FROM public.users u
        WHERE u.id = p_user_id
    ),
    visible AS (
        SELECT t.*,
            (
                t.owner
                OR t.profile_visibility = 'public'
                OR (
                    t.profile_visibility = 'friends'
                    AND EXISTS (
                        SELECT 1 FROM public.friendships f
                        WHERE f.status = 'accepted'
                          AND (
                              (f.requester_id = (select auth.uid()) AND f.addressee_id = t.id)
                              OR (f.addressee_id = (select auth.uid()) AND f.requester_id = t.id)
                          )
                    )
                )
            ) AS can_view
        FROM target t
    ),
    daily AS (
        SELECT da.*
        FROM public.daily_activity da
        JOIN visible v ON v.can_view AND da.user_id = v.id
    ),
    lifetime AS (
        SELECT COALESCE(SUM(distance_miles), 0) AS miles, COALESCE(SUM(steps), 0) AS steps
        FROM daily
    ),
    this_month AS (
        SELECT COALESCE(SUM(distance_miles), 0) AS miles, COALESCE(SUM(steps), 0) AS steps
        FROM daily
        WHERE date_trunc('month', activity_date) = date_trunc('month', CURRENT_DATE)
    ),
    best_day AS (
        SELECT distance_miles AS miles, activity_date AS date
        FROM daily
        ORDER BY distance_miles DESC
        LIMIT 1
    ),
    -- Calendar (ISO, Mon-Sun) weeks, not the trailing-7-day window the
    -- leaderboard functions use -- this is an all-time "best single
    -- week" record, not a rolling total.
    weekly AS (
        SELECT date_trunc('week', activity_date)::date AS week_start, SUM(distance_miles) AS miles
        FROM daily
        GROUP BY 1
    ),
    best_week AS (
        SELECT miles, week_start FROM weekly ORDER BY miles DESC LIMIT 1
    ),
    monthly AS (
        SELECT date_trunc('month', activity_date)::date AS month_start, SUM(distance_miles) AS miles
        FROM daily
        GROUP BY 1
    ),
    best_month AS (
        SELECT miles, month_start FROM monthly ORDER BY miles DESC LIMIT 1
    )
    SELECT
        v.id,
        v.username,
        v.display_name,
        v.avatar_url,
        v.owner,
        v.profile_visibility,
        v.show_lifetime_miles,
        v.show_lifetime_steps,
        v.show_monthly_stats,
        v.show_records,
        CASE WHEN v.owner OR v.show_lifetime_miles THEN lifetime.miles END,
        CASE WHEN v.owner OR v.show_lifetime_steps THEN lifetime.steps END,
        CASE WHEN v.owner OR v.show_monthly_stats THEN this_month.miles END,
        CASE WHEN v.owner OR v.show_monthly_stats THEN this_month.steps END,
        CASE WHEN v.owner OR v.show_records THEN best_day.miles END,
        CASE WHEN v.owner OR v.show_records THEN best_day.date END,
        CASE WHEN v.owner OR v.show_records THEN best_week.miles END,
        CASE WHEN v.owner OR v.show_records THEN best_week.week_start END,
        CASE WHEN v.owner OR v.show_records THEN best_month.miles END,
        CASE WHEN v.owner OR v.show_records THEN to_char(best_month.month_start, 'YYYY-MM') END
    FROM visible v
    LEFT JOIN lifetime ON true
    LEFT JOIN this_month ON true
    LEFT JOIN best_day ON true
    LEFT JOIN best_week ON true
    LEFT JOIN best_month ON true
    WHERE v.can_view;
$$;

REVOKE ALL ON FUNCTION public.get_profile(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_profile(UUID) TO authenticated;
