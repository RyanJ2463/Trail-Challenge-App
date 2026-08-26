import { supabase } from './supabase';
import type { TablesUpdate } from './database.types';

export type ProfileVisibility = 'private' | 'friends' | 'public';

export type Profile = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isOwner: boolean;
  visibility: ProfileVisibility;
  showLifetimeMiles: boolean;
  showLifetimeSteps: boolean;
  showMonthlyStats: boolean;
  showRecords: boolean;
  lifetimeMiles: number | null;
  lifetimeSteps: number | null;
  currentMonthMiles: number | null;
  currentMonthSteps: number | null;
  bestDayMiles: number | null;
  bestDayDate: string | null;
  bestWeekMiles: number | null;
  bestWeekStart: string | null;
  bestMonthMiles: number | null;
  bestMonth: string | null;
};

/** Null means "not visible to you" (private, or friends-only and you aren't friends) or the user doesn't exist. */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.rpc('get_profile', { p_user_id: userId });
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;

  return {
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    isOwner: row.is_owner,
    visibility: row.profile_visibility as ProfileVisibility,
    showLifetimeMiles: row.show_lifetime_miles,
    showLifetimeSteps: row.show_lifetime_steps,
    showMonthlyStats: row.show_monthly_stats,
    showRecords: row.show_records,
    lifetimeMiles: row.lifetime_miles,
    lifetimeSteps: row.lifetime_steps,
    currentMonthMiles: row.current_month_miles,
    currentMonthSteps: row.current_month_steps,
    bestDayMiles: row.best_day_miles,
    bestDayDate: row.best_day_date,
    bestWeekMiles: row.best_week_miles,
    bestWeekStart: row.best_week_start,
    bestMonthMiles: row.best_month_miles,
    bestMonth: row.best_month,
  };
}

export async function updateProfileSettings(
  userId: string,
  input: Partial<{
    avatarUrl: string | null;
    visibility: ProfileVisibility;
    showLifetimeMiles: boolean;
    showLifetimeSteps: boolean;
    showMonthlyStats: boolean;
    showRecords: boolean;
  }>
): Promise<void> {
  const update: TablesUpdate<'users'> = {};
  if (input.avatarUrl !== undefined) update.avatar_url = input.avatarUrl || null;
  if (input.visibility !== undefined) update.profile_visibility = input.visibility;
  if (input.showLifetimeMiles !== undefined) update.show_lifetime_miles = input.showLifetimeMiles;
  if (input.showLifetimeSteps !== undefined) update.show_lifetime_steps = input.showLifetimeSteps;
  if (input.showMonthlyStats !== undefined) update.show_monthly_stats = input.showMonthlyStats;
  if (input.showRecords !== undefined) update.show_records = input.showRecords;

  const { error } = await supabase.from('users').update(update).eq('id', userId);
  if (error) throw error;
}
