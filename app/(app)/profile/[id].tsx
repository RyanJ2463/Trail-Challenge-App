import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../lib/auth-context';
import { getProfile, type Profile } from '../../../lib/profile';
import { colors, radius, spacing, typography } from '../../../lib/theme';

function formatMonthLabel(monthStr: string): string {
  const [year, month] = monthStr.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function formatDateLabel(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatWeekLabel(weekStartStr: string): string {
  const [year, month, day] = weekStartStr.split('-').map(Number);
  return `Week of ${new Date(year, month - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { session } = useAuth();
  const viewerId = session?.user.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setProfile(await getProfile(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this profile.');
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  if (loading) {
    return <ActivityIndicator style={styles.loading} color={colors.primary} />;
  }

  if (error || !profile) {
    return (
      <View style={styles.center}>
        <Stack.Screen options={{ title: 'Profile' }} />
        <Text style={styles.emptyEmoji}>🔒</Text>
        <Text style={styles.emptyText}>
          {error ?? "This profile isn't visible to you."}
        </Text>
      </View>
    );
  }

  const isMe = profile.userId === viewerId;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: profile.displayName }} />

      <View style={styles.header}>
        {profile.avatarUrl ? (
          <Image source={{ uri: profile.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{profile.displayName.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={styles.name}>{profile.displayName}</Text>
        <Text style={styles.username}>@{profile.username}</Text>

        {isMe && (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push('/profile/edit')}
            activeOpacity={0.85}
          >
            <Text style={styles.editButtonText}>Edit profile</Text>
          </TouchableOpacity>
        )}
      </View>

      {(profile.lifetimeMiles !== null || profile.lifetimeSteps !== null) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Lifetime</Text>
          <View style={styles.statRow}>
            {profile.lifetimeMiles !== null && (
              <View style={styles.stat}>
                <Text style={styles.statValue}>{profile.lifetimeMiles.toFixed(1)}</Text>
                <Text style={styles.statLabel}>miles</Text>
              </View>
            )}
            {profile.lifetimeSteps !== null && (
              <View style={styles.stat}>
                <Text style={styles.statValue}>{profile.lifetimeSteps.toLocaleString()}</Text>
                <Text style={styles.statLabel}>steps</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {(profile.currentMonthMiles !== null || profile.currentMonthSteps !== null) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>This month</Text>
          <View style={styles.statRow}>
            {profile.currentMonthMiles !== null && (
              <View style={styles.stat}>
                <Text style={styles.statValue}>{profile.currentMonthMiles.toFixed(1)}</Text>
                <Text style={styles.statLabel}>miles</Text>
              </View>
            )}
            {profile.currentMonthSteps !== null && (
              <View style={styles.stat}>
                <Text style={styles.statValue}>{profile.currentMonthSteps.toLocaleString()}</Text>
                <Text style={styles.statLabel}>steps</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {profile.showRecords || isMe ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Records</Text>
          {profile.bestDayMiles === null &&
          profile.bestWeekMiles === null &&
          profile.bestMonthMiles === null ? (
            <Text style={styles.recordEmpty}>No activity logged yet.</Text>
          ) : (
            <>
              {profile.bestDayMiles !== null && (
                <View style={styles.recordRow}>
                  <Text style={styles.recordLabel}>Best day</Text>
                  <Text style={styles.recordValue}>
                    {profile.bestDayMiles.toFixed(1)} mi
                    {profile.bestDayDate ? ` · ${formatDateLabel(profile.bestDayDate)}` : ''}
                  </Text>
                </View>
              )}
              {profile.bestWeekMiles !== null && (
                <View style={styles.recordRow}>
                  <Text style={styles.recordLabel}>Best week</Text>
                  <Text style={styles.recordValue}>
                    {profile.bestWeekMiles.toFixed(1)} mi
                    {profile.bestWeekStart ? ` · ${formatWeekLabel(profile.bestWeekStart)}` : ''}
                  </Text>
                </View>
              )}
              {profile.bestMonthMiles !== null && (
                <View style={styles.recordRow}>
                  <Text style={styles.recordLabel}>Best month</Text>
                  <Text style={styles.recordValue}>
                    {profile.bestMonthMiles.toFixed(1)} mi
                    {profile.bestMonth ? ` · ${formatMonthLabel(profile.bestMonth)}` : ''}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>
      ) : null}
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
    paddingBottom: spacing.xxl,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  emptyEmoji: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  name: {
    ...typography.title,
    fontSize: 22,
    color: colors.text,
  },
  username: {
    color: colors.textMuted,
    marginTop: 2,
  },
  editButton: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  editButtonText: {
    color: colors.primary,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTitle: {
    ...typography.subheading,
    color: colors.text,
    marginBottom: spacing.md,
  },
  statRow: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  stat: {},
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  recordLabel: {
    color: colors.textMuted,
  },
  recordValue: {
    color: colors.text,
    fontWeight: '600',
  },
  recordEmpty: {
    color: colors.textMuted,
  },
});
