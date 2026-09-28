# Phase 3C-3 — Consistency Rewards

## Implemented

Fresh, durably saved LiveWorkout completions award Daily Workout +10 Coins once
per device-local calendar day. The third distinct qualifying day in a Monday–Sunday
week adds +30 once. Additional same-day sessions add zero; additional days retain
the daily 10 but weekly target display stays at 3/3. PRs, growth, OVR and Card Tier
are neither requirements nor outputs of Coins. No streak or rest-day penalty exists.

HOME shows actual Coins and weekly days. SHOP shows the same balance and states
that Coins cannot be spent yet. The factual saved workout summary shows daily,
weekly, total earned, or independent retryable reward failure. Historical summaries
can read an existing receipt but never create one. No additional full-screen reward
presentation, dependency, inventory, purchase or Phase 4 feature is introduced.

## Files

- `src/config/rewards.ts`: centralized 10 / 30 / 3 constants.
- `src/rewards/domain.ts`: calendar helpers, receipt/transaction types, eligibility,
  identity, balance, weekly progress and conservative ledger validation.
- `src/rewards/controller.ts`: fresh completion intents and one initial settlement.
- `src/storage/rewards-repository.ts`: serialized, independent atomic document writes.
- `src/rewards/provider.tsx`: persisted state, pending requests and explicit retry.
- `src/components/rewards/rewards.tsx`: balance, weekly days and completion details.
- Root layout, LiveWorkout/summary, HOME and SHOP integrate these components.
- Removed unused mock credit balance from `src/data/mock.ts`.
- `tests/rewards.test.cjs`, `tests/browser-rewards.cjs`; Card Evolution browser
  coverage additionally asserts zero historical rewards and no post-evolution replay.
- README, Product Spec, Game System section 50 and Roadmap updated.

## Storage and idempotency

`ascend.rewards.v1` stores `{version:1, receipts:[], transactions:[]}`. A receipt
contains `sessionId`, nullable audit `playerId`, `completedAt`, `localDay`, Monday
`weekId`, and `offsetMinutes`. Zero-award completions also receive receipts. A
transaction adds `id`, `type` (`daily-workout` or `weekly-consistency`), integer
`amount`, and `createdAt` equal to factual completion time. Balance is derived from
the transaction sum, so no separate stored balance can drift from the ledger.

Daily ID = JSON `["local-player", localDay, "daily-workout"]`.
Weekly ID = JSON `["local-player", weekId, "weekly-consistency"]`.
Session receipt identity additionally prevents the same session being reconsidered
under a changed date/timezone. This single-user app supports workouts before Growth
Player initialization. A stable local-user namespace ensures initializing Player
later does not create another daily allowance. Actual Player ID remains audit data.
No authentication or second Player account is introduced.

The repository queues operations, rereads/validates durable state, then commits the
receipt and all daily/weekly transactions with one AsyncStorage write. Balance is
computed only from that committed document. Daily + Weekly cannot be partially
published by separate writes. Reload/retry sees durable identities. Validation
replays only reward receipts to check transaction amounts and identities; it does
not scan workout history. Missing storage is an empty read with zero writes.
Corrupt/unreadable/unsupported data is preserved and blocks reward writes; UI says
unavailable rather than falsely displaying zero. No repair/reset UI is added.

## Calendar and failure policy

Completion captures the session's factual completedAt using local calendar getters,
plus its timezone offset. Local day never uses a UTC ISO slice. Monday's date is a
canonical week identity across month/year/ISO-year/leap boundaries, calculated with
calendar fields rather than epoch-week division. Stored day/week values are never
reinterpreted. Current-week UI uses the current device timezone, refreshing on
foreground and every 30 seconds. Travel may change the visible current week, but
never moves or duplicates an existing transaction. New distinct local dates can
qualify; there is no clock-tampering protection or retroactive timezone migration.

Only a fresh completion callback creates an in-memory request. Old sessions,
startup, remount, history, PLAYER and debug reads create none. An already-active
workout can qualify when completed. No launch-date cutoff or historical scan exists.
The request waits for ordinary persisted Growth finalization, or absence/error of
Growth, before attempting Coins. Settlement releases the existing presentation
request once, even when reward storage fails. It never calls Growth reconciliation
or changes its retry path. Factual workout saving/summary occurs first.

Failed award writes leave workout/Player data intact and cannot claim earned Coins.
Explicit retry rereads storage and retries the same captured request while this
process remains alive. Termination before commit can lose that reward opportunity;
restart deliberately does not invent a historical callback. A successful commit
survives termination and cannot be duplicated. There is no cross-device or concurrent
multi-browser-tab transaction lock; the supported app uses one root repository.
Future reward rebalance/schema changes need explicit compatibility handling.

## Verification

Verification results are recorded below after the final checks.

## iPhone Expo Go verification

Physical-device verification has not been performed for Phase 3C-3.

1. Run `cd my-app` and `npx expo start --go --lan`. Open the development bundle in
   compatible Expo Go on the same Wi-Fi. Preserve all existing phone data.
2. Open HOME and SHOP: first installation of this phase shows zero Coins and 0/3
   days. PLAYER, old history and Growth Debug must not award anything. Existing
   PRs, Ratings, Card Tier and saved workouts must remain intact.
3. Complete a genuine workout, explicitly confirming its final set. Verify it is
   saved normally and its factual result shows Daily +10, weekly 1/3, total +10.
   No PR or growth is required. HOME and SHOP must show the same balance.
4. Complete another normal workout that day only if appropriate for your training:
   expect daily already earned, total 0 and unchanged weekly distinct-day count.
   Rest does not penalize anything; do not add exercise merely to test the UI.
5. On two other normal training days in the same Monday–Sunday week, expect +10
   daily each. The third distinct day shows weekly +30, total +40 for that workout,
   and normally 60 Coins across those three days. A fourth day adds only daily +10.
6. Navigate through PLAYER/history/debug, Expo Reload and restart. Balance remains;
   there is no additional reward. If Rating UP/Card Evolution also occurs, close it
   and confirm normal reward details and no duplicate after reopening/reloading.
7. Next Monday, weekly progress naturally becomes 0/3 while balance/history remain.
   Do not change your real device clock or fabricate history to force boundaries;
   isolated automated fixtures cover midnight, leap years and timezone changes.
8. Check 320-class/small screen behavior, large system text, VoiceOver, Reduce Motion,
   safe areas, scrollability and reachable result/retry controls. Browser font-size
   approximation is not native Dynamic Type verification.

Storage failure/corruption is tested with isolated fixtures. Do not damage or reset
real phone data to test recovery. Coins remain non-spendable. Phase 3C ends here;
Career, Match, Shop purchasing and Phase 4 remain unimplemented.
