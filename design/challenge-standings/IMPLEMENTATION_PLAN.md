# Implementation plan — challenge standings + per-participant map

**Design:** [`design/challenge-standings/`](.) &middot; published canvas
<https://claude.ai/code/artifact/13978f71-4e99-4d88-8336-f31dd9105409>
**Design merged in:** PR #1 (`78b3365`)
**Written against:** `main` @ `f5248ef` (2026-08-26)
**Owner of this doc:** Aidan's Claude instance. Ryan / Ryan's Claude — edit freely,
this is a shared working doc.

---

## 1. Why this doc exists

The design mockups define a target the app doesn't hit yet: **every participant
visible on the challenge trail map**, and a **ranked standings list** in place of
the current name chips. Getting there touches the DB, the data layer, one screen,
a new screen, and (for it to be fully honest) the HealthKit sync. This is the
breakdown of that work, phased so Phase 1 ships something real without the
health-sync rework.

---

## 2. Status at a glance

| Capability | Today | Target (design) |
| --- | --- | --- |
| Map markers | Current user only (`PointAnnotation`) | Every participant: you / friends / others / finished, legend, tap-callout |
| Standings | Name chips, unranked | Ranked list: rank, avatar, trail position, miles, weekly delta, you-highlighted |
| "See all" screen | — | Full standings: per-hiker progress bar, weekly delta, sync state |
| Per-participant mileage | **Impossible from client** (`daily_activity` is owner-only RLS) | `challenge_standings(challenge_id)` SECURITY DEFINER RPC |
| `activity_type` | Cosmetic — every challenge sums all walking+running distance | Running challenge counts runs only, etc. |
| `challenge_progress` table | Exists, nothing writes to it | Decide: populate or drop |

---

## 3. Current codebase state (what's already here)

- **`app/(app)/challenge/[id].tsx`** — renders the map with a single
  `Mapbox.PointAnnotation` at `getRouteSegments(points, cumulativeMiles).position`.
  Participants render as `participantChip` views (`display_name` only). Pending
  invites render the same way. Challenges can now have `trail_id === null`
  ("open goal", no map).
- **`lib/challengeProgress.ts`** — `getUserCumulativeMiles(userId, start, end)` sums
  **all** `daily_activity.distance_miles` in range. `getUserTrailPosition` wraps it
  with `computeTrailPosition`. Both are single-user and rely on the caller being
  that user (RLS).
- **`lib/trailPosition.ts`** — `computeTrailPosition()` and `getRouteSegments()`.
  Pure, unit-verified, works. Reusable per-participant as-is.
- **`lib/challenges.ts`** — `getChallenge`, `listParticipants` (returns
  `id, display_name, username`), `isParticipant`, `joinChallenge`.
- **`lib/healthSync.ts`** — iOS only. Pulls `HKQuantityTypeIdentifierDistanceWalkingRunning`
  (combined walk+run, **not** separable) + `StepCount`, last 30 days, into one
  `daily_activity` row per `(user_id, activity_date)`. Manual button on the home tab.
  No cycling, no per-activity-type attribution, no Android.
- **`daily_activity`** — columns: `steps`, `distance_miles NOT NULL`, `source`,
  `synced_at`. `UNIQUE (user_id, activity_date)`. RLS: owner-only for every verb.
- **`challenges.activity_type`** — `TEXT CHECK IN ('hiking','walking','running','cycling','steps')`,
  set at creation, read nowhere in progress math.
- **`challenge_progress`** — `(challenge_id, user_id, cumulative_miles,
  current_trail_point_id, last_computed_at)`. RLS SELECT = challenge visibility.
  No writer. `current_trail_point_id` already nullable.
- **SECURITY DEFINER precedent** — `weekly_leaderboard()`,
  `friends_weekly_leaderboard()`, `get_profile()` all read other users'
  `daily_activity` this way. Copy that pattern for the standings RPC.
- **`scripts/import-gpx.mjs`** — generates `trails` + `trail_points` seed SQL from a
  GPX course (landmark points w/ cumulative distance). This is how real trail data
  gets in; markers need it.
- **Nav** — bottom tabs (`app/(app)/(tabs)/`). `challenge/[id]` is a stack screen
  above the tabs (`app/(app)/_layout.tsx`). It's a **file**, not a folder — see
  routing note in §6 S1.
- **Theme** — `lib/theme.ts`. No `friend` color yet.
- **Tests** — none; no runner configured.

---

## 4. Gap analysis

1. **No backend path to another user's mileage.** Blocking. Everything else waits
   on the RPC (or on populating `challenge_progress`).
2. **`activity_type` is not in `daily_activity`.** Making it "real" needs a schema
   change *and* a HealthKit rework (the combined walk+run quantity type can't be
   split — running attribution needs `HKWorkout` samples). See §7.
3. **Map renders one marker.** Needs N markers keyed by participant, styled by
   relationship (self / friend / other / finished).
4. **Standings UI doesn't exist.** Chips → ranked rows; plus a new full-screen route.
5. **Open-goal challenges (`trail_id === null`)** — the design assumes a trail.
   Standings should still work (miles only, no trail-position line, no map).

