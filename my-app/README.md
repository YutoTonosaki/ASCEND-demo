# ASCEND — native Phase 3B

The active mobile application lives here. Product requirements are in the parent
`README.md` and `docs/` directory. The original Expo SDK 57, React Native 0.86,
TypeScript, and Expo Router configuration is reused.

## Launch on your phone

Requires Node.js 22.13+ and a compatible Expo Go app on iPhone or Android.
From the ASCEND repository root:

```sh
cd my-app
npm ci
npx expo start --go --lan
```

Keep the computer and phone on the same Wi-Fi network. Scan the terminal QR code
with the iPhone Camera app or Expo Go on Android. If port 8081 is occupied, select
the alternative port offered by Expo. This prototype needs no API keys or account
inside the app. Expo Go must support SDK 57.

## Verify

```sh
npm run typecheck
npm run lint
npm test
npm run export
```

Export compiles the JavaScript and assets for Android, iOS, and web; it does not
create a signed native binary or substitute for testing on a physical device.

See [Phase 1 verification](docs/PHASE1_VERIFICATION.md) for completed checks and
the remaining physical-device acceptance check.
The mobile usability pass is recorded in [Phase 1.1 verification](docs/PHASE1_1_VERIFICATION.md).

## Structure

- `src/app/(tabs)/`: Home, Train, Player, Career, Shop routes.
- `src/app/_layout.tsx`: dark navigation theme, status bar, safe-area provider.
- `src/components/`: native UI primitives, Player Card, original SVG Rival.
- `src/types/domain.ts`: Player, ratings, Rival, card appearance types.
- `src/data/mock.ts`: all sample player, rival, weekly, recovery, and season data.
- `src/config/`: visual palettes and shared theme; no balancing formulas.
- `src/animations/`: native-driver effects, reduced-motion/background handling.
- `src/game/`: reserved for future pure game modules.
- `src/storage/`: adapter, AsyncStorage implementation, versioned training repository.
- `src/types/training.ts`: exercises, discriminated per-set targets, saved plans.
- `src/data/exercises.ts`: 42 standard exercises and draft difficulty metadata.
- `src/training/`: plan helpers, runtime validation, training state provider.
- `src/components/training/`: picker, custom editor, builder, saved-plan workspace.
- `tests/`: dependency-free Node tests using the existing TypeScript compiler.

## Prototype behavior

- All five bottom tabs navigate; the Home CTA opens Train.
- Player previews four finishes and three effect intensities.
- Career previews four rival colors. Previews never alter ratings or save items.
- Career collections and Shop
  remain unavailable. Custom Workout, Saved Workouts, My Exercises, Live Workout,
  factual Workout History, and rule-based AI Coach work.
- The default card is high Bronze; the default rival is Blue. No OVR thresholds
  are assigned. Career progress and balances remain illustrative; Player ratings, Personal Records and workout
  history contains actual confirmed sessions.
- Animations use React Native Animated, stop off-screen/in the background, and
  respect the device's reduced-motion preference.

Phase 2A adds workout planning; Phase 2B adds execution, rest countdowns, resume,
and actual history. Phase 2C adds rule-based recommendations. External AI services,
progression, backend services, matches, seasons,
rewards, and purchases remain deferred.

## Training flow

TRAIN → Create Workout → Add Exercise → search/filter/select → configure targets
→ Save Workout. Expand an exercise's details to change individual sets, rest,
order, or remove it. Saved Workouts supports viewing, editing, duplication, and
confirmed deletion. My Exercises supports custom exercise management. Selecting
an exercise adds it to the six-item persisted Recent list.

Storage uses Expo-compatible AsyncStorage behind `StorageAdapter<string>` and a
serialized repository. Targets (kg/reps/seconds), custom exercises, Recent IDs,
and saved plans use `ascend.training.v1`. Actual sessions use the independent
`ascend.sessions.v1` document (version 1). No Player/Club state is persisted. Corrupt or newer schemas are preserved; the
recovery screen supports retry and confirmed reset with a local raw backup.
Referenced custom exercises cannot be deleted or change tracking type. Difficulty
is always null for user-created movements.

Draft edits survive tab switches but not app termination/reload. The Back control
confirms discarding changed workouts. Save a plan, then START WORKOUT from its detail.

See [Phase 2A verification](docs/PHASE2A_VERIFICATION.md) for completed checks and
physical-device follow-up.

## Club identity foundation

Tokyo Zenith is the current fictional Japanese Club. The catalog and six league
environments are centralized in `src/config/clubs.ts`; the mock current tenure
is in `src/data/club-career.ts`. `src/types/club.ts` defines future Club career,
offer, role, tenure, transfer, and immutable Season Club snapshot contracts.
The small crest is original SVG geometry. Player Card Club props are optional
and accept either a current Club or historical identity data.

Home and Player show secondary Club identity. Career adds Current Club, expandable
Club details, and a locked Transfer Center. Club selection, scouting, offers,
transfers, reputation/role calculations, and persistence are Phase 4 work.

See [Club foundation verification](docs/CLUB_FOUNDATION_VERIFICATION.md) for
checks performed, mock assumptions, and remaining device verification.

## Expo Go tools button and overlay safe areas

The blue circular gear in Expo Go is its own **Tools button**, not ASCEND's
Settings control. Shake the iPhone to open Expo Go's developer menu and turn
**Tools button** off. This keeps the developer menu available and does not affect
ASCEND's dark header Settings button. See the [Expo explanation](https://docs.expo.dev/tutorial/create-your-first-app/#edit-the-index-screen).
There is no duplicate floating Settings component in the application source.

