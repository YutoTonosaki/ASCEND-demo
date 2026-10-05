# Phase 4B — Monthly Season System

## Implemented and architecture

CAREER supports explicit START SEASON, active statistics, later-month COMPLETE
SEASON and permanent history/detail. HOME shows the same factual Season identity
and compact counts; the former mock Season/Rival presentation is removed. No large
PLAYER dashboard, Match, Rival generation, transfers, trophies or rewards are added.

SeasonsProvider is inside CareerProvider (already inside GrowthProvider), outside
RewardsProvider and GrowthPresentationProvider. Existing provider order otherwise
remains intact. LiveWorkout submits an independent, non-blocking association only
after its normal completed-session save and existing reward/presentation request.
No new dependency, reconciliation call or change to physical progression exists.

## Files

- `src/seasons/calendar.ts`: captured local day/month and offset validation.
- `src/seasons/domain.ts`: lifecycle, snapshots, ownership, evidence and validation.
- `src/storage/seasons-repository.ts`: queued isolated whole-document persistence.
- `src/seasons/provider.tsx`: explicit actions, calendar refresh, pending retry.
- `src/components/career/seasons.tsx`: current Season, history/detail and HOME row.
- Root layout, CAREER, HOME and LiveWorkout integrate the above.
- `tests/seasons.test.cjs`, `tests/browser-seasons.cjs`: isolated automated QA.
- Root README, Product Spec, Game System section 52 and Roadmap document the rules.

## Storage, identity and snapshots

`ascend.seasons.v1` stores `{version:1,seasons:[]}`. Each Season contains:

```
id, number, monthId, playerId, careerStartedAt,
start: {at, localDay, monthId, offsetMinutes},
club: copied complete Club catalog value,
startingPlayer: {ratings, ovr, tier, finish},
evidence: [{sessionId, at, localDay, monthId, offsetMinutes, prSetIds}],
end: null | {calendar, player: {ratings, ovr, tier, finish}, stats}
```

ID is JSON `[playerId, careerStartedAt, monthId]`. Season numbers are contiguous
actual records beginning at 1; unique month IDs may have gaps. Only the last Season
can be active. Contradictory identity, numbering, chronology, snapshots, calendar
context or frozen statistics fail validation. Status derives from end, not a second
mutable field. Duplicate start/close/evidence requests do not duplicate records.

Club snapshots contain ID, names, country/environment/league, reputation, colors,
crest configuration and other existing metadata. They render independently of the
future catalog. Player snapshots preserve fractional six-body ratings and existing
`overall()`/card-domain outputs. No alternative OVR or tier formula is introduced.

START requires the existing valid Career/Player and captures saved Provider values
at the explicit action. COMPLETE requires a later local month and freezes saved
Player values and factual associated counts. Delayed completion uses current saved
values supplied at that action, **not** a guessed month-end value. Later growth or
catalog edits cannot rewrite completed records. October → January produces Season
01 October and Season 02 January; no November/December records are invented.

## Calendar and statistics

Local getters resolve canonical `YYYY-MM` and `YYYY-MM-DD`; UTC slicing does not
choose membership. Captured offset validates each historical wall date. Stored
associations never move after timezone changes. Current availability uses today's
device-local month, refreshed on foreground/every 30 seconds. This refresh is UI
only: no automatic start, close, reward or storage write.

Only fresh successful LiveWorkout completion submits evidence. The completed
session must match the durably committed history supplied by the existing session
repository. The active Season must contain its captured completion month/time.

- Workouts: unique associated completed session IDs.
- Training days: distinct captured local dates; not consecutive days or a streak.
- PR improvements: existing Phase 3A comparison output, one confirmed set with any
  `improved` metric counted once. Source ID = JSON `[sessionId,entryId,setId]`.
  Multiple weighted metrics do not inflate the count; first/equal/lower and
  pre-Season confirmations do not count. Earlier history can supply comparison
  references without itself becoming Season evidence.
- Current OVR: existing saved Growth Player. Delta is current displayed OVR minus
  starting displayed OVR. Final OVR/statistics are immutable close snapshots.

No workout/PR database is copied. Stored evidence contains only identities/calendar
context; transient retry holds a detached completion/history snapshot in memory.
Old workouts, opening history/HOME/PLAYER/CAREER and startup never submit evidence.

## Failure behavior and limitations

Repository operations serialize fresh read/validate/whole-document write, and only
write the Season key. Missing storage reads empty without writing. Corrupt/newer or
unreadable storage is preserved; UI reports an error rather than pretending empty.
There is no reset UI. Failed start/close leaves the prior durable state unchanged.
Retry can reread and idempotently associate pending completion evidence.

Workout/PR/Growth/Coins/presentation saving never depends on Season success. Season
start/close does not create growth/rewards or consume presentation IDs. Pending
Season errors must be resolved before lifecycle mutations proceed.

