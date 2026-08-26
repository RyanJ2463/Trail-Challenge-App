-- ============================================================
-- Fixes "infinite recursion detected in policy for relation
-- challenge_participants" (Postgres error 42P17).
--
-- The `challenges` SELECT policy checks challenge_participants via
-- EXISTS, and the `challenge_participants` SELECT policy checks
-- challenges via EXISTS. Evaluating either policy re-triggers RLS on
-- the other table, which re-triggers the first policy, forever.
--
-- Fix: move the shared "can this user see this challenge" check into
-- a single SECURITY DEFINER function. Its internal queries run as the
-- function's owner (the table owner, which bypasses RLS), so it never
-- re-enters either table's RLS policy -- breaking the cycle. All four
-- policies that previously duplicated this EXISTS logic now call the
-- same function instead.
-- ============================================================

CREATE FUNCTION public.can_view_challenge(p_challenge_id BIGINT, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.challenges c
        WHERE c.id = p_challenge_id
          AND (
              c.is_public
              OR c.created_by = p_user_id
              OR EXISTS (
                  SELECT 1 FROM public.challenge_participants cp
                  WHERE cp.challenge_id = c.id AND cp.user_id = p_user_id
              )
          )
    );
$$;

REVOKE ALL ON FUNCTION public.can_view_challenge(BIGINT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_challenge(BIGINT, UUID) TO authenticated;

ALTER POLICY "Challenges visible if public, owned, or joined"
    ON public.challenges
    USING (public.can_view_challenge(id, (select auth.uid())));

ALTER POLICY "Participants visible if challenge is public, owned, or joined"
    ON public.challenge_participants
    USING (public.can_view_challenge(challenge_id, (select auth.uid())));

ALTER POLICY "Progress visible if challenge is public, owned, or joined"
    ON public.challenge_progress
    USING (public.can_view_challenge(challenge_id, (select auth.uid())));
