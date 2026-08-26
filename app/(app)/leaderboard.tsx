import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { getFriendsWeeklyLeaderboard, getWeeklyLeaderboard, type LeaderboardEntry } from '../../lib/leaderboard';
import { colors, radius, spacing, typography } from '../../lib/theme';

const RANK_MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

type Scope = 'global' | 'friends';

export default function Leaderboard() {
  const { session } = useAuth();
  const userId = session?.user.id;

  const [scope, setScope] = useState<Scope>('global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (activeScope: Scope) => {
    setError(null);
    try {
      setEntries(
        activeScope === 'global' ? await getWeeklyLeaderboard() : await getFriendsWeeklyLeaderboard()
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the leaderboard.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load(scope).finally(() => setLoading(false));
    }, [load, scope])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await load(scope);
    setRefreshing(false);
  };

  const handleSelectScope = (next: Scope) => {
    if (next === scope) return;
    setScope(next);
    setLoading(true);
    load(next).finally(() => setLoading(false));
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <Text style={styles.subheading}>
        Total miles, last 7 days
        {scope === 'global' ? ', across everyone on Trail Challenge.' : ', among your friends.'}
      </Text>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, scope === 'global' && styles.tabSelected]}
          onPress={() => handleSelectScope('global')}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, scope === 'global' && styles.tabTextSelected]}>Global</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, scope === 'friends' && styles.tabSelected]}
          onPress={() => handleSelectScope('friends')}
          activeOpacity={0.85}
        >
          <Text style={[styles.tabText, scope === 'friends' && styles.tabTextSelected]}>Friends</Text>
        </TouchableOpacity>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {loading ? (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      ) : entries.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🏆</Text>
          <Text style={styles.emptyText}>
            {scope === 'global'
              ? 'No activity logged this week yet. Sync your Health data to show up here.'
              : "No friends have logged activity this week yet — or you haven't added any friends."}
          </Text>
        </View>
      ) : (
        entries.map((entry, index) => {
          const rank = index + 1;
          const isMe = entry.userId === userId;
          return (
            <View key={entry.userId} style={[styles.row, isMe && styles.rowMe]}>
              <Text style={styles.rank}>{RANK_MEDAL[rank] ?? rank}</Text>
              <Text style={[styles.name, isMe && styles.nameMe]} numberOfLines={1}>
                {entry.displayName}
                {isMe ? ' (you)' : ''}
              </Text>
              <Text style={styles.miles}>{entry.totalMiles.toFixed(1)} mi</Text>
            </View>
          );
        })
      )}
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
  subheading: {
    color: colors.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.pill,
    padding: 4,
    marginBottom: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  tabSelected: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontWeight: '600',
    color: colors.primaryDark,
  },
  tabTextSelected: {
    color: colors.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  rowMe: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  rank: {
    width: 36,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  name: {
    ...typography.subheading,
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  nameMe: {
    color: colors.primaryDark,
  },
  miles: {
    fontWeight: '700',
    color: colors.primaryDark,
  },
  emptyCard: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 28,
    marginBottom: spacing.xs,
  },
  emptyText: {
    color: colors.textMuted,
    lineHeight: 20,
    textAlign: 'center',
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
  },
});
