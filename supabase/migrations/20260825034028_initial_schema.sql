-- ============================================================
-- USERS
-- One row per Supabase Auth user (public.users.id === auth.users.id).
-- Kept as a separate table from auth.users, per Supabase convention,
-- so app-facing profile data can be joined/queried and exposed via
-- RLS without touching the protected auth schema.
-- ============================================================
CREATE TABLE public.users (
    id              UUID PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
    username        TEXT NOT NULL UNIQUE,
    display_name    TEXT NOT NULL,
    email           TEXT NOT NULL UNIQUE,
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create a public.users row whenever someone signs up through
-- Supabase Auth. Expects `username` and `display_name` to be passed
-- as auth signup metadata (e.g. supabase.auth.signUp({ options: { data: { username, display_name } } })).
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.users (id, username, display_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)),
        NEW.email
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Any signed-in user can see other users' public profile fields
-- (needed to render challenge participant lists, leaderboards, etc.).
CREATE POLICY "Authenticated users can view all profiles"
    ON public.users FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- No client-side INSERT/DELETE policy: rows are created only by the
-- handle_new_user trigger (SECURITY DEFINER) and deleted via the
-- auth.users cascade.

-- ============================================================
-- RAW ACTIVITY DATA  (from HealthKit / Health Connect)
-- One row per user per day. This is the single source of truth --
-- every challenge's progress is computed FROM this table, never
-- duplicated per-challenge.
-- ============================================================
CREATE TABLE public.daily_activity (
    id              BIGSERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
    activity_date   DATE NOT NULL,
    steps           INTEGER,
    distance_miles  NUMERIC(6,2) NOT NULL,   -- HealthKit distance / Health Connect Distance record
    source          TEXT NOT NULL,           -- 'apple_watch' | 'garmin' | 'manual'
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, activity_date)          -- one merged total per person per day
);
CREATE INDEX idx_daily_activity_user_date ON public.daily_activity (user_id, activity_date);

ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;

-- Raw daily activity is treated as private health data: only the
-- owning user can read or write their own rows. Aggregated progress
-- toward a shared challenge is exposed separately via
-- challenge_progress, which is visible to fellow participants below.
-- Loosen this if you want daily-level activity itself to be visible
-- to other challenge members (e.g. for a daily-effort leaderboard).
CREATE POLICY "Users can view their own daily activity"
    ON public.daily_activity FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily activity"
    ON public.daily_activity FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily activity"
    ON public.daily_activity FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily activity"
    ON public.daily_activity FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ============================================================
