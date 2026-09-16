# Phase 1 verification — 2026-09-15

## Scope

Native Phase 1 only, implemented in `my-app` using the existing Expo SDK 57
project. No Phase 2–5 game systems or persistence were added.

## Completed checks

- `npm run typecheck`: passed.
- `npm run lint`: passed, no source errors or warnings.
- `npx expo install --check`: dependencies are up to date for the installed SDK.
- `npx expo export --platform all --max-workers 2`: generated iOS and Android
  Hermes bundles, all referenced assets, and all five web routes. Exported
  metadata and every native asset path were checked for existence.
- `npx expo start --go --lan --port 8083`: Metro started; the local Expo Go
  manifest reported ASCEND, SDK 57, and an iOS launch-bundle URL.
- Production web preview: all five tabs at 320, 390, 430, and 768px widths.
  No horizontal document overflow; tab targets were at least 44px high.
- Home training CTA navigates to Train.
- All 12 card finish/intensity combinations update the card without changing OVR.
- All four Rival colors update the Career preview.
- No browser console errors or uncaught runtime errors during the interaction checks.
- `git diff --check`: passed in the mobile project.

Headless browser tools were installed in a temporary directory, not added to
application dependencies. Screenshots were inspected for phone-sized layout.

## Physical device verification still required

No physical phone was available to this session. Exporting native bundles and
checking the web rendering does **not** verify native safe-area insets, touch
feel, animation performance, or device accessibility behavior.

On a phone with an Expo Go version that supports SDK 57, run from `my-app`:

```sh
npx expo start --go --lan
```

Use the same Wi-Fi network and scan the QR code. Check all five tabs, vertical
scrolling, the Home CTA, card previews, rival colors, bottom/home-indicator safe
areas, and the OS Reduce Motion setting. This is the remaining device acceptance
check before calling Phase 1 fully accepted.

## Tooling notes

ESLint 9 is used with Expo's lint configuration. npm emits an upstream ESLint 9
deprecation notice; application lint itself passes. No forced SDK or transitive
major-version upgrades were applied.
