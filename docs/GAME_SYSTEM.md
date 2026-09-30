# ASCEND — Game System Specification

# 1. Fundamental Rule

Physical Player Ratings represent demonstrated real-world physical ability.

Participation rewards and physical progression are separate.

Completing a workout may provide:

XP
Credits
FORM
Drops

But long-term STR/OVR/etc. should primarily change because the user demonstrates improved performance.

---

# 2. Rating Range

Target rating range:

40–99

Initial Combine will generally place users in the lower portion of this range.

Exact calibration must remain configurable.

---

# 3. Athletic Ratings

STR — Strength

PWR — Power

END — Endurance

CORE — Core strength/stability

ATH — Athleticism

Phase 3B implements body-part ratings only. The five athletic categories remain
future concepts; they are not independently calculated or displayed as fictional
player performance. OVR is the arithmetic mean of Chest, Back, Shoulders, Arms,
Core and Legs, floored for display. See section 47 for the implemented rules.

---

# 4. Internal Precision

Ratings should support decimals internally.

Example:

OVR_INTERNAL = 58.72

Display:

OVR 58

This allows gradual progression.

---

# 5. Body Ratings

V1:

Chest

Back

Shoulders

Arms

Core

Legs

Exercises have primary and secondary body areas.

Example:

Push-up

Primary:
Chest

Secondary:
Arms
Shoulders
Core

---

# 6. Initial Combine

Initial tests:

Push-up

Bodyweight Squat

Plank

Goal:

approximately five minutes.

These create baseline estimates.

Unmeasured areas such as Back may initially use lower-confidence estimated values.

Historical performance gradually becomes more authoritative than Combine estimates.

---

# 7. Height and Weight

Height should not directly provide OVR bonuses or penalties.

Body weight may be used when relevant to relative strength and bodyweight exercise performance.

---

# 8. Exercise Model

Each exercise should eventually support:

ID

Name

Exercise Type

Measurement Type

Primary Body Area

Secondary Body Areas

Difficulty

Equipment

Progression Level

Possible measurement types:

REPS

TIME

WEIGHT_AND_REPS

---

# 9. Performance Score

Conceptual model:

PERFORMANCE SCORE =

Exercise Difficulty
× Repetition Factor
× Set Factor
× Load Factor
× Completion/Quality Modifier

Exact formulas should remain modular and configurable.

---

# 10. Bodyweight Exercise Difficulty

Conceptual example only:

Push-up = 1.0

Diamond Push-up = 1.3

Decline Push-up = 1.5

Archer Push-up = 2.0

One-arm Push-up = 3.0

These are balancing values, not finalized scientific measurements.

---

# 11. Gym Exercise Performance

Weighted exercise evaluation may use:

external load;

repetitions;

sets;

body weight where relevant;

previous performance.

Example:

50 kg × 10

should generally demonstrate more performance than:

50 kg × 5.

---

# 12. Training Modality Neutrality

Gym training must not automatically be superior to bodyweight training.

Advanced calisthenics can represent high physical performance.

Both routes must be capable of producing high Player Ratings.

---

# 13. Diminishing Returns

Repeating the same easy performance indefinitely must approach zero long-term physical progression.

Example:

User establishes ability far above:

Push-up
3 × 10

Repeating 3 × 10 should eventually produce little or no physical Rating growth.

This prevents farming OVR.

---

# 14. Evidence of Improvement

Strong evidence includes:

new PR;

more repetitions;

higher load;

harder progression;

meaningful increased workload;

successful Skill progression.

---

# 15. Progressive Overload

Workout recommendations should use previous performance.

Progression should normally be small.

Avoid arbitrary large jumps.

---

# 16. Skill Unlocking

Skill unlocks are primarily performance-based.

A user should normally demonstrate the required performance more than once.

Initial conceptual rule:

successful threshold on at least two separate sessions.

Exact thresholds remain configurable.

---

# 17. Recovery

Body areas store simplified workload/recovery information.

States:

READY

MODERATE

RECOVERING

Recovery is an estimate for workout planning, not a medical assessment.

---

# 18. Weekly Target

Weekly consistency replaces strict daily streaks.

Example:

TARGET = 3

Completed = 2

Progress = 2 / 3

---

# 19. Form

Conceptual mapping for Target 3:

0/3 = POOR

1/3 = LOW

2/3 = GOOD

3/3 = EXCELLENT

Additional workouts beyond the target should not produce unlimited Match power.

---

# 20. Comeback

After a meaningful inactivity period, completing a workout may trigger a Comeback event.

Possible rewards:

Bonus XP

Bonus Credits

Potential cooldown:

approximately once per month.

Exact timing remains configurable.

---

# 21. Rival Generation

Rival should generally begin close to the Player's ability.

Rival stats should contain strengths and weaknesses.

Avoid perfectly uniform Rival Ratings.

---

# 22. Rival Growth

Conceptual Rival growth:

approximately 80–105% of Player growth with controlled variation.

The user should not feel guaranteed to eventually catch the Rival.

Exact balancing will require testing.

---

# 23. Match Inputs

Match calculation may use:

Athletic Ratings

Body Ratings

OVR

FORM

controlled randomness

---

