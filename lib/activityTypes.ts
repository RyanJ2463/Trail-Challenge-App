import type { IconName } from '../components/Icon';

export type ActivityType = 'hiking' | 'walking' | 'running' | 'cycling' | 'steps';

export const ACTIVITY_TYPES: { value: ActivityType; label: string; icon: IconName }[] = [
  { value: 'hiking', label: 'Hiking', icon: 'hiking' },
  { value: 'walking', label: 'Walking', icon: 'walking' },
  { value: 'running', label: 'Running', icon: 'running' },
  { value: 'cycling', label: 'Cycling', icon: 'cycling' },
  { value: 'steps', label: 'Steps', icon: 'steps' },
];

export function activityTypeMeta(type: string) {
  return ACTIVITY_TYPES.find((a) => a.value === type) ?? ACTIVITY_TYPES[0];
}
