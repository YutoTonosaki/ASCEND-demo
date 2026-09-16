# ASCEND — native Phase 1

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
npm run export
```

Export compiles the JavaScript and assets for Android, iOS, and web; it does not
create a signed native binary or substitute for testing on a physical device.

See [Phase 1 verification](docs/PHASE1_VERIFICATION.md) for completed checks and
the remaining physical-device acceptance check.

## Structure

- `src/app/(tabs)/`: Home, Train, Player, Career, Shop routes.
- `src/app/_layout.tsx`: dark navigation theme, status bar, safe-area provider.
- `src/components/`: native UI primitives, Player Card, original SVG Rival.
- `src/types/domain.ts`: Player, ratings, Rival, card appearance types.
- `src/data/mock.ts`: all sample player, rival, weekly, recovery, and season data.
- `src/config/`: visual palettes and shared theme; no balancing formulas.
- `src/animations/`: native-driver effects, reduced-motion/background handling.
- `src/game/`: reserved for future pure game modules.
- `src/storage/`: interface only; nothing is saved in Phase 1.

## Prototype behavior

- All five bottom tabs navigate; the Home CTA opens Train.
- Player previews four finishes and three effect intensities.
- Career previews four rival colors. Previews never alter ratings or save items.
- Train, progression entry points, Career collections, and Shop are labeled
  placeholders for their respective roadmap phases.
- The default card is high Bronze; the default rival is Blue. No OVR thresholds
  are assigned. All displayed progress, records, and balances are mock data.
- Animations use React Native Animated, stop off-screen/in the background, and
  respect the device's reduced-motion preference.

Only Phase 1 is implemented. Workouts, progression, timers, persistence,
backend services, matches, seasons, rewards, and purchases are deferred.