# 24. Match Randomness

Small ability differences allow meaningful uncertainty.

Large ability differences strongly favor the stronger competitor.

Example:

61 vs 60

Upset:
realistic.

75 vs 50

Upset:
extremely unlikely.

Randomness must not make physical progression meaningless.

---

# 25. Match Rounds

Potential V1 sequence:

STRENGTH

POWER

ENDURANCE

CORE

ATHLETICISM

BODY BATTLE

FINAL PERFORMANCE

---

# 26. Body Battle

Compare:

Chest

Back

Shoulders

Arms

Core

Legs

Rather than awarding six full Match points, the competitor winning more categories receives a Body Battle advantage.

---

# 27. Final Performance

Conceptually:

MATCH PERFORMANCE =

Long-Term Ability
+ Form Modifier
+ Controlled Random Modifier

Exact formula remains configurable.

---

# 28. Season

One calendar month equals one Season.

Approximately one Match occurs each week.

Season result is based on weekly Match record.

Tie behavior can be designed later.

---

# 29. Player Card Tier

Initial conceptual order:

BRONZE

SILVER

GOLD

PURPLE / ELITE

ASCEND

Exact thresholds remain configurable.

---

# 30. Card Intensity

Each major Tier supports visual intensity.

Example:

LOW

MID

HIGH

This allows a high-Bronze Player to visually look closer to Silver while remaining Bronze.

Card intensity is visual.

It does not independently affect Ratings.

---

# 31. Rewards

Workout participation may award:

XP

Credits

Drop Chance

Physical progression remains separate.

---

# 32. Cosmetic Rarity

Initial rarity system:

COMMON

UNCOMMON

RARE

EPIC

LEGENDARY

Conceptual rarity distribution after a Drop:

Common: 55%

Uncommon: 25%

Rare: 13%

Epic: 6%

Legendary: 1%

Values must be centralized and configurable.

---

# 33. Drop Chance

Conceptual initial chance:

approximately 30% after eligible Workout completion.

Not finalized.

A pity/protection system may later guarantee a Rare-or-better reward after an extended unlucky period.

---

# 34. Coins

Phase 3C-3 replaces the temporary Credits terminology with Coins. Current rewards
are Daily Workout +10 and three-distinct-day Weekly Consistency +30, as defined
in section 50. Coins do not affect physical progression and cannot be spent yet.
Match, Season and achievement rewards and cosmetic purchases remain future scope.

---

# 35. Cosmetics

Categories:

Card Background

Border

Aura

Title

Badge

Rival Color

Victory Effect

Cosmetics must not change physical Ratings.

---

# 36. Season Card

Season Cards are immutable snapshots.

When a Season ends, save:

Season

Date

OVR

Athletic Ratings

Body Ratings

Archetype

Record

Season Result

Card cosmetics/appearance where appropriate

Club identity snapshot and represented Club tenures (see section 39).

Future Player progression or transfers must not modify old Season Cards.

---

# 37. Safety / Anti-Exploitation

The optimal strategy must never become:

TRAIN AS MUCH AS POSSIBLE EVERY DAY.

Systems should use:

recovery;

diminishing returns;

Form caps;

progressive overload;

reasonable Weekly Targets.

The game should reward sustainable training.

---

# 38. Configuration

Centralize tunable values.

Examples:

OVR weights

Card thresholds

Card intensity thresholds

exercise difficulty

progression rates

Rival growth

Match randomness

FORM modifiers

Drop chance

rarity probabilities

Comeback cooldown

Skill thresholds

Avoid magic numbers distributed across UI code.

---

# 39. Club Career Model (Phase 4 contracts)

Keep Club Career separate from physical Player ratings. The Phase 1 TypeScript
contracts are in `my-app/src/types/club.ts`; fixtures and the replaceable Club
catalog live in `src/data/club-career.ts` and `src/config/clubs.ts` within that app.
No Club calculation, Club persistence, or transfer state machine is added.
The Phase 2A storage adapter persists training plans only.

| Concept | Data / invariant |
| --- | --- |
| Club identity | Stable id, name, shortName, league, country, original vector crest, primaryColor, secondaryColor |
| Club expectations | Reputation, recommendedOVR, preferredArchetypes, preferredAttributes, description |
| Player Club career | currentClubId, clubJoinedAt, previousClubs, careerTransfers, clubReputation, role, transferOffers |
| Club tenure | Unique tenure id, copied Club identity, joinedAt, leftAt; returning creates a new tenure |
| Transfer offer | Offering Club snapshot, proposed role, state, window kind, offer date, optional expiry |
| Accepted transfer | Offer id, from/to Club identity snapshots, decision and effective dates |
| Season Club snapshot | Season id, copied Club at Season end, represented Club tenures |

Catalog Club reputation describes an organization's standing. The Player's
`clubReputation` describes their relationship/standing at the current Club; its
scale is TBD and it can be unset. Neither value is a physical rating. The mock
uses an unset Player standing and role, rather than pretending to calculate them.

Dates use ISO calendar dates; display them without time-zone month shifts.
Historical records must store identity copies, including crest geometry/colors,
not only IDs resolved against the mutable live catalog. TypeScript readonly
contracts express intent; future persistence must copy/validate data and enforce
immutability. Current data remains in memory only.

