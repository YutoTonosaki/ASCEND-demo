# ASCEND — Product Specification

# 1. Product Vision

ASCEND turns real-world fitness into a personal sports Career Mode.

The user creates a Player representing themselves.

Real physical performance determines Player development.

The experience combines:

- fitness tracking;
- player ratings;
- progression;
- Skill Trees;
- weekly Rival competition;
- monthly Seasons;
- collectible Player Cards;
- cosmetic customization.

The primary purpose is to help maintain long-term motivation for exercise.

---

# 2. Target Experience

ASCEND should feel like:

A FUTURISTIC SPORTS CAREER GAME
+
A DIGITAL TRAINING FACILITY

The UI should be:

- dark;
- modern;
- athletic;
- game-like;
- lightweight;
- easy to operate during exercise.

Numbers should be visually important.

Examples:

OVR 58

FORM GOOD

MATCH IN 2 DAYS

WEEKLY TARGET 2 / 3

Avoid excessive text during normal use.

---

# 3. Initial Player Creation

The user creates themselves as a Player.

Basic information:

- Player Name
- Height
- Weight

The user then performs an Initial Combine.

---

# 4. Initial Combine

The Initial Combine must be:

- possible at home;
- equipment-free;
- beginner-friendly;
- approximately five minutes;
- only 2–3 exercises.

V1 tests:

1. Push-up
2. Bodyweight Squat
3. Plank

The results create an initial estimate of Player ability.

The Combine is not expected to perfectly measure the entire body.

Areas that cannot be measured reliably initially may use estimated baseline values.

As real workout history accumulates, actual performance data becomes more important than the Initial Combine estimate.

---

# 5. Player Ratings

Athletic Ratings:

OVR — Overall Rating

STR — Strength

PWR — Power

END — Endurance

CORE — Core strength and stability

ATH — General athletic ability

FORM is separate from OVR.

Consistency is also separate from long-term physical ability.

---

# 6. Body Ratings

V1 Body Ratings:

- Chest
- Back
- Shoulders
- Arms
- Core
- Legs

Future versions may subdivide Legs into:

- Quads
- Hamstrings
- Glutes
- Calves

---

# 7. Player Card

The Player Card visually represents the Player's current ability.

Display:

- OVR
- Player Name
- STR
- PWR
- END
- CORE
- ATH
- Archetype/Title
- optional Badge

The Card evolves as OVR increases.

General progression:

BRONZE
→ SILVER
→ GOLD
→ PURPLE / ELITE
→ ASCEND

Exact OVR boundaries remain configurable and may be balanced later.

---

# 8. Card Evolution Within Tiers

Cards should evolve visually even before reaching the next major tier.

Example:

Low Bronze:
simple bronze appearance.

Mid Bronze:
slightly brighter material.

High Bronze:
subtle shimmer and particles.

Very High Bronze:
stronger sparks/glow indicating proximity to Silver.

The same concept applies to Silver, Gold and Purple.

Crossing into a new major Card Tier should trigger a stronger Card Evolution presentation.

---

# 9. ASCEND Card

OVR 99 represents the ultimate long-term progression state.

It may unlock a special:

ASCEND CARD

This should have a unique visual identity separate from normal tiers.

99 should be intentionally difficult to reach.

---

# 10. Training Modes

TRAIN contains two primary modes:

AI COACH

CUSTOM WORKOUT

Also:

SAVED WORKOUTS

WORKOUT HISTORY

---

# 11. AI Coach

AI Coach should generate training based on the user's actual history and Player state.

Inputs may include:

- current Athletic Ratings;
- Body Ratings;
- exercise history;
- Personal Records;
- previous workout performance;
- exercises performed this week;
- body areas already trained this week;
- body areas not trained this week;
- recovery status;
- Home/Gym;
- available equipment;
- available time;
- energy level;
- preferred body areas;
- body areas the user wants to avoid;
- Skill Tree progress;
- current Rival strengths and weaknesses.

The system should not simply generate a generic workout from scratch every time.

---

# 12. Progressive Training

AI Coach should normally attempt gradual progression.

Example history:

Push-up

Workout 1:
12 / 12 / 10

Workout 2:
12 / 12 / 12

Workout 3:
14 / 13 / 12

The next recommendation should be based on demonstrated ability.

The system may recommend:

- slightly more repetitions;
- slightly more resistance;
- an additional set where appropriate;
- a harder exercise progression.

Large arbitrary jumps should be avoided.

---

# 13. Workout Environment

Before generating a workout, the user may specify:

LOCATION

HOME
GYM
ANYWHERE

TIME

10 MIN
20 MIN
30 MIN
45 MIN

ENERGY

LOW
NORMAL
HIGH

The user may also select:

TRAIN TODAY

and

AVOID TODAY

for body areas.

---

# 14. Custom Workouts

The user can manually create and save workouts.

