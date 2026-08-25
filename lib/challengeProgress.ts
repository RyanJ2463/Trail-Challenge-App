import { supabase } from './supabase';
import { computeTrailPosition, type TrailPosition } from './trailPosition';

/**
 * Sums a user's daily_activity distance over a challenge's date range.
 * The full daily total counts toward every challenge active that day —
 * there's no splitting mileage across challenges, so this is a plain sum
 * over the same source rows every other challenge also reads from.
 */
export async function getUserCumulativeMiles(
  userId: string,
  startDate: string,
  endDate: string | null
): Promise<number> {
  let query = supabase
    .from('daily_activity')
    .select('distance_miles')
    .eq('user_id', userId)
    .gte('activity_date', startDate);

  query = endDate
    ? query.lte('activity_date', endDate)
    : query.lte('activity_date', new Date().toISOString().slice(0, 10));

  const { data, error } = await query;
  if (error) throw error;

  return data.reduce((total, row) => total + row.distance_miles, 0);
}

/**
 * Resolves where a user currently sits on a challenge's trail: sums their
 * mileage for the challenge's date range, then walks the trail's points to
 * find the matching coordinate.
 */
export async function getUserTrailPosition(
  userId: string,
  challengeId: number
): Promise<TrailPosition | null> {
  const { data: challenge, error: challengeError } = await supabase
    .from('challenges')
    .select('start_date, end_date, trail_id')
    .eq('id', challengeId)
    .single();
  if (challengeError) throw challengeError;

  const { data: points, error: pointsError } = await supabase
    .from('trail_points')
    .select('id, sequence, latitude, longitude, cumulative_distance_miles, label')
    .eq('trail_id', challenge.trail_id)
    .order('sequence', { ascending: true });
  if (pointsError) throw pointsError;

  const cumulativeMiles = await getUserCumulativeMiles(
    userId,
    challenge.start_date,
    challenge.end_date
  );

  return computeTrailPosition(
    points.map((p) => ({
      id: p.id,
      sequence: p.sequence,
      latitude: p.latitude,
      longitude: p.longitude,
      cumulativeDistanceMiles: p.cumulative_distance_miles,
      label: p.label,
    })),
    cumulativeMiles
  );
}
