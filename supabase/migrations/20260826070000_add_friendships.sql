-- ============================================================
-- FRIENDSHIPS
-- One row per requester/addressee pair. 'pending' until the addressee
-- accepts; either party can delete a row at any point (decline,
-- cancel a sent request, or unfriend).
-- ============================================================
CREATE TABLE public.friendships (
    requester_id    UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
    addressee_id    UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (requester_id, addressee_id),
    CHECK (requester_id <> addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friendships"
    ON public.friendships FOR SELECT
    TO authenticated
    USING (requester_id = (select auth.uid()) OR addressee_id = (select auth.uid()));

CREATE POLICY "Users can send friend requests"
    ON public.friendships FOR INSERT
    TO authenticated
    WITH CHECK (requester_id = (select auth.uid()));

-- Only the addressee can move a request from pending to accepted.
CREATE POLICY "Addressee can accept a friend request"
    ON public.friendships FOR UPDATE
    TO authenticated
    USING (addressee_id = (select auth.uid()))
    WITH CHECK (addressee_id = (select auth.uid()));

-- Either side can remove a friendship: decline a pending request,
-- cancel one they sent, or unfriend an accepted one.
CREATE POLICY "Either party can remove a friendship"
    ON public.friendships FOR DELETE
    TO authenticated
    USING (requester_id = (select auth.uid()) OR addressee_id = (select auth.uid()));

-- ============================================================
-- Friends-only weekly leaderboard: same aggregate-only privacy model
-- as weekly_leaderboard() (see 20260826040000_add_weekly_leaderboard),
-- restricted to the caller plus their accepted friends. SECURITY
-- DEFINER is required for the same reason: reading a friend's
-- daily_activity to sum it would otherwise be blocked by its
-- owner-only RLS policy.
-- ============================================================
CREATE FUNCTION public.friends_weekly_leaderboard()
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
      AND (
          u.id = (select auth.uid())
          OR EXISTS (
              SELECT 1 FROM public.friendships f
              WHERE f.status = 'accepted'
                AND (
                    (f.requester_id = (select auth.uid()) AND f.addressee_id = u.id)
                    OR (f.addressee_id = (select auth.uid()) AND f.requester_id = u.id)
                )
          )
      )
    GROUP BY u.id, u.display_name, u.username
    HAVING SUM(da.distance_miles) > 0
    ORDER BY total_miles DESC
    LIMIT 100;
$$;

REVOKE ALL ON FUNCTION public.friends_weekly_leaderboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.friends_weekly_leaderboard() TO authenticated;
