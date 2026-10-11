# Phase 4C-1 — Rival Match foundation verification

Date: 2026-10-11 (America/Vancouver)

## Specification and audit reconciliation

Compared the user-provided Phase 4C-0 audit with the actual Session, Growth, Coach, Career, Season, Rewards, storage and root Provider implementations before implementation. The named files, storage keys, Growth replay chain and initialization/finalization guards match the audit. Applied the user's Final Product & Implementation Specification, which supersedes the audit's open product decisions. No blocking contradiction was found for 4C-1.

Final rules applied: each week's first eligible application access (not lifetime-only generation); initialized Player and valid Career/active club; Coach goal snapshot with null/profile-absent fallback 3; positive completed workouts, including workouts before generation; completion-time attribution in the Match's fixed IANA timezone; recorded Growth event time (including later successful persistence); Season association by target Monday's month, with no Season writes in this phase.

Followed the repository AGENTS.md requirement to read https://docs.expo.dev/versions/v57.0.0/ before coding. Added no dependencies.

## Changes

- `src/matches/calendar.ts`: IANA calendar conversion, local Monday week identity, independently resolved start/unlock/expiration UTC instants. No fixed 168-hour assumption. Calendar validation retains historical boundaries; nonexistent/ambiguous local midnight fails closed rather than guessing.
- `src/matches/rival.ts`: UNDERDOG −6…−3, EVEN −2…+2, CHALLENGER +3…+6; OVR clamp 0…99; exact difficulty and Condition weights; most recent five completed references, excluding SKIPPED; detached name, club and appearance generation.
- `src/matches/domain.ts`: independent v1 schema, stable Player/Career/week ID, ownership validation, goal/baseline/club/generation snapshots, fixed Rival, corruption/version/invariant checks.
- `src/matches/evidence.ts`: initial-ratings replay of persisted events before the exclusive boundary using existing `overall()`. Validates Player/Session records, necessary processed sets and completed Session finalization, source identity/value/timestamps, event chronology and change chain. Includes active Session sets for Growth coverage while excluding active Sessions from training days. Missing evidence remains pending. Never calls Growth reconciliation.
- `src/storage/match-repository.ts`: only writes `ascend.matches.v1`; shared adapter queue across repository remounts; re-read/validate before writes; publication after successful persistence; immutable saved week-end snapshots; no missing-week backfill; retryable evidence evaluation.
- `src/matches/provider.tsx`: waits for successful prerequisite hydration; refreshes at startup, foreground, every 30 seconds while active, dependency changes and explicit retry/access. Hides data while prerequisites or ownership/storage are in error.
- `src/app/_layout.tsx`: adds MatchProvider inside RewardsProvider. Existing Provider order is preserved.
- `tests/matches.test.cjs`: calendar, distribution, evidence, ownership, persistence and isolation regression tests.

## Persistence and safety

Existing Player, Session, Coach, Career, Season, Rewards, presentation and training schemas/keys are unchanged. No migration, reset, deletion or historical backfill occurs. The repository has no Match outcome, Coins credit, reward delivery or cinematic API. `result` and `rewardDelivery` remain null and non-null values are rejected in this phase. Existing `docs/PHASE4B5_1_VERIFICATION.md` working changes were left untouched.

Rival is durable before Provider publication. Failed pre-save generation is not displayed. If storage succeeds but its response is lost, the next read reuses the saved Rival. The queue protects instances sharing the application's storage adapter; it does not claim atomic cross-process transactions.

Evidence pending reasons are derived on every refresh, not duplicated as persistent Match state. Immutable saved snapshot references contain IDs rather than copies of entire Growth/workout histories.

## Validation

- `npm test`: **321 passed, 0 failed**, including 27 Match tests and all existing regressions (exit 0).
- `node --require ./tests/register.cjs --test tests/matches.test.cjs`: **27 passed, 0 failed** (exit 0).
- `npm run typecheck`: passed (exit 0).
- `npm run lint`: passed without warnings/errors (exit 0).
- `git diff --check`: passed.

Covered exact Sunday/Monday boundaries, spring/fall DST weeks of 167/169 hours, non-hour timezone offsets, year/leap-day boundaries, frozen timezone attribution, goals 1–7/null and full seven-day counts, same-day deduplication, zero-performance/active/cross-week Sessions, pre-generation completions, post-boundary Growth exclusion, immutable snapshots, missing/delayed/inconsistent Growth, historical initialization limits, distributions and adaptive selection, repeated/concurrent generation and reload, unvisited weeks, read/write/acknowledgment failures, corruption/unsupported versions, ownership mismatch and unrelated-key preservation.

## Scope and remaining verification

- Match resolution, READY/SKIPPED lifecycle actions, PLAY, rewards, Career history UI, Season read-only UI and Cinematic presentation belong to 4C-2/4C-3 and are intentionally absent.
- Adaptive last-five selection and weights are implemented and tested as pure functions. Because 4C-1 cannot produce completed results, generation correctly persists an empty completion history and base 25/50/25 weights. 4C-2 must connect authoritative stored completion results and extend Match validation without changing existing snapshots; fabricated completion history is not accepted by the 4C-1 schema.
- Existing Rival mock UI is unchanged; the new persisted foundation is available through `useMatches()`.
- No iPhone/Hermes, simulator, VoiceOver, or visual UI verification was performed. Calendar behavior was verified under Node/Intl; native runtime timezone support still requires device verification.
- Rare calendar midnights that cannot be uniquely represented are blocked with an explicit error and no write. No alternate calendar rule is silently chosen.
