export type ActivityType = 'hiking' | 'walking' | 'running' | 'cycling' | 'steps';

export const ACTIVITY_TYPES: { value: ActivityType; label: string; emoji: string }[] = [
  { value: 'hiking', label: 'Hiking', emoji: '🥾' },
  { value: 'walking', label: 'Walking', emoji: '🚶' },
  { value: 'running', label: 'Running', emoji: '🏃' },
  { value: 'cycling', label: 'Cycling', emoji: '🚴' },
  { value: 'steps', label: 'Steps', emoji: '👟' },
];

export function activityTypeMeta(type: string) {
  return ACTIVITY_TYPES.find((a) => a.value === type) ?? ACTIVITY_TYPES[0];
}
