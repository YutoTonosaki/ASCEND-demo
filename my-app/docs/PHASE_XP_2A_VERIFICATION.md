# Phase XP-2A — Completion calendar and activation foundation

## Implementation

New completed Session records include optional version-1 `completionContext` with
`completedAt`, `localDay`, `timeZone` and `offsetMinutes`. The final confirmation's
existing UTC timestamp supplies one Date for all calendar getters. The timestamp
remains equal to the final confirmed set timestamp. Offset uses Date semantics
(UTC minus local minutes). IANA lookup failure yields null. Validation checks the
canonical timestamp, exact Session timestamp equality, valid local day and offset
consistency. The IANA label is audit metadata, with string-shape validation only;
historical validation never reinterprets it using today's timezone database.

Context and completed Session are written together in the existing
`ascend.sessions.v1` document. Legacy completed Sessions without context remain
valid and are never backfilled. Active Sessions cannot contain context. Copies
explicitly detach the context. Loading never writes.

Session operations now use the existing adapter-wide queue. Each commit rereads
validated durable Session data inside that queue. A lost acknowledgment can then
recover the already completed Session without confirming another set or capturing
another date. A failed final write retains one bounded in-memory completion attempt
for identical retries against unchanged durable input. This preserves its original
calendar even across midnight in the same Repository instance. Changed input or
commands invalidate that attempt. If the process dies before any write succeeds,
there is no durable completion to recover; a later explicit confirmation captures
its own completion time. There is no durable outbox in this phase.

## Activation storage

Key `ascend.experience.v1` stores only:

```json
{"version":1,"activation":{"activatedAt":"2026-11-16T12:00:00.000Z","excludedSessionIds":[]}}
```

`XPRepository.load()` returns inactive state for missing storage without writing.
Only explicit `activate()` creates storage. No Provider, UI or startup code invokes
it yet. XP awards, balances, receipts and dailyAwards are absent.

Activation holds the same exact-adapter queue as Session commits, reads durable
completed Session IDs, sorts their exclusion list, samples its clock, validates,
writes once, then rereads and compares the saved activation before success. It
uses raw reads within the lock and never calls another queued Repository method.
Duplicate activation returns a detached saved boundary without writing. Lost write
acknowledgment or failed readback can be recovered by a later explicit call reading
the saved activation. No second acknowledgment document is required.

A completion serialized before activation is excluded by ID, even at an equal
instant. An active Session completing afterward remains outside the exclusion list
and is eligible for later XP-1 evaluation when its completion timestamp is within
the activation boundary. XP-1 retains its inclusive timestamp check. A write that
fails before committing establishes no durable activation; a subsequent attempt
samples a new boundary and rereads all then-completed IDs. This avoids treating
sessions completed before successful initialization as new training.

Corrupt, unsupported, unreadable or contradictory XP/Session storage blocks new
activation and preserves bytes. No repair, migration, reset or historical rewrite
is performed. Existing XP-1 eligibility and Level source files are unchanged.

## Files

- Added `src/sessions/calendar.ts`, `src/xp/activation.ts`,
  `src/storage/xp-repository.ts`, `tests/xp-activation.test.cjs` and this report.
- Updated `src/types/session.ts`, `src/sessions/domain.ts`,
  `src/storage/session-repository.ts` and the shared queue's descriptive comment.
- Existing XP-1 uncommitted files are preserved as prior work.

## Verification

- `npm test`: 684 passed, 0 failed (including all existing regressions and the
  24 XP-2A tests), exit 0.
- `node --require ./tests/register.cjs --test tests/xp-activation.test.cjs`:
  24 passed, 0 failed, exit 0.
- `npm run typecheck`: passed, exit 0.
- `npm run lint`: passed, exit 0.
- `git diff --check`: passed.

All tests use isolated in-memory adapters. Calendar fixtures spawn Node with explicit TZ values
for Vancouver midnight, both DST transitions and Kathmandu's 45-minute offset.
Failure fixtures cover writes before/after commit, readback rejection/mismatch,
concurrent ordering, repeated activation, repository remount, legacy records,
copy isolation and unchanged unrelated gameplay keys.

## Limits and XP-2B decisions

The queue protects only one process sharing the exact adapter object. It supplies
serialization, not a cross-process or cross-key database transaction. AsyncStorage
write durability remains the existing app assumption.

Travel never changes a stored localDay/offset. Different newly captured dates can
have different daily entitlements under XP-1. Device clock rollback may put a new
completion before activation, making it ineligible under the existing domain.
There is no clock-tamper protection. Missing legacy context must not be inferred
from the current timezone. XP-2B must define its unavailable-context handling,
Session attribution of the daily cap, award ledger/versioning and activation call
site before integrating recovery or UI. No XP-2B work is implemented here.

Browser, Expo export and physical-device checks are not performed for this
storage/domain phase. Native Intl/Date behavior and ordinary completion should be
smoke-tested on iPhone before a later production XP rollout, preserving real data.
