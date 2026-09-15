# ASCEND — Native Mobile Development Roadmap

Development proceeds incrementally.

Never automatically begin the next Phase.

---

# PHASE 1 — MOBILE FOUNDATION & VISUAL PROTOTYPE

## Goal

Create a working native-oriented mobile prototype on a physical smartphone.

## Technology

React Native

Expo

TypeScript

Expo Router

## Build

Create main navigation:

HOME

TRAIN

PLAYER

CAREER

SHOP

Use native mobile navigation appropriate for Expo Router.

---

## Visual Theme

Create an original:

futuristic sports game
+
digital training facility

visual identity.

Use:

dark background;

bold typography;

large ratings;

subtle glow;

gradients;

lightweight animations.

---

## Home Prototype

Use mock Player data.

Display:

OVR 58

Weekly Target 2/3

FORM GOOD

Next Match Saturday

RIVAL // 01

Rival OVR 59

Recovery summary

START TODAY'S TRAINING button

---

## Player Card Prototype

Create reusable Player Card.

Support:

Bronze

Silver

Gold

Purple

Also:

Low

Mid

High

visual intensity.

Use lightweight React Native animations.

---

## Rival Prototype

Create lightweight digital human-shaped avatar.

Support configurable:

Blue

Red

Purple

Green

No detailed face required.

---

## Player Page

Display:

Player Card

Athletic Ratings

Body Ratings

placeholder:

Personal Records

Skill Tree

Archetype

---

## Train Page

Prototype:

AI COACH

CUSTOM WORKOUT

Saved Workouts

Workout History

No real workout logic yet.

---

## Career Page

Prototype:

Season 01

Record 2W–1L

Rival

Next Match

placeholder:

Season History

Trophy Room

Past Cards

---

## Shop Page

Prototype:

1,250 CR

Categories:

Background

Border

Aura

Title

Badge

Rival Color

Victory Effect

No purchasing yet.

---

## Physical Device Testing

The application must run on a real smartphone using Expo development tooling.

Check:

touch targets;

safe areas;

bottom navigation;

scrolling;

text readability;

animation performance.

---

## Phase 1 Acceptance

App launches successfully.

All five tabs work.

Player Card works.

Tier/intensity can be changed using mock data.

Rival color is configurable.

App works on physical phone.

TypeScript passes.

No obvious runtime errors.

Do not begin Phase 2.

---

# PHASE 2 — REAL WORKOUT SYSTEM

## Goal

Make ASCEND usable during real workouts.

## Build

Exercise Library

AI Coach initial rule-based generator

Custom Workout

Saved Workouts

Workout History

Workout Session

Reps input

Weight input

Time input

Workout Timer

Automatic Rest Timer

Skip Rest

Sounds

Haptic feedback

Workout completion

Local persistence

## Device Experience

Test during actual workout-style interaction.

Large buttons.

Minimal typing.

Screen remains understandable during timers.

## Acceptance

User can complete and save a full workout on their phone.

---

# PHASE 3 — PLAYER DEVELOPMENT

## Goal

Connect real-world performance to Player growth.

## Build

Initial Combine

Height/Weight

Push-up

Squat

Plank

Athletic Ratings

Body Ratings

OVR

Personal Records

Performance Engine

Diminishing Returns

Progressive Overload

Recovery

Weekly Target

FORM

Skill Tree

Archetype

AI Coach history-based recommendations

## Acceptance

Real improved performance produces explainable Player growth.

Repeated unchanged easy workouts cannot farm unlimited OVR.

---

# PHASE 4 — CAREER MODE

## Goal

Create weekly and monthly game competition.

## Build

Rival generation

Rival growth

Match Day

Match engine

Match rounds

2D battle presentation

sound

haptic impact

particles

Victory/Defeat

Monthly Season

Season Result

Season Card

Career History

Trophy Room

## Acceptance

The user can complete a full Season.

Historical cards remain unchanged.

---

# PHASE 5 — REWARDS & CUSTOMIZATION

## Goal

Complete the reward/collection loop.

## Build

Credits

Shop

Inventory

Backgrounds

Borders

Auras

Titles

Badges

Rival Colors

Victory Effects

Rarity

Drops

Pity system

Workout Complete presentation

OVR UP presentation

Card Evolution

Season Victory presentation

## Acceptance

Rewards provide visual customization without affecting physical Ratings.

---

# POST-V1

Only consider after using ASCEND in real life.

Potential additions:

cloud backup;

Firebase/Supabase;

authentication;

cross-device sync;

LLM-powered AI Coach;

richer exercise library;

advanced recovery;

advanced avatars;

Boss Rivals;

Legacy Matches;

notifications;

Apple Health / Health Connect integration;

social features;

multiplayer.

Do not implement these during V1 unless requirements change.