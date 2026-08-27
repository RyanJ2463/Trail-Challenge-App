import { supabase } from './supabase';
import { computeTrailPosition, type TrailPoint, type TrailPosition } from './trailPosition';

/** One participant's row from the challenge_standings RPC, camel-cased. */
export type ChallengeStandingRow = {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  /** The signed-in caller's own row. */
  isMe: boolean;
  /** The caller and this user are accepted friends. */
  isFriend: boolean;
  cumulativeMiles: number;
  /** Miles in the trailing 7 days, also clamped to the challenge's date range. */
  weekMiles: number;
  /** ISO timestamp of this user's most recent sync inside the challenge window, or null if they've never synced. */
  lastSyncedAt: string | null;
};

export type ChallengeStanding = ChallengeStandingRow & {
  /** 1-based position, by cumulative miles descending then display name. */
  rank: number;
  /**
   * Where this user currently sits on the challenge's trail. Null for an
   * open-goal challenge (no trail) or when trail points weren't supplied.
   */
  trailPosition: TrailPosition | null;
};

function fromRpcRow(row: {
  user_id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  is_me: boolean;
  is_friend: boolean;
  cumulative_miles: number;
  week_miles: number;
  last_synced_at: string | null;
}): ChallengeStandingRow {
  return {
    userId: row.user_id,
    displayName: row.display_name,
    username: row.username,
    avatarUrl: row.avatar_url,
    isMe: row.is_me,
    isFriend: row.is_friend,
    cumulativeMiles: row.cumulative_miles,
    weekMiles: row.week_miles,
    lastSyncedAt: row.last_synced_at,
  };
}

/**
 * Sorts rows by cumulative miles (then display name), assigns a 1-based rank,
 * and resolves each row's position on the trail. Pure — the RPC already returns
 * this order, but re-sorting here keeps `rank` correct regardless of transport.
 *
 * `trailPoints` empty (an open-goal challenge, or not loaded yet) → every
 * `trailPosition` is null.
 */
export function rankStandings(
  rows: ChallengeStandingRow[],
  trailPoints: TrailPoint[] = []
): ChallengeStanding[] {
  return [...rows]
    .sort(
      (a, b) =>
        b.cumulativeMiles - a.cumulativeMiles || a.displayName.localeCompare(b.displayName)
    )
    .map((row, index) => ({
      ...row,
      rank: index + 1,
      trailPosition:
        trailPoints.length > 0 ? computeTrailPosition(trailPoints, row.cumulativeMiles) : null,
    }));
}

/**
 * Ranked standings for a challenge: cumulative + trailing-7-day distance per
 * participant, plus where each one sits on the trail.
 *
 * Goes through the `challenge_standings` SECURITY DEFINER RPC because
 * daily_activity is owner-only under RLS — a member can't read another
 * member's rows directly (see
 * supabase/migrations/20260826160000_add_challenge_standings.sql). Returns an
 * empty array when the caller can't view the challenge (the RPC yields no rows).
 *
 * Pass the challenge's `trail_points` to populate `trailPosition` per row; pass
 * `[]` (or omit) for an open-goal challenge and every `trailPosition` is null.
 */
export async function getChallengeStandings(
  challengeId: number,
  trailPoints: TrailPoint[] = []
): Promise<ChallengeStanding[]> {
  const { data, error } = await supabase.rpc('challenge_standings', {
    p_challenge_id: challengeId,
  });
  if (error) throw error;

  return rankStandings((data ?? []).map(fromRpcRow), trailPoints);
}

/**
 * A short "Mile 142 · past Franconia Ridge" label for a standings row: the
 * user's own mileage, plus the last landmark they've passed. Null when there's
 * no trail position (open goal) so the caller can just omit the line.
 */
export function trailPositionLabel(
  standing: Pick<ChallengeStanding, 'cumulativeMiles' | 'trailPosition'>
): string | null {
  const { trailPosition, cumulativeMiles } = standing;
  if (!trailPosition) return null;

  const landmark = trailPosition.precedingPoint.label?.trim();
  if (trailPosition.completed) {
    return landmark ? `Finished · ${landmark}` : 'Finished';
  }

  const mile = `Mile ${Math.round(cumulativeMiles)}`;
  if (!landmark) return mile;
  // precedingPoint is the last landmark at or before the user — "at" it only
  // when they're right on it, otherwise they're "past" it.
  const atLandmark =
    cumulativeMiles - trailPosition.precedingPoint.cumulativeDistanceMiles < 0.1;
  return atLandmark ? `${mile} · ${landmark}` : `${mile} · past ${landmark}`;
}
