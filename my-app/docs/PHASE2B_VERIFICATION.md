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

Results are recorded after the final checks below complete.
