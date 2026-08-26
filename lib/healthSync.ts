import { Platform } from 'react-native';
import {
  isHealthDataAvailable,
  requestAuthorization,
  queryStatisticsCollectionForQuantity,
} from '@kingstinct/react-native-healthkit';
import { supabase } from './supabase';

// HealthKit's walking+running distance, not raw step count — see README
// "Data source, iOS" for why (stride-calibrated, matters more on trails).
const DISTANCE_TYPE = 'HKQuantityTypeIdentifierDistanceWalkingRunning';
const STEPS_TYPE = 'HKQuantityTypeIdentifierStepCount';

export function isHealthSyncAvailable(): boolean {
  return Platform.OS === 'ios' && isHealthDataAvailable();
}

/**
 * Prompts the iOS Health permission sheet. Per Apple's privacy model, a read
 * request always resolves once the sheet is dismissed -- it never reveals
 * whether the user actually granted or denied each type. A denied read just
 * shows up as empty query results later, not an error here.
 */
export async function requestHealthAuthorization(): Promise<void> {
  await requestAuthorization({ toRead: [DISTANCE_TYPE, STEPS_TYPE] });
}

// YYYY-MM-DD in local time (HealthKit day buckets are anchored to the
// device's local timezone, so this must match rather than using UTC).
function toLocalDateString(date: Date): string {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export type HealthSyncResult = { daysSynced: number };

/**
 * Pulls daily walking+running distance and steps from HealthKit for the
 * last `days` days (default 30) and upserts one merged row per day into
 * daily_activity, matching the schema's "one row per user per day" model.
 */
export async function syncHealthData(userId: string, days = 30): Promise<HealthSyncResult> {
  const endDate = new Date();
  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  const filter = { date: { startDate, endDate } };

  const [distanceByDay, stepsByDay] = await Promise.all([
    queryStatisticsCollectionForQuantity(
      DISTANCE_TYPE,
      ['cumulativeSum'],
      startDate,
      { day: 1 },
      { filter, unit: 'mi' }
    ),
    queryStatisticsCollectionForQuantity(
      STEPS_TYPE,
      ['cumulativeSum'],
      startDate,
      { day: 1 },
      { filter, unit: 'count' }
    ),
  ]);

  const stepsByDate = new Map<string, number>();
  for (const bucket of stepsByDay) {
    if (!bucket.startDate || !bucket.sumQuantity) continue;
    stepsByDate.set(toLocalDateString(bucket.startDate), Math.round(bucket.sumQuantity.quantity));
  }

  const now = new Date().toISOString();
  const rows = distanceByDay
    .filter((bucket) => bucket.startDate && bucket.sumQuantity && bucket.sumQuantity.quantity > 0)
    .map((bucket) => {
      const activityDate = toLocalDateString(bucket.startDate!);
      return {
        user_id: userId,
        activity_date: activityDate,
        distance_miles: Math.round(bucket.sumQuantity!.quantity * 100) / 100,
        steps: stepsByDate.get(activityDate) ?? null,
        source: 'apple_watch' as const,
        synced_at: now,
      };
    });

  if (rows.length === 0) {
    return { daysSynced: 0 };
  }

  const { error } = await supabase
    .from('daily_activity')
    .upsert(rows, { onConflict: 'user_id,activity_date' });
  if (error) throw error;

  return { daysSynced: rows.length };
}