Examples:

Chest Day

Upper Body

Quick 15

Home Full Body

Custom workouts use the same performance/progression system as AI workouts.

---

# 15. Workout Interface

Workout operation should require minimal text input.

Primary measurement types:

REPETITIONS

WEIGHT

TIME

Example:

PUSH-UP

SET 1 / 3

TARGET
12 REPS

[-] 12 [+]

[ COMPLETE SET ]

If the user completes exactly the target, no editing is necessary.

If they perform 10 instead of 12, they tap minus twice.

---

# 16. Rest Timer

After completing a set, Rest Timer begins automatically.

Example:

REST

00:58

[ SKIP REST ]

When the timer finishes:

- play a short sound;
- provide haptic feedback where supported.

---

# 17. Timed Exercises

Exercises such as Plank use an integrated timer.

Example:

PLANK

TARGET
00:45

[ START ]

The interface should be usable with sweaty hands and minimal attention.

Buttons should therefore be large and touch-friendly.

---

# 18. Workout Completion

Workout completion should feel rewarding.

Potential sequence:

WORKOUT COMPLETE

→ performance grade
→ XP
→ Credits
→ rating changes
→ Personal Record
→ Skill progression
→ cosmetic Drop
→ OVR increase if applicable

Use:

- animation;
- short music/audio;
- haptic feedback;
- particles;
- number transitions.

Keep the sequence relatively short.

---

# 19. Personal Records

ASCEND tracks meaningful Personal Records.

Examples:

Push-up maximum repetitions

Pull-up repetitions

Plank duration

Bench Press performance

Squat performance

PRs provide strong evidence of real improvement.

---

# 20. Skill Tree

Skill Trees exist by body area / movement progression.

They can be viewed manually from PLAYER.

They may also automatically appear when:

- Skill Level increases;
- new movement is unlocked.

Example:

Push-up
↓
Diamond Push-up
↓
Decline Push-up
↓
Archer Push-up
↓
One-arm Push-up progression

Unlocks depend primarily on demonstrated performance.

Bodyweight and gym progression paths may coexist.

---

# 21. Archetype

The Player may receive an Archetype based on their actual development.

Examples:

POWERHOUSE

IRON ENGINE

ALL-ROUNDER

UPPER BODY SPECIALIST

BALANCED ATHLETE

The Archetype should emerge from Player data rather than being purely cosmetic.

---

# 22. Recovery

ASCEND tracks simplified recovery by body area.

Possible states:

READY

MODERATE

RECOVERING

Example:

Chest — Recovering

Back — Ready

Shoulders — Moderate

Arms — Ready

Core — Ready

Legs — Ready

AI Coach should consider recovery when generating workouts.

---

# 23. Weekly Target

ASCEND prioritizes Weekly Consistency rather than Daily Streaks.

Example:

WEEKLY TARGET

3 WORKOUTS

MON REST

TUE COMPLETE

WED REST

THU COMPLETE

FRI REST

SAT COMPLETE

3 / 3

Rest days do not automatically break progression.

The Weekly Target should generally be established near the beginning of the week.

---

# 24. Form

FORM represents current weekly preparation.

Example:

POOR

LOW

GOOD

EXCELLENT

FORM affects Match performance.

It does not permanently increase OVR.

Completing the Weekly Target should generally be enough for excellent preparation.

Training excessively should not provide unlimited Form bonuses.

---

# 25. Comeback

ASCEND should encourage returning after inactivity.

Instead of:

STREAK LOST

the user may receive:

COMEBACK

WELCOME BACK

Bonus XP

Bonus Credits

Comeback rewards should have a cooldown to prevent deliberate exploitation.

---

# 26. Rival

V1 uses one Rival at a time.

No league or multiplayer is required.

The Rival is represented by a simple digital human-shaped opponent.

Visual direction:

- full-body silhouette;
- minimal facial detail;
- digital/futuristic;
- lightweight;
- configurable color.

Season colors may include:

Blue

Red

Purple

Green

The visual concept should be original and must not copy an existing anime/game character.

---

# 27. Rival Ability

Rivals have:

- OVR
- STR
- PWR
- END
- CORE
- ATH
- Body Ratings
- FORM

Rivals should have identifiable strengths and weaknesses.

Example:

YOU

OVR 61

STR 65
PWR 59
END 57
CORE 64
ATH 60

RIVAL

OVR 62

STR 61
PWR 64
END 62
CORE 58
ATH 63

This creates strategic motivation for training.

---

# 28. Rival-Aware Training

AI Coach may use the current Rival as one training input.

Example:

Rival Shoulders: 63

Player Shoulders: 61

AI Coach may explain:

"Your Rival currently has an advantage in Shoulders. Training Shoulders this week could close the gap."

The user must remain free to choose another workout.

---

# 29. Match Day

The user selects their preferred Match Day.

