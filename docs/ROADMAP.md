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

## Club identity architecture (Phase 1 only)

- One centralized fictional Japanese Club: Tokyo Zenith.
- Original geometric crest and subtle Home Club identity.
- Optional Club identity props on the full Player Card.
- Compact Career Current Club preview, mock Club details, and locked Transfer Center.
- Typed Club, career tenure, offer, role, and immutable Season Club snapshot contracts.
- No onboarding, calculations, offers, history writes, transfers, or persistence.

Preserve the refined compact Home/Recovery/Shop/legacy layouts, Player Card,
Rival, typography, and five-tab navigation. Club lives inside CAREER.

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

Workout functionality remains the priority. Do not add Club selection, scouting,
interest, transfer logic, or transfer persistence to Phase 2.

## Phase 2A — Exercise & Workout Planning Foundation

Implemented scope:

- Centralized 42-exercise standard library with stable IDs and configurable metadata.
- Custom exercises (My Exercises): create, edit, delete with reference protection.
- Search, body/equipment/tracking filters, and six persisted Recent selections.
- Workout builder: names, exercise ordering, sets, per-set reps/weight/time targets,
  and rest-duration configuration.
- Saved workouts: view, edit, deep duplicate, confirmed deletion.
- Versioned local persistence, validation, failure handling, and recovery backup.
- Clear earned-tier versus appearance-preview semantics on PLAYER.

Acceptance: create/edit custom exercises and saved workouts; targets and recent
selections survive restart/refresh; referenced exercises cannot become dangling;
all three tracking types work; lint, TypeScript, tests, and production export pass.
Physical iPhone/Android keyboard and touch testing remains a manual check.

No actual performance, session completion, timers, history, rating calculations,
AI generation, or Club simulation is included. Stop after Phase 2A.

## Phase 2B — Active Workouts & Actual Performance (deferred)

- Start a session from a copied editable WorkoutPlan.
- Complete sets while retaining both planned targets and actual performance.
- Reps/weight/time entry, workout timer, automatic rest countdown, skip rest.
- Add sets/exercises, skip exercises, and end a session.
- Sounds/haptics and useful workout completion presentation.
- Local actual-performance history, separate from editable Saved Workouts.
- Initial rule-based AI Coach: environment/equipment/time/energy/focus inputs
  produce the same editable plan structure; no external AI API.

Acceptance: complete and save an actual workout on a phone; later edits to a
saved plan or exercise cannot rewrite the recorded session's evidence.
Test the full flow during actual workout-style interaction with minimal typing.

---

# PHASE 3 — PLAYER DEVELOPMENT

## Goal

Connect real-world performance to Player growth.

Produce the performance evidence that the future Phase 4 Club system consumes.
Do not implement Club interest or transfers here.

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

Create weekly and monthly game competition and optional Club career opportunities.

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

## Club Career & Transfer implementation

- Fictional Club catalog and the six league environments.
- First Japanese Club selection after setup/Combine/provisional ratings.
- Club reputation and separate Player standing at their Club.
- Permanent Club tenures and transfer history.
- Transfer Center inside CAREER; no sixth tab.
- Interest using OVR plus profile, consistency, Match/Season, and PR evidence.
- Offers and explicit Accept / Reject / Stay decisions; never automatic transfers.
- Season-end transfer windows, with extensibility for special mid-season offers.
- Club roles and centralized configurable requirements; no physical bonuses.
- Season/Club integration and immutable Club identity on permanent Season Cards.
- Meaningful offer presentation below major Season Victory/Card Evolution events.

## Acceptance

The user can complete a full Season.

Historical cards and Club identity remain unchanged after transfers or catalog edits.
Club changes preserve previous tenures. Staying indefinitely is supported.
Offers cannot grant ratings or encourage unsafe training. All career balancing
values are centralized; recommended OVR is never a hard country/league ladder.

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