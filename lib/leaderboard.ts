import { supabase } from './supabase';

export type LeaderboardEntry = {
  userId: string;
  displayName: string;
  username: string;
  totalMiles: number;
};

/** Total miles per user over the trailing 7 days, ranked highest first. */
export async function getWeeklyLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('weekly_leaderboard');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    username: row.username,
    totalMiles: row.total_miles,
  }));
}

/** Same as getWeeklyLeaderboard, restricted to the caller and their accepted friends. */
export async function getFriendsWeeklyLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('friends_weekly_leaderboard');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    username: row.username,
    totalMiles: row.total_miles,
  }));
}
