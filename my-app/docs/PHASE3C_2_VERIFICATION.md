# Phase 3C-2 — Card Evolution

## Derived state and visuals

`src/cards/domain.ts` is the only threshold definition. Consumers first use the
unchanged Phase 3B `overall(ratings)` (floored six-body mean), then derive appearance:

| Displayed OVR | Tier | Finish |
| --- | --- | --- |
| 0–49 | Bronze | Standard |
| 50–59 | Bronze | High |
| 60–74 | Silver | Standard |
| 75–89 | Gold | Standard |
| 90–98 | Purple | Standard |
| 99 | ASCEND | Standard / maximum evolution |

Purple retains internal `elite` identity for compatibility with existing visuals.
High is a finish, not another tier. Separate finish and visual-intensity types allow
future within-tier finishes without altering ratings. Inputs must be displayed
integers 0–99. Next tier/minimum OVR comes from the same threshold table; ASCEND
has no next tier. No fractional OVR progress or artificial XP is displayed.

PlayerCard and Home summary derive appearance from their actual OVR. Card tier and
intensity props can no longer override the earned card. The former manual preview
selector is removed; PLAYER now has a compact current tier/finish/next-OVR panel.
No preview state, mutable earned tier or second OVR is persisted.

Existing dark card geometry, typography, numerical hierarchy and palettes remain.
Bronze Standard is restrained; High adds a brighter highlight/glow. Silver is cool
metallic, Gold is warm premium, Purple is vivid violet. ASCEND has mint-white accents,
a deep teal base and a separate pale-gold inner frame with MAXIMUM EVOLUTION.
Effects are static gradients/frames/highlights; no flashing, sounds, 3D or new
libraries. The former unused motion hook is removed. All information is available
with reduced motion. Card stats wrap on narrow screens instead of overflowing.

## Presentation and persistence

Phase 3C-1 still reconstructs factual six-area snapshots from the durable ledger.
Its existing `overall` results supply `cardEvolution(before, after)`: only an upward
OVR transition with different tiers qualifies. 49→50 changes finish without an
evolution; multi-tier jumps show the actual initial/final tiers once.

The existing full-screen sheet shows body ratings, then OVR UP, then CARD EVOLUTION
with the evolved Player Card using a detached post-session body-rating snapshot.
Entering ASCEND uses FINAL EVOLUTION and ASCEND ACHIEVED. CLOSE stays fixed while
results and CONTINUE scroll. No growth recalculation or extra award is performed.

The original controller, provider and `ascend.presentation.v1` repository are
unchanged. Rating UP, OVR UP and Card Evolution share exactly one player/session
identity and mark-before-show consumption. No separate evolution persistence,
player migration or history scan is introduced. Old consumed results stay consumed.
Existing high-OVR players immediately get their earned appearance without a popup.
Failed consumption suppresses the whole presentation; app interruption follows the
same skip-rather-than-replay policy. Existing player/session/PR/Coach data is intact.

## Files

- Added `src/cards/domain.ts`, `tests/cards.test.cjs`, `tests/browser-cards.cjs`.
- Updated PlayerCard, PlayerSummary, PLAYER and HOME integration, visual palette and
  CardTier type; removed unused `animations/use-card-motion.ts`.
- Updated presentation/domain and player/rating-up with evolution data and UI.
- Updated README/spec/roadmap and this phase verification report.

## Verification

- Full unit suite: 164 passed (142 existing + 22 card tests).
- TypeScript and lint: passed.
- `env -u NO_COLOR CI=1 npx expo export --platform all --max-workers 1 --output-dir /tmp/ascend-card-export-final`:
  passed; iOS/Android Hermes bundles and 13 static web routes generated.
- Existing browser regressions passed: `browser-growth`, `browser-records`,
  `browser-input`, `browser-audit`, `browser-overlays`, `browser-sessions`,
  `browser-coach`, `browser-presentation`, and development-only `browser-growth-debug`.
  The growth test now asserts removal of manual preview controls instead of pressing
  the obsolete Gold/Low buttons. All remaining existing assertions are retained.
- `browser-cards` passed: Bronze High and existing Silver/Gold/Purple/ASCEND render
  consistently on HOME/PLAYER without historical popups or saved Player changes.
  A fresh live workout crosses Silver → Gold, displays OVR UP before CARD EVOLUTION,
  and shares the existing consumed identity without replay after restart.
- Card and presentation tests were rerun on the final export after the text-layout
  adjustment. Visually inspected the 320px evolution/ASCEND screenshots and 1.5×
  text approximation; card headers and stats wrap. Presentation regression also
  covers 390px, reduced motion, dismissal and interruption while visible.
- Early card test attempts had an empty fixture workout name and an above-limit
  planned rep target. Corrected the isolated fixtures to respect existing validation;
  no workout validation or growth rules were changed to make tests pass.
- TypeScript/lint have no new warnings. The known development-Web SVG
  `accessible={false}` React warning remains unchanged; Growth Debug still passed
  with zero writes on open/refresh and production entry absence. No page exceptions
  occurred in the successful focused card/presentation flows.
- `git diff --check` passed. PR/growth/Coach code, Player/session repositories and
  presentation controller/provider/consumption repository remain unchanged.
- Browser tooling remains outside app dependencies. Use
  `NODE_PATH=/tmp/ascend-debug-qa/node_modules`,
  `PLAYWRIGHT_BROWSERS_PATH=/tmp/ascend-debug-qa/browsers`, and `ASCEND_QA_URL`
  pointing to a local production export. Growth Debug additionally requires a
  development Metro URL and `ASCEND_QA_PROD_URL` for its production check.
- Browser fixtures for high ratings are isolated synthetic, schema-valid ledgers;
  they test presentation, not the Phase 3B balancing formula. Production records
  are never modified to force a tier. Existing growth tests cover the formulas.
- Physical iPhone testing is not claimed for this phase. The user verified Phase
  3C-1 on iPhone before this work; that does not verify these new visuals.

## iPhone Expo Go steps

1. `cd my-app` then `npx expo start --go --lan`; open in compatible Expo Go on the
   same Wi-Fi. Preserve your existing saved data.
2. On PLAYER, compare displayed OVR against the table above. Check current tier,
   finish and next required OVR. Manual tier selectors must not appear.
3. Open HOME and confirm its tier/color agrees. Open history and Growth Debug:
   existing records must remain intact and no historical evolution should appear.
4. Complete genuine workouts normally. At 49→50 expect Bronze High, with ordinary
   Rating/OVR information and no CARD EVOLUTION. At a major boundary expect body
   ratings → OVR UP → CARD EVOLUTION with the new earned card.
5. At 99, check the distinct ASCEND card, maximum-evolution label, no next tier, and
   FINAL EVOLUTION / ASCEND ACHIEVED for a fresh qualifying completion only.
6. CONTINUE/CLOSE, navigate, Expo Reload and restart: no duplicate celebration.
   Also interrupt while the presentation is visible; the saved session stays intact.
7. With Reduce Motion, larger system text and VoiceOver, check safe areas, all
   card values, scrollability and reachable CLOSE/CONTINUE on a small iPhone.

High-tier transitions may not be reachable soon through normal training. Do not
fabricate performance in your real history; automated isolated fixtures cover the
thresholds. Native device behavior and real multi-year growth remain distinct checks.

## Phase 3C-3 hand-off

Tier is derived physical progression, never an inventory item or purchasable unlock.
Card Evolution grants no rating bonus, Coins or rewards. Future rewards must preserve
this boundary and must not split consumption of the existing completed-session
presentation. No Phase 3C-3, Shop, weekly rewards, Career or Match implementation.
