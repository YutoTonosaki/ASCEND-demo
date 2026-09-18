# Phase 2A mobile cleanup

## Changes

- Added `src/components/ui/safe-area-modal.tsx` and used it for the shared training
  Sheet, confirmation dialog, and header Settings dialog. Each native Modal now
  measures its own safe area using a provider inside the presentation surface.
- Added `src/app/+html.tsx` with `viewport-fit=cover`; safe-area-context reads
  `env(safe-area-inset-top/bottom/left/right)` on web. No fixed device padding.
- Confirmed the existing Exercise Name input plus primary body part, optional
  secondary body parts, equipment, tracking type, and category. No duplicated field.
- Preserved all Phase 2A training behavior, visual styles, and header Settings.

## Blue floating gear: external source

The user confirmed iPhone Expo Go. Repository-wide application searches found only
`SettingsControl`, mounted in the shared ASCEND header. The blue gear is Expo Go's
native developer Tools button, identified in [Expo's official guide](https://docs.expo.dev/tutorial/create-your-first-app/#edit-the-index-screen).
It is not an obsolete React component that can be deleted from this repository.
No page-level hiding rules, private host-setting mutations, dependencies, or
node_modules patches were introduced.

The remaining device action is to shake the iPhone, open Expo Go's developer menu,
and toggle **Tools button** off. Production builds do not contain that host control.
This device setting cannot be verified or changed by the browser checks here.

## Verification

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: 9 tests passed.
- `env -u NO_COLOR CI=1 npx expo export --platform all --max-workers 1 --output-dir /tmp/ascend-cleanup-export`:
  iOS/Android Hermes bundles and 12 web routes generated successfully.
- `git diff --check`: passed.

Browser checks passed against the export using an isolated Playwright installation:

- `tests/browser-overlays.cjs`: one intended header Settings control on all five
  tabs and the builder; it stays behind full-screen overlays. Modal-local simulated
  59px top / 34px bottom insets apply independently of zero parent-screen insets.
  The picker/custom editor header clears the top inset, Save clears the bottom,
  and the existing single Exercise Name input plus all required fields are present.
  Both picker-created and My Exercises-created forms use the shared modal provider.
- `tests/browser-input.cjs`: set targets, decimal +/- controls, save, and reload
  behavior remain intact. No browser console/page errors in either check.

 Safe-area values in browser checks are
simulated; an actual iPhone remains necessary to verify the status bar/Dynamic
Island, keyboard, and Expo Go Tools-button preference on the device.

No Phase 2B features were added.
