# Phase 3A — Personal Records Foundation

## Implemented

PLAYER now shows real Personal Records after Card Finish Preview, with best reps,
best seconds, maximum kg and best reps at that weight. An expandable load list
retains every recorded weight's repetition record. Existing card, finish controls,
ratings, navigation and Phase 2C flows are preserved. Empty/loading/retryable error
states do not show fictional PRs. No dependencies, growth, rewards or Career changes.

## Files and boundaries

- `src/types/records.ts`: derived record, provenance and per-metric comparison types.
- `src/records/domain.ts`: pure derivation, current record, set comparison and
  previous-record lookup. No clock, randomness, storage writes or input mutation.
- `src/components/player/personal-records.tsx`: SessionProvider-backed panel,
  memoized by session data, with compact weighted detail controls.
- `src/app/(tabs)/player.tsx`: replaces Personal Records placeholder with the panel.
- `tests/records.test.cjs`: 26 domain/repository tests.
- `tests/browser-records.cjs`: optional production-web mobile integration checks.
- Root README, Product Spec section 19, Game System section 46, Roadmap and app
  README describe the Phase 3A scope and rules.

`ascend.sessions.v1` remains the only PR evidence source. No new persistent PR key,
cache document, schema migration, session history rewrite, Training Profile change,
Baseline change or AI Coach algorithm change. Existing session validation is reused.

## Calculation and compatibility

- Valid confirmed sets from completed sessions and the persisted active-session
  prefix qualify. Unconfirmed sets, targets, optional baselines and invalid sessions
  do not. The app has no separate abandoned-session state or session-delete command.
- Reps/seconds are maximum actual values in one set, not total volume. Explicit zero
  is valid; missing values are not zero.
- Weighted records require positive completed reps. Zero-rep attempts remain in
  history but do not establish a lifted weight or a repetition record at that load.
  Zero kg with positive reps is valid. Every exact decimal kg load has an independent
  repetition best. No e1RM or overall score is calculated.
- Exercise ID + tracking type defines the record. Names do not define identity.
  Different IDs with the same name never merge; tracking changes remain separate.
  Display names use the latest eligible snapshot, not the current editable catalog.
  Thus a catalog-only rename appears after a subsequent eligible recorded set;
  old PR values remain intact even after template/custom-exercise deletion.
- Confirmed timestamp orders evidence; tied timestamps use session ID, then original
  entry/set order and set ID. Tied cross-session order is a deterministic convention,
  not knowledge of the actual order of simultaneous events. A best-value tie keeps
  the earliest source. Duplicate ambiguous session IDs are excluded.
- Required IDs/timestamps cannot be missing in accepted version-1 sessions. Missing
  required values remain invalid under the existing repository rather than invented.
  Nullable metadata and absent future optional PR annotations need no migration.
  Importing older data without reliable timestamps is not supported in this phase.
- The existing schema records kg and seconds only, and has no explicit assistance,
  unilateral or resistance-level conditions. No unsupported conversion or condition
  is inferred. Changing a custom movement's meaning while keeping its ID cannot be
  inferred as a new exercise; a different movement should have a new exercise ID.

## Phase 3B hand-off (not implemented)

`derivePersonalRecords` returns current records and ordered comparisons.
`getExerciseRecord(result, exerciseId, trackingType)` retrieves the current record.
`getSetComparison(result, sessionId, setId)` includes copied actual evidence,
provenance, detached previous/current records and independent metrics.
`getPreviousRecord` returns null for the first record and undefined for an ineligible
or missing set. Metrics expose previous/value, first/improved/maintained outcome,
and first/higher/equal/lower relation. Weighted results expose maximum-weight and
reps-at-this-weight comparisons separately. First reps at a new lower load do not
mean maximum weight improved. Future growth must distinguish those meanings and
use source/metric identity to avoid duplicate awards. No awards run here.

## Verification

- `npm test`: **79 passed, 0 failed** (53 existing + 26 PR tests).
- `npm run typecheck`: passed.
- `npm run lint`: passed, no warnings.
- `env -u NO_COLOR CI=1 npx expo export --platform all --max-workers 1 --output-dir /tmp/ascend-pr-export`:
  passed; iOS and Android Hermes bundles plus 13 static web routes generated.
