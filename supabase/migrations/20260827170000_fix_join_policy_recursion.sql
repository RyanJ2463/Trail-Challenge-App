-- ============================================================
-- Fixes "infinite recursion detected in policy for relation
-- challenge_participants" (42P17) whenever an authenticated user
-- inserts a challenge_participants row -- i.e. joining a public
-- challenge, and createChallenge() creating one (it self-joins the
-- creator for public challenges).
--
-- The challenge_participants INSERT policy "Users can join public
-- challenges" checks:
--     EXISTS (SELECT 1 FROM public.challenges c
--             WHERE c.id = challenge_id AND c.is_public)
-- That subquery pulls in the challenges SELECT policy, which since
-- 20260826130000_fix_challenges_returning_visibility.sql inlines
--     EXISTS (SELECT 1 FROM public.challenge_participants cp ...)
-- so Postgres re-enters challenge_participants' policies while it is
-- still expanding them for the INSERT, and bails out.
--
-- Fix: move the is_public test into a SECURITY DEFINER function whose
-- body bypasses RLS -- the same trick can_view_challenge() uses
-- (20260825190000_fix_challenge_rls_recursion.sql). The policy
-- expression then has no visible reference to another table, so no
-- policy cycle can form.
-- ============================================================

-- CREATE OR REPLACE (not plain CREATE) so this is safe to apply even if the
-- same statement was already run by hand against a project to unblock joins
-- before this migration merged.
CREATE OR REPLACE FUNCTION public.challenge_is_public(p_challenge_id BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.challenges
        WHERE id = p_challenge_id AND is_public
    );
$$;

REVOKE ALL ON FUNCTION public.challenge_is_public(BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.challenge_is_public(BIGINT) TO authenticated;

ALTER POLICY "Users can join public challenges"
    ON public.challenge_participants
    WITH CHECK (
        user_id = (select auth.uid())
        AND public.challenge_is_public(challenge_id)
    );
