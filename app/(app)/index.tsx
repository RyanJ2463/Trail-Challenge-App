import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../lib/auth-context';
import { supabase } from '../../lib/supabase';
import {
  joinChallenge,
  listDiscoverableChallenges,
  listMyChallenges,
  type ChallengeWithTrail,
} from '../../lib/challenges';
import { activityTypeMeta } from '../../lib/activityTypes';
import { colors, radius, spacing, typography } from '../../lib/theme';

export default function Home() {
  const { session } = useAuth();
  const router = useRouter();
  const userId = session?.user.id;

  const [myChallenges, setMyChallenges] = useState<ChallengeWithTrail[]>([]);
  const [discoverable, setDiscoverable] = useState<ChallengeWithTrail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningId, setJoiningId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    const [mine, discover] = await Promise.all([
      listMyChallenges(userId),
      listDiscoverableChallenges(userId),
    ]);
    setMyChallenges(mine);
    setDiscoverable(discover);
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleJoin = async (challengeId: number) => {
    if (!userId) return;
    setJoiningId(challengeId);
    try {
      await joinChallenge(challengeId, userId);
      await load();
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Trail Challenge</Text>
          <Text style={styles.greetingSub}>🥾 Ready for a few more miles?</Text>
        </View>
        <TouchableOpacity onPress={() => supabase.auth.signOut()} hitSlop={8}>
          <Text style={styles.signOut}>Sign out</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.startButton}
        onPress={() => router.push('/challenge/new')}
        activeOpacity={0.85}
      >
        <Text style={styles.startButtonText}>+ Start a challenge</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator style={styles.loading} color={colors.primary} />
      ) : (
        <>
          <Text style={styles.sectionTitle}>Your challenges</Text>
          {myChallenges.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>🏔️</Text>
              <Text style={styles.emptyText}>
                You haven&apos;t joined a challenge yet. Start one above, or join a public
                challenge below.
              </Text>
            </View>
          ) : (
            myChallenges.map((challenge) => (
              <Link key={challenge.id} href={`/challenge/${challenge.id}`} asChild>
                <TouchableOpacity style={styles.card} activeOpacity={0.7}>
                  <View style={styles.cardTop}>
                    <Text style={styles.cardTitle}>{challenge.name}</Text>
                    <View style={[styles.pill, challenge.is_public ? styles.pillPublic : styles.pillPrivate]}>
                      <Text
                        style={[
                          styles.pillText,
                          challenge.is_public ? styles.pillTextPublic : styles.pillTextPrivate,
                        ]}
                      >
                        {challenge.is_public ? 'Public' : 'Private'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.cardSubtitle}>
                    {activityTypeMeta(challenge.activity_type).emoji}{' '}
                    {challenge.trails?.name ?? 'Unknown trail'}
                    {challenge.trails ? ` · ${challenge.trails.total_distance_miles} mi` : ''}
                  </Text>
                  <Text style={styles.cardMeta}>Started {challenge.start_date}</Text>
                </TouchableOpacity>
              </Link>
            ))
          )}

          <Text style={styles.sectionTitle}>Discover challenges</Text>
          {discoverable.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No public challenges to join right now.</Text>
            </View>
          ) : (
            discoverable.map((challenge) => (
              <View key={challenge.id} style={styles.card}>
                <Text style={styles.cardTitle}>{challenge.name}</Text>
                <Text style={styles.cardSubtitle}>
                  {activityTypeMeta(challenge.activity_type).emoji}{' '}
                  {challenge.trails?.name ?? 'Unknown trail'}
                  {challenge.trails ? ` · ${challenge.trails.total_distance_miles} mi` : ''}
                </Text>
                <TouchableOpacity
                  style={styles.joinButton}
                  onPress={() => handleJoin(challenge.id)}
                  disabled={joiningId === challenge.id}
                  activeOpacity={0.85}
                >
                  <Text style={styles.joinButtonText}>
                    {joiningId === challenge.id ? 'Joining…' : 'Join'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </>
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
    paddingTop: 60,
    paddingBottom: spacing.xxl + spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  greeting: {
    ...typography.title,
    color: colors.text,
  },
  greetingSub: {
    color: colors.textMuted,
    marginTop: 2,
  },
  signOut: {
    color: colors.primary,
    fontWeight: '600',
    paddingTop: 4,
  },
  startButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.xl,
    shadowColor: colors.primaryDark,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  startButtonText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  loading: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  emptyCard: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
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
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  cardTitle: {
    ...typography.subheading,
    color: colors.text,
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  cardSubtitle: {
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  cardMeta: {
    color: colors.textFaint,
    fontSize: 13,
  },
  pill: {
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  pillPublic: {
    backgroundColor: colors.primaryMuted,
  },
  pillPrivate: {
    backgroundColor: colors.background,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pillTextPublic: {
    color: colors.primaryDark,
  },
  pillTextPrivate: {
    color: colors.textMuted,
  },
  joinButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm + 2,
    alignItems: 'center',
    marginTop: spacing.md,
  },
  joinButtonText: {
    color: colors.white,
    fontWeight: '600',
  },
});
