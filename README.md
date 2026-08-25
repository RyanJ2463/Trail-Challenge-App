# Trail Challenge App

Pulls activity data (steps/distance/workouts) from a user's smartwatch, uses it to
power challenges among friends or strangers, and maps cumulative mileage onto real
trails (e.g. the Appalachian Trail) — showing each participant's current position
on the trail, including friends in the same challenge.

## How it works

- **Data source, iOS:** Apple HealthKit, via `@kingstinct/react-native-healthkit`.
  Apple Watch data syncs to Health automatically — no watch-specific integration
  needed.
- **Data source, Android/Garmin:** Android Health Connect, via
  `react-native-health-connect`. Garmin Connect can push a user's data into Health
  Connect once they enable it under Garmin Connect → Settings → Connected Apps.
- **What gets pulled:** distance, not raw steps. HealthKit's walking+running
  distance and Health Connect's `Distance` record are stride-calibrated, which
  matters more for hiking on uneven terrain than flat-ground step counts.
- **Challenge mechanic:** a user's full daily distance total counts toward every
  challenge they're currently active in — no splitting mileage across challenges.
  This falls directly out of the data model: `daily_activity` holds one merged row
  per user per day, and every challenge just sums that same source over its own
  date range.
- **Trail mapping:** trails are stored once as an ordered list of GPS points with
  cumulative distance from the trailhead (`trails` / `trail_points`). Given a
  user's total miles within a challenge's date range, `lib/trailPosition.ts` walks
  the point list to find the matching segment and linearly interpolates the exact
  coordinate — that's their map marker. The logic is generic, not hardcoded to any
  one trail, so the same code works for a licensed trail or a user-uploaded GPX
  route.
- **Map:** `@rnmapbox/maps`.
- **Backend:** Supabase (Postgres + auth + client SDK). Every table has row-level
  security — see `supabase/migrations/`.

## Stack

- Expo (React Native + TypeScript), **custom Expo dev client** — not Expo Go, since
  HealthKit, Health Connect, and Mapbox are all native modules that Expo Go can't
  load.
- `expo-router` for navigation, with a `Stack.Protected` auth gate: `app/(auth)/`
  for sign-in/sign-up, `app/(app)/` for everything behind a session.
- Supabase for auth, Postgres, and RLS.

## Project layout

```
app/
  _layout.tsx          Root layout — gates (app) vs (auth) on session state
  (auth)/               Sign-in (index.tsx) and sign-up screens
  (app)/                Signed-in screens — currently just the map (index.tsx)
lib/
  supabase.ts           Supabase client (AsyncStorage session persistence,
                         AppState-driven auto-refresh)
  auth-context.tsx       AuthProvider / useAuth, wraps supabase.auth
  database.types.ts       Generated from the live schema — see below, don't hand-edit
  trailPosition.ts        Pure mileage → map-coordinate interpolation
  challengeProgress.ts    Queries feeding trailPosition a user's cumulative miles
plugins/
  withHealthConnectQueries.js   Adds the <queries> package-visibility entry
                                 Health Connect needs on Android 11+
supabase/
  migrations/            Schema history — see below
  config.toml
```

## Prerequisites

- Node.js and npm
- A Mac with Xcode (for iOS) and/or Android Studio (for Android) — both platforms
  need a real dev-client build; neither HealthKit, Health Connect, nor Mapbox will
  load inside plain Expo Go
- [Homebrew](https://brew.sh) `pod` (CocoaPods) for iOS builds
- Accounts: [Supabase](https://supabase.com) and [Mapbox](https://mapbox.com)
  (both free tier)

## Setup

1. **Install dependencies**

   ```
   npm install
   ```

2. **Environment variables** — copy `.env.example` to `.env` and fill in:

   ```
   EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=       # Mapbox public token (pk.…) — Account > Tokens on mapbox.com
   EXPO_PUBLIC_SUPABASE_URL=              # Project Settings > API on supabase.com
   EXPO_PUBLIC_SUPABASE_ANON_KEY=         # Same page — the anon/public or "publishable" key, never service_role
   ```

3. **Set up the Supabase project.** From a fresh Supabase project, link it and push
   the schema:

   ```
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

   This applies everything in `supabase/migrations/` — see that folder's file names
   for what each one does. If you ever change the schema, add a new migration
   (`npx supabase migration new <name>`) rather than editing an already-applied one,
   push it, then regenerate types:

   ```
   npx supabase gen types typescript --linked > lib/database.types.ts
   ```

4. **Supabase Auth setting worth knowing about:** Authentication → Providers →
   Email → "Confirm email" is on by default, which means sign-up requires clicking
   a confirmation link before the session activates (the app's sign-up screen
   handles this — it shows a "check your email" state). Turn it off in the
   dashboard if you'd rather skip that step while testing.

## Running it

Native modules mean this always needs a real dev-client build — there's no Expo Go
shortcut.

```
npm run ios       # expo run:ios     — builds and launches in the iOS Simulator
npm run android   # expo run:android — builds and launches on an Android emulator/device
npm run start      # expo start --dev-client — once a dev client is already installed
```

The first `run:ios` / `run:android` will take a while (CocoaPods/Gradle native
build). After that, `npm run start` is enough for day-to-day iteration.

## Current status

Built: native module + dev-client config, RLS-protected Supabase schema, auth
flow (sign-in/sign-up/sign-out), the map screen, and the trail-position
interpolation logic (unit-verified standalone, not yet wired into a UI).

Not yet built: pulling live data from HealthKit/Health Connect into
`daily_activity` (including the double-counting warning called out below),
challenge create/join screens, and rendering other participants' markers on the
map.

One thing worth surfacing in onboarding once health sync exists: if both a phone
and a watch track the same activity, steps/distance can get double-counted unless
the user sets source priority in the Health app (iOS) or Health Connect (Android).

## Notes for later

- Not using Google Fit — its API is being fully retired by end of 2026.
- Not using Strava as the core data pipeline — its API terms (as of mid-2026)
  forbid showing one user's data to other users, which breaks the shared-map/
  leaderboard feature directly, and standard-tier access now requires a paid
  subscription. Could still be added later for a private, single-user detail view.
- Before using a real trail's official centerline (e.g. the AT) in a commercial
  product, check the relevant org's terms (Appalachian Trail Conservancy, NPS,
  etc.) — or start with a self-drawn or user-supplied GPX route, since the
  trail-mapping logic doesn't care which.
- Android requires declaring Health Connect data access through the Play Console
  before launch — approval plus whitelist propagation takes about two weeks
  total, worth starting early.
