# Phase 3B — Player Growth & OVR

## Implemented

PLAYER offers explicit INITIALIZE PLAYER using existing optional Phase 2C Baselines.
Six body ratings retain fractional values and provisional/assessed status. OVR is
computed from their mean, never persisted independently. The card keeps its design,
finish/intensity controls, Club identity and navigation, replacing fictional athletic
stats with six real body ratings. HOME uses the same real OVR. Personal Records is
unchanged. No tier evolution, Phase 3C presentation, Career, Match, Shop or rewards.

Confirmed sets use the existing Phase 3A PR comparisons. First records do not award
growth. Comparable improvements can award bounded fractional changes, with normalized
body allocation, early multipliers, high-rating diminishing and event/session/day caps.
First direct assessment replaces a provisional estimate, not adds to it. Distinct PR
improvements can earn a small completion-only bonus once. Existing history is never
rewritten, and receives no retroactive growth at initialization.

## Files

- `src/config/growth.ts`: version-1 conversion curves and every growth constant.
- `src/types/growth.ts`: Player document, rating statuses and source-linked ledger.
- `src/growth/domain.ts`: pure initialization, assessment, PR-based reconciliation,
  weighted comparison selection, caps, allocation and derived OVR.
- `src/growth/validation.ts`: runtime schema/bounds/identity/ledger replay validation
  and detached document copies.
- `src/storage/player-repository.ts`: queued load/initialize/reconcile, atomic writes,
  independent `ascend.player.v1` boundary, no automatic reset.
- `src/growth/provider.tsx`, `src/app/_layout.tsx`: root lifecycle and retry integration.
- `src/components/player/growth-status.tsx`, `player-card.tsx`, `player-summary.tsx`:
  initialization/error states and real rating presentation.
- `src/app/(tabs)/player.tsx`, `index.tsx`: PLAYER and HOME integration.
- `tests/growth.test.cjs`, `tests/browser-growth.cjs`: domain/persistence/mobile QA.
- README files, Product Spec, Game System section 47 and Roadmap updated.

No dependencies, existing session/PR/Profile models, Coach rules or other repositories
were changed. No second PR calculator, questionnaire or PR database is introduced.

## Exact rules and assumptions

The canonical formulas and full conversion tables are in **Game System section 47**
and `src/config/growth.ts`; this verification report does not duplicate that spec.

- Provisional = 45. Initial Baselines assess only Chest (Push-up), Legs (Squat), Core
  (Plank) from their primary metadata. Curves interpolate 40–60 and saturate. Missing
  Baselines are fine; no measurements infer another area's capacity. Complete example
  10 reps / 10 reps / 30 seconds gives 46/43/48 plus three 45s, displayed OVR 45.
- First new direct assessments also support Pull-up → Back, Diamond Push-up → Arms
  and Overhead Press with at least 5 reps → Shoulders. Other movements/custom exercises
  have no initial conversion. They may grow already assessed relevant areas. An area
  newly assessed by a set gets no growth from that same set. Unsupported areas remain
  visibly provisional; their unused growth allocation is not redistributed.
- Relative improvement caps at 0.50; previous zero uses 0.10. Budget is
  `min(0.30, (0.06 + 0.40*ratio) * earlyMultiplier)`.
- Early weeks since initialization: 1.25, 1.20, 1.15, 1.10, then 1.00. No passive growth.
- Primary weight 1, secondary 0.25; normalize all labels, then exclude provisional and
  newly assessed areas. Multiply eligible shares by `max(0.15,min(1,(99-rating)/59))`.
- Total growth caps across all six areas: 0.30/event, 0.65/workout, 0.90/UTC day.
  Apply remaining rating capacity and proportional session/day clipping. Assessments
  are separate from growth caps. Caps do not promise an integer gain every week.