# 40. Club Reputation and Interest

Draft Club reputation levels (centralized labels, balancing TBD):

1. Development / starting Clubs
2. Growing competitive Clubs
3. Established Clubs
4. High-level Clubs
5. Elite Clubs

All six league environments can contain different reputation levels. There is
no rule such as OVR 60 = Germany or OVR 70 = England. `recommendedOVR` is a soft
expectation, not an absolute lock. Tokyo Zenith's illustrative 45/reputation 1
is catalog sample data, not an implemented offer threshold.

Future interest takes OVR as its primary signal and may additionally consume
STR, PWR, END, CORE, ATH, Body Ratings, Archetype, Form, weekly consistency,
Season performance, Match results, PR progression, Club reputation, current Club,
and career history. A strength/power-focused Club may value a different profile
from one emphasizing endurance/athleticism/Form. No scoring weights, probabilities,
thresholds, role requirements, or automatic scouting are implemented yet.

Phase 3 produces performance evidence; Phase 4 consumes it through pure game
modules. UI renders results and invokes future explicit decisions, never computes
interest or changes ratings. Offer frequency, recommended OVR ranges, Club
preferences, interest thresholds/calculations, window rules, and role requirements
must live in centralized future configuration; unspecified values remain TBD.

# 41. Offers, Windows, and Voluntary Decisions

Interest states: LOCKED, SCOUTING, MONITORING, INTERESTED, OFFER_RECEIVED.
Offer states: OFFER_RECEIVED, ACCEPTED, REJECTED, EXPIRED. These are conceptual
contracts, not an active state machine or guaranteed linear sequence.

Future decisions are ACCEPT, REJECT, or STAY. Only explicit acceptance can create
an effective transfer. Rising OVR, expiring/declining an offer, or choosing to stay
never changes Club automatically. Staying must remain possible indefinitely;
missing an offer cannot block future physical growth. Rejected/expired offers
and completed tenures remain part of history under future retention rules.

One calendar month remains one Season. Season-end windows are the main cadence;
a window-kind field also permits SPECIAL_MID_SEASON later without requiring it
in the first implementation. Offer issuance, expiry, effective dates, and window
processing are deferred. Proposed roles are PROSPECT, ROTATION, STARTER,
KEY_PLAYER, CLUB_ICON; no role progression or bonuses are implemented.

At Season completion, snapshot ratings and Club identity before applying any
next-Season transfer. For future mid-season transfers, retain represented tenures
as well as the Club at Season end; finalize presentation policy in Phase 4.
Never relabel older Season Cards with the Player's new Club or delete old history.

# 42. Club Safety and Presentation Rules

Joining any Club, changing role, or gaining reputation never directly increases
Athletic Ratings, Body Ratings, or OVR. Cosmetics remain ability-neutral. Future
interest incentives must use sustainable performance evidence and existing Form
caps/recovery principles, not reward unlimited additional volume. Clubs are not
pay-to-win or a substitute for real physical improvement.

Transfer events rank above ordinary notifications but below major Season Victory
and major Card Evolution presentations. This task adds no event animations.
No real football assets, live Club database, backend, authentication, or cloud
infrastructure are required. Club/transfer simulations belong only in Phase 4.


# 43. Phase 2A Training Data Foundation

Types live in `my-app/src/types/training.ts`; standard definitions and draft
exercise difficulty metadata live in `src/data/exercises.ts`. Shared options,
defaults, Recent limits, and input bounds are in `src/config/training.ts`.

- Exercise: stable ID, name, primary/secondary BodyArea arrays, category,
  equipment array, tracking type, difficulty, progression family, and isCustom.
- Categories describe training, independently of Athletic Ratings.
- Standard difficulty values are draft game metadata, not scientific measurements.
  They are not used for scoring in Phase 2A. Progression family is a future grouping
  key, not an implemented Skill Tree.
- CustomExercise is a distinct union member: isCustom=true, difficulty=null,
  progressionFamily=null. Future Performance Engine policy for custom movements
  remains unresolved; never infer a rating multiplier from user input.
- WorkoutPlan has a stable ID, name, created/updated timestamps, and ordered
  WorkoutExercise entries. Each entry has its own ID, exercise reference, rest
  target, and ordered SetTarget values with stable set IDs.
- SetTarget is discriminated by reps, weight_reps, or time. Weight is kilograms;
  durations are seconds. This model contains no actual-performance fields.

`src/training/plans.ts` supplies pure plan creation, ordering, and deep duplication.
The future AI Coach should return an editable WorkoutPlan after consulting
training context, not write UI-specific state. Phase 2B must snapshot the plan and
exercise metadata into separate session evidence before recording actual sets.
Subsequent plan edits/deletions must never rewrite completed session history.
Phase 3 consumes that evidence, not planned targets, for PRs and progression.

## Local repository

UI → TrainingProvider → TrainingRepository → StorageAdapter → AsyncStorage.
The only new runtime dependency is Expo-compatible AsyncStorage. The version-1
training document is stored under `ascend.training.v1`; it contains custom
exercises, six unique Recent IDs, and saved plans. Standard definitions remain
bundled data. No Player or Club fixtures are written to this document.

