import { supabase } from './supabase';
import type { Tables } from './database.types';

export type UserProfile = Pick<Tables<'users'>, 'id' | 'username' | 'display_name'>;
export type FriendRequest = {
  requesterId: string;
  addresseeId: string;
  status: string;
  createdAt: string;
  user: UserProfile;
};

export async function searchUsers(query: string, excludeUserId: string): Promise<UserProfile[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const { data, error } = await supabase
    .from('users')
    .select('id, username, display_name')
    .neq('id', excludeUserId)
    .or(`username.ilike.%${trimmed}%,display_name.ilike.%${trimmed}%`)
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

/**
 * Sends a friend request. If the other user already sent one to us, this
 * accepts theirs instead of creating a duplicate pending row in the
 * opposite direction.
 */
export async function sendFriendRequest(myUserId: string, otherUserId: string): Promise<void> {
  const { data: reverse, error: reverseError } = await supabase
    .from('friendships')
    .select('status')
    .eq('requester_id', otherUserId)
    .eq('addressee_id', myUserId)
    .maybeSingle();
  if (reverseError) throw reverseError;

  if (reverse) {
    if (reverse.status === 'pending') {
      await acceptFriendRequest(otherUserId, myUserId);
    }
    return;
  }

  const { error } = await supabase
    .from('friendships')
    .insert({ requester_id: myUserId, addressee_id: otherUserId });
  if (error) throw error;
}

export async function acceptFriendRequest(requesterId: string, addresseeId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('requester_id', requesterId)
    .eq('addressee_id', addresseeId);
  if (error) throw error;
}

/** Declines a pending request, cancels one you sent, or unfriends an accepted one. */
export async function removeFriendship(userA: string, userB: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .delete()
    .or(
      `and(requester_id.eq.${userA},addressee_id.eq.${userB}),and(requester_id.eq.${userB},addressee_id.eq.${userA})`
    );
  if (error) throw error;
}

export async function listFriends(userId: string): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(
      'requester_id, addressee_id, requester:users!friendships_requester_id_fkey(id, username, display_name), addressee:users!friendships_addressee_id_fkey(id, username, display_name)'
    )
    .eq('status', 'accepted')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
  if (error) throw error;

  return (data ?? []).map((row) => (row.requester_id === userId ? row.addressee : row.requester));
}

export async function listIncomingRequests(userId: string): Promise<FriendRequest[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(
      'requester_id, addressee_id, status, created_at, requester:users!friendships_requester_id_fkey(id, username, display_name)'
    )
    .eq('status', 'pending')
    .eq('addressee_id', userId);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    requesterId: row.requester_id,
    addresseeId: row.addressee_id,
    status: row.status,
    createdAt: row.created_at,
    user: row.requester,
  }));
}

export async function listOutgoingRequests(userId: string): Promise<FriendRequest[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(
      'requester_id, addressee_id, status, created_at, addressee:users!friendships_addressee_id_fkey(id, username, display_name)'
    )
    .eq('status', 'pending')
    .eq('requester_id', userId);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    requesterId: row.requester_id,
    addresseeId: row.addressee_id,
    status: row.status,
    createdAt: row.created_at,
    user: row.addressee,
  }));
}
