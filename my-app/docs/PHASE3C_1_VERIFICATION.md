# Phase 3C-1 — Growth Presentation

## Architecture and rules

LiveWorkout requests a presentation only after the final set has successfully saved
and opened the factual summary. The root GrowthPresentationProvider keeps that
request across tab navigation and waits for both the completed session and the
GrowthProvider's persisted `finalizedSessionIds`. This includes the final bonus.
It never calls reconciliation, PR calculation or PlayerRepository writes.

`presentation/domain.ts` replays the existing ordered before/after ledger starting
at `initialRatings`, copying all six values immediately before the session's first
event and after its last event. Later sessions cannot change these snapshots. Each
body area appears once only if `floor(after) > floor(before)`. Compare endpoints,
not sums of rounded event deltas. OVR uses the existing `overall` function on both
six-value snapshots; an OVR-only increase is supported. No new rating snapshot is
necessary. Duplicate IDs, broken chains or interleaved session events fail closed
rather than guessing a previous OVR.

Assessment adjustments are included in the factual net rating/OVR comparison;
areas with an assessment are explicitly labeled ASSESSMENT UPDATED. This presents
an integer rating change, not a PR reward. Assessment decreases are not celebrated.
Baseline initialization itself never requests a presentation.

The screen uses the existing safe-area full-screen Sheet, dark/bronze tokens,
scrollable content, accessible integer transitions, fixed CLOSE and CONTINUE.
All qualifying areas appear together, with OVR UP below them. It intentionally
uses a static presentation: there is no animation dependency, flashing, sound or
motion requirement, and reduced-motion users receive identical information.
Normal completion still shows no decimal growth. Growth Debug is unchanged.

## Identity, persistence and recovery

`ascend.presentation.v1` stores `{version:1, consumed:string[]}` independently of
`ascend.player.v1`. Identity is JSON `[playerId, sessionId]`, never a timestamp.
The queued PresentationRepository persists consumption **before** showing UI.
Repeated callbacks, reads and navigation cannot replay it. No player/session/coach
schema or key is rewritten. Missing presentation storage starts empty; corrupt,
unsupported or failed reads/writes suppress the celebration and preserve data.
There is no automatic reset or repair.

Pending requests exist only in memory, and only fresh LiveWorkout completion
callbacks enqueue them. Opening history/PLAYER/debug and loading old finalized
sessions cannot enqueue anything. Thus all pre-feature completed history is excluded
without a timestamp cutoff, history scan or migration. An existing active workout
completed through the new LiveWorkout can qualify, using its entire persisted result.

Closing or backgrounding a visible presentation consumes it permanently. Termination
before display/claim may lose the pending celebration; termination after claim never
replays it. This deliberately prefers missed celebration over duplicate celebration.
A presentation-storage failure also skips that result for the current run; it never
blocks session saving. Existing growth persistence errors wait for the ordinary
successful GrowthProvider retry while this app instance remains alive. There is no
new growth retry or recalculation path. A rendering boundary isolates display errors.

## Files

- `src/presentation/domain.ts`: pure finalized-ledger presentation derivation.
- `src/presentation/controller.ts`: completion intents and at-most-once coordination.
- `src/presentation/provider.tsx`: root lifecycle, foreground and persistence wait.
- `src/storage/presentation-repository.ts`: independent mark-before-show record.
- `src/components/player/rating-up.tsx`: full-screen result and rendering boundary.
- `src/app/_layout.tsx`, `src/components/training/live-workout.tsx`: integration.
- `tests/presentation.test.cjs`, `tests/browser-presentation.cjs`: isolated tests.

## Verification

- Unit suite: 142 passed (124 existing including Growth Debug + 18 presentation tests).
- TypeScript and lint: passed.
- Platform export and browser checks: pending final verification.
- No physical iPhone testing is claimed.

## iPhone Expo Go verification

1. `cd my-app` then `npx expo start --go --lan`; open the development bundle in
   compatible Expo Go on the same Wi-Fi. Preserve your real saved data.
2. Open existing PLAYER, Workout History and Growth Debug. Old results should
   produce no celebration. Check the debug panel remains read-only.
3. Complete a normal workout with genuine confirmed results. Fractional increases
   that stay below the next integer should show only the ordinary summary.
4. When a qualifying integer boundary is crossed, finish the workout: one full-screen
   RATING UP lists the old/new integers for each increased area. A final bonus that
   crosses a boundary must be included. First assessments are labeled separately.
5. If the mean of the six fractional ratings crosses an integer, check OVR UP below
   the area rows. An individual area increase need not cause an OVR increase.
6. CONTINUE/CLOSE returns to the saved result. FINISH, navigate to PLAYER/history,
   and Expo Reload: no duplicate celebration and unchanged saved workout/ratings.
7. On a later qualifying result, background while the screen is visible, then return;
   it should be dismissed. Kill/reopen while visible: no replay, workout remains saved.
8. Check a small iPhone, large text, VoiceOver and Reduce Motion: safe areas, scrolling,
   readable integer transitions and reachable CLOSE/CONTINUE. No sideways overflow.

Use separate isolated test data for deliberate boundary/corruption scenarios; do not
invent exercise results or reset your actual phone history merely to force a popup.
Card evolution, Coins, weekly rewards, Career and SHOP remain outside this phase.
