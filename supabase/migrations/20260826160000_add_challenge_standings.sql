-- ============================================================
-- challenge_standings(challenge_id): one ranked row per participant
-- of a challenge, with cumulative + trailing-7-day distance and the
-- last time that user synced activity inside the challenge window.
--
-- Why a SECURITY DEFINER function: daily_activity is private health
-- data -- its RLS only lets a user read their OWN rows (see
-- 20260825034028_initial_schema.sql). A challenge member still needs
-- to see how far the OTHER members have walked. This function exposes
-- ONLY the per-member aggregate a fellow member is entitled to,
-- never raw per-day rows -- the same trade-off already made by
-- weekly_leaderboard() (20260826040000) and get_profile()
-- (20260826100000).
--
-- Visibility: gated by can_view_challenge() -- a caller who cannot
-- see the challenge gets zero rows, deliberately indistinguishable
-- from an empty or non-existent challenge (same posture as
-- get_profile()). Invitees to a private challenge can see standings,
-- since can_view_challenge() already lets them open its detail screen.
--
-- Roster: every challenge_participants row, UNION the creator -- a
-- private challenge's creator has no participant row (RLS only allows
-- self-joining PUBLIC challenges) but still "owns" the challenge and
-- should appear in its standings.
--
-- Phase 1 scope: sums daily_activity.distance_miles regardless of the
-- challenge's activity_type. daily_activity has no per-activity-type
-- breakdown yet, so every challenge currently ranks on total
-- walking+running distance. Making a "running" challenge count runs
-- only is Phase 2 -- see design/challenge-standings/IMPLEMENTATION_PLAN.md.
-- week_miles is clamped to the challenge window, so a challenge that
-- ended more than 7 days ago reports 0.
-- ============================================================

CREATE FUNCTION public.challenge_standings(p_challenge_id BIGINT)
RETURNS TABLE (
    user_id           UUID,
    display_name      TEXT,
    username          TEXT,
    avatar_url        TEXT,
    is_me             BOOLEAN,
    is_friend         BOOLEAN,
    cumulative_miles  NUMERIC,
    week_miles        NUMERIC,
    last_synced_at    TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    WITH viewer AS (
        SELECT (select auth.uid()) AS uid
    ),
    challenge AS (
        SELECT c.created_by,
               c.start_date,
               COALESCE(c.end_date, CURRENT_DATE) AS end_date
        FROM public.challenges c
        WHERE c.id = p_challenge_id
    ),
    roster AS (
        SELECT cp.user_id
        FROM public.challenge_participants cp
        WHERE cp.challenge_id = p_challenge_id
        UNION
        SELECT ch.created_by
        FROM challenge ch
    ),
    activity AS (
        SELECT da.user_id,
               SUM(da.distance_miles) AS cumulative_miles,
               SUM(da.distance_miles) FILTER (
                   WHERE da.activity_date >= CURRENT_DATE - INTERVAL '6 days'
               ) AS week_miles,
               MAX(da.synced_at) AS last_synced_at
        FROM public.daily_activity da
        CROSS JOIN challenge ch
        WHERE da.user_id IN (SELECT user_id FROM roster)
          AND da.activity_date >= ch.start_date
          AND da.activity_date <= ch.end_date
        GROUP BY da.user_id
    )
    SELECT
        u.id,
        u.display_name,
        u.username,
        u.avatar_url,
        u.id = viewer.uid AS is_me,
        EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE f.status = 'accepted'
              AND (
                  (f.requester_id = viewer.uid AND f.addressee_id = u.id)
                  OR (f.addressee_id = viewer.uid AND f.requester_id = u.id)
              )
        ) AS is_friend,
        COALESCE(a.cumulative_miles, 0) AS cumulative_miles,
        COALESCE(a.week_miles, 0) AS week_miles,
        a.last_synced_at
    FROM roster r
    JOIN public.users u ON u.id = r.user_id
    CROSS JOIN viewer
    LEFT JOIN activity a ON a.user_id = r.user_id
    WHERE public.can_view_challenge(p_challenge_id, viewer.uid)
    ORDER BY COALESCE(a.cumulative_miles, 0) DESC, u.display_name ASC;
$$;

REVOKE ALL ON FUNCTION public.challenge_standings(BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.challenge_standings(BIGINT) TO authenticated;
