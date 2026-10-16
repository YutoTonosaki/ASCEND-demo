# Phase 4C-3 — Cinematic Hybrid Match Experience

## Audit and scope

Read `AGENTS.md` and the versioned Expo SDK 57 reference, README, actual Match
engine/provider/repository, Rewards source validation/provider, read-only history,
Season and Career integration, root providers, Player Card, localization, safe-area
modal and existing tests. The working tree was initially clean. React Native
Animated is available; no animation dependency, network asset, sound or haptics was
added. No Reanimated dependency was assumed.

The Weekly Rival Match panel remains the only entry. PLAY MATCH now opens a frozen
pre-match comparison; CONFIRM PLAY MATCH deliberately invokes the existing engine.
History and Season remain read-only. No AVS, transfer, Shop spending, Season rewards
or later phase is implemented.

## Architecture and files

Added:

- `src/matches/presentation/model.ts`: pure detached/deep-frozen matchup and saved
  result models; existing constants supply expected reward. No current OVR input.
- `src/matches/presentation/play.ts`: durable-first orchestration around existing
  `play` and `load`, with ownership validation and lost-acknowledgment recovery.
- `src/matches/presentation/controller.ts`: injected-scheduler stage controller,
  cancellation generations, skip, background and Reduce Motion. No storage imports.
- `src/components/match/renderer.tsx`: replaceable original 2D renderer, saved Player
  Card, Rival identity/card, power comparison and native-driver visual timeline.
- `src/components/match/report.tsx`: independent factual report using the existing
  read-only MatchDetails and validated payment view; accessible result announcement.
- `src/components/match/experience.tsx`: safe-area modal coordinating manual
  confirmation, presentation lifecycle, source ownership and live report payment.
- `tests/match-cinematic.test.cjs`, `tests/browser-match-cinematic.cjs`.
- This report.

Updated:

- `src/components/career/matches.tsx`: READY opens the pre-match surface.
- `src/matches/provider.tsx`: returns saved Match or null; existing PLAY is followed
  by a durable read, including when the write acknowledgment was lost. Existing
  independent Rewards reconciliation remains in `finally`.
- English/Japanese semantic `cinematic.*` keys and `README.md`.
- Existing browser-match-resolution/rewards tests now explicitly confirm the
  pre-match screen and close the report, retaining original persistence assertions.

Match domain/repository, reward rules/domain/repository/provider, PR, Growth, OVR,
Card thresholds, workout/session, Coach, Career/Season schemas and repositories,
history selectors/components and progression-presentation consumption are unchanged.
No storage key, schema migration or cinematic progress record is added.

## Durable-first flow and report

1. READY entry shows saved week-end ratings/OVR/Weekly Bonus, copied Player Club,
   Rival name/Club/OVR/Condition and fixed powers. The Player identity is the existing
   localized PLAYER concept; no fictional portrait or name is invented.
2. Confirm invokes the existing queued `MatchRepository.play`. UI locks repeat taps.
3. Read and validate the persisted document and ownership. A durable result and
   week-end snapshot are required. The original error is retained when no saved
   result can be recovered. No second resolution call is used for recovery.
4. Publish the saved result and begin playback. Rewards independently reconcile
   from saved results; neither their success nor animation completion gates the other.
5. Report uses saved powers/outcome and existing MatchDetails for factual snapshots,
   timing and reward evidence. It remains usable during payment failures.

The report distinguishes expected Coins from actual confirmed Coins. Pending or
unavailable payments never appear credited. The payment view must reference the
same saved result ID; stale pre-result state is not substituted during asynchronous
publication. Failed confirmation reads suppress playback; the existing retry can
recover the completed record and expose its report without resolving it again.

## Playback, accessibility and recovery

VS **2 seconds** → authored 2D simulation **8 seconds** → saved result reveal
**2 seconds** → report. The simulation has two abstract identity markers, arena
geometry, power comparison and stage progress. It is explicitly labeled a cinematic
visualization of a saved result. No goals, scores, injuries, random winner, fabricated
statistics or visual-event persistence is introduced. WIN/DRAW/LOSS produce localized
VICTORY/DRAW/DEFEAT; the result is never produced by the renderer.

SKIP is fixed above the scrollable content during animated stages and immediately
shows the report. Repeated SKIP is harmless. Controller cancellation generations
reject obsolete callbacks; renderer cleanup stops Animated timing. Reduce Motion
starts directly at the report, including a setting enabled during playback. Until
its asynchronous OS query resolves, the conservative default is reduced motion.
Background/inactive events end the timeline at the report; foreground never restarts
it. A result finishing persistence while backgrounded also starts at the report.

CLOSE is fixed; confirmation/report controls are reachable by scrolling. Existing
SafeAreaModal measures the separate native modal surface. Text wraps and respects
system font scaling. Result text has a polite live region and report entry explicitly
announces the localized outcome for screen readers. No flashing, sound or color-only
outcome is required. Renderer exceptions fall back to the independent report.

Closing, leaving CAREER or unmounting disposes timing; a closed pending confirmation
cannot reopen the cinematic. Saved Match/results/payments remain authoritative.
Restart has no cinematic intent: completed history is immediately available without
replay. No new consumption system is created and `ascend.presentation.v1` is untouched.
Rendering cannot undo a Match, credit Coins or change training evidence. Existing
startup/foreground Rival generation and earned-reward recovery remain ordinary app
services, independent of viewing the report/history.

## Verification

- `npm test`: **451 passed, 0 failed** (431 existing + 20 cinematic tests).
  Covers frozen WIN/DRAW/LOSS models, durable confirmation, failed writes/reads,
  lost acknowledgment, repeat PLAY, absent snapshots, expired/upcoming rejection,
  stage timing/order, skip at all stages, cancellation, remount/change, background,
  Reduce Motion and expected/pending/paid/unavailable payment views. Existing domain,
  history, Season, Daily/Weekly rewards and read-only Growth Debug tests remain green.
