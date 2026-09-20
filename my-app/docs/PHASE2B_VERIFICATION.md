# Phase 2B — Live Workout Execution

## Implemented

Saved workout detail → START WORKOUT → actual input → COMPLETE SET → rest/next
→ factual completion → FINISH. TRAIN resumes one persisted active session and
opens a minimal completed-session history/list/detail. Existing planning, library,
custom exercise, safe-area and five-tab behavior remains intact. No dependencies
or Expo development-control changes.

## Domain and historical isolation

- `src/types/session.ts`: WorkoutSession, copied SessionExercise, SessionSet,
  discriminated ActualResult, versioned SessionData.
- `src/sessions/domain.ts`: source validation, snapshots, typed copies, confirmed
  prefix validation, current position, set confirmation, deadline rest transitions.
- Each session/entry/set has an independent ID. Copied targets retain original
  target IDs/values. SourceWorkoutId records provenance, not a required live link.
- Exercise metadata is copied using the audited shared Exercise model. History
  never resolves labels from current catalogs or templates.
- A result is null until explicit confirmation; UI prefill is not stored evidence.
  Actual reps/seconds are nonnegative integers; weight is finite/nonnegative and
  supports decimals. Explicit zero is valid. Targets stay positive as audited.
- Current position is the first unconfirmed set in snapshot order. Completed sets
  must form a prefix; completed sessions require all sets and final confirmedAt.
- Stale expected-set IDs are harmless. UI also prevents overlapping writes and
  debounces rapid taps across zero-rest transitions.

## Persistence and failure behavior

`ascend.sessions.v1`, schema `version: 1`, is independent of `ascend.training.v1`.
Its document contains active (session or null) and completed sessions. A final set
confirmation atomically saves history and clears active. FINISH only navigates,
so repeated taps do not duplicate history. No completed-session update command.

`src/storage/session-repository.ts` serializes load/commit/reset, detaches mutable
submissions/results and publishes only successful writes. Failed reload blocks
stale writes. Unknown/corrupt data remains unchanged, with isolated retry or explicit
reset after a raw timestamped backup. Failed backup blocks reset. Neither session
recovery nor template deletion resets the other repository.

## Rest and resume

RestUntil is the confirmation timestamp plus planned rest. Countdown reads current
time rather than counting interval ticks; a cleaned-up interval and foreground
listener refresh it. Expired rest advances when the focused Live Workout screen
resumes. Skip uses the expected deadline, preventing a stale skip from clearing a
later rest. Final sets never start rest. No background service/notification.

Tab navigation and BACK retain the active session. Resume from TRAIN after reload.
Only confirmed values persist; unfinished edits reinitialize from targets. There is
no destructive abandon flow. Storage errors display retryable feedback and retain
the previous durable position. Sessions remain accessible if template loading fails.

## UI and assumptions

`src/components/training/live-workout.tsx` provides focused Live Workout, Rest and
factual SessionSummary, using existing Screen/Panel/Counter/button primitives.
`training-workspace.tsx` connects start/resume/history. The root SessionProvider
persists across tab navigation. Existing modal providers and viewport insets remain.

- Start requires saving the plan first; direct unsaved start was optional.
- Time sets record manually entered actual seconds; no exercise stopwatch is added.
- Duration is wall-clock time including rest and time away. A device clock moving
  behind previous confirmations produces a retryable error, not invented evidence.
- No pause/abandon, session editing/deletion, analytics, or sound/haptic cues.
- AI conveniences await separately scoped Phase 2C; progression/PR/recovery/Form
  and rating calculations await Phase 3. No rewards or Career systems run.

## Verification

- `npm test`: 30 passed, 0 failed (17 existing + 13 session/domain/repository tests).
  Covers all requested identity/copy, three-mode/zero, unconfirmed prefill,
  single-confirmation, rest/expiry/skip, final-once, timestamps/reload,
  template/catalog isolation, malformed storage and write/backup failure scenarios.
- `npm run typecheck`: passed.
- `npm run lint`: passed, no warnings.
- `env -u NO_COLOR CI=1 npx expo export --platform all --max-workers 1 --output-dir /tmp/ascend-session-final-export`:
  passed; iOS and Android Hermes bundles and 12 static web routes generated.
- Existing `tests/browser-input.cjs`: passed at 320px, including direct set-count
  replacement, decimal weight controls, per-set targets and reload.
- Existing `tests/browser-audit.cjs`: passed custom/plan CRUD, reload, duplicate
  independence, stable identity and referenced-custom protections.
- Existing `tests/browser-overlays.cjs`: passed all tabs, header Settings,
  modal-only simulated top/bottom insets, input/close placement and dismissal.
- `tests/browser-sessions.cjs`: mixed three-mode flow, zero, skip/expired rest,
  tab/reload resume, unconfirmed edits, double tap, completion/history and source
  edit/delete/rename isolation passed at 320px on the final production export.
  Template corruption still permits resume/history; session corruption disables
  start, allows independent template use, and explicitly resets only sessions
  after a verified raw backup. These recovery assertions passed.
- No horizontal overflow or browser console/page errors in the verified flows.
  Live Workout, weighted inputs, rest and completion screenshots visually inspected
  at 320px.
- Browser tooling is the existing isolated Playwright installation, not an app
  dependency. Run scripts with `NODE_PATH=/tmp/ascend-qa/node_modules`,
  `PLAYWRIGHT_BROWSERS_PATH=/tmp/ascend-qa/browsers`, and `ASCEND_QA_URL` pointing
  at a locally served production export.
- `git diff --check`: passed.
- Physical iPhone/Android testing is not claimed. Keyboard/device behavior still
  warrants a manual phone check; simulated safe areas are not device verification.