Validate unknown JSON, IDs/references, enum values, finite numeric bounds, and
matching target types before loading or committing. Writes are serialized and
state is published only after persistence succeeds. Referenced custom exercises
cannot be deleted or change tracking type; rename/metadata edits remain valid.
Missing storage means an empty library of user data. Invalid or unsupported data
blocks writes rather than silently discarding it. Explicit reset first copies the
original raw document to a timestamped local backup key. Phase 2A.5 adds the narrow
version-1 normalization described below. There is no cloud recovery, encryption,
or backup export UI.

Input bounds limit malformed plans (30 exercises, 20 sets per exercise, names
80 characters). Defaults and bounds are editing constraints, not training advice,
performance scores, or growth formulas. Phase 2B sessions, rest and factual history
are described in section 44. Scoring, PRs, recovery, Form, Skill Tree, and rating
changes remain deferred.


## Phase 2A.5 audit decisions

The shared Exercise metadata and discriminated isCustom/difficulty contract are
retained. `isExercise` validates both origins; `isCustomExercise` only narrows the
same model. Custom difficulty stays null and custom progression-family assignment
is deferred. Equipment is an array of structured options, not a display string.

V1 taxonomy adjustments (catalog IDs and 42-item count unchanged):

- Dead Hang: primary Back + Arms, secondary Shoulders. Arms is the current coarse
  proxy for grip/forearms. This is an indexing choice, not a growth multiplier.
- Inverted Row: Low Bar equipment, representing a fixed low horizontal support;
  it does not require a free-weight Barbell. Other apparatus variants remain future
  metadata work rather than expanding the library in this checkpoint.
- Jumping Jack: primary Legs + Shoulders, secondary Core, still Athletic category.
  Multiple primary areas express the whole-body movement within six broad groups.

WorkoutPlan.exercises and WorkoutExercise.sets array positions define order.
Stable entry/set IDs identify instances; no redundant order/setNumber fields are
stored. Labels are derived from structured SetTarget values. Editing preserves
plan ID and createdAt; duplication creates new plan/entry/set IDs. Targets require
at least one rep/second and one set; zero load and zero rest remain valid. Negative,
non-finite, fractional rep/time, blank names, and empty plans are rejected.

The repository serializes load, commit, and reset. Submitted mutable objects and
returned results are detached copies so an editor or future session cannot mutate
its retained template state. A failed reload blocks stale writes until a successful
load or explicit reset. No UI component reads storage directly.

`src/storage/training-schema.ts` is the small version-dispatch/normalization point.
Current valid version-1 data is read without rewriting. For version 1 only, missing
custom secondary areas become []; missing difficulty/progressionFamily become
null; missing Recent becomes []; duplicate, dangling, or excess Recent IDs are
removed while preserving recency order. Validate the complete result before writing
and back up the original raw data first. Failures preserve the original and remain
retryable. Never guess missing IDs, names, equipment, primary areas, tracking type,
targets, rest, or timestamps; never convert unknown/unversioned schemas or assign a
custom difficulty. Those cases use the existing non-crashing recovery screen.

Phase 2B must snapshot plan targets **and exercise metadata** before execution,
store actual performance separately, and retain completed evidence independently
of future exercise/template edits or deletion. No session types/state engine are
introduced by this audit. Performance evaluation of custom movements and metadata
weighting remain Phase 3 decisions.


# 44. Phase 2B Session Evidence

WorkoutPlan remains a reusable target template. WorkoutSession is independent
historical evidence, with its own ID, sourceWorkoutId, name at start, startedAt,
completedAt, status, and ordered SessionExercise/SessionSet snapshots. Each entry
copies the shared Exercise metadata (including equipment, body areas, category,
tracking, difficulty and family) and planned rest. Session entry/set IDs are new;
target IDs/values are retained inside the copied target for provenance.

ActualResult discriminates reps, weight_reps, and time. A set result is null until
explicit confirmation, then contains actual values and confirmedAt. Zero differs
from null. Results form a confirmed prefix in snapshot order; the first null result
is current position. This derives position without a redundant drifting index.
Completed sessions require every result, completedAt matching final confirmation,
and no rest. Active sessions require at least one unconfirmed set and no completedAt.

`ascend.sessions.v1` version 1 contains one active session or null, plus completed
sessions. Separate repository/provider, validated reads and commands, queued
load/write/reset, and typed detached copies preserve the audited template boundary.
No history edit command exists. Final confirmation atomically appends history and
clears active; stale set IDs are harmless and FINISH writes nothing. Failed writes
retain prior state. Malformed session data blocks session writes, offers retry or
confirmed raw-backup reset, and does not block or reset training templates.

RestUntil stores the previous confirmation time plus its planned rest seconds.
Display countdown derives from current time, refreshing on foreground; expiry and
skip clear rest without changing targets. No background service or notification.
One active session resumes from TRAIN. Unconfirmed UI edits are not evidence and
are not persisted. Wall-clock duration includes rest and time away; clock reversal
before prior confirmations is rejected with a retryable error.

