# ASCEND — native Phase 2A

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
- AI Coach, actual Workout History, progression, Career collections, and Shop
  remain unavailable. Custom Workout, Saved Workouts, and My Exercises now work.
- The default card is high Bronze; the default rival is Blue. No OVR thresholds
  are assigned. All displayed progress, records, and balances are mock data.
- Animations use React Native Animated, stop off-screen/in the background, and
  respect the device's reduced-motion preference.

Phase 2A adds workout planning and local storage. Active sessions, timers, actual
history, AI generation, progression, backend services, matches, seasons, rewards,
and purchases remain deferred.

## Training flow

TRAIN → Create Workout → Add Exercise → search/filter/select → configure targets
→ Save Workout. Expand an exercise's details to change individual sets, rest,
order, or remove it. Saved Workouts supports viewing, editing, duplication, and
confirmed deletion. My Exercises supports custom exercise management. Selecting
an exercise adds it to the six-item persisted Recent list.

Storage uses Expo-compatible AsyncStorage behind `StorageAdapter<string>` and a
serialized repository. Targets (kg/reps/seconds), custom exercises, Recent IDs,
and saved plans use a validated version-1 document. No actual session performance
or Player/Club state is persisted. Corrupt or newer schemas are preserved; the
recovery screen supports retry and confirmed reset with a local raw backup.
Referenced custom exercises cannot be deleted or change tracking type. Difficulty
is always null for user-created movements.

Draft edits survive tab switches but not app termination/reload. The Back control
confirms discarding changed workouts. Start Workout remains Coming Soon.

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
