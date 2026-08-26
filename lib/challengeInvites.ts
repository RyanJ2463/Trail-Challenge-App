import { supabase } from './supabase';
import type { UserProfile } from './friends';

export type ChallengeInvite = {
  challengeId: number;
  challengeName: string;
  trailName: string | null;
  inviter: UserProfile;
  createdAt: string;
};

export async function sendChallengeInvite(
  challengeId: number,
  inviterId: string,
  inviteeId: string
): Promise<void> {
  const { error } = await supabase
    .from('challenge_invites')
    .insert({ challenge_id: challengeId, inviter_id: inviterId, invitee_id: inviteeId });
  if (error) throw error;
}

export async function listMyPendingInvites(userId: string): Promise<ChallengeInvite[]> {
  const { data, error } = await supabase
    .from('challenge_invites')
    .select(
      'challenge_id, created_at, challenges(name, trails(name)), inviter:users!challenge_invites_inviter_id_fkey(id, username, display_name)'
    )
    .eq('invitee_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    challengeId: row.challenge_id,
    challengeName: row.challenges?.name ?? 'Untitled challenge',
    trailName: row.challenges?.trails?.name ?? null,
    inviter: row.inviter,
    createdAt: row.created_at,
  }));
}

export async function acceptChallengeInvite(challengeId: number, userId: string): Promise<void> {
  const { error } = await supabase
    .from('challenge_invites')
    .update({ status: 'accepted' })
    .eq('challenge_id', challengeId)
    .eq('invitee_id', userId);
  if (error) throw error;
}

export async function declineChallengeInvite(challengeId: number, userId: string): Promise<void> {
  const { error } = await supabase
    .from('challenge_invites')
    .delete()
    .eq('challenge_id', challengeId)
    .eq('invitee_id', userId);
  if (error) throw error;
}

/** Pending invites for a challenge, so its creator/members can see who's been invited. */
export async function listInvitesForChallenge(challengeId: number): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('challenge_invites')
    .select('invitee:users!challenge_invites_invitee_id_fkey(id, username, display_name)')
    .eq('challenge_id', challengeId)
    .eq('status', 'pending');
  if (error) throw error;
  return (data ?? []).map((row) => row.invitee);
}
