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

Initial conceptual OVR weighting:

STR = 30%

PWR = 20%

END = 20%

CORE = 15%

ATH = 15%

Conceptual formula:

OVR =
STR × 0.30
+ PWR × 0.20
+ END × 0.20
+ CORE × 0.15
+ ATH × 0.15

Do not tightly hardcode this formula into UI components.

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

# 34. Credits

Credits may be earned through:

Workout completion

Weekly Target

Match victory

Season completion

Achievements

Credits purchase cosmetics only.

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
original raw document to a timestamped local backup key. There is no automatic
migration, cloud recovery, encryption, or backup export UI in this phase.

Input bounds limit malformed plans (30 exercises, 20 sets per exercise, names
80 characters). Defaults and bounds are editing constraints, not training advice,
performance scores, or growth formulas. Actual timers, sessions/history, scoring,
PRs, recovery, Form, Skill Tree, and rating changes remain deferred.