Phase 2B uses manual seconds entry for timed sets, factual completion/history,
and no growth, PR, recovery, weekly/Form, reward, AI, or Career calculations.
Phase 2C adds the Coach foundation in section 45. Phase 3 must
consume confirmed historical results rather than mutable template targets.


# 45. Phase 2C Rule-Based Coach

`TrainingProfile` stores stable identity/timestamps; optional cm/kg; experience;
goal; location; available equipment; duration/exercise-count preferences; optional
weekly days; and optional BaselineAssessment entries. A baseline copies shared
Exercise metadata, a typed ActualResult, known/performed origin and recording time.
It is not a WorkoutSession. `ascend.coach.v1` version 1 stores profile or null using
queued, validated operations and detached inputs/outputs. Invalid data blocks only
Coach writes and supports retry or explicit raw-backup reset; no migration of the
established training/session contracts.

The pure engine receives profile, catalog, completed sessions, optional current
preferences and an explicit reference timestamp. It reads no clock/storage and
uses no randomness. Proposals have no saved identity; accepted conversion uses
existing plan/entry/set ID helpers and WorkoutPlan validation. Proposal metadata is
not a second template schema or historical evidence. Metadata changes invalidate
conversion; name-only changes do not transfer or rewrite history.

Current centralized product heuristics (not clinical prescriptions):

- Default beginner/strength/Home, implicit Bodyweight, 8 minutes/up to 3 exercises.
  Numeric validation limits profile minutes to 1–120 and count to 1–10; these are
  editor limits. Optional height/weight are never used in selection or targets.
- Every required equipment item must be selected. Home/Gym/Both names are context;
  selected equipment is authoritative because catalog entries have no location field.
- Experience limits draft difficulty conservatively. Unknown custom difficulty is
  excluded unless explicitly opted in as familiar. Generic initial bodyweight
  suggestions are restricted to a small configured subset of existing movements.
- Requested primary areas rank above secondary areas. Every requested area must
  remain represented; secondary-only coverage is explained. Prefer differing primary
  areas/families when alternatives exist. No silent unrelated fallback.
- Use the latest matching completed session within 90 days, then optional matching
  baseline within 90 days, otherwise a marked initial suggestion. Ignore future
  evidence and incompatible movement metadata; name-only edits preserve matching.
- Repeat the lower observed reps/time, or an actually observed conservative kg/reps
  pair; never combine a load with unrelated reps or automatically increase targets.
  Limit to at most two sets, and no more than recorded result count. Recorded zero
  reps/seconds excludes the movement from automatic target construction rather than
  guessing a positive ability; manually choosing a target remains possible.
- Without evidence, selected bodyweight defaults are 6 reps or 15 seconds. Weighted
  proposals carry null load plus one set; conversion requires explicit load confirmation
  (including valid zero). Explicit custom opt-in allows an editable initial target,
  never a claim of beginner safety.
- The last 48 hours of positive confirmed participation affects selection, with
  primary involvement above secondary. This ranks alternatives, not physical effort,
  fatigue or readiness: equal sets do not imply equal effort. Automatic proposals use
  one set for recently involved primary areas if selected; directed focus remains
  allowed with a reminder. Leaving the window does not declare recovery.
- Strength/muscle/fitness defaults use 90/75/60 seconds of rest. Estimate work using
  actual planned seconds or 4 seconds per planned rep, plus inter-set rest and 20
  seconds per exercise for transitions/setup. These are transparent rough estimates,
  never actual session duration. Remove sets then exercises, preserving requested
  area coverage and rest; otherwise explain the conflict. Count is a maximum.

Weekly-days preference is stored for future scheduling, not used for penalties or
weekly/Form updates. No ratings, recovery percentages, PRs, automatic overload,
AI service calls or game-system writes. Later Phase 3 development must continue to
use confirmed historical evidence independently of these suggested targets.


# 46. Phase 3A Personal Records

## Authoritative evidence and identity

`src/records/domain.ts` derives records from the existing SessionProvider document:
completed sessions plus its active session when present. Persisted confirmed active
sets are already explicit performance evidence, even before final workout completion.
Only non-null results qualify; no target, baseline, proposal, or unconfirmed UI input
is used. Existing `isSession` validation remains the compatibility boundary. Invalid
sessions and duplicate session identities are excluded with a rejected-session count.
Repository corruption remains an explicit read/retry error rather than an empty PR.

Identity is exercise snapshot ID plus tracking type. Renaming cannot split a record;
a new exercise with a similar name cannot inherit it. A custom exercise changing its
tracking type keeps independent metrics. Display uses the latest eligible snapshot
name, so a catalog-only rename appears after a subsequent eligible set. No lookup of
a mutable template/catalog is required. Session metadata, targets and actuals remain
unchanged. The existing schema has kg only and no distinct assisted/unilateral or
resistance-level performance fields; Phase 3A does not invent those conditions.

## Record rules

- Reps: maximum actual reps in one confirmed set, never a sum.
- Time: maximum actual seconds in one confirmed set, with no unit conversion.
- Weighted: maximum actual kg with at least one completed rep, plus an independent
  repetition maximum for each exact recorded kg value. Decimal loads are not rounded
  or merged. The UI's reps at maximum load come from that load's repetition record;
  the maximum-load source remains the first achievement of the load.