- Domain coverage: empty, first/improved/equal/lower reps, duration, independent
  weighted records, multiple sets/exercises, target/actual separation, unconfirmed
  and invalid/abandoned status, active confirmed prefix, rename and ID isolation,
  tracking changes, template edit/delete, repository reload, nullable metadata,
  missing required timestamps, malformed values, zero/decimal loads, repeated and
  shuffled processing, equal-time ordering, detached results, duplicate IDs and
  baseline exclusion. Test data uses isolated in-memory/browser storage only.
- `tests/browser-records.cjs`: passed on the production export at 320px/390px.
  Verified empty/baseline isolation, all three record types, every weight's reps,
  unconfirmed exclusion, active confirmation/tab updates, reload/resume, final
  completion, template deletion, profile/history preservation and storage error/retry.
- Existing `browser-input.cjs`, `browser-audit.cjs`, `browser-overlays.cjs`,
  `browser-sessions.cjs` and `browser-coach.cjs`: all passed on the same export.
  Planning/custom CRUD, input controls, session execution/rest/reload/history,
  Coach setup/profile/baseline/proposals and isolated recovery remain functional.
- No horizontal overflow or browser console/page errors in these flows. PR panel
  screenshots at 320px/390px and expanded weight details were visually inspected.
  Existing overlay checks verified simulated safe areas and one header Settings.
- `git diff --check`: passed.
- Browser tools use the existing isolated Playwright installation, not an app
  dependency. Run with `NODE_PATH=/tmp/ascend-qa/node_modules`,
  `PLAYWRIGHT_BROWSERS_PATH=/tmp/ascend-qa/browsers`, and `ASCEND_QA_URL` pointing
  to a locally served production export. A stale local server initially returned
  an empty response; all browser checks passed after restarting it on port 8105.
- Physical iPhone/Android testing has **not** been performed by this implementation.
  Browser viewport/simulated insets do not verify native touch, keyboard or safe areas.

## Physical iPhone test steps

Use your existing Expo Go setup. Do not reset your current training data. Enter only
actual performed results in your normal installation; illustrative numeric cases
below can instead be exercised in a separate test installation/data set.

1. From the repository root run `cd my-app` then `npx expo start --go --lan`.
   Connect iPhone and computer to the same Wi-Fi and open the QR code in compatible
   Expo Go. Confirm the existing profile, saved workouts and history are still there.
2. Open PLAYER and scroll below CARD FINISH PREVIEW to PERSONAL RECORDS. Existing
   confirmed history should appear. On a clean test installation, no history should
   show the empty state even if a Baseline has been entered.
3. TRAIN → CUSTOM WORKOUT: create a plan containing Push-up, Plank and a weighted
   movement, with at least two sets. Save, open its detail, and START WORKOUT.
4. Change an actual input but do not tap COMPLETE SET. Switch to PLAYER: it must
   not count. Return to TRAIN, confirm that set, then switch to PLAYER: that confirmed
   result can establish/update a record while the rest of the workout is unfinished.
5. Finish remaining sets and tap FINISH. Check single-set maximum reps/seconds on
   PLAYER. For example, reps 8 then 12 give 12, never 20. A later equal/lower result
   must keep 12; a genuinely higher result updates it. Do the same for seconds.
6. For weighted records, a test history of 5 kg × 15, 7 kg × 12 and 10 kg × 8 should
   show maximum 10 kg and 8 reps at that load. Tap VIEW RECORDS BY WEIGHT: all three
   distinct bests must remain. A later 5 kg × 16 updates only the 5 kg rep best.
   A 0-rep attempt at a higher load must not establish a lifted-weight PR.
7. Close/reopen the app (or reload it from Expo's developer menu), revisit PLAYER,
   and confirm the same PRs. Repeat with a partially confirmed active workout, then
   TRAIN → RESUME WORKOUT; confirmation should continue normally without duplication.
8. Edit the saved plan's targets; PRs must not change. Delete that saved template;
   PRs and completed history must remain. For a custom exercise, rename it and record
   another set with the same exercise: it should retain its prior best under one ID.
9. Open Settings → Training profile and AI COACH. Verify the existing profile and
   Baselines are unchanged and Coach can still generate/save a proposal. Saving a
   proposal alone must not add a PR.
10. At normal and larger system text sizes, inspect safe areas, bottom tabs, long
    exercise names, vertical scrolling and weighted expand/collapse buttons. Confirm
    nothing is clipped behind the status bar or navigation and there is no sideways
    scrolling. Check keyboard/touch behavior in the unchanged workout flow.

Stop at Phase 3A; Phase 3B growth remains deferred.
