export type TrailPoint = {
  id: number;
  sequence: number;
  latitude: number;
  longitude: number;
  cumulativeDistanceMiles: number;
  label?: string | null;
};

export type TrailPosition = {
  latitude: number;
  longitude: number;
  /** True once cumulativeMiles reaches or exceeds the trail's last point. */
  completed: boolean;
  precedingPoint: TrailPoint;
  nextPoint: TrailPoint | null;
};

/**
 * Maps a cumulative mileage total onto a coordinate along a trail.
 *
 * Walks the ordered point list to find the segment containing
 * cumulativeMiles, then linearly interpolates lat/lng within that
 * segment. Straight-line interpolation (not great-circle) is a
 * deliberate approximation: fine given trail_points are dense enough
 * for a distance-driven lookup in the first place, per the schema's
 * own design. Generic over any ordered point list, so it works
 * identically for a licensed trail or a user-uploaded GPX route.
 */
export function computeTrailPosition(
  points: TrailPoint[],
  cumulativeMiles: number
): TrailPosition | null {
  if (points.length === 0) {
    return null;
  }

  const sorted = [...points].sort(
    (a, b) => a.cumulativeDistanceMiles - b.cumulativeDistanceMiles
  );

  const first = sorted[0];
  if (cumulativeMiles <= first.cumulativeDistanceMiles) {
    return {
      latitude: first.latitude,
      longitude: first.longitude,
      completed: false,
      precedingPoint: first,
      nextPoint: sorted[1] ?? null,
    };
  }

  const last = sorted[sorted.length - 1];
  if (cumulativeMiles >= last.cumulativeDistanceMiles) {
    return {
      latitude: last.latitude,
      longitude: last.longitude,
      completed: true,
      precedingPoint: last,
      nextPoint: null,
    };
  }

  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i];
    const end = sorted[i + 1];

    if (
      cumulativeMiles >= start.cumulativeDistanceMiles &&
      cumulativeMiles <= end.cumulativeDistanceMiles
    ) {
      const segmentLength = end.cumulativeDistanceMiles - start.cumulativeDistanceMiles;
      const fraction =
        segmentLength === 0
          ? 0
          : (cumulativeMiles - start.cumulativeDistanceMiles) / segmentLength;

      return {
        latitude: start.latitude + (end.latitude - start.latitude) * fraction,
        longitude: start.longitude + (end.longitude - start.longitude) * fraction,
        completed: false,
        precedingPoint: start,
        nextPoint: end,
      };
    }
  }

  // Unreachable given the bounds checks above; satisfies the type checker.
  return null;
}
