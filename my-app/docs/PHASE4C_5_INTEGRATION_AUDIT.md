# Phase 4C.5 — Integration Audit & Gameplay Polish

Date: 2026-10-14. Assessment: **PASS WITH LIMITATIONS** (native verification pending).

## Scope, baseline and method

Read AGENTS.md, the SDK 57 reference, README, 4C verification reports and the actual
Match/calendar/evidence/rival/persistence, Rewards, history, Season, cinematic,
localization, navigation and test implementations. Baseline reported by 4C-3:
451 unit tests, 14 cinematic scenarios and nine related production browser suites.
The 4C-3 implementation was still uncommitted at audit start; it was preserved.
Source hashes captured before this audit distinguish its three existing-source
edits from earlier working-tree changes. No production records were loaded/edited.

This is stabilization only. No new reward, outcome, OVR, PR, Growth, probability,
Season or Career rule, schema, migration, dependency or storage key is introduced.
SHOP spending, AVS, transfers and later features remain outside scope.

## Ownership and lifecycle matrix

Paths below are relative to `my-app/`.

| Subsystem | Authoritative source / functions | Lifecycle and boundary | Coverage |
| --- | --- | --- | --- |
| Workout | `storage/session-repository.ts`: `load`, `commit`; `sessions/domain.ts`: `confirmSet` | `ascend.sessions.v1`; write succeeds before LiveWorkout completion callbacks | Sessions tests/browser; new full loop |
| PR | `records/domain.ts`: `derivePersonalRecords` | Pure confirmed actual-set derivation; planned values and Baselines do not become workout PRs | Records tests/browser; full loop |
| Growth/OVR | `growth/domain.ts`: `reconcilePlayer`, `overall`; `storage/player-repository.ts` | `ascend.player.v1`; persisted fractional ratings/events; no mutable independent OVR | Growth tests/browser; full loop |
| Career/Club | `career/domain.ts`, `storage/career-repository.ts`, `career/provider.tsx` | `ascend.career.v1`; explicit join; Player/Career ownership; historical Club snapshots retained | Career tests/browser |
| Rival | `matches/domain.ts`: `generateCurrentMatch`; `matches/rival.ts`: `generateRival`, `generationEvidence` | First eligible access in visited target week, saved before publication; frozen generation-time ratings, goal, Club, difficulty and Condition | Matches/resolution tests; full loop/travel |
| Calendar | `matches/calendar.ts`: `matchWeek`, `matchDay`, `validWeek` | Saved IANA timezone and independently resolved UTC midnights; Monday identity | Calendar/DST/boundary tests; timezone browser |
| Week-end | `matches/evidence.ts`: `reconstructWeekEnd` | Replay durable initial ratings/events before exclusive week end; require processed set/finalized session coverage | Evidence tests; full loop |
| Resolution | `matches/domain.ts`: `matchStatus`, `resolveMatch`; `storage/match-repository.ts`: `play`, `refresh` | `ascend.matches.v1`; manual queued PLAY; immutable result; persisted terminal skip observation | Resolution tests/browser; full loop |
| Coins | `rewards/domain.ts`: `parseRewards`, `balance`; `rewards/matches.ts`: `applyMatchPayments`, `validateMatchPayments`; `storage/rewards-repository.ts` | `ascend.rewards.v1`; receipt/transaction ledger, source validation, independent automatic settlement | Rewards/Match rewards tests/browser; full loop |
| Cinematic | `matches/presentation/play.ts`: `playSaved`; `model.ts`; `controller.ts`: `CinematicController` | Durable result readback before in-memory 2/8/2 playback; no cinematic persistence or reward callback | Cinematic tests/14 browser scenarios |
| History | `matches/history.ts`: `historyItems`, `seasonMatches`, `matchStatistics`; `use-history.ts` | Read-only scoped selectors; validated Match/Reward contexts; virtualized list | History tests/browser; full loop |
| Season | `seasons/domain.ts`, `storage/seasons-repository.ts`, `components/career/season-match-stats.tsx` | `ascend.seasons.v1`; frozen close snapshots, live read-only Match join by target Monday month | Season/history tests/browser; full loop |
| Debug/language | `growth/debug.ts`, `localization/`, `storage/settings-repository.ts` | Read-only Growth debug; locale writes settings only | Debug/localization tests/browser |

