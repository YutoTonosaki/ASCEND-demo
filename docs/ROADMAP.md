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

## Phase 2A.5 — Workout Data Foundation Audit

Small architecture/stabilization checkpoint; preserve the Phase 2A UI.

- Audit the unified Exercise model, structured equipment and all built-in metadata.
- Correct Dead Hang, Inverted Row, and Jumping Jack taxonomy without changing IDs.
- Keep ordered exercise/set arrays as the source of truth for targets.
- Validate both built-in and custom exercise metadata through a shared validator.
- Isolate repository input/output copies and preserve identity/creation timestamps.
- Retain schema version 1; normalize only missing optional custom metadata and the
  derived Recent cache, with raw backup before any normalized write.
- Test validation boundaries, CRUD/reload, ordering, per-set targets, duplicate
  isolation, failed writes, and unknown/damaged storage.

No Live Workout, actual results, history, AI generation, progression, or game
systems. Phase 2B must copy targets and exercise metadata into independent session
records; recording a session must never mutate a saved template.

## Phase 2B — Live Workout Execution

- Start from saved workout detail, validating and copying the plan and exercise metadata.
- Separate session identity, ordered target snapshots and explicitly confirmed actuals.
- Reps, decimal kg + reps, and manually entered seconds; zero actuals are valid.
- Automatic timestamp-based rest countdown, skip rest, snapshot-order advancement.
- One locally persisted active session, resumable across reloads/tab navigation.
- Atomic final completion, factual summary, minimal completed history/list detail.
- Independent version-1 session key; detached copies, validation and safe recovery.
- Tests for double submission, rest, reload and historical isolation; existing audits.

No AI Coach, game calculations, rewards, analytics, or template schema migration.
See `my-app/docs/PHASE2B_VERIFICATION.md` for checks and device-test limitations.

## Phase 2C — AI Coach Foundation

- Optional three-step profile, environment preferences and baseline references.
- Editable Settings/Coach profile with independent versioned local persistence.
- Pure deterministic automatic and user-directed recommendation engine.
- All-required equipment checks, primary/secondary focus and movement variety.
- Completed-history awareness with conservative matching targets and recent-area cues.
- Explicit unknown-load confirmation; no guessed resistance from measurements.
- Approximate duration, limited count, normal rests and clear infeasible constraints.
- Review → save or existing Workout Builder → existing Phase 2B Live Workout.
- Tests for profile/repository, evidence, constraints, zero, conversion and mobile flows.

No progression, OVR, PRs, rewards, recovery percentages, external AI or new backend.
See `my-app/docs/PHASE2C_VERIFICATION.md` for results, assumptions and limitations.
Exercise stopwatches, sound/haptic cues, and in-session adjustments were not part of
this Coach scope and remain separately scoped future conveniences.

---

# PHASE 3 — PLAYER DEVELOPMENT

## Phase 3A — Personal Records Foundation

- Pure, deterministic PR derivation from validated confirmed workout sets.
- Confirmed active-session prefixes remain eligible; unconfirmed inputs do not.
- Single-set repetition/seconds bests; maximum kg and independent reps at each load.
- Stable exercise identity, separate tracking modes, historical source references.
- First/improved/maintained comparisons and previous-record lookup for Phase 3B.
- PLAYER Personal Records with actual values, empty/loading/error states and load details.
- No migration, independent PR store, Coach changes or dependencies.
- Regression tests, repository reload/template-isolation checks and mobile web checks.

See `my-app/docs/PHASE3A_VERIFICATION.md` for verification and physical iPhone steps.
## Phase 3B — Player Growth & OVR

- Explicit initialization using existing optional Baselines and frozen evidence.
- Six real fractional body ratings with provisional/assessed status; mean-derived OVR.
- Direct configurable first-performance assessment, separate from PR growth.
- Existing PR comparisons, bounded growth, conservative weighted rules, early windows.
- Normalized body allocation, diminishing returns, event/workout/UTC-day caps.
- Completed-session-only distinct-exercise bonus with duplicate prevention.
- Separate validated version-1 Player repository/provider, ledger and retry states.
- Real PLAYER/card/Home ratings; preserve finish preview, PR panel and navigation.
- No retroactive growth from pre-initialization history; no history/profile migration.

See `my-app/docs/PHASE3B_VERIFICATION.md`. Phase 3C-1 presentation is described
below; the remaining systems are deferred.


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

Further progression-aware AI Coach recommendations

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
## Phase 3C-1 — Growth Presentation

Adds only finalized-workout integer Rating UP and OVR UP presentation, separate
consumed-ID persistence and at-most-once lifecycle. Existing Phase 3B calculations
and player schema remain unchanged. See `my-app/docs/PHASE3C_1_VERIFICATION.md`.
Card evolution, sound, Coins, weekly rewards and remaining Phase 3C work are deferred.

## Phase 3C-2 — Card Evolution

Shared OVR-derived tiers/finishes, earned PLAYER/Home cards, final ASCEND treatment,
compact next-evolution information and a Card Evolution section in the existing
consumed completion presentation. No growth/schema migration or new dependencies.
See `my-app/docs/PHASE3C_2_VERIFICATION.md`. Consistency rewards are covered by Phase 3C-3 below.

## Phase 3C-3 — Consistency Rewards

Daily +10 / three-distinct-local-days weekly +30, independent durable reward ledger,
factual completion rewards, real HOME weekly progress and HOME/SHOP balance.
No purchases, inventory, streak penalties or physical Rating effects. Verification
and remaining device checks: `my-app/docs/PHASE3C_3_VERIFICATION.md`. Phase 3C
implementation is complete after automated verification; Phase 4 is not started.