Termination before successful evidence association may lose that association;
restart does not scan history or invent a callback. The workout remains saved.
There is no durable outbox, cross-instance locking, cloud recovery or clock-tamper
protection. Snapshots observe saved state, not pending future Growth results.
A development Season Debug panel was optional and is not added; existing Growth
Debug remains unchanged and read-only.

## Verification

- `npm test`: **267 passed, 0 failed** (220 existing + 47 Season tests).
- `npm run typecheck`: passed. `npm run lint`: passed with no warnings.
- `env -u NO_COLOR CI=1 npx expo export --platform all --max-workers 1 --output-dir /tmp/ascend-seasons-export`:
  passed; iOS/Android bundles and 13 static web routes generated.
- `browser-seasons`: passed explicit start/failure/retry/double tap, real completion
  association (3 workouts / 2 days / 2 improved sets), reload, HOME agreement,
  immutable close snapshots, January return from October, contiguous next Season,
  history/detail and corruption preservation. Unrelated storage remains unchanged
  by lifecycle actions. 320px/reduced motion and 1.5× text approximation passed
  without horizontal overflow or browser page exceptions. Both screenshots were
  visually inspected. Native Dynamic Type is not simulated by browser font scaling.
- Development `browser-growth-debug`: passed, including zero writes on open/refresh,
  unchanged data, error/retry, 320/390px and production debug-entry absence.
- Full production browser regression passed: `browser-growth`, `browser-records`,
  `browser-input`, `browser-audit`, `browser-overlays`, `browser-sessions`,
  `browser-coach`, `browser-presentation`, `browser-cards`, `browser-rewards`
  and `browser-career`. All eleven scripts completed with exit code 0, retaining
  existing assertions. The overlay suite checks simulated safe areas; physical
  iPhone safe areas and native accessibility still require the checks below.
- `git diff --check`: passed. Relative to the pre-Season commit, production PR,
  Growth, Rewards, presentation, card-domain, Coach and Career modules and the
  Player/session/Career repositories are unchanged. LiveWorkout only adds the
  independent Season association call.
- The first new browser attempt began before export finished and timed out waiting
  for HOME; rerun after export completed passed. No product changes were needed.
- Development Metro retains the known SVG `accessible={false}` React warning,
  NO_COLOR/FORCE_COLOR notices and an Expo patch-update advisory. No dependencies
  were upgraded for unrelated advisories; final type/lint/export has no new warnings.
- QA tooling is external: `NODE_PATH=/tmp/ascend-phase4b-qa/node_modules`,
  `PLAYWRIGHT_BROWSERS_PATH=/tmp/ascend-phase4b-qa/browsers`, `ASCEND_QA_URL` to a
  served production export. Growth Debug uses a development Metro URL and
  `ASCEND_QA_PROD_URL` to the production export. No real phone data was modified.
- Physical iPhone testing has **not** been performed for Phase 4B.

## Physical iPhone Expo Go checks

1. From the repository root run `cd my-app`, then `npx expo start --go --lan`.
   Open the development bundle in compatible Expo Go on the same Wi-Fi. Preserve
   existing real data; do not reset storage or fabricate exercise results.
2. Check saved workouts/history/PRs, Player OVR/tier, Club, Coins and Growth Debug.
   CAREER/HOME must not create a Season merely by opening. Without Career, finish
   the existing explicit Club onboarding first; no implicit Player/Club is created.
3. CAREER → START SEASON. Check SEASON 01, actual local month, selected Club and
   current saved starting OVR. Start changes neither Coins nor physical Ratings.
   Reopen/reload: one active Season, no same-month START or COMPLETE action.
4. Complete genuine workouts normally. Check completed workout count, distinct
   local training days and actual improved-set PR count. Two workouts on the same
   day count two workouts but one training day; first records are not improvements.
   Equal/lower results still count as workouts. PR/Growth/Coins/presentation retain
   their ordinary behavior. HOME must agree with CAREER.
5. Expo Reload/restart and open history/PLAYER/debug: no duplicated evidence or
   retroactive Season, unchanged saved workout and progression data.
6. In a later real month, CAREER shows MONTH ENDED and COMPLETE SEASON. Close it,
   inspect immutable history/detail, then explicitly start the current month.
   A delayed close captures current saved ratings, as explained on screen. Returning
   after several months creates only the next actual Season, not skipped records.
   Do not change your real phone clock to force this; isolated tests cover it.
7. Check safe-area clearance, scrolling, CLOSE/action reachability, VoiceOver,
   Reduce Motion and larger system text on a small iPhone. Browser font scaling is
   not native Dynamic Type verification.

Corruption/failure scenarios use isolated automated fixtures, never real phone data.
Phase 4C may consume these immutable Season identities/snapshots/evidence. No Match,
Rival, transfer, trophy, Season Card or Season reward implementation begins here.
