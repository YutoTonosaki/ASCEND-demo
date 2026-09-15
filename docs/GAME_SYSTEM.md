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

Future Player progression must not modify old Season Cards.

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