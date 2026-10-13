# Phase 4C-2B — Match Reward Integration

## Audit and scope

Inspected the actual Rewards domain/parser/repository/provider, Match domain,
repository/provider/panel, storage adapter, root Provider order, Coins consumers,
and existing failure fixtures before editing. Followed AGENTS.md and read the
Expo SDK 57 reference. Preserved the existing uncommitted Phase 4C-2A implementation,
its report and unrelated work. No dependency or platform configuration change.

Findings:

- Rewards v1 strictly replays workout receipts; arbitrary appended transactions are
  invalid. Existing transactions and receipt ordering must be preserved.
- Match already has immutable validated completed results and an adapter-wide queue.
  Rewards previously had only a per-Repository queue, allowing competing instances
  to overwrite each other's updates. No cross-key atomic transaction exists.
- HOME and SHOP use the same CoinBalance/RewardsProvider. PLAYER has no independent
  balance to replace. Normal workout summaries use the same reward state.
- RewardsProvider is outside MatchProvider but inside Career/Growth. It can recover
  saved Match rewards without depending on MatchProvider or visiting CAREER.

Only saved WIN/DRAW/LOSS results are paid: **25 / 15 / 10 Coins**. Unresolved or
SKIPPED records receive nothing. No participation addition, difficulty multiplier,
CLAIM, OVR growth, PR bonus or workout eligibility change. Existing 4C-2A completed
Matches are deliberately eligible for one automatic payment. Unvisited weeks and
unresolved Matches are never generated/resolved by reward recovery.

## Schema and compatibility

Keep key **ascend.rewards.v1**. Read schema versions 1 and 2. Ordinary missing reads
remain an empty version-1 value with zero writes. Existing workout-only records
remain version 1 until a real Match payment requires version 2:

```
{ version: 2, receipts: existingWorkoutReceipts,
  transactions: [existingWorkoutTransactions, ...matchTransactions] }
```

The discriminated transaction union preserves the existing Daily/Weekly types and
adds `match-result` with:

```
id, type, matchId, resultId, playerId, careerStartedAt,
outcome, amount, resolvedAt, createdAt
```

Reward ID is JSON `["match", matchId, "result"]`. Result ID reuses the existing
`resultId(matchId)`. Match ID encodes the existing Player/Career/target-week identity.
Amounts come only from central `MATCH_REWARD_COINS` and a validated saved outcome.
createdAt is the injected award clock; resolvedAt retains the factual result time.
A clock preceding resolution blocks new payment rather than inventing a timestamp.

`parseRewards` still replays all workout receipts and compares the entire ordered
workout transaction subsequence exactly. It separately validates Match identities,
ownership components, result reference, outcome/amount and canonical timestamps.
It rejects duplicate IDs/Match payments, unsupported types, malformed/negative/wrong
amounts and unsafe balances. Match records cannot be smuggled into schema 1.

Repository reads/writes containing Match payments additionally validate them against
actual durable Match results, including ownership, outcome and resolvedAt. Structural
transaction validity alone is not evidence of a completed Match. Corrupt/missing
Match evidence blocks unsafe publication/payment without discarding records.

Balance remains the safe-integer sum of all validated transactions, with no separate
mutable balance. Match payments do not create workout receipts or change local-day/
weekly identities. sessionRewards explicitly selects workout transactions only.
Existing receipt values, transaction IDs and chronological array positions are
retained; new records append. No migration-on-read, reset, backup replacement or
unnecessary historical rewrite. Unsupported schema 3+ remains untouched.

Older application binaries that understand only schema 1 cannot read schema 2;
rolling back to those binaries is unsupported and must not overwrite the ledger.

## Delivery and concurrency

`RewardsRepository.reconcileMatches(owner)` executes within the shared adapter lock:

1. Reread/validate durable Match storage and ownership.
2. Reread/validate Rewards and every existing Match-payment reference.
3. Derive missing payments from actual completed results and deterministic IDs.
4. Validate and write the whole Rewards document once (including all due payments).
5. Reread and validate the durable document before publishing the new balance.