---

## 5. Phased plan

### Phase 1 — Everyone on the map + standings *(no health rework)*

Ships the headline feature. Uses today's "all walking+running distance" totals; the
activity-type explainer copy is written to match that honestly ("all walking and
running distance counts"). ~2–3 focused PRs.

| # | Task | Files | Done when |
| --- | --- | --- | --- |
| **1.1** | `challenge_standings(p_challenge_id bigint)` RPC — SECURITY DEFINER, returns one row per participant: `user_id, display_name, username, avatar_url, is_me, is_friend, cumulative_miles, week_miles, last_synced_at`. Sums `daily_activity.distance_miles` over `[start_date, COALESCE(end_date, CURRENT_DATE)]`. `GRANT EXECUTE ... TO authenticated`. | `supabase/migrations/2026XXXX_add_challenge_standings.sql` | RPC returns correct rows for a member; errors/empty for a non-member (mirror `can_view_challenge`). |
| **1.2** | Regenerate DB types | `lib/database.types.ts` (`npx supabase gen types typescript --linked`) | `challenge_standings` typed |
| **1.3** | `getChallengeStandings(challengeId)` — calls RPC, returns typed rows sorted by `cumulative_miles` desc. For trail challenges, map each row's miles → `computeTrailPosition(points, miles)` to get `{ latitude, longitude, precedingPoint.label, completed }`. | new `lib/challengeStandings.ts` | Returns ranked rows with a `trailPosition` field (null when `trail_id === null`) |
| **1.4** | Add `friend: '#47688c'` | `lib/theme.ts` | token exists |
| **1.5** | **Map: N markers.** Replace the single `PointAnnotation` with one per standing. Interim: `PointAnnotation` per row (fine at ~≤15 people). Self = existing green dot; friend = blue (`colors.friend`) initials pin; other = grey hollow dot; finished (`completed`) = flag at the last trail point. Tap → callout (`display_name` + `cumulative_miles`). | `app/(app)/challenge/[id].tsx` | All participants show; tapping shows name + miles |
| **1.6** | **Legend** overlay card, bottom-left of the map. | same | matches `Components.dc.html` |
| **1.7** | **Standings list** replaces `participantList` chips. Row = rank (medal `🥇🥈🥉` / number, matching `leaderboard.tsx` `RANK_MEDAL`), avatar initial (friend gets a `colors.friend` dot badge), name, trail-position sub-line ("Mile 142 · past Franconia Ridge" from `precedingPoint.label`), miles, `+X.X this wk`. Your row highlighted like `leaderboard.tsx` `rowMe`. Keep invites section below. | same | list renders from `getChallengeStandings`, you highlighted, tap row → `profile/[id]` |
| **1.8** | **"Your progress" card** gains a `Nth of M` pill and "X mi behind Nth" line (derive from the standings array). | same | numbers match the list |
| **1.9** | **Activity-type explainer banner** (`primaryMuted` bg, info icon). Phase-1 copy: *"All walking and running distance from your watch counts toward this challenge."* | same | banner shows above "Your progress" |
| **1.10** | **"See all" screen.** `challenge/[id]` standings route (see S1). Full list: per-hiker mini progress bar vs trail total, weekly delta, `last_synced_at` relative time, and an "awaiting first sync" state (`last_synced_at === null`). Segmented control (Trail distance / This week) can be static for v1. | new screen file | reachable from a "See all N" row on the detail screen |
| **1.11** | Open-goal handling: standings list works with `trailPosition === null` (hide the sub-line, hide map, keep miles + rank). | both screens | no crash on a `trail_id === null` challenge |

**S1 — routing note for 1.10.** `challenge/[id].tsx` is a file. To add a nested
`standings` route, either:
- (a) convert to `challenge/[id]/index.tsx` + `challenge/[id]/standings.tsx`
  (updates `_layout.tsx` screen names), or
- (b) add a sibling `challenge/standings.tsx` taking `?id=`.
Recommend (a) — cleaner URL, room for future sub-screens (results, settings).

**Phase 1 acceptance:** open a challenge you're in with ≥3 members who've synced →
see everyone on the map with the right marker styles, a ranked standings list with
yourself highlighted, your rank in the progress card, and a working "See all" screen.

---

### Phase 2 — Make `activity_type` real

The honest version. Bigger because HealthKit doesn't hand us per-type distance for
free (see §7). Land Phase 1 first.

| # | Task | Notes |
| --- | --- | --- |
| **2.1** | Schema: add per-type distance to `daily_activity`. **Recommended:** keep one row per `(user_id, activity_date)`, keep `distance_miles` as the all-walk+run total (leaderboards/profile untouched), add nullable `running_miles`, `hiking_miles`, `walking_miles`, `cycling_miles`. Alt: one row per `(user_id, activity_date, activity_type)` — cleaner model, forces rewrites of `weekly_leaderboard`, `friends_weekly_leaderboard`, `get_profile`, the sync `onConflict`, and a data backfill. | migration |
| **2.2** | `healthSync.ts` rework: keep `DistanceWalkingRunning` + `StepCount` for `distance_miles`/`steps`; add `DistanceCycling`; query `HKWorkout` samples grouped by `HKWorkoutActivityType` (`.running`, `.hiking`, `.walking`) and sum `totalDistance` per type into the new columns. | `@kingstinct/react-native-healthkit` workout query API |
| **2.3** | `challenge_standings` RPC: pick the column matching `challenges.activity_type` (`running` → `running_miles`, `steps` → `steps`, etc.), `COALESCE` to `distance_miles` for rows synced before 2.2. | update migration from 1.1 |
| **2.4** | `getUserCumulativeMiles` + `challengeProgress` mirror the same type selection so the "Your progress" number matches the RPC. | `lib/challengeProgress.ts` |
| **2.5** | Update explainer copy per type ("Only running distance counts…"). | `challenge/[id].tsx` |
| **2.6** | Backfill / prompt: existing users need a re-sync to populate the new columns; surface a one-time "re-sync for activity breakdown" nudge. | home tab |

---

### Phase 3 — Scale & polish

| # | Task |
| --- | --- |
| 3.1 | Markers → `Mapbox.ShapeSource` + `SymbolLayer` with registered images (`Mapbox.Images`) instead of N `PointAnnotation`s. |
| 3.2 | Marker **clustering** with a count badge when markers overlap (design's cluster spec). `ShapeSource` `cluster` prop. |
| 3.3 | `challenge_progress` decision: either a trigger on `daily_activity` write that recomputes for the user's active challenges, or **drop the table** and stay live. Recommend drop unless the live RPC gets slow. |
| 3.4 | Android Health Connect sync (`react-native-health-connect`) — separate track, blocks non-iOS entirely. |
| 3.5 | Realtime: subscribe to `daily_activity` / a progress channel so standings update without a manual refresh. |
| 3.6 | Tests: set up `jest-expo`; cover `computeTrailPosition` per-row mapping, standings sort/rank, "behind by" math; pgTAP for the RPC's visibility rules. |
| 3.7 | Challenge **results** screen when `end_date` passes — final standings, winner. |

---

## 6. Key technical decisions & risks

- **RPC vs `challenge_progress` table.** Going with a live SECURITY DEFINER RPC
  (Phase 1) — matches `weekly_leaderboard` precedent, no cache-invalidation logic,
  fine at friend-group scale. Revisit only if slow.
- **HealthKit can't split walking from running** in `DistanceWalkingRunning`. Real
  per-type attribution needs `HKWorkout` samples (§2.2). Until Phase 2, a "running"
  challenge counts all walk+run distance — Phase 1 copy must not claim otherwise.
- **`steps` activity type** — a steps challenge should rank on `daily_activity.steps`,
  not miles. The RPC and the standings UI need a "unit" concept (mi vs steps).
  Small but don't forget it.
- **Leaderboard double-count risk.** If 2.1 goes with row-per-type, every existing
  `SUM(distance_miles)` in the SQL functions silently changes meaning. The
  recommended additive-columns approach avoids this.
- **Marker perf.** `PointAnnotation` is heavy; ~15 is the comfortable ceiling.
  Public challenges could exceed that → Phase 3 `SymbolLayer` isn't optional
  long-term.
- **UTC vs local day boundary** — `getUserCumulativeMiles` caps at
  `new Date().toISOString().slice(0,10)` (UTC) while `healthSync` buckets in local
  time. Pre-existing; the RPC should cap at `CURRENT_DATE` in the DB's TZ and be
  consistent with the client.
- **Marker anchor** — `trail_points` are sparse landmark points; interpolated
  positions between them are straight-line (documented in `trailPosition.ts`). Fine.

---

## 7. Open questions for the team

1. **Activity-type semantics.** For a "hiking" challenge, does a long walk count?
   Is "walking" = casual steps distance, or walking *workouts* only? Need a product
   call before 2.1/2.2.
2. **Should the global `weekly_leaderboard` stay "all activity"** or also become
   type-aware? (Currently it ignores type entirely.)
3. **"Finished" for open-goal challenges** — there's no goal/target column on
   `challenges`. Add one, or "finished" only exists for trail challenges?
4. **Standings visibility** — RLS shows the challenge to the public; should a public
   challenge's standings expose every stranger's mileage, or only friends + self
   with others anonymized/aggregated?
5. Routing: OK to restructure `challenge/[id].tsx` → `challenge/[id]/` (§6 S1)?

---

## 8. Coordination notes (two devs / two Claude instances)

- **Design lives in `design/challenge-standings/`** — `.dc.html` artboards +
  `canvas.json` are the source; the 2.4 MB `challenge-standings-and-map.html` is
  git-ignored and regenerated by the `/design` skill's `seed-canvas.mjs`.
- Suggested split: one person takes the **RPC + data layer** (1.1–1.4, 1.11), the
  other takes **the screen** (1.5–1.9); 1.10 after both.
- Each task above is sized for its own PR. Keep `lib/database.types.ts` regens in
  their own commit.
- Update the §2 table as things land so the other side (and the other Claude) can
  see current state at a glance.
