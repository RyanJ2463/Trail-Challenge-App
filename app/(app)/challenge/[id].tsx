import { useCallback, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Mapbox from '@rnmapbox/maps';
import { useAuth } from '../../../lib/auth-context';
import { supabase } from '../../../lib/supabase';
import {
  getChallenge,
  isParticipant,
  joinChallenge,
  type ChallengeWithTrail,
} from '../../../lib/challenges';
import { listInvitesForChallenge } from '../../../lib/challengeInvites';
import type { UserProfile } from '../../../lib/friends';
import {
  getChallengeStandings,
  trailPositionLabel,
  type ChallengeStanding,
} from '../../../lib/challengeStandings';
import { getRouteSegments, type TrailPoint } from '../../../lib/trailPosition';
import { activityTypeMeta } from '../../../lib/activityTypes';
import { Icon, rankIconName } from '../../../components/Icon';
import { colors, radius, spacing, typography } from '../../../lib/theme';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');

function initials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : trimmed.slice(0, 2)).toUpperCase();
}

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}

export default function ChallengeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const challengeId = Number(id);
  const { session } = useAuth();
  const userId = session?.user.id;

  const [challenge, setChallenge] = useState<ChallengeWithTrail | null>(null);
  const [points, setPoints] = useState<TrailPoint[]>([]);
  const [standings, setStandings] = useState<ChallengeStanding[]>([]);
  const [pendingInvites, setPendingInvites] = useState<UserProfile[]>([]);
  const [joined, setJoined] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId || !Number.isFinite(challengeId)) return;
    const [challengeData, memberStatus] = await Promise.all([
      getChallenge(challengeId),
      isParticipant(challengeId, userId),
    ]);
    setChallenge(challengeData);
    setJoined(memberStatus);
    setPendingInvites(
      !challengeData.is_public && challengeData.created_by === userId
        ? await listInvitesForChallenge(challengeId)
        : []
    );

    let loadedPoints: TrailPoint[] = [];
    if (challengeData.trail_id !== null) {
      const { data: pointRows, error: pointsError } = await supabase
        .from('trail_points')
        .select('id, sequence, latitude, longitude, cumulative_distance_miles, label')
        .eq('trail_id', challengeData.trail_id)
        .order('sequence', { ascending: true });
      if (pointsError) throw pointsError;
      loadedPoints = (pointRows ?? []).map((p) => ({
        id: p.id,
        sequence: p.sequence,
        latitude: p.latitude,
        longitude: p.longitude,
        cumulativeDistanceMiles: p.cumulative_distance_miles,
        label: p.label,
      }));
    }
    setPoints(loadedPoints);
    setStandings(await getChallengeStandings(challengeId, loadedPoints));
  }, [challengeId, userId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);
      load()
        .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load challenge.'))
        .finally(() => setLoading(false));
    }, [load])
  );

  const handleJoin = async () => {
    if (!userId) return;
    setJoining(true);
    try {
      await joinChallenge(challengeId, userId);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join this challenge.');
    } finally {
      setJoining(false);
    }
  };

  if (loading || !challenge) {
    return (
      <View style={styles.center}>
        {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color={colors.primary} />}
      </View>
    );
  }

  const me = standings.find((s) => s.isMe) ?? null;
  const myMiles = me?.cumulativeMiles ?? 0;
  const segments = getRouteSegments(points, myMiles);
  const bounds = computeBounds(points);
  const totalMiles = challenge.trails?.total_distance_miles ?? null;
  const progressFraction = totalMiles ? Math.min(1, myMiles / totalMiles) : 0;
  const progressPct = totalMiles ? Math.round(progressFraction * 100) : null;

  // The person one place ahead, for the "X mi behind" line.
  const ahead = me && me.rank > 1 ? standings[me.rank - 2] : null;
  const activityBanner =
    challenge.activity_type === 'steps'
      ? 'Step distance from your watch counts toward this challenge.'
      : 'All walking and running distance from your watch counts toward this challenge.';

  // Render the selected marker last so its callout sits above the others.
  const markerOrder = [...standings].sort(
    (a, b) => Number(a.userId === selectedUserId) - Number(b.userId === selectedUserId)
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: challenge.name }} />

      {challenge.trail_id !== null && (
        <View style={styles.mapWrap}>
          <Mapbox.MapView
            style={styles.map}
            scrollEnabled
            zoomEnabled
            styleURL={Mapbox.StyleURL.Outdoors}
            logoPosition={{ top: 8, left: 8 }}
            attributionPosition={{ top: 8, right: 8 }}
          >
            <Mapbox.Camera
              defaultSettings={
                bounds
                  ? {
                      bounds: {
                        ne: bounds.ne,
                        sw: bounds.sw,
                        paddingTop: 60,
                        paddingBottom: 60,
                        paddingLeft: 40,
                        paddingRight: 40,
                      },
                    }
                  : { centerCoordinate: [-122.4194, 37.7749], zoomLevel: 10 }
              }
            />

            {segments && segments.remaining.length > 1 && (
              <Mapbox.ShapeSource
                id="remaining-route"
                shape={{ type: 'LineString', coordinates: segments.remaining }}
              >
                <Mapbox.LineLayer
                  id="remaining-route-line"
                  style={{ lineColor: colors.route, lineWidth: 4, lineCap: 'round', lineJoin: 'round' }}
                />
              </Mapbox.ShapeSource>
            )}

            {segments && segments.completed.length > 1 && (
              <Mapbox.ShapeSource
                id="completed-route"
                shape={{ type: 'LineString', coordinates: segments.completed }}
              >
                <Mapbox.LineLayer
                  id="completed-route-line"
                  style={{ lineColor: colors.primary, lineWidth: 5, lineCap: 'round', lineJoin: 'round' }}
                />
              </Mapbox.ShapeSource>
            )}

            {markerOrder.map((s) =>
              s.trailPosition ? (
                <Mapbox.MarkerView
                  key={s.userId}
                  coordinate={[s.trailPosition.longitude, s.trailPosition.latitude]}
                  anchor={markerAnchor(s)}
                  allowOverlap
                >
                  <Pressable
                    onPress={() =>
                      setSelectedUserId((current) => (current === s.userId ? null : s.userId))
                    }
                  >
                    <ParticipantMarker standing={s} selected={s.userId === selectedUserId} />
                  </Pressable>
                </Mapbox.MarkerView>
              ) : null
            )}
          </Mapbox.MapView>

          <View style={styles.legend}>
            <LegendRow swatch={<View style={styles.legendYou} />} label="You" />
            <LegendRow swatch={<View style={styles.legendFriend} />} label="Friends" />
            <LegendRow swatch={<View style={styles.legendOther} />} label="Others" />
            <LegendRow swatch={<Flag size={11} />} label="Finished" />
          </View>
        </View>
      )}

      <ScrollView style={styles.info} contentContainerStyle={styles.infoContent}>
        {error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.trailName}>{challenge.trails?.name ?? 'Open goal — no trail'}</Text>
        <View style={styles.activityLabel}>
          <Icon
            name={activityTypeMeta(challenge.activity_type).icon}
            size={15}
            color={colors.textMuted}
          />
          <Text style={styles.activityLabelText}>{activityTypeMeta(challenge.activity_type).label}</Text>
        </View>

        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>{activityBanner}</Text>
        </View>

        {me && (
          <View style={styles.progressCard}>
            <View style={styles.progressCardTop}>
              <Text style={styles.progressCardLabel}>Your progress</Text>
              {standings.length > 1 && (
                <View style={styles.rankPill}>
                  <Text style={styles.rankPillText}>
                    {ordinal(me.rank)} of {standings.length}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.progressRow}>
              <Text style={styles.progressMiles}>{myMiles.toFixed(1)}</Text>
              <Text style={styles.progressTotal}>
                {totalMiles ? ` mi of ${totalMiles} mi` : ' mi'}
              </Text>
            </View>
            {totalMiles && (
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progressFraction * 100}%` }]} />
              </View>
            )}
            {(progressPct !== null || ahead) && (
              <Text style={styles.progressSub}>
                {progressPct !== null ? `${progressPct}% complete` : ''}
                {progressPct !== null && ahead ? ' · ' : ''}
                {ahead
                  ? `${(ahead.cumulativeMiles - myMiles).toFixed(1)} mi behind ${ahead.displayName}`
                  : ''}
              </Text>
            )}
          </View>
        )}

        {!joined && challenge.is_public && (
          <TouchableOpacity style={styles.joinButton} onPress={handleJoin} disabled={joining} activeOpacity={0.85}>
            <Text style={styles.joinButtonText}>{joining ? 'Joining…' : 'Join this challenge'}</Text>
          </TouchableOpacity>
        )}

        <View style={styles.standingsHeader}>
          <Text style={styles.sectionTitle}>Standings</Text>
          {standings.length > 0 && (
            <Text style={styles.standingsHint}>
              {standings.length} {standings.length === 1 ? 'person' : 'people'}
            </Text>
          )}
        </View>

        {standings.length === 0 ? (
          <Text style={styles.emptyText}>No one has joined yet.</Text>
        ) : (
          standings.map((s) => {
            const positionLabel = trailPositionLabel(s);
            return (
              <Link key={s.userId} href={`/profile/${s.userId}`} asChild>
                <TouchableOpacity
                  style={StyleSheet.flatten([styles.standingRow, s.isMe && styles.standingRowMe])}
                  activeOpacity={0.7}
                >
                  <View style={styles.standingRank}>
                    {rankIconName(s.rank) ? (
                      <Icon name={rankIconName(s.rank)!} size={20} color={colors.primaryDark} strokeWidth={1.7} />
                    ) : (
                      <Text style={styles.standingRankText}>{s.rank}</Text>
                    )}
                  </View>
                  <View style={styles.standingAvatar}>
                    <Text style={styles.standingAvatarText}>{initials(s.displayName)}</Text>
                    {s.isFriend && !s.isMe && <View style={styles.standingFriendDot} />}
                  </View>
                  <View style={styles.standingMain}>
                    <Text style={[styles.standingName, s.isMe && styles.standingNameMe]} numberOfLines={1}>
                      {s.isMe ? 'You' : s.displayName}
                    </Text>
                    {positionLabel && (
                      <Text style={styles.standingSub} numberOfLines={1}>
                        {positionLabel}
                      </Text>
                    )}
                  </View>
                  <View style={styles.standingRight}>
                    <Text style={styles.standingMiles}>{s.cumulativeMiles.toFixed(1)} mi</Text>
                    {s.weekMiles > 0 && (
                      <Text style={styles.standingWeek}>+{s.weekMiles.toFixed(1)} this wk</Text>
                    )}
                  </View>
                </TouchableOpacity>
              </Link>
            );
          })
        )}

        {pendingInvites.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Invited · {pendingInvites.length}</Text>
            <View style={styles.inviteList}>
              {pendingInvites.map((invitee) => (
                <View key={invitee.id} style={styles.inviteChip}>
                  <Text style={styles.inviteChipText}>{invitee.display_name} · pending</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function computeBounds(points: TrailPoint[]): { ne: [number, number]; sw: [number, number] } | null {
  if (points.length === 0) return null;
  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLng = points[0].longitude;
  let maxLng = points[0].longitude;
  for (const p of points) {
    minLat = Math.min(minLat, p.latitude);
    maxLat = Math.max(maxLat, p.latitude);
    minLng = Math.min(minLng, p.longitude);
    maxLng = Math.max(maxLng, p.longitude);
  }
  return { ne: [maxLng, maxLat], sw: [minLng, minLat] };
}

function markerAnchor(s: ChallengeStanding): { x: number; y: number } {
  if (s.trailPosition?.completed) return { x: 0.08, y: 1 }; // flag: base of the pole
  return { x: 0.5, y: 0.5 }; // dot / pin: its centre
}

function ParticipantMarker({ standing, selected }: { standing: ChallengeStanding; selected: boolean }) {
  return (
    <View style={markerStyles.wrap}>
      {selected && (
        <View style={markerStyles.callout}>
          <Text style={markerStyles.calloutText} numberOfLines={1}>
            <Text style={markerStyles.calloutName}>
              {standing.isMe ? 'You' : standing.displayName}
            </Text>
            {`  ${standing.cumulativeMiles.toFixed(1)} mi`}
          </Text>
        </View>
      )}
      {standing.trailPosition?.completed ? (
        <Flag size={18} />
      ) : standing.isMe ? (
        <View style={markerStyles.youRing}>
          <View style={markerStyles.youDot} />
        </View>
      ) : standing.isFriend ? (
        <View style={markerStyles.friendPin}>
          <Text style={markerStyles.friendInitials}>{initials(standing.displayName)}</Text>
        </View>
      ) : (
        <View style={markerStyles.otherDot} />
      )}
    </View>
  );
}

function Flag({ size }: { size: number }) {
  return (
    <View style={{ width: size * 0.8, height: size }}>
      <View
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, backgroundColor: colors.text }}
      />
      <View
        style={{
          position: 'absolute',
          left: 2,
          top: 1,
          width: size * 0.62,
          height: size * 0.44,
          backgroundColor: colors.primary,
          borderWidth: 1,
          borderColor: colors.white,
        }}
      />
    </View>
  );
}

function LegendRow({ swatch, label }: { swatch: ReactNode; label: string }) {
  return (
    <View style={styles.legendRow}>
      <View style={styles.legendSwatch}>{swatch}</View>
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const markerStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  callout: {
    position: 'absolute',
    bottom: '100%',
    alignSelf: 'center',
    marginBottom: 6,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  calloutText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  calloutName: {
    fontWeight: '700',
    color: colors.text,
  },
  youRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(47, 111, 79, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  youDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
  },
  friendPin: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.friend,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendInitials: {
    color: colors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  otherDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.textFaint,
  },
});

const styles = StyleSheet.create({
  container: {
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
  mapWrap: {
    height: '42%',
    backgroundColor: colors.border,
  },
  map: {
    flex: 1,
  },
  legend: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
    gap: spacing.xs + 2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  legendSwatch: {
    width: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendYou: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
  },
  legendFriend: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.friend,
  },
  legendOther: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.textFaint,
  },
  legendLabel: {
    fontSize: 11,
    color: colors.text,
  },
  info: {
    flex: 1,
  },
  infoContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  trailName: {
    ...typography.heading,
    fontSize: 20,
    color: colors.text,
  },
  activityLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    marginBottom: spacing.md,
  },
  activityLabelText: {
    color: colors.textMuted,
  },
  infoBanner: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoBannerText: {
    color: colors.primaryDark,
    fontSize: 12,
    lineHeight: 17,
  },
  progressCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  progressCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressCardLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  rankPill: {
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 1,
    paddingVertical: 3,
  },
  rankPillText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: spacing.sm,
  },
  progressMiles: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  progressTotal: {
    fontSize: 15,
    color: colors.textMuted,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  progressSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  joinButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    padding: spacing.md + 2,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  joinButtonText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 16,
  },
  standingsHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.subheading,
    color: colors.text,
  },
  standingsHint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  standingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  standingRowMe: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  standingRank: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  standingRankText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textMuted,
  },
  standingAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    marginRight: spacing.md,
  },
  standingAvatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  standingFriendDot: {
    position: 'absolute',
    right: -1,
    bottom: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.friend,
    borderWidth: 2,
    borderColor: colors.surface,
  },
  standingMain: {
    flex: 1,
    minWidth: 0,
    marginRight: spacing.sm,
  },
  standingName: {
    ...typography.subheading,
    color: colors.text,
  },
  standingNameMe: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
  standingSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  standingRight: {
    alignItems: 'flex-end',
  },
  standingMiles: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  standingWeek: {
    fontSize: 11,
    color: colors.textFaint,
    marginTop: 1,
  },
  emptyText: {
    color: colors.textMuted,
  },
  inviteList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  inviteChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  inviteChipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
  },
});