If all payments are settled, no write or timestamp replacement occurs. Missing stores
without payable results remain unwritten. There is no freely supplied amount API.

Delivery is **derived** from the saved result plus a validated Rewards transaction.
The existing `Match.rewardDelivery` stays null, including after payment. No Match-side
acknowledgment is needed or written. This is a deliberate read-model extension that
eliminates the crash window between payment and acknowledgment; it does not treat a
UI callback or the null field as proof that payment is due. Match schema, result,
Rival, week boundaries, goal and OVR snapshots remain unchanged. Paid/unpaid/error
status is displayed by joining the existing result with RewardsProvider data.

`src/storage/queue.ts` supplies one WeakMap queue shared by all MatchRepository and
RewardsRepository instances using the same StorageAdapter object. Load, workout
award, Match play/refresh and Match reward reconciliation serialize through it.
Inside the lock, operations use raw adapter I/O and pure validators, never enter
another Repository method/lock. There is no lock-order inversion or nested locking.

This provides an exactly-once durable reward effect for the supported shared-adapter
single-process app. It does not claim distributed exactly-once execution, cross-tab/
cross-process exclusion, or locking between different adapter wrapper objects. The
underlying AsyncStorage durability model still applies; no filesystem fsync/server
transaction guarantee is invented.

## Recovery and Provider integration

- Startup and foreground: RewardsProvider automatically reconciles after valid
  Growth/Career identity hydration, without opening CAREER.
- PLAY: MatchProvider requests independent reconciliation after the operation,
  including a possible successful save whose acknowledgment was lost.
- Newly detected completed-result IDs trigger a check; IDs, not mutable Rewards
  state, drive the effect. No new polling or data/error feedback loop is introduced.
- Explicit Rewards retry reloads the ledger, retains existing workout retry behavior
  and reconciles earned Match rewards.

Match result without payment recovers on startup/foreground/retry. Payment saved
with lost acknowledgment recovers by rereading the existing transaction, without a
second credit. A confirmation-read failure likewise retains durable payment and
retries safely. No Match acknowledgment write can fail because none is required.

Reward failure never rolls back a completed Match or workout. No optimistic balance
or saved-payment label is published. Existing Rewards unavailable/retry controls and
compact localized Match reward feedback surface failures. Corrupt/newer data is
preserved; there is no automatic repair/reset or false zero balance. No full report,
transaction history, cinematic, Season Match UI or Shop spending is added.

## Files for this phase

Added:

- `src/rewards/matches.ts`: typed Match transaction, identity, source cross-validation,
  fixed-amount derivation and missing-payment reconciliation.
- `src/storage/queue.ts`: shared adapter serialization.
- `tests/match-rewards.test.cjs`, `tests/browser-match-rewards.cjs`.
- This verification report.

Updated:

- `src/config/rewards.ts`, `src/rewards/domain.ts`, `src/storage/rewards-repository.ts`.
- `src/rewards/provider.tsx`, `src/matches/provider.tsx`.
- `src/storage/match-repository.ts`: uses shared queue; result/lifecycle logic unchanged.
- `src/components/career/matches.tsx`, English/Japanese semantic keys.
- `tests/rewards.test.cjs`: newer-schema rejection fixture moves from newly supported
  version 2 to unsupported version 3, retaining preservation assertions.
- `tests/browser-match-resolution.cjs`: retains original resolution assertions and
  adds exact +10 payment verification instead of the obsolete no-reward expectation.

The pre-existing 4C-2A Match domain, Career entry integration, tests and report are
retained. No PR/Growth/Session/Coach/Career/Season calculation or repository, card
rules or progression-presentation consumption change is made in this phase.

## Verification

- `npm test`: **403 passed, 0 failed** (358 existing + 45 Match reward tests), exit 0.
- `npm run typecheck`: passed, exit 0.
- `npm run lint`: passed without warnings/errors, exit 0.
- `git diff --check`: passed.
- Expo production export for iOS/Android/web: passed, 13 static web routes generated
  under `/tmp/ascend-match-rewards-export`. Hermes bundles are build artifacts, not
  native runtime testing.