Root hydration order is Localization → Training → Session → Coach → Growth →
Career → Seasons → Rewards → Match → GrowthPresentation. Growth and Career errors
block Match publication. The new publication guard also checks every loaded Match's
Player and Career-start identity synchronously, before asynchronous refresh finishes.
History already performed this ownership guard independently.

## End-to-end findings

No contradiction requiring a gameplay/schema change was found in the finalized
4C power, reward, generation or lifecycle rules. Existing calculations are reused:

- Confirmed actual sets supply PR/Growth; successful Session persistence happens
  before fresh reward, Season and Growth-presentation intents.
- `overall()` floors the six fractional rating mean. Rival generation snapshots
  the saved value at generation; later workouts never reroll that Rival.
- Week-end replay uses saved **event.at** (set confirmation/completion time), not
  the wall clock of the eventual storage write. A delayed successful Growth commit
  can supply previously missing evidence while the Match remains eligible. Coverage
  guards keep incomplete evidence pending; no guessed midnight/current OVR is used.
- Positive completed Sessions determine distinct Match training days, attributed
  by completion time in the Match's frozen timezone. Confirmed active sets can
  contribute Growth evidence but not a completed Match training day.
- Match goal snapshots use Coach's 1–7-day setting, null → 3. Match Bonus is the
  existing floored capped ratio. Consistency Coins have their separate fixed
  three-day target. These are intentionally different systems.
- READY is unlock-inclusive and expiration-exclusive. "Week-end exclusive" refers
  to the training evidence boundary; PLAY is allowed exactly at the next Monday's
  unlock when a usable saved snapshot exists, and disallowed at expiration.
- Result powers/outcome are read from fixed snapshots; playback never computes a
  winner, changes ratings or causes payment.
- Season association uses target Monday's canonical month plus Player/Career
  identity. Late play/payment updates the read-only join, never frozen `end.stats`.

### New full-loop evidence

Both repository integration and browser UI tests cover a September 28 training week
with fresh real completion API calls on September 29/30 and October 1. The browser
uses actual LiveWorkout confirmation and ordinary providers, with isolated synthetic
active-session fixtures; it does not directly inject completed results or payments.

They verify PR improvement and fractional growth, 60 workout Coins (three Daily
awards + one Weekly bonus), immutable Rival, three Match days/Bonus 10, frozen OVR,
manual next-week PLAY, exactly one outcome-dependent payment and report/history.
September is explicitly closed before play. Only its two September workouts are
frozen in Season evidence, while the Match played in October joins September by its
Monday. Closed Season bytes and Player/Session/Profile/Career bytes do not change
from Match play/payment/history. HOME/SHOP agree after reload; no replay occurs.

## Calendar and timezone

Existing tests cover Sunday/Monday final milliseconds, spring/fall DST (167/169-hour
training weeks), non-hour offsets, leap days, month/year/ISO-week-year transitions,
clock rollback and future evidence. Boundaries resolve each saved local midnight
independently, not fixed epoch-week arithmetic. Ambiguous/nonexistent rare local
midnights fail closed with no guessed boundary.

New fixtures exercise first access immediately after UTC Monday followed by travel
back to a device-local Sunday, preserving one ongoing Rival; returning after missed
weeks creates only the currently visited week. Existing saved timezone/goal/Rival
stay unchanged. Expired unplayed records are SKIPPED, never LOSS or paid. Once a
skip marker is durably saved, clock rollback cannot revive it.

A UI inconsistency was found: Weekly Match used the device timezone for unlock text
although history used the saved Match zone. It now uses the same `zonedDate` helper.
Its Monday heading uses `calendarDay`, preserving the wall date and selected locale.
An isolated Vancouver browser verifies a saved UTC unlock is still displayed in UTC.

