# Phase 4C-2A — Match Resolution & Lifecycle

## Scope and entry point

CAREER now contains a compact Weekly Rival Match panel showing the two most recent
actual records (current training week and previous Match where available). It shows
the saved Rival, derived lifecycle, manual PLAY MATCH only when READY, and the saved
outcome/powers after successful persistence. English/Japanese labels are provided.
There is no cinematic, full Match History screen, Season Match UI or reward display.

Inspected AGENTS.md, the Expo SDK 57 reference, all Phase 4C-1 modules/tests, root
Provider order and existing gameplay/persistence interfaces before editing. No
contradiction with the supplied 4C-2A specification was found. No dependencies added.

## Lifecycle and persistence

`matchStatus(match, now)` derives UPCOMING before the saved unlock boundary,
PENDING_EVIDENCE when a usable immutable snapshot is missing, READY within the
playable window, COMPLETED for a durable result, and SKIPPED at/after the saved
exclusive expiration. A future capturedAt after a device clock rollback cannot
make the snapshot immediately playable. Completed results always remain completed.

An optional `skippedAt` observation is added to the existing version-1 Match model.
It is written once when refresh or manual PLAY observes expiration, including when
evidence is missing. This narrowly scoped terminal marker is necessary to prevent
clock rollback from reviving an already-observed expired Match. Missing skippedAt
remains valid for all 4C-1 records. Expired matches are not given invented outcomes
or late snapshots. Existing saved snapshots are never replaced.

`MatchRepository.play(owner, id)` copies ownership input, enters the existing shared
adapter queue, rereads/validates durable state, verifies ownership, then samples its
injected clock. Eligibility is rechecked here, independently of UI state. No current
Player rating, PR or randomness is used for resolution:

- Player power = saved weekEnd OVR + saved Weekly Bonus.
- Rival power = saved Rival OVR + saved Rival Condition.
- Greater/equal/lower gives WIN/DRAW/LOSS.

`result` contains `id`, `matchId`, `resolvedAt`, `outcome`, `playerMatchPower` and
`rivalMatchPower`. Stable identity is JSON `[matchId,"result"]`; matchId identifies
the containing fixed Rival/week-end snapshots. Validation checks powers, outcome,
identity and resolution time (unlock inclusive, expiration exclusive, no earlier
than snapshot capture). A result and skippedAt cannot coexist. rewardDelivery stays
null; non-null values are rejected. No other storage schema/key is changed.

The complete validated document is written once before publishing completion.
Repeated/concurrent PLAY requests reread the saved result and do not write another
outcome. Lost acknowledgments surface an error; retry/load recovers the original
saved result, even after expiration, without recalculation. Failed writes do not
publish completion or roll back unrelated evidence. Corruption/version errors
preserve raw storage. There is no reset/migration/backfill.

The MatchProvider exposes `play`, `playing` and `status`, alongside existing data,
pending evidence and retry. A synchronous action lock prevents duplicate UI taps;
normal hydration/ownership guards remain. Periodic/startup/foreground refresh never
resolves a Match. It may generate the eligible current week's Rival, freeze valid
week-end evidence or mark expiration, as appropriate. No new Growth reconciliation
path is introduced. Older refresh publications are suppressed while PLAY is pending.

## Adaptive generation

Generation now reads authoritative completed results from the validated Match
repository, scoped to its existing Player/Career ownership. Sort by resolvedAt
newest first with the existing stable ID tie-break, take at most five, count WINs:

| Wins | Underdog | Even | Challenger |
| --- | --- | --- | --- |
| 0–2 | 25 | 50 | 25 |
| 3–4 | 20 | 50 | 30 |
| 5 | 15 | 45 | 40 |

SKIPPED and unresolved records have no completed result and are excluded. Fewer
than five uses available results only. OVR difference/Condition distributions and
Rival visuals are unchanged. Frozen generation references are validated against
saved completed results, their ownership/time and weights. Existing generated
Rivals keep their original evidence; later plays never reroll them. Corrupt Match
storage blocks operations rather than selectively discarding user records.

The current week's Rival can already have been generated before the player plays
last week's Match; its frozen weights correctly remain unchanged. A later newly
generated Rival can use the newly completed result.

## Files

- `src/matches/domain.ts`: result type/validation, lifecycle, deterministic resolution,
  adaptive authoritative history and frozen reference validation.
- `src/storage/match-repository.ts`: serialized manual play, injected clock, terminal
  expiration observation and no late evidence capture.
