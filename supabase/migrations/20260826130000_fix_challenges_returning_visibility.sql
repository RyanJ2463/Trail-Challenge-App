-- ============================================================
-- Fixes "new row violates row-level security policy for table
-- challenges" on INSERT ... RETURNING (i.e. every `.select().single()`
-- after createChallenge(), for public AND private challenges alike).
--
-- Root cause: the `challenges` SELECT policy calls
-- public.can_view_challenge(id, uid), which re-queries `challenges`
-- itself by id. For INSERT ... RETURNING, Postgres evaluates the
-- SELECT policy against the row it just inserted, in the same
-- command -- and a function-based self-query on the table currently
-- being inserted into isn't guaranteed to see that not-yet-committed
-- row within the same command. can_view_challenge() was introduced by
-- 20260825190000_fix_challenge_rls_recursion.sql to break a *different*
-- cycle (challenges <-> challenge_participants); it was never meant to
-- be called from challenges' own policy, which doesn't need it --
-- is_public, created_by, and id are direct columns on the row under
-- check, not a subquery, so they can be tested inline with no
-- self-reference at all. Only the challenge_participants and
-- challenge_invites checks touch another table, and neither of those
-- recurses back into challenges' policy (their own policies call
-- can_view_challenge, which bypasses challenges' RLS via SECURITY
-- DEFINER).
-- ============================================================

ALTER POLICY "Challenges visible if public, owned, or joined"
    ON public.challenges
    USING (
        is_public
        OR created_by = (select auth.uid())
        OR EXISTS (
            SELECT 1 FROM public.challenge_participants cp
            WHERE cp.challenge_id = id AND cp.user_id = (select auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.challenge_invites ci
            WHERE ci.challenge_id = id AND ci.invitee_id = (select auth.uid())
        )
    );
