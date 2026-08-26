import { supabase } from './supabase';
import type { Tables } from './database.types';
import type { ActivityType } from './activityTypes';

export type ChallengeWithTrail = Tables<'challenges'> & {
  trails: Pick<Tables<'trails'>, 'name' | 'total_distance_miles'> | null;
};

/** Challenges the user created or joined, newest first, deduplicated. */
export async function listMyChallenges(userId: string): Promise<ChallengeWithTrail[]> {
  const [{ data: created, error: createdError }, { data: participantRows, error: participantError }] =
    await Promise.all([
      supabase
        .from('challenges')
        .select('*, trails(name, total_distance_miles)')
        .eq('created_by', userId),
      supabase.from('challenge_participants').select('challenge_id').eq('user_id', userId),
    ]);
  if (createdError) throw createdError;
  if (participantError) throw participantError;

  const joinedIds = (participantRows ?? []).map((row) => row.challenge_id);
  const { data: joined, error: joinedError } = joinedIds.length
    ? await supabase
        .from('challenges')
        .select('*, trails(name, total_distance_miles)')
        .in('id', joinedIds)
    : { data: [] as ChallengeWithTrail[], error: null };
  if (joinedError) throw joinedError;

  const byId = new Map<number, ChallengeWithTrail>();
  for (const challenge of [...(created ?? []), ...(joined ?? [])]) {
    byId.set(challenge.id, challenge);
  }
  return [...byId.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Public challenges the user hasn't already created or joined. */
export async function listDiscoverableChallenges(userId: string): Promise<ChallengeWithTrail[]> {
  const [{ data: publicChallenges, error }, mine] = await Promise.all([
    supabase
      .from('challenges')
      .select('*, trails(name, total_distance_miles)')
      .eq('is_public', true),
    listMyChallenges(userId),
  ]);
  if (error) throw error;

  const mineIds = new Set(mine.map((c) => c.id));
  return (publicChallenges ?? []).filter((c) => !mineIds.has(c.id));
}

export async function listTrails(): Promise<Tables<'trails'>[]> {
  const { data, error } = await supabase.from('trails').select('*').order('name');
  if (error) throw error;
  return data ?? [];
}

export async function createChallenge(input: {
  name: string;
  trailId: number | null;
  activityType: ActivityType;
  startDate: string;
  endDate: string | null;
  isPublic: boolean;
  createdBy: string;
}): Promise<Tables<'challenges'>> {
  const { data, error } = await supabase
    .from('challenges')
    .insert({
      name: input.name,
      trail_id: input.trailId,
      activity_type: input.activityType,
      start_date: input.startDate,
      end_date: input.endDate,
      is_public: input.isPublic,
      created_by: input.createdBy,
    })
    .select()
    .single();
  if (error) throw error;

  // RLS only allows self-joining public challenges, so a private challenge's
  // creator has no participant row — they still see it via created_by.
  if (input.isPublic) {
    const { error: joinError } = await supabase
      .from('challenge_participants')
      .insert({ challenge_id: data.id, user_id: input.createdBy });
    if (joinError) throw joinError;
  }

  return data;
}

export async function joinChallenge(challengeId: number, userId: string): Promise<void> {
  const { error } = await supabase
    .from('challenge_participants')
    .insert({ challenge_id: challengeId, user_id: userId });
  if (error) throw error;
}

export async function getChallenge(challengeId: number): Promise<ChallengeWithTrail> {
  const { data, error } = await supabase
    .from('challenges')
    .select('*, trails(name, total_distance_miles)')
    .eq('id', challengeId)
    .single();
  if (error) throw error;
  return data;
}

export async function listParticipants(
  challengeId: number
): Promise<Pick<Tables<'users'>, 'id' | 'display_name' | 'username'>[]> {
  const { data, error } = await supabase
    .from('challenge_participants')
    .select('users(id, display_name, username)')
    .eq('challenge_id', challengeId);
  if (error) throw error;
  return (data ?? []).map((row) => row.users).filter((u): u is NonNullable<typeof u> => u != null);
}

export async function isParticipant(challengeId: number, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('challenge_participants')
    .select('challenge_id')
    .eq('challenge_id', challengeId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data != null;
}
