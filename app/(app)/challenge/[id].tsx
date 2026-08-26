import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import Mapbox from '@rnmapbox/maps';
import { useAuth } from '../../../lib/auth-context';
import { supabase } from '../../../lib/supabase';
import {
  getChallenge,
  isParticipant,
  joinChallenge,
  listParticipants,
  type ChallengeWithTrail,
} from '../../../lib/challenges';
import { getUserCumulativeMiles } from '../../../lib/challengeProgress';
import { getRouteSegments, type TrailPoint } from '../../../lib/trailPosition';
import { activityTypeMeta } from '../../../lib/activityTypes';
import { colors, radius, spacing, typography } from '../../../lib/theme';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '');

type Participant = { id: string; display_name: string; username: string };

export default function ChallengeDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const challengeId = Number(id);
  const { session } = useAuth();
  const userId = session?.user.id;

  const [challenge, setChallenge] = useState<ChallengeWithTrail | null>(null);
  const [points, setPoints] = useState<TrailPoint[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [joined, setJoined] = useState(false);
  const [cumulativeMiles, setCumulativeMiles] = useState(0);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId || !Number.isFinite(challengeId)) return;
    const [challengeData, participantList, memberStatus] = await Promise.all([
      getChallenge(challengeId),
      listParticipants(challengeId),
      isParticipant(challengeId, userId),
    ]);
    setChallenge(challengeData);
    setParticipants(participantList);
    setJoined(memberStatus);

    const { data: pointRows, error: pointsError } = await supabase
      .from('trail_points')
      .select('id, sequence, latitude, longitude, cumulative_distance_miles, label')
      .eq('trail_id', challengeData.trail_id)
      .order('sequence', { ascending: true });
    if (pointsError) throw pointsError;
    setPoints(
      (pointRows ?? []).map((p) => ({
        id: p.id,
        sequence: p.sequence,
        latitude: p.latitude,
        longitude: p.longitude,
        cumulativeDistanceMiles: p.cumulative_distance_miles,
        label: p.label,
      }))
    );

    const miles = await getUserCumulativeMiles(
      userId,
      challengeData.start_date,
      challengeData.end_date
    );
    setCumulativeMiles(miles);
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
      setJoined(true);
      const list = await listParticipants(challengeId);
      setParticipants(list);
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

  const segments = getRouteSegments(points, cumulativeMiles);
  const bounds = computeBounds(points);
  const totalMiles = challenge.trails?.total_distance_miles ?? null;
  const progressFraction = totalMiles ? Math.min(1, cumulativeMiles / totalMiles) : 0;
  const progressPct = totalMiles ? Math.round(progressFraction * 100) : null;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: challenge.name }} />

      <View style={styles.mapWrap}>
        <Mapbox.MapView style={styles.map} scrollEnabled zoomEnabled styleURL={Mapbox.StyleURL.Outdoors}>
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

          {segments && (
            <Mapbox.PointAnnotation
              id="current-position"
              coordinate={[segments.position.longitude, segments.position.latitude]}
            >
              <View style={styles.markerRing}>
                <View style={styles.marker} />
              </View>
            </Mapbox.PointAnnotation>
          )}
        </Mapbox.MapView>
      </View>

      <ScrollView style={styles.info} contentContainerStyle={styles.infoContent}>
        {error && <Text style={styles.error}>{error}</Text>}

        <Text style={styles.trailName}>{challenge.trails?.name ?? 'Unknown trail'}</Text>
        <Text style={styles.activityLabel}>
          {activityTypeMeta(challenge.activity_type).emoji} {activityTypeMeta(challenge.activity_type).label}
        </Text>

        <View style={styles.progressRow}>
          <Text style={styles.progressMiles}>{cumulativeMiles.toFixed(1)} mi</Text>
          {totalMiles && <Text style={styles.progressTotal}> of {totalMiles} mi</Text>}
        </View>
        {totalMiles && (
          <View style={styles.progressBarTrack}>
            <View style={[styles.progressBarFill, { width: `${progressFraction * 100}%` }]} />
          </View>
        )}
        {progressPct !== null && <Text style={styles.progressPct}>{progressPct}% complete</Text>}

        {!joined && challenge.is_public && (
          <TouchableOpacity style={styles.joinButton} onPress={handleJoin} disabled={joining} activeOpacity={0.85}>
            <Text style={styles.joinButtonText}>{joining ? 'Joining…' : 'Join this challenge'}</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Participants · {participants.length}</Text>
        {participants.length === 0 ? (
          <Text style={styles.emptyText}>No one has joined yet.</Text>
        ) : (
          <View style={styles.participantList}>
            {participants.map((p) => (
              <View key={p.id} style={styles.participantChip}>
                <Text style={styles.participantText}>{p.display_name}</Text>
              </View>
            ))}
          </View>
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
  markerRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(47, 111, 79, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
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
    color: colors.textMuted,
    marginBottom: spacing.md,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  progressMiles: {
    fontSize: 22,
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
  progressPct: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.subheading,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  participantList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  participantChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
  },
  participantText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    color: colors.textMuted,
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
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
  },
});
