# Challenge standings + map — design canvas

Design mockups for showing **every participant** on a challenge's trail map and
replacing the plain participant chips with a ranked **standings list**.

**Published canvas:** https://claude.ai/code/artifact/13978f71-4e99-4d88-8336-f31dd9105409

## Artboards

| File | What it is |
| --- | --- |
| `Main.dc.html` | Redesigned challenge detail — map with per-participant markers, legend, activity-type explainer, standings list. |
| `StandingsExpanded.dc.html` | Full "See all" standings — per-hiker progress bar, weekly delta, sync state. |
| `Components.dc.html` | Build spec — marker set, standings-row states, legend, palette, and the backend RPC shape. |

Tokens are lifted from `lib/theme.ts`; marker/route styling matches
`app/(app)/challenge/[id].tsx`. One new color token is proposed: `friend` `#47688c`.

## What this implies for the code

- **Backend:** a `challenge_standings(challenge_id)` `SECURITY DEFINER` RPC returning
  cumulative + trailing-7-day miles per participant, filtered to the challenge's
  `activity_type` and `[start_date, end_date]`. `daily_activity` is owner-only RLS,
  so the client cannot compute this itself.
- **Activity type:** add an `activity_type` dimension to `daily_activity` and sync
  per-type from HealthKit / Health Connect, so a running challenge counts runs only.
- **Map:** render participant markers via a `ShapeSource` + `SymbolLayer` (not one
  `PointAnnotation` each); feed each row's miles through the existing
  `lib/trailPosition.ts` for its coordinate and nearest `trail_points.label`.

## Regenerating the canvas

The 2.4 MB `challenge-standings-and-map.html` is generated (git-ignored). Rebuild it
from the `.dc.html` sources + `canvas.json` with the `/design` skill's
`seed-canvas.mjs`, then re-publish to the artifact URL above.