- Explicit zero reps/seconds is valid for unweighted/time records. Zero-rep weighted
  attempts remain in session history but establish neither load nor repetition PRs;
  zero kg with positive reps qualifies. Missing values never become zero.
- First eligible observation establishes a record; greater values improve it;
  equal/lower values maintain it. Ties retain the earliest achievement source.
  A first observation at a new load is a first *load-specific* repetition record,
  not automatically a maximum-load improvement or overall performance increase.
- No e1RM, combined performance score, growth formula or points.

## Ordering, compatibility and future consumers

Order by confirmed timestamp, then code-point session ID, then original exercise
and set array order, then set ID. Equal cross-session timestamps use the deterministic
ID convention, not a claim about the real-world order of simultaneous events.
All accepted version-1 results require valid timestamps and stable IDs. Missing
required dates/IDs are invalid under the existing repository contract and are not
invented or migrated. There are no optional PR fields to backfill. Nullable exercise
metadata remains supported; future optional annotations/units are not required.
A legacy import with no reliable timestamp is outside the supported session schema
and requires a separately scoped compatibility decision, not silent reconstruction.

`derivePersonalRecords` returns current records and ordered set comparisons.
`getExerciseRecord` retrieves a record by ID/type. `getSetComparison` uses session ID
and set ID, retaining confirmed timestamp and copied actual result as provenance.
`getPreviousRecord` returns the record before that set (null for first; undefined if
not eligible/found). Comparisons include independent metric names, optional kg
condition, previous/current numeric values, first/improved/maintained outcome and
first/higher/equal/lower relation, plus detached previous/current record snapshots.
Phase 3B can consume this evidence, distinguish initial records from improvements,
and deduplicate by source/metric; Phase 3A does not award or persist any growth.

Pure derivation reads no clock, randomness or storage and does not mutate inputs.
PLAYER memoizes against the SessionProvider data reference; successful confirmations,
reloads or explicit session resets naturally invalidate it. No new persistent source
of truth, schema/key changes, history edits, template dependencies or Coach changes.


# 47. Phase 3B Player Growth & OVR (rules version 1)

These numbers are configurable game balance, not medical measurements, muscle
activation percentages, population percentiles or physiological growth estimates.
Implementation: `my-app/src/config/growth.ts`, `src/growth/`, and `src/types/growth.ts`.
The existing Phase 3A PR engine is reused without a second record calculator.

## Explicit initialization and provisional assessment

PLAYER → INITIALIZE PLAYER snapshots eligible existing Phase 2C Baselines and an
initialization timestamp/identity. Profile and session storage must load first;
no second questionnaire, baseline requirement or automatic reset. REVIEW BASELINES
opens the existing profile. Later profile edits do not reinitialize ratings.

All six areas start at **45, provisional**. The existing built-in Baseline IDs
`push-up` (reps), `squat` (reps) and `plank` (seconds) assess only their existing
primary areas: Chest, Legs and Core respectively. Secondary areas remain provisional.
Height, body weight, age, targets and unrelated movements never infer ability.
Snapshots whose recorded time is after initialization are not used.

Conversion uses linear interpolation between these (actual value, rating) points,
with saturation at the final point. No difficulty multiplier is used.

| Exercise / actual unit | Points | Initialization Baseline? |
| --- | --- | --- |
| Push-up / reps | (0,40), (5,42), (10,46), (20,52), (40,60) | Yes |
| Bodyweight Squat / reps | (0,40), (10,43), (20,48), (40,55), (60,60) | Yes |
| Plank / seconds | (0,40), (15,43), (30,48), (60,55), (120,60) | Yes |
| Pull-up / reps | (0,40), (1,42), (5,48), (10,54), (15,60) | No; later Back assessment |
| Diamond Push-up / reps | (0,40), (5,44), (10,49), (20,56), (30,60) | No; later Arms assessment |
| Overhead Press / kg, at least 5 completed reps | (0,40), (10,44), (20,48), (40,54), (60,60) | No; later Shoulders assessment |

Between adjacent points `(x0,y0)` and `(x1,y1)`, rating is
`y0 + (y1-y0) * (actual-x0)/(x1-x0)`. Each initial rating is 40–60 or provisional
45. OVR therefore stays inside the intended 40–60 game range; with only the three
Baseline primary areas assessed, the possible initial displayed OVR is 42–52,
or 45 with no Baselines. For example 10 Push-ups, 10 Squats and 30 Plank seconds
produce Chest 46, Legs 43, Core 48 and three provisional 45s: OVR floor(272/6) = 45.

The first new, supported, directly relevant confirmed set can replace a provisional
value, upward or downward. This is an assessment adjustment, not a PR growth reward.
Already assessed areas never reinitialize. A newly assessed area receives no growth
from that same set; later genuine improvements may grow it. Secondary-only involvement
cannot confirm a provisional area. A first post-initialization supported set may assess
an area even when it is equal/lower than an older PR, without awarding PR growth.

Built-in ID, tracking type, primary metadata and equipment must match the configured
movement. Custom exercises and other built-ins have no initial conversion; unsupported
areas remain provisional with the available assessment paths explained on PLAYER.
Their genuine PRs can grow already assessed areas through their recorded metadata.
No invented strength from an uncalibrated exercise, arbitrary custom difficulty or
unspecified band/machine resistance. Overhead Press is a game load-at-5+-reps curve,
not an estimated one-repetition maximum.

