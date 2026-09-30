# ASCEND

ASCEND is a mobile-first gamified fitness application that turns real-world physical training into a player career progression game.

The user is the Player.

Real-world workouts improve the Player's demonstrated abilities. Those abilities affect Player Ratings, OVR, Skill progression, weekly Rival Matches, and monthly Seasons.

The central gameplay loop is:

REAL TRAINING
→ PERFORMANCE
→ PLAYER DEVELOPMENT
→ WEEKLY RIVAL MATCH
→ MONTHLY SEASON
→ CLUB CAREER / REPUTATION & INTEREST
→ TRANSFER OFFERS
→ CHOOSE A NEW CLUB OR STAY
→ PERMANENT CAREER HISTORY

Train in real life → improve your Player → compete against Rivals → build your
Club career → receive opportunities → create a permanent career history.

Club Career uses original fictional Clubs across Japan, England, Spain, Germany,
Italy, and France. Careers eventually start with a freely chosen Japanese Club.
Transfers are always optional; staying is equally valid. Club reputation and roles
never grant physical rating bonuses. Phase 1 shows mock Club identity only; the
dynamic Club and Transfer system belongs to Phase 4, after workouts and progression.

ASCEND is currently designed primarily as a personal single-user application.

---

# Product Goal

Traditional workout trackers often focus on:

- calories;
- workout logs;
- streaks;
- generic fitness statistics.

ASCEND instead presents fitness as character/player development.

The objective is to make the user want to return because they are developing their Player, preparing for the next Rival Match, unlocking skills, improving their Player Card, and building a long-term Career.

The application must remain useful as an actual workout tool.

Game mechanics must support real training rather than replace it.

---

# Core Principles

## 1. Real improvement drives Player improvement

Physical Ratings must primarily represent demonstrated physical performance.

Simply opening the app or repeating an easy workout indefinitely must not create unlimited OVR growth.

---

## 2. Low-friction workout recording

The application will often be used while exercising.

Workout interaction should therefore require minimal typing.

Prefer:

- large buttons;
- +/- controls;
- timers;
- automatic rest timers;
- simple taps;
- vibration/haptic feedback;
- short sounds.

---

## 3. Flexible training

ASCEND must support:

- home workouts;
- bodyweight training;
- gym workouts;
- weighted exercises;
- short workouts;
- longer workouts.

The user should not be forced into a rigid workout schedule.

---

## 4. Recovery is legitimate

Rest days must not automatically be treated as failure.

ASCEND primarily uses weekly consistency rather than daily workout streaks.

---

## 5. Multiple motivation horizons

ASCEND provides goals at several timescales.

Workout:
complete today's session.

Weekly:
prepare for and defeat the Rival.

Monthly:
win the Season and create a permanent Season Card.

Long-term:
develop the Player and build Career History.

---

## 6. Cosmetics do not create physical ability

Credits and cosmetic items may modify appearance.

They must never directly purchase:

- OVR;
- STR;
- physical performance;
- Match victories.

Real-world improvement remains the source of physical Player progression.

---

## 7. Lightweight application

Avoid unnecessary complexity.

Do not add:

- heavy 3D engines;
- multiplayer;
- social systems;
- cloud infrastructure;
- large dependencies;

unless future requirements justify them.

---

# Technology Direction

ASCEND is a native-oriented mobile application.

Initial technology:

- React Native
- Expo
- TypeScript
- Expo Router
- local-first persistence
- lightweight React Native animations
- SVG where useful

Primary target:

- iPhone
- Android

Development and testing should be possible using Expo tooling and physical devices.

---

# V1 Storage

V1 is local-first.

Player data, workouts, progression and game state should initially be stored on the device.

Cloud synchronization is not required for the initial development phases.

The architecture should allow Firebase, Supabase, or another backend to be introduced later without rewriting the UI.

---

# Not Required Initially

Do not add unless explicitly requested:

- Firebase
- Supabase
- authentication
- OpenAI API
- backend server
- multiplayer
- social network
- online leaderboard
- 3D engine

---

# Main Navigation

ASCEND uses five primary sections:

HOME

TRAIN