- Weighted: same-load rep improvements qualify. Higher kg qualifies only if reps are
  at least the **best reps at the former maximum kg**. New-load first rep records do
  not qualify. Choose the greatest qualifying ratio once per set, never sum metrics.
  Zero-rep weighted attempts give nothing; zero kg with completed reps is valid.
- Completion bonus: `min(0.12, 0.04*(distinct improved exercise IDs - 1))` for at least
  two IDs. Normalize their eligible area allocations, apply diminishing and remaining
  session/day caps. No early multiplier; no first-record or active-session bonus.
- Display body ratings by flooring; OVR floors the mean of fractional ratings.
  Maximum 99. These are game abstractions, not medical/physiological measurements.

## Persistence and historical integrity

Schema version 1 / rules version 1 persists player identity/time, used Baseline
snapshots, initial/current body ratings and statuses, processed session/set IDs,
finalized session IDs, and assessment/growth/bonus events with source/time, metric,
actual where relevant, allocation and before/after changes. This is not a duplicate
workout history or PR database. Existing keys are not written by PlayerRepository.

Initialization consumes all already-confirmed set identities and finalizes existing
completed sessions without awards. Existing PRs still supply comparison references.
Unmeasured areas wait for a supported new set; a first new assessment can occur even
if its actual result is below an older PR, with no PR award. Old active confirmed sets
are excluded; new confirmations after initialization are eligible. Sets at/before the
initialization timestamp do not award growth.

Reconciliation atomically saves ratings, events and processed identities. Repeated
reads/remounts/callbacks do not re-award. Failed writes retain durable state and can
retry pending evidence. Missing storage is explicitly uninitialized; malformed/newer
schema data is preserved and blocks Player writes with a retryable error. There is
no automatic reset or destructive Player reset UI. Read validation reconstructs
ratings/status from the initialization evidence and ledger and checks bounds/caps.

If previously processed set evidence disappears, new growth pauses while saved
ratings remain. Restore the original history before retrying. Similarly, future
workout timestamps and newly arriving post-initialization evidence older than already
processed results pause rather than retroactively rewrite awards. No legacy import,
cloud backup or manual data-repair UI is added. A clock/history problem is not a
rating penalty. Ordinary template edits/deletion, catalog renaming and Profile edits
preserve established history and ratings.

Phase 3C can later visualize the source-linked before/after events and distinguish
assessment adjustments from improvements/bonus. No event animation or sound is added.
Rules-version changes will require an explicit compatibility policy; editing balancing
curves must not silently recompute existing initial ratings.

## Verification

- `npm test`: **120 passed, 0 failed** (79 existing + 41 growth tests).
- `npm run typecheck`: passed.
- `npm run lint`: passed with no warnings.
- `env -u NO_COLOR CI=1 npx expo export --platform all --max-workers 1 --output-dir /tmp/ascend-growth-export`:
  passed, generating iOS/Android Hermes bundles and 13 static web routes.
- Tests cover all requested initialization/assessment/PR/weighted/bonus/early/cap
  cases, deterministic results and detached snapshots, history cutoff, persistence
  reload/duplicates, template and profile isolation, missing/backdated/future history,
  corruption, unsupported versions, initial/write failure and pending-event retry.
- `tests/browser-growth.cjs`: passed on the production export at 320px/390px. Explicit
  initialization, baseline snapshots, old-history cutoff, unconfirmed exclusion,
  confirmed active growth, simulated Player-only write failure/retry, resume/reload,
  equal-result exclusion, completed-only distinct bonus, template deletion/Profile
  isolation, finish preview, real Home OVR and corrupt Player data/retry verified.
- Existing PR/input/overlay/Coach browser regressions passed. Final plan/session
  browser rerun results are recorded below when finished.
- Card and body-status screenshots at 320px were visually inspected; no horizontal
  overflow or browser console/page errors in the completed growth flow.
- Parallel browser QA initially hit screenshot/click/navigation timeouts; growth
  passed when rerun alone. Remaining affected scripts are rerun sequentially.