All app modals use `SafeAreaModal`, which mounts a `SafeAreaProvider` inside each
native modal surface. This prevents the modal from relying on a navigation
screen's possibly zero insets. On web the provider reads CSS safe-area environment
values; `src/app/+html.tsx` enables `viewport-fit=cover`. No model-specific padding
is used. Exercise Name remains the first field of the existing custom editor.


## Phase 2A.5 data audit

The existing exercise/plan shapes, version-1 key, and UI are retained. Equipment
adds Low Bar for Inverted Row; Dead Hang and Jumping Jack use multiple primary body
areas. Repository inputs and outputs are detached; edits preserve creation time
and ID. Load/reset/commit share a queue. `src/storage/training-schema.ts` safely
normalizes absent optional custom metadata and derived Recent entries, backing up
raw data before rewriting. Unknown versions or incomplete targets are never guessed.
Tests cover validation boundaries, CRUD/reload, isolation, and recovery failures.

See [audit verification](docs/PHASE2A_5_AUDIT.md) for the foundation checkpoint.

## Live workouts

`src/types/session.ts`, `src/sessions/`, and `src/storage/session-repository.ts`
separate execution evidence from plans. Start copies targets and full exercise
metadata; only COMPLETE SET confirms actual reps, kg + reps, or seconds. Explicit
zero is a recorded result; prefilled inputs remain unconfirmed.

Rest uses a persisted deadline, with automatic expiry and SKIP REST. One active
session can resume from TRAIN after reload or tab navigation. Only confirmed inputs
are persisted. Final confirmation atomically moves the session into history; FINISH
is navigation only. History renders copied metadata without consulting the catalog.
Duration includes rest and time away. Time-based sets use manual actual seconds
entry; an exercise stopwatch, sounds/haptics, and AI Coach await later scope.

Malformed session storage has its own retry and confirmed backed-up reset, leaving
plans untouched. No session editing/deletion, analytics, progression or rewards are
implemented. See [Phase 2B verification](docs/PHASE2B_VERIFICATION.md).


## AI Coach foundation

TRAIN → AI Coach → optional three-step profile → Generate → Review → Save or
Customize in the existing builder → START WORKOUT. Setup can be skipped; manual
workouts remain available. Settings → Training profile revisits the same form.
Body measurements and baselines are optional and do not change ratings/history.

`src/types/coach.ts`, `src/coach/`, `src/config/coach.ts` and
`src/components/coach/` separate deterministic proposals, configuration and UI.
`src/storage/coach-repository.ts` stores a validated version-1 profile under
`ascend.coach.v1`, independent of training/session storage. Queued operations,
detached copies and explicit backed-up recovery preserve existing guarantees.

Automatic proposals consider confirmed recent training. Customize Today overrides
focus, location, equipment, minutes and exercise count for one proposal. All required
equipment must be selected; location never implies ownership. Custom movements need
explicit familiar-movement opt-in. Unknown external loads must be entered and
confirmed before conversion/save. No automatic overload or physiological recovery
model. See [Phase 2C verification](docs/PHASE2C_VERIFICATION.md) for exact rules,
limitations and test results. Phase 3A adds PR evidence; Phase 3B adds bounded player growth.


## Personal Records

PLAYER shows actual exercise records after Card Finish Preview. Reps and seconds
are single-set maxima. Weighted exercises show maximum kg, best reps at that load,
and an expandable list of best reps at every recorded weight. Loading, empty and
retryable storage-error states never substitute mock data or optional baselines.

`src/records/domain.ts` contains pure calculation/comparison functions;
`src/types/records.ts` defines the results; `src/components/player/personal-records.tsx`
reads the existing SessionProvider. PRs recompute when its authoritative data changes.
No persistence key, schema, dependency, Coach rule or session write path changes.
See [Phase 3A verification](docs/PHASE3A_VERIFICATION.md) and Game System section 46
for eligibility, ordering, zero handling, compatibility and the future growth API.


## Player growth and OVR

PLAYER → INITIALIZE PLAYER uses the existing optional Training Profile Baselines,
then persists six fractional body ratings, provisional/assessed status and a growth
ledger under `ascend.player.v1`. Existing history informs PR comparisons but earns
no retroactive growth. Later profile edits do not rewrite initialization evidence.

`src/config/growth.ts` centralizes version-1 game curves and caps. `src/growth/`
contains pure assessment/growth, validation and provider logic; it consumes the
existing PR comparison API. `src/storage/player-repository.ts` serializes detached
read/init/reconcile operations. OVR is the floored mean of six fractional body
ratings, never independent persisted state. HOME and PLAYER share those ratings.
No fictional athletic values are shown in the player card. Card finishes remain
visual previews; tier progression is not implemented.

See Game System section 47 for exact formulas and
[Phase 3B verification](docs/PHASE3B_VERIFICATION.md) for automated checks, persistence
failure behavior, limitations and physical iPhone test steps. Phase 3C is deferred.

### Growth Debug (development only)

In Expo Go using the normal development bundle, open PLAYER → GROWTH DEBUG.
The read-only sheet shows saved three-decimal body ratings/status/OVR and separate
newest-first growth, bonus and assessment histories with before/after/actual deltas.
Reopen, foreground or REFRESH SAVED DATA to reread the persisted snapshot. It uses
a read-only PlayerRepository reader exposed by GrowthProvider, never reconciliation
or initialization. Production builds hide both the entry and panel. See the debug
appendix in [Phase 3B verification](docs/PHASE3B_VERIFICATION.md) for tests and phone checks.