## Comparable improvement and fractional growth

Only Phase 3A comparisons with `outcome: improved` and a previous value qualify.
First, equal, lower, targets, optional Baselines and unconfirmed inputs award nothing.

For reps/seconds, compare against the previous single-set best. For weighted sets:

- Maximum kg improvement qualifies only if completed reps are at least the previous
  maximum load's **best reps**. More weight with fewer reps is still a weight PR in
  Phase 3A, but is not automatically growth here.
- More reps at the identical recorded kg qualifies independently.
- First reps at a new load (including a new lower load) are not an improvement.
- If multiple metrics qualify, choose the largest relative improvement, never sum
  metrics from one set. A tie keeps Phase 3A's metric order.
- Zero-rep weighted attempts never qualify. Zero kg with completed reps can qualify.

For the selected metric, with previous `p` and actual `v`:

`ratio = p == 0 ? 0.10 : min(0.50, (v-p)/p)`

`eventBudget = min(0.30, (0.06 + 0.40*ratio) * earlyMultiplier)`

Early multiplier uses elapsed 7-day windows from the persisted initialization time:
week 1 = 1.25; week 2 = 1.20; week 3 = 1.15; week 4 = 1.10; week 5+ = 1.00.
Elapsed time alone never awards growth.

Allocate weight 1 to each primary area and 0.25 to each secondary area; divide by
the sum of all labels. Exclude provisional areas and areas newly assessed by this
set without redistributing their unused share. Unrelated areas receive nothing.
For eligible area rating `r`, multiply its allocated budget by
`max(0.15, min(1, (99-r)/59))`, then limit to remaining space below 99.
This makes high ratings generally slower to advance. These are abstract allocations,
not estimates of muscle activation or hypertrophy.

Caps constrain **total rating points across all six areas**, not each area:
0.30 per set event; 0.65 per session; 0.90 per UTC calendar day. The per-set cap is
applied before allocation/diminishing; session/day caps are applied afterward.
When a cap binds, proportionally scale that event's remaining area deltas. Keep
internal finite fractional values; no automatic reduction of assessed ratings.

## Multi-PR bonus

After a session is fully completed, count distinct exercise IDs among its new,
qualifying post-initialization PR improvements. Several sets or weighted metrics
from one exercise still count once. First records do not count.

For at least two distinct exercises:
`bonusBudget = min(0.12, 0.04*(distinctExerciseCount-1))`.
For each exercise take the maximum eligible allocation seen per area, sum those
allocations across distinct exercises and normalize. Only areas affected by these
qualifying improvements are eligible. Apply high-rating diminishing and remaining
rating capacity, then the same session/day caps. There is no early multiplier on
the bonus. Assessment adjustments are not part of the growth caps or bonus.
Active sessions receive ordinary confirmed-set growth, never a completion bonus.
A persisted finalized-session identity makes completion handling idempotent.

## OVR, UI and historical policy

Ratings remain fractional; displayed body ratings use `floor(clamp(value,0,99))`.
OVR is **floor(mean of the six fractional ratings)**, capped at 99, calculated on
read. No independently mutable OVR is stored. PLAYER and HOME use the same result.
The original full card, finish preview, Personal Records, tabs and safe areas remain;
card stat slots show real body ratings instead of fictional athletic ratings. Finishes
remain appearance previews; no earned tier/evolution/archetype calculation is added.

Existing confirmed sets are marked processed at initialization; existing completed
sessions are finalized without awards. Their evidence still participates in Phase 3A
comparisons for subsequent improvements. Existing active confirmed sets are also
excluded from retroactive growth; new confirmations after initialization can qualify.
No old assessment is inferred from history at initialization: an unmeasured area waits
for its first supported *new* confirmed set. Sets at/before the initialization timestamp
cannot award growth, including later-loaded older data. Initial Baselines are separate
snapshots, never workout/PR events.

## Persistence and Phase 3C hand-off

`ascend.player.v1`, schema version 1 / rules version 1, has its own queued repository
and root provider. Persist player ID/time, used Baseline snapshots, initial/current
ratings and statuses, processed session/set identities, finalized session identities,
and an event ledger of assessment/growth/bonus changes. Each event retains source
IDs/time, selected metric and actual where relevant, allocation and before/after
area values. This is enough for later factual Phase 3C explanations/visualization;
no animation, sound or reward system is implemented here. Full workout history and
PR tables are not duplicated. No unrelated storage keys are written.

A reconciliation uses validated authoritative sessions and Phase 3A comparisons,
orders set events and completion bonuses, and atomically writes the updated ratings,
ledger and processed identities. Reload/remount/repeated callbacks cannot award an
identity twice. Failed writes publish nothing and retry the same evidence. Missing
storage gives an explicit uninitialized state; malformed/unsupported documents are
preserved and block writes with retry, never silently reset. No player reset button
is introduced. Validation replays rating changes against the initial snapshot and
checks finite bounds, statuses, unique event identities and caps.

