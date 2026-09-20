# Phase 2C — AI Coach Foundation

## Implemented

TRAIN → AI Coach → optional setup → generate automatically or customize today's
constraints → review → save or edit in the existing Workout Builder → saved detail
→ existing Live Workout. No second editor or execution engine. Manual workouts
remain accessible when setup is skipped. Settings → Training profile reopens the
same profile form. Existing five tabs, styling and safe-area wrappers are retained.

## Profile and persistence

`src/types/coach.ts` defines TrainingProfile, BaselineAssessment, CoachPreferences,
and the separate proposal model. Profile fields: identity/timestamps, optional
height/weight, experience, goal, location, equipment, minutes/count, optional weekly
days, and optional baselines. Defaults are beginner, strength, Home, Bodyweight,
8 minutes and up to 3 exercises. Optional measurements/days remain null, not invented.

Setup has Basic profile, Environment and Optional baseline steps. Baseline choices
use the existing Push-up, Bodyweight Squat and Plank catalog entries and equipment
checks. Each entry can be known or performed now, explicitly confirmed, edited,
removed or skipped. Guidance discourages maximum effort and advises stopping for
pain/dizziness/unusual discomfort. A baseline is never a completed workout/session.

`ascend.coach.v1`, version 1, contains profile or null. CoachRepository serializes
load/save/reset, validates unknown reads, copies submissions immediately, returns
detached nested objects and publishes only successful writes. Edits preserve original
identity/creation time. Failed reload blocks stale writes. Corrupt/unknown data stays
unchanged with retry and explicit raw-backup reset; backup failure blocks reset.
Neither training nor session keys are touched. No new dependencies or migration.

## Engine and evidence

`src/coach/engine.ts` is pure and deterministic given profile, library, completed
sessions, per-request preferences and reference timestamp. It never writes history,
profiles, templates or catalog objects. `src/config/coach.ts` centralizes heuristics.

- All required equipment must be available; Bodyweight is implicit. Location never
  grants equipment. The selected equipment list means what is available at that
  location, including explicitly owned home gym equipment. The existing catalog
  has no location metadata; no arbitrary gym-only bans or inferred home inventory.
- Body-part primary matches outrank secondary matches. All requested areas must
  remain covered, and secondary-only coverage is explained. Movement families and
  different primary areas favor variety. Count is a maximum, never a promise.
- Experience caps draft difficulty. Generic no-history bodyweight suggestions are
  limited to configured existing movements. A custom exercise needs explicit opt-in
  as familiar; null difficulty is never interpreted as safe or beginner-level.
- Latest matching completed-session results within 90 days take precedence over
  matching baseline references, then initial suggestions. Metadata must match;
  name-only changes retain identity. Future timestamps and incompatible metadata
  do not transfer capacity. A zero rep/time result is evidence and blocks automatic
  guessing for that movement, rather than falling back to an older positive result.
- Reps/time repeat the conservative observed value. Weighted targets copy an
  observed kg/reps pair, never a fabricated combination. No automatic overload or
  inference from height, weight, unrelated movements or saved templates.
- Unknown loads remain null in the proposal. Both Save and Customize are disabled
  until each unknown load is explicitly entered and confirmed. Conversion independently
  enforces this. A confirmed zero load is valid. Existing manual edits remain free.
- Recent 48-hour participation ranks alternatives using primary above secondary
  involvement. This is not effort/fatigue/readiness measurement: equal sets do not
  imply equal physical effort. A selected recently involved area gets one set in
  automatic mode; explicit focus remains allowed with a short reminder/rest option.
  Leaving the window does not declare full recovery.
- Goal selects 90/75/60-second rests for strength/muscle/fitness; fitness also favors
  suitable Core/Athletic/Endurance categories. Proposals use at most two sets and
  do not exceed available evidence count. Initial suggestions are 6 reps/15 seconds;
  weighted or explicitly opted-in custom suggestions start with one set.
- Approximate time sums planned duration or 4 seconds per rep, inter-set rests and
  20 seconds per exercise for setup/transitions. Fit time by reducing sets/count,
  preserving focus and ordinary rest, or explain infeasibility. Never store this as
  actual duration. Tiny or impossible constraints do not trigger a violating fallback.

## Integration and UI

`recommendationToPlan` creates standard fresh plan/entry/set IDs and validates the
result against the current library. The proposal has no saved identity or historical
meaning. Saving is explicit; generating/reviewing creates no stored workout. The
existing builder edits all structured fields. START WORKOUT still needs a saved
valid plan; all actual recording, rest and completion use Phase 2B.

New `components/coach/` contains preferences, profile editor and Coach workspace.
`coach/provider.tsx` is mounted at root; `app/training-profile.tsx` provides Settings
access. Corrupt session data prevents a history-aware recommendation with a clear
explanation; manual planning still works. Profile changes affect future proposals
only and never rewrite saved plans or completed snapshots.

## Assumptions and limits

- Weekly-days preference is stored for future scheduling and does not update Form,
  Weekly Target or generate a rigid schedule.
- Measurements use broad input validation bounds only (50–300 cm, 10–500 kg).
  They never produce BMI, medical assessments or strength estimates.
- The 90-day evidence and 48-hour selection windows are adjustable product heuristics,
  not physiological claims. Known baseline recording time is when it was entered,
  not fabricated historical exercise time. Users can edit/skip any proposal.
- No random “another” button; changing today's constraints creates meaningful
  alternatives while identical inputs remain deterministic.
- Only session confirmation establishes historical performance. No progression,
  OVR/body ratings, PR, rewards, recovery percentages, external AI/chat/cloud, or
  Career systems. No Phase 3 work or Expo development-control changes.

## Verification

- `npm test`: **53 passed, 0 failed** (30 existing + 23 Coach tests). Covers
  profile CRUD/reload/copy boundaries, optional inputs, validation, all-equipment
  constraints, directed focus, deterministic proposals, recent/session/baseline
  evidence, all three targets, unknown/zero loads, zero performance, time/count
  limits, immutable inputs, future/stale/active-session exclusion, plan conversion,
  normal Live Workout execution and isolated recovery/write failures.
- `npm run typecheck`: passed.
- `npm run lint`: passed, no warnings.
- Expo production export passed for iOS, Android and Web, with **13 static routes**:
  `env -u NO_COLOR CI=1 npx expo export --platform all --max-workers 1 --output-dir /tmp/ascend-coach-final-export`.
- `tests/browser-coach.cjs`: passed on the final production export at **320px**.
  Setup/skip, invalid/optional measurements, baseline confirmation/skip, Settings
  profile edit and reload, automatic and directed/history proposals, impossible
  constraints, required load confirmation, Builder editing/save, normal session
  completion, profile/history separation and backed-up profile reset verified.
- Existing `tests/browser-input.cjs`, `browser-audit.cjs`, `browser-sessions.cjs`
  and `browser-overlays.cjs`: **all passed** against the Phase 2C production build.
  Existing planner inputs, CRUD/reference protections, execution/rest/resume/history,
  storage isolation and simulated modal safe areas remain working.
- No browser console/page errors or horizontal overflow in these flows. The final
  compact review and load-confirmation screens were visually checked at 320px.
- Browser tests use the existing isolated Playwright installation via `NODE_PATH`
  and `PLAYWRIGHT_BROWSERS_PATH`, with `ASCEND_QA_URL` pointing to the served export.
  No testing dependency was added to the app.
- Physical iPhone/Android testing is **not claimed**; actual keyboard/touch behavior
  remains a manual phone check. Simulated insets are not physical-device verification.
- `git diff --check`: passed.