## Persistence, recovery and economy

Match/Rewards share `storage/queue.ts`'s WeakMap queue keyed by the exact adapter
object. Each operation rereads validated storage inside the lock; internal raw I/O
avoids nested Repository locks. Session, Player, Career and Season retain independent
key-specific repositories; there is no new cross-key transaction claim.

| Interruption | Existing recovery / audit finding |
| --- | --- |
| Generation or week-end write | No publication on rejection; reread reuses committed identity/snapshot after lost acknowledgment |
| PLAY before commit | No completed cinematic or payment; repository rechecks ownership/window using its injected clock inside the queue |
| Result commit with lost acknowledgment | `playSaved` reads durable result, never calls resolution a second time for recovery |
| Result saved, reward not saved | Startup/foreground/explicit retry can pay from the saved completed result without visiting CAREER |
| Payment saved, acknowledgment/readback lost | Deterministic transaction identity + reread prevents a second credit |
| Cinematic start/skip/background/close | Result already durable; no storage API in controller/renderer; cleanup rejects stale timers |
| Report/history/Season | Context reads only; no receipt, PLAY, reward reconciliation or Season write initiated by these views |
| Corrupt/newer storage | Preserve bytes; error/unavailable, no silent zero/reset/repair |

Match amounts remain WIN 25 / DRAW 15 / LOSS 10 / SKIPPED 0. Workout amounts remain
Daily 10 once per captured local day and Weekly 30 once on the third distinct day.
Workout day/week/offset are retained in receipts; travel does not reinterpret them.
This can differ from a Match's frozen timezone after travel, intentionally.

Rewards v1 remains readable. Version 2 is written only when a Match payment is due;
its workout transaction subsequence still exactly replays receipts. Payment IDs are
`["match", matchId, "result"]`; no arbitrary amount/credit UI/API is introduced.
Balance is the safe integer sum of validated transactions. Match `rewardDelivery`
remains null; it is not an unpaid flag. Confirmed Rewards transactions joined to
actual results determine payment. Pending expected Coins never count as earned.

No migration-on-read, historical Rival backfill, workout receipt fabrication or
animation-generated reward was found. Repeated/competing repository requests are
covered by existing failure/concurrency tests and the new full loop. Normal refresh
can independently generate the current Rival, capture evidence or observe expiration;
these root services must not be confused with writes caused by history browsing.

## Concrete defects and minimal fixes

| Defect / risk | Minimal fix | Regression evidence |
| --- | --- | --- |
| Device-zone unlock text disagreed with frozen Match/history zone after travel | `components/career/matches.tsx` uses existing zoned/calendar formatting | UTC Match displayed from Vancouver browser; timestamps unchanged |
| READY pre-match became blank/disabled after expiry while open, with no explanation | `components/match/experience.tsx` displays the existing localized lifecycle label when no longer READY | Open READY then foreground at exclusive expiry → SKIPPED label, confirmation disabled, no result/payment |
| Provider could publish previously loaded foreign-owner Match data while new valid prerequisites hydrated before refresh rejected it | `matches/scope.ts` pure ownership predicate; `matches/provider.tsx` gates data/error/PLAY synchronously | Unit tests for missing/mixed/changed scopes; browser mutation observer sees no foreign Rival, raw Match bytes preserved |

These are display/publication safeguards. No result, power, amount, probability,
identity, snapshot or eligibility formula changed. No full Career redesign.

## Cinematic, accessibility and lifecycle findings

Saved pre-match ratings/Clubs/powers are used; no current OVR substitution. Manual
confirmation precedes persistence and playback. VS 2s / simulation 8s / reveal 2s
remain unchanged. SKIP/CLOSE, double-confirm locks, readback errors, lost acknowledgment,
interruption and report independence have unit and browser coverage. The authored
arena markers are explicitly presentation-only, with no scores/injuries/extra stats.