PLAYER

CAREER

SHOP

---

# Documentation

Before implementing features, read:

- `README.md`
- `docs/PRODUCT_SPEC.md`
- `docs/GAME_SYSTEM.md`
- `docs/ROADMAP.md`

These documents are the source of truth.

---

# Development Rule

Development proceeds incrementally.

Do not automatically implement future phases.

When implementing a phase:

1. read all project documentation;
2. inspect the existing codebase;
3. implement only the requested phase;
4. keep future phases architecturally possible;
5. avoid unnecessary dependencies;
6. test the application;
7. verify TypeScript;
8. report changes;
9. stop before the next phase.
## Current application — Phase 3C-2

The native Expo application is in [`my-app`](./my-app/README.md). Run it on your
phone from this repository root:

```sh
cd my-app
npm ci
npx expo start --go --lan
```

Scan the QR code with a compatible Expo Go app on the same Wi-Fi network.
The root Next.js files are the earlier web prototype; they are not the mobile
application. Use the commands in `my-app/README.md` for current development.


### Training foundation

Phase 2A adds a 42-exercise library, custom exercises, recent selections, an
editable workout builder, and saved workouts in the existing native app.
Targets support repetitions, kilograms + repetitions, and seconds, with separate
per-set targets and configurable rest. These are plans, not recorded performance.

Training data is stored locally through an AsyncStorage repository with schema
validation and serialized writes. No account, backend, or API is required.
Player/Career values remain illustrative. Phase 2B adds saved-workout execution,
rest countdowns, resumable sessions, and factual history; physical progression
remains Phase 3.

See [`my-app/README.md`](./my-app/README.md) for architecture and verification.

Phase 2A.5 audits the existing training foundation: shared exercise validation,
corrected V1 movement metadata, detached repository copies, and conservative
version-1 data normalization. It is a stabilization checkpoint before Live Workout;
it did not introduce execution or progression.

Phase 2B records confirmed reps, kg + reps, or seconds independently of targets.
Sessions copy exercise metadata and survive later template/catalog changes.
One active workout resumes from TRAIN after reload; completed sessions appear in
Workout History. Session storage uses `ascend.sessions.v1` independently of plans.
See [Phase 2B verification](my-app/docs/PHASE2B_VERIFICATION.md).


Phase 2C adds a local, deterministic AI Coach: optional profile/baseline setup,
equipment- and history-aware proposals, explicit unknown-load confirmation, and
review/customization through the existing workout builder. Proposals, saved plans,
and historical sessions remain separate. No external AI API or progression engine.
See [Phase 2C verification](my-app/docs/PHASE2C_VERIFICATION.md).


Phase 3A adds exercise-specific Personal Records on PLAYER, derived from confirmed
session sets (including persisted confirmed sets in the active workout). Reps and
seconds use a single-set maximum; weighted records keep maximum kg and best reps
at every recorded load. No independent PR storage, migration, growth or rewards.
See [Phase 3A verification](my-app/docs/PHASE3A_VERIFICATION.md).


Phase 3B adds explicit Player initialization from optional existing Baselines,
provisional/assessed body ratings, bounded PR-based fractional growth and mean-body
OVR. Player state and the duplicate-prevention ledger use `ascend.player.v1`;
pre-initialization history remains PR evidence without retroactive growth.
See [Phase 3B verification](my-app/docs/PHASE3B_VERIFICATION.md).
Phase 3C-1 adds integer Rating UP / OVR UP presentation only; see
[verification](my-app/docs/PHASE3C_1_VERIFICATION.md). Career, Match, rewards,
Shop and rewards remain deferred. Phase 3C-2 adds earned Card Evolution; see
[verification](my-app/docs/PHASE3C_2_VERIFICATION.md).

## Phase 3C-3 — Consistency Rewards

The native app awards Daily Workout +10 Coins and weekly three-distinct-day +30
Coins from fresh, saved completions only. HOME uses real weekly days and HOME/SHOP
show the persisted balance. Coins do not affect physical progression and cannot
be spent. See `my-app/docs/PHASE3C_3_VERIFICATION.md` for verification and limits.