- `npm run typecheck`: passed. `npm run lint`: passed, no warnings/errors.
- `env -u NO_COLOR CI=1 npx expo export --platform all --max-workers 1
  --output-dir /tmp/ascend-cinematic-verified-export`: passed, iOS/Android Hermes
  bundles and 13 static web routes. No new application dependency or export warning.
- `git diff --check`: passed.
- `browser-match-cinematic`: passed all 14 scenarios on the final verified export:
  actual READY entry/manual confirmation, durable saved result before playback,
  WIN/DRAW/LOSS, authored stages, skip during VS/simulation/reveal, Reduce Motion,
  background/foreground, lost acknowledgment, write failure/retry, EN/JA, restart
  while visible, leaving CAREER, and reward-only failure/foreground recovery.
  Each scenario retains exact unrelated gameplay bytes, one Match reward transaction,
  and no cinematic replay after restart. Payment pending is additionally covered by
  the pure report-model test; browser failure testing verifies unavailable → paid.
- 320px pre-match, simulation and enlarged Japanese report screenshots were visually
  inspected. Verified flows have no horizontal overflow or browser page exceptions.
- Existing browser regressions passed on the same final export (all exit 0):
  `browser-match-resolution`, `browser-match-rewards`, `browser-match-history`,
  `browser-rewards`, `browser-career`, `browser-seasons`, `browser-localization`,
  `browser-presentation`, `browser-cards`. Original assertions are retained; the two
  manual PLAY scripts only add the explicit confirmation/report-dismissal steps.
  These cover payment recovery, read-only history, immutable Season evidence,
  ordinary rewards, onboarding, settings-only writes and unchanged Rating/Card
  presentation consumption. Other legacy browser scripts were not rerun here;
  the complete existing unit suite was run.
- Focused Japanese cinematic QA was rerun after strengthening exact unrelated-key
  equality and scaling both font size and line height by 1.5. It passed; the updated
  screenshot was visually inspected. Browser page exceptions: none in passed flows.

Browser QA uses isolated schema-valid records and clock; no actual phone data is
changed. Playwright/Prettier remain external under `/tmp/ascend-polish-qa`, not app
packages. Set `NODE_PATH=/tmp/ascend-polish-qa/node_modules`,
`PLAYWRIGHT_BROWSERS_PATH=/tmp/ascend-polish-qa/browsers`, and `ASCEND_QA_URL` to the
local final export server. `ASCEND_QA_SCENARIO` optionally selects one focused
cinematic scenario; the default runs all fourteen. Restart uses `/` because the
simple QA server lacks extensionless route fallback. No native execution is implied.

The initial type check found that `@react-navigation/native` is not installed as a
public project dependency. The implementation uses the already available Expo
Router `useFocusEffect` instead. Initial lint rejected render-time ref access;
controller/Animated values now use stable lazy state and callback refs update in an
effect. No dependency was installed and no lint rule was disabled.

## Limitations and future AVS boundary

No physical iPhone/Hermes execution is claimed. The user's previous smoke test
covered Rival generation, Coin balance and Match History, not native READY → PLAY
or this new cinematic. Hermes export is compilation, not native execution. Browser
font scaling, visibility events and reduced-motion emulation do not verify native
Dynamic Type, VoiceOver, AppState, safe areas or animation performance.

The renderer has a factual immutable model plus stage interface; a future AVS renderer
can replace it without changing MatchRepository, RewardsRepository or resolution.
There is no 3D implementation in this phase. The 2D sequence is authored atmosphere,
not a second Match engine. No persistent resume/replay feature is added. If the app
terminates after saving but before playback, the result is accessed through history;
existing reward recovery still pays it once. Storage remains subject to existing
single-process/shared-adapter guarantees, not cross-device transactions.

## Physical iPhone Expo Go checklist

1. Preserve real data. Run `cd my-app` then `npx expo start --go --lan`; open in
   compatible Expo Go on the same Wi-Fi. Do not reset storage or change the clock.
2. Check existing OVR, PRs, Growth Debug, Coins, Club and Season. Upcoming/pending/
   skipped/completed states must remain factual; history must have no PLAY/CLAIM.
3. When a genuine Match is READY, open PLAY MATCH. Compare the frozen week-end OVR,
   Weekly Bonus, both Clubs, Rival OVR/Condition and powers with its history detail.
   CLOSE before confirming must not resolve the Match.
4. Reopen and confirm. Expect VS → simulation → saved-result reveal → report.
   Check actual WIN/DRAW/LOSS and powers; payment is exactly 25/15/10 when confirmed,
   with pending/unavailable distinguished. Physical Ratings and Season are unchanged.
5. On another eligible Match, use SKIP during a stage: report opens without another
   result/payment. No extra Match is needed solely for testing.
6. Background during playback, return, then close/navigate/Expo Reload/restart.
   Saved outcome remains, report/history works, no automatic cinematic replay or
   duplicate Coins. Normal training/rewards must continue unchanged.
7. Enable Reduce Motion before a later eligible confirmation: immediate report.
   Check EN/JA, large Dynamic Type, VoiceOver outcome announcement, fixed CLOSE/SKIP,
   scrollable confirmation/report, safe areas and small-screen layout.

Do not inject synthetic Matches or corrupt real phone data to force scenarios;
isolated automated fixtures cover outcomes, boundaries and storage failures.
Stop after Phase 4C-3. No AVS, Shop spending, transfer or Season rewards follow-on.