English/Japanese semantic keys are complete/type-checked for these screens. Outcome
text distinguishes victory/draw/defeat without relying on color. Report entry calls
AccessibilityInfo announcement; controls retain accessible names/disabled states.
Saved IANA timezone is used for historical instants, canonical Monday for wall dates.
Existing safe-area modal patterns, wrapping headers and scrollable content are reused.
Long Club/Rival names, 320px, enlarged text and Reduce Motion are browser-tested.
Native VoiceOver/Dynamic Type/insets remain unverified.

Animations use native-driver transform values with cleanup. Controller timers have
cancellation generations; background/reduced motion ends at report without replay.
No cinematic progress storage exists; restart exposes completed history, not playback.
Renderer errors fall back to the factual report; they cannot undo saved progression.

## Performance and measured limits

No speculative optimization was made. Root Match refresh runs on prerequisite changes,
startup/foreground, explicit retry and every 30s only while active. Rewards settlement
runs on owner readiness, foreground, newly detected completed IDs and PLAY completion.
There can be redundant **idempotent reads**, but Rewards data/error is not a dependency
that retriggers its own reconciliation loop. Shared queue ordering prevents duplicate
credits, not every duplicate read.

The new browser's last-root trace recorded 28 instrumented reads and three legitimate
writes (current Rival, week-end snapshot/result lifecycle and reward operations as
captured in that trace). Two additional settled foreground events generated **zero
additional writes**, with exact durable state unchanged. This is a bounded fixture
observation, not a native profiling result or a guarantee of a fixed read count.

History uses FlatList with eight initial/batch rows and windowSize 5. A new unit test
constructs/validates/selects 156 actual-schema records (three years), preserving all
rows, order and source bytes. Its focused Node run took about 2.1 seconds including
fixture generation/validation/selection. This is not an iPhone benchmark. Full-document
validation/replay and some linear lookups still grow with history size; no multi-year
Hermes memory/FPS/latency claim is made.

## Files changed by this audit

- Added `src/matches/scope.ts`: read-model ownership predicate.
- Modified `src/matches/provider.tsx`: synchronous ownership publication/action guard.
- Modified `src/components/career/matches.tsx`: frozen-zone/localized date display.
- Modified `src/components/match/experience.tsx`: expired/pre-match state explanation.
- Added `tests/match-integration-audit.test.cjs`: four focused tests (ownership,
  repository full loop/month association, near-midnight travel, three-year history).
- Added `tests/browser-match-integration.cjs`: real UI full loop, no-write foreground,
  frozen-zone/expiry/long-name checks and ownership-hydration observer.
- This audit report. Existing 4C-3 working changes are retained separately.

Source hashes confirm only the three listed existing production files changed from
this audit's starting tree; `scope.ts` is the sole new production module. Match domain,
repositories, calendar/evidence/rival, Rewards, Growth/PR/OVR, Coach, Session, Career,
Season, card rules and progression-presentation consumption remain byte-identical.

## Exact verification

- `npm test`: **455 passed, 0 failed** (451 existing + 4 focused audit tests).
- Focused `node --require ./tests/register.cjs --test tests/match-integration-audit.test.cjs`:
  **4 passed, 0 failed**. Existing tests/assertions were not weakened or removed.
- `npm run typecheck`, `npm run lint`: passed; no errors/warnings.
- `env -u NO_COLOR CI=1 npx expo export --platform all --max-workers 1
  --output-dir /tmp/ascend-4c5-export`: passed; iOS/Android Hermes bundles + 13 web routes.
- New `browser-match-integration`: passed full loop, frozen timezone/long-name/expiry
  and ownership-hydration scenarios; no browser page exceptions.
- All **18 existing production browser suites passed** sequentially on the final
  export (exit 0): Match resolution, Match rewards, Match history, cinematic (all
  14 scenarios), workout rewards, Career, Seasons, localization, presentation,
  cards, Growth, records, input, audit/custom CRUD, overlays, sessions, Coach and
  localization polish. Existing assertions were retained without edits in this audit.
- New integration browser was rerun with 1.5× font **and line-height** scaling of
  long Club/Rival names at 320px before expiry. It passed; the long-name and expired
  pre-match screenshots were visually inspected. No horizontal overflow/page errors.