-- TRAILS  (static reference data, loaded once by you, reused
-- across many challenges -- not tied to any single user)
-- ============================================================
CREATE TABLE public.trails (
    id                      BIGSERIAL PRIMARY KEY,
    name                    TEXT NOT NULL,          -- e.g. "Appalachian Trail"
    total_distance_miles    NUMERIC(7,2) NOT NULL,
    description             TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trails ENABLE ROW LEVEL SECURITY;

-- Reference data: readable by anyone, including signed-out users
-- browsing trails before creating an account. Writes are left to the
-- service role (e.g. an admin script loading trail data), so there
-- are no client-facing INSERT/UPDATE/DELETE policies.
CREATE POLICY "Trails are publicly readable"
    ON public.trails FOR SELECT
    TO anon, authenticated
    USING (true);

-- Ordered points along the trail with CUMULATIVE distance from the
-- trailhead. This is what turns "23.6 miles in -> lat/lng" into a
-- lookup instead of a live GPS computation.
CREATE TABLE public.trail_points (
    id                          BIGSERIAL PRIMARY KEY,
    trail_id                    BIGINT NOT NULL REFERENCES public.trails (id) ON DELETE CASCADE,
    sequence                    INTEGER NOT NULL,     -- ordering along the trail
    latitude                    NUMERIC(9,6) NOT NULL,
    longitude                   NUMERIC(9,6) NOT NULL,
    cumulative_distance_miles   NUMERIC(7,2) NOT NULL,
    label                       TEXT,                 -- optional: "Springer Mountain", "Mile 100"
    UNIQUE (trail_id, sequence)
);
CREATE INDEX idx_trail_points_trail_dist ON public.trail_points (trail_id, cumulative_distance_miles);

ALTER TABLE public.trail_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trail points are publicly readable"
    ON public.trail_points FOR SELECT
    TO anon, authenticated
    USING (true);

-- ============================================================
-- CHALLENGES
-- ============================================================
CREATE TABLE public.challenges (
    id              BIGSERIAL PRIMARY KEY,
    trail_id        BIGINT NOT NULL REFERENCES public.trails (id),
    name            TEXT NOT NULL,            -- e.g. "AT Thru-Hike w/ the boys"
    created_by      UUID NOT NULL REFERENCES public.users (id),
    start_date      DATE NOT NULL,
    end_date        DATE,                     -- nullable = open-ended
    is_public       BOOLEAN NOT NULL DEFAULT false,  -- lets strangers discover/join, not just invited friends
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.challenge_participants (
    challenge_id    BIGINT NOT NULL REFERENCES public.challenges (id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (challenge_id, user_id)
);

-- RLS on both challenges and challenge_participants is enabled below,
-- after both tables exist -- their policies reference each other, so
-- neither table's policies can be created until both are present.
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

-- Visible if it's public, or the viewer is the creator or a participant.
CREATE POLICY "Challenges visible if public, owned, or joined"
    ON public.challenges FOR SELECT
    TO authenticated
    USING (
        is_public
        OR created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.challenge_participants cp
            WHERE cp.challenge_id = id AND cp.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create challenges"
    ON public.challenges FOR INSERT
    TO authenticated
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creators can update their challenges"
    ON public.challenges FOR UPDATE
    TO authenticated
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creators can delete their challenges"
    ON public.challenges FOR DELETE
    TO authenticated
    USING (created_by = auth.uid());

-- Participant lists follow the same visibility as the challenge itself.
CREATE POLICY "Participants visible if challenge is public, owned, or joined"
    ON public.challenge_participants FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.challenges c
            WHERE c.id = challenge_id
              AND (
                  c.is_public
                  OR c.created_by = auth.uid()
                  OR EXISTS (
                      SELECT 1 FROM public.challenge_participants cp
                      WHERE cp.challenge_id = c.id AND cp.user_id = auth.uid()
                  )
              )
        )
    );

-- Self-join only, and only on public challenges. Private challenges
-- need an invite mechanism (not modeled in this schema) before a
-- client-facing join policy can be added for them.
CREATE POLICY "Users can join public challenges"
    ON public.challenge_participants FOR INSERT
    TO authenticated
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.challenges c
            WHERE c.id = challenge_id AND c.is_public
        )
    );

CREATE POLICY "Users can leave challenges"
    ON public.challenge_participants FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- ============================================================
-- (OPTIONAL) CACHED PROGRESS
-- Recomputing "sum distance since start_date, then walk trail_points"
-- on every map load is cheap at small scale but wasteful once you have
-- many users / long trails. This table is a materialized cache you'd
-- update via a background job or on-write trigger whenever a user's
-- daily_activity changes and they're in an active challenge.
-- Skip this table for the MVP -- add it only if the live join starts
-- to feel slow.
-- ============================================================
CREATE TABLE public.challenge_progress (
    challenge_id            BIGINT NOT NULL REFERENCES public.challenges (id) ON DELETE CASCADE,
    user_id                 UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
    cumulative_miles        NUMERIC(7,2) NOT NULL DEFAULT 0,
    current_trail_point_id  BIGINT REFERENCES public.trail_points (id),
    last_computed_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (challenge_id, user_id)
);

ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;

-- Same visibility as participants. No client-facing write policies:
-- this table is meant to be maintained by a background job / trigger
-- running as the service role, not written directly by users.
CREATE POLICY "Progress visible if challenge is public, owned, or joined"
    ON public.challenge_progress FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.challenges c
            WHERE c.id = challenge_id
              AND (
                  c.is_public
                  OR c.created_by = auth.uid()
                  OR EXISTS (
                      SELECT 1 FROM public.challenge_participants cp
                      WHERE cp.challenge_id = c.id AND cp.user_id = auth.uid()
                  )
              )
        )
    );

-- ============================================================
-- EXAMPLE: resolve one user's cumulative miles in a challenge
-- (the "live" version -- no caching)
-- ============================================================
-- SELECT COALESCE(SUM(distance_miles), 0) AS cumulative_miles
-- FROM public.daily_activity
-- WHERE user_id = :user_id
--   AND activity_date BETWEEN :challenge_start_date
--                          AND COALESCE(:challenge_end_date, CURRENT_DATE);
--
-- Then, in application code (or a second query), find the last
-- trail_point whose cumulative_distance_miles <= cumulative_miles,
-- and linearly interpolate toward the next point using the leftover
-- distance -- that gives the exact marker coordinate.