- `src/matches/provider.tsx`: safe manual action, in-flight UI state and lifecycle.
- `src/components/career/matches.tsx`: minimal manual panel.
- `src/app/(tabs)/career.tsx`: panel replaces obsolete Match Coming Soon entry.
- `src/localization/locales/en.ts`, `ja.ts`: new semantic Match keys.
- `tests/match-resolution.test.cjs`, `tests/browser-match-resolution.cjs`: isolated QA.
- `tests/matches.test.cjs`: replaces the old post-expiration late-snapshot expectation
  with stronger assertions for SKIPPED, a durable marker and no invented snapshot.

## Verification

- `npm test`: **358 passed, 0 failed** (321 existing + 37 new resolution tests),
  exit 0. Includes existing PR/Growth, Rewards/Coins, Career, Season, Training,
  localization, presentation consumption and read-only Growth Debug regressions.
- `npm run typecheck`: passed, exit 0.
- `npm run lint`: passed without warnings/errors, exit 0.
- `git diff --check`: passed.
- `env -u NO_COLOR CI=1 npx expo export --platform all --max-workers 1
  --output-dir /tmp/ascend-match-resolution-export`: final rerun passed, exit 0;
  iOS/Android Hermes bundles and 13 static web routes. No new warnings reported.
- `tests/browser-match-resolution.cjs`: passed on the final production export with
  isolated storage and an injected browser clock. Verified actual CAREER manual
  PLAY, Match-only write failure/non-destructive retry, persisted powers/outcome,
  no replay after root restart/navigation, and byte-identical unrelated storage.
  320px, reduced motion and 1.5x text approximation had no horizontal overflow or
  page exceptions. The enlarged-text Match screenshot was visually inspected.
- Browser tools use existing external `/tmp/ascend-polish-qa` Playwright/browser
  installations, not an app dependency. Use `NODE_PATH` and
  `PLAYWRIGHT_BROWSERS_PATH` for that directory, and `ASCEND_QA_URL` for the local
  export server. Full legacy browser suites were not rerun in this phase; the
  complete existing unit suite was run.
- An early browser attempt overlapped export output rebuilding and was interrupted.
  The simple static server also lacks extensionless `/career` reload fallback;
  the final test restarts through `/` with unchanged storage, as previous QA did.
  These were test-host issues; no production behavior was changed for them.
- Final diff contains only Match domain/repository/provider, its compact Career UI,
  translation keys, tests and this report. PR/Growth/Session/Coach/Rewards/Season
  algorithms/repositories and presentation consumption remain unchanged.

New tests cover lifecycle endpoints, final-millisecond play, expiration before
or after missing evidence, durable skip after clock rollback, DST/fixed boundaries,
WIN/DRAW/LOSS and exact powers, no unrelated writes, repeat/concurrent play across
Repository instances, reload, write/read validation and lost acknowledgment,
legacy null results, malformed result/snapshot/ownership, startup refresh without
resolution, frozen generation and newest-five mixed outcomes/weights.

An initial DST lifecycle fixture reused an October snapshot capture time while
substituting a March week. The new future-capture guard correctly rejected it.
Corrected the fixture timestamp and added a dedicated future-capture test; no
production validation was weakened. Automated fixtures never write real phone data.

## Limits and iPhone checks

No native iPhone/Hermes execution is claimed. Exported bundles are not native runtime
verification. No cross-process/storage-adapter transaction lock or clock-tampering
protection is introduced. An observed expiration remains terminal after successful
marker persistence; a storage failure plus subsequent external clock rollback cannot
be reconstructed without durable evidence. Errors suppress writes/publication and
preserve saved data. Calendar/Intl native compatibility remains a device check.

1. Run `cd my-app` then `npx expo start --go --lan`; open compatible Expo Go without
   resetting existing data.
2. Open CAREER after Player initialization and Club selection. Check the real Rival
   and UPCOMING label; no PLAY button during its training week.
3. On the following Monday, READY shows PLAY MATCH after evidence is saved. If
   pending, resolve the existing Player/session error and use retry; do not invent
   workout evidence or change the real device clock.
4. Tap PLAY MATCH once. Check the persisted WIN/DRAW/LOSS and powers. OVR, PRs,
   Coins, Club, Season and workout history must not change from this action.
5. Navigate/reload/restart: same outcome, no replay action and no additional awards.
6. Leave a later Match unplayed through its deadline: SKIPPED, no loss or payment,
   and no PLAY even after delayed Growth becomes available.
7. Check Japanese/English, large Dynamic Type, VoiceOver, reduced motion, small
   screens and reachable actions. Browser text scaling is not native verification.

Do not fabricate real workout history to force outcomes or alter the phone clock.
Boundary and persistence-failure scenarios use isolated automated fixtures.
Coins payment, Rewards schema changes, Cinematic Hybrid and full Career/Season
Match History remain unimplemented. Stop after Phase 4C-2A.