- Existing development `browser-growth-debug` passed (exit 0): open/refresh performs
  zero storage writes, exact decimal ratings and event data remain unchanged,
  missing/corrupt/retry states work, 320/390px pass and production entry is absent.
- Total browser coverage: **19 existing suites** (18 production + 1 development)
  plus the new full-loop integration suite. No existing browser suite was skipped.
- Development Metro retained the previously documented SVG `accessible={false}`
  non-boolean Web attribute warning from `components/ui/icon.tsx`, and
  NO_COLOR/FORCE_COLOR notices. These are not new Match/storage failures; the Debug
  suite passed with no page exceptions. No dependency or shared SVG accessibility
  behavior was changed to suppress unrelated warnings. Typecheck/lint/export have
  no new warnings.
- `git diff --check`: passed.

QA uses external `/tmp/ascend-polish-qa` Playwright/Prettier and isolated browser
storage, never phone records. NODE_PATH/PLAYWRIGHT_BROWSERS_PATH reference that
installation; ASCEND_QA_URL references the local production export. Root restart
uses `/` because the simple test server lacks extensionless route fallback.

## Remaining limitations and assessment

**PASS WITH LIMITATIONS**: tested domain/repository/browser behavior is internally
consistent, with the three concrete presentation safeguards fixed. No serious issue
requiring a schema migration or product-rule change was identified.

- No physical iPhone, simulator or Hermes execution was performed. User-reported
  smoke testing is acknowledged; native READY → PLAY → result → reward remains
  **not explicitly verified**, as do VoiceOver, Dynamic Type and actual insets/FPS.
- Same-process/shared-adapter queues are not cross-tab/process/device transactions.
  AsyncStorage durability is assumed; no server clock, fsync, cloud recovery or
  clock-tampering protection exists.
- A failed expiration write followed by external clock rollback cannot prove an
  unsaved observation. A persisted skip remains terminal. Rare IANA midnight cases
  fail closed; native Intl/IANA behavior still needs device evidence.
- Frozen week-end snapshots are never rewritten by late imports. Missing/damaged
  historical evidence blocks capture; there is no silent fallback or repair UI.
- Some fresh workout reward/Season intents are in memory until commit; termination
  before commit may lose that association/reward opportunity under existing policy.
  Saved completed Match rewards instead recover automatically from durable results.
- No persistent cinematic resume/replay. Close/termination after save loses playback,
  not result/payment eligibility. No cross-key atomic transaction is claimed.

## iPhone smoke-test checklist

1. Preserve real data; `cd my-app` → `npx expo start --go --lan` → compatible Expo Go.
2. Verify OVR/PR/Growth, Club, Coins, Season and workout history are unchanged.
   Check EN/JA; saved Match week/window displays must agree between panel/history.
3. Complete normal training when appropriate. Check ordinary Daily/Weekly Coins and
   Season/workout counts; no extra exercise or fabricated evidence is needed.
4. When a genuine Match is READY, inspect pre-match frozen values and close without
   confirming. Reopen, confirm once; check VS → simulation → result → report and
   exact WIN 25 / DRAW 15 / LOSS 10 confirmed payment. Record this native path explicitly.
5. Check SKIP/background/close on eligible future Matches, then navigate/reload/restart:
   same saved result, no duplicate payment or automatic cinematic replay. SKIPPED
   remains non-loss/unpaid. Do not change the actual phone clock to force boundaries.
6. Open history and actual Season detail. Verify factual powers/payment and live
   Monday-month Match statistics without changed frozen OVR/workout snapshots.
7. Check larger Dynamic Type, VoiceOver outcome announcement, Reduce Motion, long
   names, scrolling, fixed CLOSE/SKIP/BACK and safe areas on a small iPhone.

Deliberate clock/error/ownership scenarios are isolated automated fixtures only.
Stop after Phase 4C.5. No SHOP spending, AVS, transfers or subsequent phase begins.