- Optional Playwright remains external tooling. Use
  `NODE_PATH=/tmp/ascend-qa/node_modules`,
  `PLAYWRIGHT_BROWSERS_PATH=/tmp/ascend-qa/browsers`, and `ASCEND_QA_URL` pointing
  to the served production export; no app dependency was added.
- Physical iPhone/Android testing was **not performed** for Phase 3B. Browser mobile
  viewports and simulated safe areas do not prove native keyboard/touch behavior.

## Physical iPhone test steps

Preserve your existing data. Use genuine performed values in your normal installation;
example numeric scenarios can be exercised in a separate test installation/data set.

1. From the repository root: `cd my-app`, then `npx expo start --go --lan`. Use the
   same Wi-Fi on iPhone and computer, open the QR code in compatible Expo Go.
2. Verify existing Saved Workouts, Workout History, Training Profile and Personal
   Records are still present. Open PLAYER: before initialization there should be an
   explicit starting-point panel, not the old fixed OVR 58.
3. Optionally choose REVIEW BASELINES to use the existing profile editor. Return to
   PLAYER and tap INITIALIZE PLAYER once. With no Baselines, expect OVR 45 and six
   provisional 45s. With Push-up 10, Squat 10 and Plank 30 seconds, expect Chest 46,
   Legs 43, Core 48, other areas provisional 45 and OVR 45. Initialization should not
   award growth from your earlier workout history.
4. Inspect the full card, Bronze/Silver/Gold/Purple and Low/Mid/High previews, PR
   panel, body ratings and status labels. Preview changes must not change ratings.
   HOME must show the same OVR as PLAYER.
5. Start a saved workout. Change an actual input without confirming it: no growth.
   Confirm a first-ever exercise record: no PR growth. If it is a supported direct
   assessment, its provisional primary area may become assessed (possibly lower).
   Secondary-only areas should remain provisional. Already assessed areas should
   never reinitialize from another exercise's first record.
6. On a later genuinely improved set, confirm the actual result, switch to PLAYER,
   and verify assessed relevant areas can advance. Small growth is fractional and
   may not change the displayed integer yet. Equal/lower results must not advance
   or lower assessed ratings. PR values still reflect the actual confirmed evidence.
7. For weighted test data: 10 kg × 8 → 12 kg × 8 can grow; 10 kg × 8 → 12 kg × 6
   is still a weight PR but does not qualify for maximum-weight growth. 10 kg × 8
   → 10 kg × 9 can grow. A first 5 kg × 15 after 10 kg × 8 must not grow merely
   for being a new lower load. Use a previously assessed relevant area for this test.
8. In a workout with two distinct exercises, improve both pre-existing records.
   No completion bonus should occur while a set remains unfinished. Complete the
   workout and tap FINISH; the ledger may contain one small capped bonus affecting
   only eligible areas. Multiple improved sets of one exercise do not qualify.
   There is intentionally no bonus animation or pop-up in Phase 3B.
9. Leave a partially confirmed workout, close/reopen the app (or use Expo Reload),
   return to PLAYER then TRAIN → RESUME WORKOUT. Ratings and confirmed evidence
   should remain, with no extra increment merely from navigation/reloading. Complete
   and reload again: no duplicate completion bonus.
10. Edit a saved template or delete it after completing its workout. Rename a custom
    exercise. Update Baselines/measurements in Settings → Training profile. Confirm
    these operations do not reinitialize existing ratings or rewrite old evidence.
    AI COACH should still generate/save proposals and use history normally.
11. Inspect at normal and larger system text sizes: notch/status-bar clearance,
    bottom-tab clearance, card stats, body-status labels, long explanations, vertical
    scrolling, touch targets and native workout keyboard behavior. No sideways scroll.

Do not reset production history merely to test recovery. Storage corruption/failure
and retry scenarios are covered using isolated automated data, not the user's phone.
Stop after Phase 3B; Phase 3C remains unimplemented.
