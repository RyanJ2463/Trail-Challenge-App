-- ============================================================
-- CHALLENGE INVITES
-- Lets a challenge creator (or existing participant) invite a friend to a
-- private challenge, and gives the invitee a proper accept/decline step
-- instead of silent auto-join. Mirrors the friendships table: 'pending'
-- until accepted, either party can delete a row (decline / cancel), and
-- there's no separate 'declined' status -- declining just removes the row.
-- ============================================================
CREATE TABLE public.challenge_invites (
    challenge_id    BIGINT NOT NULL REFERENCES public.challenges (id) ON DELETE CASCADE,
    inviter_id      UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
    invitee_id      UUID NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (challenge_id, invitee_id),
    CHECK (inviter_id <> invitee_id)
);

ALTER TABLE public.challenge_invites ENABLE ROW LEVEL SECURITY;

-- An invitee needs to see a private challenge's detail screen before
-- deciding whether to accept, so extend the shared visibility check
-- (defined in 20260825190000_fix_challenge_rls_recursion.sql) to include
-- challenges they've been invited to. CREATE OR REPLACE keeps the same
-- signature, so the four policies already calling it pick this up as-is.
CREATE OR REPLACE FUNCTION public.can_view_challenge(p_challenge_id BIGINT, p_user_id UUID)
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
              OR EXISTS (
                  SELECT 1 FROM public.challenge_invites ci
                  WHERE ci.challenge_id = c.id AND ci.invitee_id = p_user_id
              )
          )
    );
$$;

CREATE POLICY "Invitees and inviters can view their invites"
    ON public.challenge_invites FOR SELECT
    TO authenticated
    USING (invitee_id = (select auth.uid()) OR inviter_id = (select auth.uid()));

-- Only to a challenge the inviter can already see, and only to a friend
-- (accepted friendship in either direction) -- keeps invites from becoming
-- a way to spam or add strangers.
CREATE POLICY "Members can invite friends to a challenge they can see"
    ON public.challenge_invites FOR INSERT
    TO authenticated
    WITH CHECK (
        inviter_id = (select auth.uid())
        AND public.can_view_challenge(challenge_id, (select auth.uid()))
        AND EXISTS (
            SELECT 1 FROM public.friendships f
            WHERE f.status = 'accepted'
              AND (
                  (f.requester_id = (select auth.uid()) AND f.addressee_id = invitee_id)
                  OR (f.addressee_id = (select auth.uid()) AND f.requester_id = invitee_id)
              )
        )
    );

-- Only the invitee can accept (move pending -> accepted).
CREATE POLICY "Invitee can accept their invite"
    ON public.challenge_invites FOR UPDATE
    TO authenticated
    USING (invitee_id = (select auth.uid()))
    WITH CHECK (invitee_id = (select auth.uid()));

-- Either side can remove an invite: decline it, or cancel one you sent.
CREATE POLICY "Either party can remove an invite"
    ON public.challenge_invites FOR DELETE
    TO authenticated
    USING (invitee_id = (select auth.uid()) OR inviter_id = (select auth.uid()));

-- Auto-join on accept, so acceptance is atomic and no client-facing
-- challenge_participants INSERT policy is needed for the invite path.
CREATE FUNCTION public.handle_invite_accepted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM 'accepted' THEN
        INSERT INTO public.challenge_participants (challenge_id, user_id)
        VALUES (NEW.challenge_id, NEW.invitee_id)
        ON CONFLICT DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

-- Trigger invocation doesn't require the triggering role to have EXECUTE
-- on the function (see 20260825041135_harden_rls_and_trigger.sql), so this
-- is safe to revoke from every client-facing role.
REVOKE EXECUTE ON FUNCTION public.handle_invite_accepted() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_challenge_invite_accepted
    AFTER UPDATE ON public.challenge_invites
    FOR EACH ROW EXECUTE FUNCTION public.handle_invite_accepted();