- `tests/browser-match-rewards.cjs`: passed on the final production export with
  isolated storage/time. Covers startup payment without CAREER, real manual PLAY,
  Reward-only write failure/retry, lost acknowledgment, corruption preservation,
  foreground-only recovery without a retry tap, combined HOME/SHOP balances,
  navigation/root restart, immutable Match/source bytes and no duplicate payments.
- Existing `browser-match-resolution.cjs`: passed with stronger exact-payment
  assertions while retaining resolution, failure/retry and persistence checks.
- Existing `browser-rewards.cjs`: passed unchanged: first-day +10, same-day zero,
  third-day +40, capped days/new week, balance agreement, history/reload isolation,
  failure/retry and corruption handling.
- Browser checks use 320px, Reduce Motion and a 1.5x text approximation, with no
  horizontal overflow or page exceptions. Visually inspected the enlarged Match
  reward status screenshot. Native Dynamic Type/safe areas remain unverified.
- Other legacy browser suites were not rerun in this phase; all existing unit tests
  were run. No native iPhone/Hermes execution is claimed.
- Existing external Playwright tooling: `NODE_PATH=/tmp/ascend-polish-qa/node_modules`,
  `PLAYWRIGHT_BROWSERS_PATH=/tmp/ascend-polish-qa/browsers`, `ASCEND_QA_URL` pointing
  to the served final export. No QA dependency is added to the app. Browser restart
  uses `/` with unchanged storage because the simple static server has no
  extensionless `/career` fallback. Corruption recovery restores only isolated
  fixture bytes externally; no production repair/reset control was added.

Tests cover exact amounts/non-eligibility, legacy v1 compatibility and deliberate
v2 extension, unchanged Daily/Weekly rules, combined balance, detached values,
old completed/null-delivery recovery, repeat/concurrent/remount/restart processing,
concurrent PLAY/workout awards, write/read failures, lost acknowledgments, confirmed
readback, no Match acknowledgment dependency, corruption/version/ownership/source
rejection, duplicate IDs/payments, and unchanged unrelated storage. All existing unit
regressions remain green. Synthetic schema-valid participation snapshots and isolated
storage are QA evidence only; no production workout data was fabricated or edited.

An initial lint check flagged synchronous effect publication analysis and a misplaced
import. Startup synchronization is now explicitly asynchronous and the import is
ordered normally; no lint rule was disabled. No unrelated dependency upgrade.

## Physical iPhone verification and limitations

No physical iPhone/Hermes runtime verification was performed. The user's earlier
smoke test verified Rival generation/UPCOMING/persistence, not native READY/PLAY or
these new rewards. Browser text scaling/visibility events are not native Dynamic
Type/AppState/VoiceOver verification.

1. Preserve real data. Run `cd my-app` then `npx expo start --go --lan`, open Expo Go.
2. If a genuine earlier Match is completed, verify its exact Coins arrive on HOME
   without opening CAREER or tapping CLAIM. HOME/SHOP balance must agree.
3. When a genuine weekly Match is READY, PLAY once. WIN/DRAW/LOSS should add exactly
   25/15/10 Coins and show saved reward feedback after durable payment. No Rating,
   PR, OVR, Club, Season or workout history should change from Match payment.
4. Navigate, Expo Reload, restart and background/foreground: no additional payment.
   SKIPPED/unresolved Matches must not pay. Do not alter real device time to force it.
5. Complete normal training: Daily +10/weekly three-day +30 rules remain unchanged
   and add to the same total. No extra exercise is required merely to test rewards.
6. Check Japanese/English, large Dynamic Type, VoiceOver, safe areas and scrolling.
   Do not corrupt/reset actual phone data to simulate failures; isolated tests do so.

Payments require valid original Match evidence and Player/Career ownership. Corrupt
or missing evidence stays blocked until valid data is restored; no manual repair,
account switching, cloud recovery, clock-tamper protection or cross-process lock.
Cinematic, SHOP spending, full Match History and Season Match UI remain unimplemented.
Stop after Phase 4C-2B; do not begin 4C-2C/4C-3.
