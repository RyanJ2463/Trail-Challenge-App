import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../../lib/auth-context';
import { createChallenge, listTrails } from '../../../../lib/challenges';
import { activityTypeMeta, type ActivityType } from '../../../../lib/activityTypes';
import type { Tables } from '../../../../lib/database.types';
import { colors, radius, spacing, typography } from '../../../../lib/theme';

// Dates are handled as plain YYYY-MM-DD calendar values throughout this
// screen (no time-of-day, no timezone conversion) so "add 7 days" always
// lands on the same calendar date regardless of the device's timezone.
function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayLocal(): string {
  return formatDateOnly(new Date());
}

function addDays(dateStr: string, days: number): string {
  const date = parseDateOnly(dateStr);
  date.setDate(date.getDate() + days);
  return formatDateOnly(date);
}

type DurationOption = 'open' | '1w' | '2w' | '3w' | '4w' | 'custom';

const DURATION_OPTIONS: { key: DurationOption; label: string; days?: number }[] = [
  { key: 'open', label: 'Open-ended' },
  { key: '1w', label: '1 week', days: 7 },
  { key: '2w', label: '2 weeks', days: 14 },
  { key: '3w', label: '3 weeks', days: 21 },
  { key: '4w', label: '4 weeks', days: 28 },
  { key: 'custom', label: 'Custom' },
];

export default function NewChallengeDetails() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user.id;
  const { activityType: activityTypeParam } = useLocalSearchParams<{ activityType?: string }>();
  const activityType = (activityTypeParam ?? 'hiking') as ActivityType;
  const activity = activityTypeMeta(activityType);

  const [trails, setTrails] = useState<Tables<'trails'>[]>([]);
  const [loadingTrails, setLoadingTrails] = useState(true);
  const [name, setName] = useState('');
  const [trailId, setTrailId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(todayLocal());
  const [durationOption, setDurationOption] = useState<DurationOption>('open');
  const [customEndDate, setCustomEndDate] = useState(todayLocal());
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listTrails()
      .then((data) => {
        setTrails(data);
        setTrailId((current) => current ?? data[0]?.id ?? null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingTrails(false));
  }, []);

  const durationPreset = DURATION_OPTIONS.find((o) => o.key === durationOption);
  const endDate =
    durationOption === 'open'
      ? null
      : durationOption === 'custom'
        ? customEndDate
        : addDays(startDate, durationPreset?.days ?? 0);

  const handleCreate = async () => {
    if (!userId || !trailId) return;
    if (!name.trim()) {
      setError('Give your challenge a name.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const challenge = await createChallenge({
        name: name.trim(),
        trailId,
        activityType,
        startDate,
        endDate,
        isPublic,
        createdBy: userId,
      });
      // Drop the whole "start a challenge" flow (picker + this form) from
      // history rather than replace()-ing just this screen, so the new
      // challenge's back button returns to Home instead of the picker.
      router.dismissAll();
      router.push(`/challenge/${challenge.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the challenge.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingTrails) {
    return <ActivityIndicator style={styles.loading} color={colors.primary} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {error && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.activityRow} onPress={() => router.back()} activeOpacity={0.7}>
        <Text style={styles.activityEmoji}>{activity.emoji}</Text>
        <Text style={styles.activityLabel}>{activity.label} challenge</Text>
        <Text style={styles.activityChange}>Change</Text>
      </TouchableOpacity>

      <Text style={styles.label}>Challenge name</Text>
      <TextInput
        style={styles.input}
        placeholder="testing"
        placeholderTextColor={colors.textFaint}
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Trail</Text>
      {trails.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>
            No trails are set up yet — ask an admin to add one before creating a challenge.
          </Text>
        </View>
      ) : (
        <View style={styles.trailList}>
          {trails.map((trail) => (
            <TouchableOpacity
              key={trail.id}
              style={[styles.trailOption, trailId === trail.id && styles.trailOptionSelected]}
              onPress={() => setTrailId(trail.id)}
              activeOpacity={0.8}
            >
              <View style={styles.trailOptionText}>
                <Text
                  style={[
                    styles.trailOptionName,
                    trailId === trail.id && styles.trailOptionTextSelected,
                  ]}
                >
                  🥾 {trail.name}
                </Text>
                {trail.description && (
                  <Text
                    style={[
                      styles.trailOptionDescription,
                      trailId === trail.id && styles.trailOptionTextSelected,
                    ]}
                    numberOfLines={2}
                  >
                    {trail.description}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.trailOptionMeta,
                  trailId === trail.id && styles.trailOptionTextSelected,
                ]}
              >
                {trail.total_distance_miles} mi
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={styles.label}>Start date</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.textFaint}
        value={startDate}
        onChangeText={setStartDate}
      />

      <Text style={styles.label}>Duration</Text>
      <View style={styles.startOptionList}>
        {DURATION_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.startOptionPill,
              durationOption === option.key && styles.startOptionPillSelected,
            ]}
            onPress={() => setDurationOption(option.key)}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.startOptionText,
                durationOption === option.key && styles.startOptionTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {durationOption === 'custom' ? (
        <TextInput
          style={[styles.input, styles.customDateInput]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.textFaint}
          value={customEndDate}
          onChangeText={setCustomEndDate}
        />
      ) : (
        <Text style={styles.startDatePreview}>
          {endDate ? `Ends ${endDate}` : 'No end date — runs until you close it out'}
        </Text>
      )}

      <View style={styles.switchRow}>
        <View style={styles.switchLabelGroup}>
          <Text style={styles.label}>Public</Text>
          <Text style={styles.switchHint}>
            Anyone can discover and join a public challenge. Private challenges are invite-only.
          </Text>
        </View>
        <Switch
          value={isPublic}
          onValueChange={setIsPublic}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.white}
        />
      </View>

      <TouchableOpacity
        style={[styles.button, (submitting || !trailId) && styles.buttonDisabled]}
        onPress={handleCreate}
        disabled={submitting || !trailId}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>{submitting ? 'Creating…' : 'Create challenge'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl + spacing.lg,
  },
  loading: {
    flex: 1,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  activityEmoji: {
    fontSize: 22,
    marginRight: spacing.sm,
  },
  activityLabel: {
    ...typography.subheading,
    color: colors.primaryDark,
    flex: 1,
  },
  activityChange: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  label: {
    ...typography.caption,
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  startOptionList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  startOptionPill: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  startOptionPillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  startOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  startOptionTextSelected: {
    color: colors.white,
  },
  customDateInput: {
    marginTop: spacing.sm,
  },
  startDatePreview: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  trailList: {
    gap: spacing.sm,
  },
  trailOption: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trailOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  trailOptionText: {
    flex: 1,
    marginRight: spacing.sm,
  },
  trailOptionName: {
    ...typography.subheading,
    color: colors.text,
  },
  trailOptionDescription: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  trailOptionMeta: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  trailOptionTextSelected: {
    color: colors.white,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  switchLabelGroup: {
    flex: 1,
    marginRight: spacing.md,
  },
  switchHint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: -spacing.xs,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    padding: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.xxl,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
  },
  emptyCard: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  emptyText: {
    color: colors.textMuted,
    lineHeight: 20,
  },
});
