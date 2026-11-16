# Phase XP-1 domain contract

XP-1 accepts explicit evidence and calculates values in memory. Rules are 15 XP
per eligible confirmed set in a valid completed Session, capped at 60 per supplied
completion day. PR, Growth and Player initialization are independent of eligibility.

## Input decisions

- Activation is inclusive at `activatedAt`. Older completions and excluded IDs
  contribute nothing. A workout spanning activation qualifies by completion time.
- `isActual` and `isSession` are the existing validation authorities. Invalid actual
  results return false in eligibility checks. Invalid Session evidence, including
  duplicated set IDs or missing results in a completed Session, rejects calculation.
  A valid active Session contributes zero, including any already confirmed sets.
- Weight zero with five repetitions is valid under current Session validation.
  ActualResult has no new upper limit added by XP. Planned targets never count.
- Identical duplicate Session inputs are deduplicated. Conflicting actuals, status
  or calendar context for one Session ID raise an error. Callers must replace an
  active snapshot with its completed snapshot before supplying the evidence list.
- Set identity is JSON `[sessionId,setId]`. Set IDs are unique within Session under
  current validation. Identical bare set IDs in different Sessions remain distinct.
- Supply the complete activation-scope evidence needed for every paid day. The
  function derives entitlement and subtracts prior paid XP. Prior paid XP must be
  0/15/30/45/60 and cannot exceed the evidenced entitlement. Missing evidence raises
  an error rather than subtracting XP or fabricating additional credit.
- Daily results and set references are sorted. Reversing Session processing order
  produces identical results. Reprocessing requires passing updated prior paid XP.

## Calendar and unresolved integration cases

Each in-scope completed Session requires its captured `localDay` and
`offsetMinutes`, using Date.getTimezoneOffset semantics (UTC minus local). Existing
`validCalendar` verifies that the supplied wall date agrees with completedAt and
offset. No current-device timezone or current clock is consulted.

The offset disambiguates a particular completion instant during DST folds. It does
not prove an IANA zone or that the device clock/timezone was truthful. Separate
Sessions with the same captured localDay share one cap, including after travel.
XP-2 must capture this context durably at completion and decide how to recover a
completion whose context was never committed. Recomputing it in the current zone
would violate this contract. Clock rollback, future completions, imported evidence,
travel across the date line and activation/exclusion persistence remain XP-2 design
items. XP-1 does not silently choose fallback calendar data for these cases.

## Level numeric contract

Level 1 starts at zero. The next-Level cost is `100 + 25 * (L - 1)` and cumulative
threshold is `100*(L-1) + 25*(L-1)*(L-2)/2`. Level has no product cap.

Total XP accepts nonnegative safe integers through Number.MAX_SAFE_INTEGER.
Invalid/unsafe numeric inputs raise RangeError. Threshold functions return bigint,
and binary search uses bigint so next thresholds can safely exceed that limit.
Level/progress differences return numbers within the supported safe-XP range.
This is a numeric representation boundary, not a gameplay Level cap.

BigInt thresholds are calculation outputs and cannot be passed directly to
JSON.stringify. XP-2 should store validated award integers and derive Level, or
explicitly encode any BigInt output as decimal text. Native Hermes support and
serialization must be verified before integration. No runtime integration exists
in XP-1.

## Proposed XP-2 boundary

The caller supplies validated durable Session snapshots, activation/excluded IDs,
captured completion-day context, and authoritative previously paid daily totals.
It must serialize fresh reads and commit the updated XP evidence/amount together.
The daily awardId identifies a day entitlement, not a one-shot immutable 15 XP
transaction. Later same-day Sessions can increase it up to 60. Separate immutable
increments will require their own deterministic identities and concurrency checks.
The domain alone cannot prevent two callers committing against the same stale paid
total. Lost acknowledgments must reread durable paid totals before retrying.

The output aggregates by day. It does not assign capped XP to individual Sessions.
XP-2 must define attribution for Session summaries if required, including timestamp
ties and delayed processing. Repository arrival order must not silently decide it.

Existing stores, UI, formulas and completion callbacks are outside XP-1's changes.

## Executed verification

New XP tests passed 48/48. The combined relevant regression run passed 178/178
(48 XP tests and 130 existing tests covering Sessions, Rewards, Growth, Session
Progression and Cards). TypeScript, lint and git diff whitespace checks passed.
The complete application test suite, browser exports and native runtime checks
were not run for this independently tested domain-only phase.
