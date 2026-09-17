# Phase 1.1 mobile polish — 2026-09-16

## Changes

- Removed development/phase/mock/demo labels from native product screens.
- Home now uses a compact Player summary with OVR and Form; weekly progress and
  the training action appear immediately below it. Rival and Recovery are compact.
- Full Player Card, its four finishes and three intensities, original SVG Rival,
  typography, palettes, and bottom tabs are preserved.
- Secondary headers, ratings, disabled entry points, and Career spacing are denser.
- Shop presents all seven cosmetic categories as compact rows.
- Header Settings uses a 20px graphite icon within a 44px touch target. Its small
  dialog has a working close action; preferences remain unavailable.

No bright-blue floating Settings component was present in the application source
at inspection. The new in-app control is integrated into the shared header;
Expo Go/developer overlays, if present on a device, are outside this product UI.

## Verification

- TypeScript and ESLint passed.
- Expo production web export passed.
- All five tabs tested at 320, 390, and 430px widths: no horizontal overflow.
- Settings opens and closes on every tab; header target is 44 × 44px.
- Home CTA navigates to Train; compact Player summary navigates to Player.
- All 12 card appearance combinations remain functional.
- No phase/mock/demo text found in rendered product screens or native JSX.
- No browser console errors or uncaught runtime errors during interaction checks.
- Simulated top inset 59px / bottom inset 34px through the safe-area provider:
  header controls clear the top inset, and tabs clear the home-indicator inset.
- Phone-width screenshots inspected. At 390 × 844 without native insets, Home's
  core information and Shop's seven categories each fit in one viewport.

The safe-area test uses simulated provider measurements in the web renderer.
It is not a physical iPhone test. Actual device touch feel, OS font scaling,
notch behavior, and native animation performance still require an Expo Go check.

## Scope

UI polish only. No workouts, timers, persistence, generation, progression,
match/season engines, purchases, or settings persistence were implemented.
