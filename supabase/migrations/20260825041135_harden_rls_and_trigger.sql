-- ============================================================
-- Fixes flagged by `supabase db advisors` after the initial schema
-- migration:
--
-- 1. auth_rls_initplan (PERFORMANCE): auth.uid() in a policy is
--    re-evaluated once per row scanned. Wrapping it as
--    (select auth.uid()) lets Postgres evaluate it once per query
--    instead. See:
--    https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
--
-- 2. anon/authenticated_security_definer_function_executable
--    (SECURITY): handle_new_user() is SECURITY DEFINER and, by
--    default, executable directly via PostgREST's RPC endpoint by
--    anyone holding the anon key -- even though it's only meant to
--    run as the on_auth_user_created trigger. Revoking EXECUTE
--    doesn't affect the trigger: trigger invocation doesn't require
--    the triggering role to have EXECUTE on the function.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

ALTER POLICY "Users can update their own profile"
    ON public.users
    USING ((select auth.uid()) = id)
    WITH CHECK ((select auth.uid()) = id);

ALTER POLICY "Users can view their own daily activity"
    ON public.daily_activity
    USING ((select auth.uid()) = user_id);

ALTER POLICY "Users can insert their own daily activity"
    ON public.daily_activity
    WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users can update their own daily activity"
    ON public.daily_activity
    USING ((select auth.uid()) = user_id)
    WITH CHECK ((select auth.uid()) = user_id);

ALTER POLICY "Users can delete their own daily activity"
    ON public.daily_activity
    USING ((select auth.uid()) = user_id);

ALTER POLICY "Challenges visible if public, owned, or joined"
    ON public.challenges
    USING (
        is_public
        OR created_by = (select auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.challenge_participants cp
            WHERE cp.challenge_id = id AND cp.user_id = (select auth.uid())
        )
    );

ALTER POLICY "Users can create challenges"
    ON public.challenges
    WITH CHECK (created_by = (select auth.uid()));

ALTER POLICY "Creators can update their challenges"
    ON public.challenges
    USING (created_by = (select auth.uid()))
    WITH CHECK (created_by = (select auth.uid()));

ALTER POLICY "Creators can delete their challenges"
    ON public.challenges
    USING (created_by = (select auth.uid()));

ALTER POLICY "Participants visible if challenge is public, owned, or joined"
    ON public.challenge_participants
    USING (
        EXISTS (
            SELECT 1 FROM public.challenges c
            WHERE c.id = challenge_id
              AND (
                  c.is_public
                  OR c.created_by = (select auth.uid())
                  OR EXISTS (
                      SELECT 1 FROM public.challenge_participants cp
                      WHERE cp.challenge_id = c.id AND cp.user_id = (select auth.uid())
                  )
              )
        )
    );

ALTER POLICY "Users can join public challenges"
    ON public.challenge_participants
    WITH CHECK (
        user_id = (select auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.challenges c
            WHERE c.id = challenge_id AND c.is_public
        )
    );

ALTER POLICY "Users can leave challenges"
    ON public.challenge_participants
    USING (user_id = (select auth.uid()));

ALTER POLICY "Progress visible if challenge is public, owned, or joined"
    ON public.challenge_progress
    USING (
        EXISTS (
            SELECT 1 FROM public.challenges c
            WHERE c.id = challenge_id
              AND (
                  c.is_public
                  OR c.created_by = (select auth.uid())
                  OR EXISTS (
                      SELECT 1 FROM public.challenge_participants cp
                      WHERE cp.challenge_id = c.id AND cp.user_id = (select auth.uid())
                  )
              )
        )
    );
