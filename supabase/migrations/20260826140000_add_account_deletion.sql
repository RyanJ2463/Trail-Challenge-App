-- ============================================================
-- Lets a signed-in user delete their own account from Account
-- Settings. auth.users isn't exposed to PostgREST (it's outside the
-- public schema), so this needs a SECURITY DEFINER function scoped to
-- the caller -- there's no way to pass someone else's id through it.
--
-- challenges.created_by -> users(id) had no ON DELETE action (defaults
-- to RESTRICT), so deleting a user who'd created any challenge would
-- fail with a foreign key violation. Every other user reference in the
-- schema already cascades on delete (see initial_schema.sql,
-- add_friendships.sql, add_challenge_invites.sql); this brings
-- created_by in line with that, so deleting your account also removes
-- challenges you created (and, via their own ON DELETE CASCADE FKs,
-- their participants/progress/invites).
-- ============================================================

ALTER TABLE public.challenges
    DROP CONSTRAINT challenges_created_by_fkey,
    ADD CONSTRAINT challenges_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.users (id) ON DELETE CASCADE;

CREATE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    DELETE FROM auth.users WHERE id = (select auth.uid());
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