Options:

FRIDAY

SATURDAY

SUNDAY

The day can be adjusted because real-world schedules vary.

The main rule is approximately one Rival Match per week.

---

# 30. Match Presentation

Matches should visually feel like a battle.

They should not simply display:

YOU 6
RIVAL 4

Use lightweight 2D presentation.

Example:

MATCH INTRO

YOU VS RIVAL

ROUND 1
STRENGTH

avatars collide

haptic impact

YOU 65
RIVAL 61

ROUND WON

then:

POWER

ENDURANCE

CORE

ATHLETICISM

BODY BATTLE

FINAL ROUND

VICTORY / DEFEAT

Possible effects:

- avatar movement;
- impact animations;
- screen shake;
- particles;
- flashes;
- short sound effects;
- haptic feedback.

No 3D engine is required.

---

# 31. Season

One calendar month equals one Season.

Example:

SEASON 01

WEEK 1 — WIN

WEEK 2 — LOSS

WEEK 3 — WIN

WEEK 4 — WIN

FINAL RECORD

3W — 1L

The next calendar month begins a new Season.

---

# 32. Season Rival

Each new Season may introduce a new Rival.

Rival appearance can change primarily through body color.

Detailed character creation is not required.

---

# 33. Season Card

At Season completion, ASCEND permanently stores a snapshot of the Player.

Example:

SEASON 01 CARD

OVR 61

STR 65

PWR 59

END 57

CORE 64

ATH 60

This card never changes afterward.

Every month creates another historical version of the Player.

Cards are saved whether the Season is won or lost.

---

# 34. Career History

CAREER displays previous Season Cards.

Example:

SEP
OVR 61
WIN

OCT
OVR 64
WIN

NOV
OVR 66
LOSS

DEC
OVR 68
WIN

This creates a visual history of the user's real physical development.

---

# 35. Trophy Room

Potential achievements:

FIRST PR

10 WORKOUTS

100 WORKOUTS

OVR 60

OVR 70

3 SEASONS WON

1 YEAR CAREER

Season victories can also create trophies.

---

# 36. Credits

ASCEND contains an in-game currency.

Temporary name:

CR — Credits

Credits are earned through gameplay.

Potential sources:

- workouts;
- Weekly Target;
- Matches;
- Season completion;
- achievements.

Credits purchase cosmetic content.

---

# 37. Cosmetics

Player Card / game customization categories:

CARD BACKGROUND

BORDER

AURA

TITLE

BADGE

RIVAL COLOR

VICTORY EFFECT

Customization should remain relatively simple to keep the application lightweight.

---

# 38. Rarity

Cosmetics can have rarity.

COMMON

UNCOMMON

RARE

EPIC

LEGENDARY

Rare items may have stronger visual effects.

Rarity has no direct effect on physical Player ability.

---

# 39. Cosmetic Drops

Completing workouts may occasionally produce a cosmetic Drop.

Example:

RARE DROP

BLUE FLAME

AURA

[EQUIP]

Random Drops create surprise without being tied to monetization.

A protection/pity system may later prevent excessively long unlucky streaks.

---

# 40. Main Navigation

Five primary sections:

HOME

TRAIN

PLAYER

CAREER

SHOP

---

# 41. Home

HOME should emphasize what matters today.

Display:

- current OVR;
- Player Card summary;
- Weekly Target;
- FORM;
- next Match;
- Rival;
- recovery;
- Start Training CTA.

---

# 42. Train

TRAIN contains:

AI COACH

CUSTOM WORKOUT

SAVED WORKOUTS

WORKOUT HISTORY

---

# 43. Player

PLAYER contains:

PLAYER CARD

ATHLETIC RATINGS

BODY RATINGS

PERSONAL RECORDS

SKILL TREE

ARCHETYPE

---

# 44. Career

CAREER contains:

CURRENT SEASON

RIVAL

MATCH

SEASON HISTORY

TROPHY ROOM

PAST PLAYER CARDS

---

# 45. Shop

SHOP contains:

CREDIT BALANCE

BACKGROUND

BORDER

AURA

TITLE

BADGE

RIVAL COLOR

VICTORY EFFECT

---

# 46. Mobile Experience

ASCEND is primarily a smartphone application.

Design around:

- one-handed use where practical;
- large tap targets;
- vertical layouts;
- safe areas;
- haptic feedback;
- workout timers;
- short audio cues;
- smooth animations;
- minimal typing.

The app should feel natural on a physical phone, not like a desktop website placed inside a phone.

---

# 47. V1 Philosophy

V1 should focus on the core loop:

TRAIN
→ RECORD PERFORMANCE
→ DEVELOP PLAYER
→ PREPARE FOR RIVAL
→ MATCH
→ SEASON
→ CAREER HISTORY
→ REPEAT

Do not prioritize feature quantity over usability.