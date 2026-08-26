-- ============================================================
-- Sample trail: Grand Canyon Rim to Rim (South Kaibab -> Phantom
-- Ranch -> North Kaibab). Named waypoints with approximate real-world
-- coordinates and commonly-cited mileage; enough to exercise the
-- trail-position/route-highlight logic end to end.
-- ============================================================

WITH new_trail AS (
    INSERT INTO public.trails (name, total_distance_miles, description)
    VALUES (
        'Grand Canyon: Rim to Rim',
        21.2,
        'South Kaibab Trailhead to North Kaibab Trailhead via Phantom Ranch, crossing the Colorado River at the bottom of the canyon.'
    )
    RETURNING id
)
INSERT INTO public.trail_points (trail_id, sequence, latitude, longitude, cumulative_distance_miles, label)
SELECT new_trail.id, pts.seq, pts.lat, pts.lng, pts.dist, pts.label
FROM new_trail, (VALUES
    (1, 36.0616, -112.0857,  0.0, 'South Kaibab Trailhead'),
    (2, 36.0676, -112.0867,  0.9, 'Ooh Aah Point'),
    (3, 36.0716, -112.0874,  1.5, 'Cedar Ridge'),
    (4, 36.0816, -112.0891,  3.0, 'Skeleton Point'),
    (5, 36.0909, -112.0907,  4.4, 'Tipoff'),
    (6, 36.1035, -112.0929,  6.3, 'Black Bridge (Colorado River)'),
    (7, 36.1075, -112.0936,  6.9, 'Phantom Ranch'),
    (8, 36.1599, -112.0731, 13.9, 'Cottonwood Campground'),
    (9, 36.1943, -112.0597, 18.5, 'Roaring Springs'),
    (10, 36.2085, -112.0541, 20.4, 'Supai Tunnel'),
    (11, 36.2145, -112.0518, 21.2, 'North Kaibab Trailhead')
) AS pts(seq, lat, lng, dist, label);