If previously processed session/set evidence disappears (for example an explicit
session reset), preserve established player ratings and pause new reconciliation
until the original history is restored. Future-dated new evidence and newly arriving
post-initialization evidence older than already processed results also pause rather
than inventing history/revising prior awards. Same-time ordering follows the existing
PR convention. Ordinary template deletion, catalog renaming or profile edits cannot
change existing session evidence or established ratings. No cloud recovery/import UI
is added; unsupported-history repair remains a separate task.

# 48. Phase 3C-1 Presentation Only

Presentation derives net integer changes from the saved ordered session ledger:
`floor(last after) > floor(first before)` per area. Replay from initialRatings gives
all six values before/after the session; use the unchanged `overall` function for
OVR. Include assessment adjustments with an explicit assessment label, never a PR
award. No decimal rounding feeds back into ratings. Wait for persisted session
completion and player finalizedSessionIds, including the bonus.

Only a fresh LiveWorkout completion callback requests presentation. Separate
`ascend.presentation.v1` stores consumed `[playerId,sessionId]` identities before UI
opens. Historical reads do not enqueue; pending requests are volatile and termination
may skip presentation. Never replay a consumed result. Corrupt/failed presentation
storage suppresses UI without modifying player/session evidence. See
`my-app/docs/PHASE3C_1_VERIFICATION.md` for lifecycle and test instructions.

# 49. Phase 3C-2 Earned Card Evolution

Use existing displayed `overall(ratings)` → `src/cards/domain.ts`: Bronze 0–59,
Silver 60–74, Gold 75–89, Purple 90–98, ASCEND 99 only. Bronze Standard is 0–49;
Bronze High is 50–59, a finish rather than a tier. Tier/finish are derived, never
saved or selectable. ASCEND has no next evolution and grants no rating bonus.

A fresh completed-session presentation uses Phase 3C-1's factual before/after OVR.
A change of tier adds Card Evolution after body Rating UP and OVR UP; 49→50 does
not. The same consumption identity covers the whole presentation. Existing high
ratings update card appearance immediately without historical popups. Manual finish
preview is removed from PLAYER. Consistency rewards follow in section 50; purchases remain a later phase.

# 50. Phase 3C-3 Consistency Rewards

A fresh LiveWorkout completion, after the completed session is durably saved,
may award 10 Coins for its first qualifying local day. Three distinct qualifying
days in a Monday–Sunday week award 30 additional Coins once. Further days still
award their daily 10, but weekly progress is capped at 3/3. No streak, rest penalty,
PR requirement, Rating increase or Card Evolution requirement applies.

`src/config/rewards.ts` centralizes 10/30/3. `src/rewards/domain.ts` owns calendar,
eligibility, identities and balance/progress derivation. Completion captures local
calendar components and offset; the Monday calendar date is the canonical week ID.
Calendar subtraction uses UTC calendar fields on an already-resolved local date,
not elapsed milliseconds divided into weeks. Persisted days/weeks never move when
the device timezone changes. Current-week UI uses the current device calendar,
refreshing on foreground and every 30 seconds. Travel can change which week is
visible; no retroactive timezone migration occurs.

`ascend.rewards.v1` contains version 1, completion receipts and transactions.
Each receipt retains sessionId, nullable playerId, completedAt, localDay, weekId,
and offsetMinutes, including zero-award sessions. Each transaction additionally
stores id, type, integer amount and createdAt (the factual completion timestamp).
Balance is the sum of transactions, never a separately mutable number. Daily and
weekly identities are JSON ["local-player", localDay or weekId, reward type]. The
app has one local user and permits training before Growth Player initialization;
that initialization must not create a second daily allowance. Actual Player IDs
are audit metadata, not a new ownership account. Receipts also deduplicate session
IDs, preventing a retry with a changed timezone from claiming another day.

One queued repository operation rereads and validates the reward ledger, then
writes receipts and all daily/weekly transactions together in one AsyncStorage
value. Failed writes do not publish success. A subsequent retry rereads durable
state and cannot duplicate a committed identity. Validation reconstructs expected
transactions from reward receipts only; it never scans workout history. Future
balance-rule changes require an explicit compatibility policy for version 1.

Only fresh in-memory completion intents can award. No startup, history, PLAYER,
Growth Debug or Card Evolution scan creates intents. Previously completed sessions
remain unrewarded. An existing active workout may qualify when actually completed.
Pending intents wait for normal Growth finalization (or absence/error of Growth),
then attempt reward persistence and release the existing presentation request.
There is no new Growth retry/reconciliation. Reward failure never rolls back the
saved workout or changes growth. Missing reward storage reads as empty without a
write; corrupt/unreadable/newer data is preserved, displayed as unavailable, and
blocks awards. Explicit retry only retries fresh intents retained in this process.
Termination before reward commit may lose an award; no historical recovery scan
is performed. A successful commit survives restart with no duplicate award.

Factual workout results show committed Daily/Weekly Coins and weekly days; normal
Rating/Card Evolution remains the only full-screen progression presentation.
Rewards do not alter PRs, Ratings, OVR, tiers or presentation consumption. HOME and
SHOP show Coins without spending, inventory or purchases. Phase 4 remains deferred.
