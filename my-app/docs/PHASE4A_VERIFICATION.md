# Phase 4A — Career Foundation & Club System

## Scope and architecture

The real CAREER screen replaces the old mock Season record/Rival preview with
not-started onboarding or a persisted current-Club dashboard. Twelve fictional
Clubs reuse the original SVG crest renderer and dark ASCEND UI. Tokyo Zenith's
established identity is retained. Reputation and recommended OVR are informational
only; Club affiliation never enters PR, Growth, OVR, Card Tier, Coach or Coin rules.
No dependency, Match, Season engine, Transfer command or Shop purchase is added.

| Environment | Clubs (reputation / recommended OVR) |
| --- | --- |
| Japan | Tokyo Zenith (1 / 45), Osaka Forge (2 / 50), Yokohama Nova (3 / 58) |
| England | London Crown (5 / 88), Northbridge United (2 / 53) |
| Germany | Berlin Einheit (3 / 64), Munich Adler (5 / 86) |
| Spain | Madrid Solaris (4 / 77), Valencia Orbit (2 / 55) |
| Italy | Milano Veloce (4 / 78) |
| France | Paris Élan (5 / 87), Lyon Apex (3 / 63) |

Catalog fields retain stable IDs, original vector geometry, colors, names, short
names, country and generic uppercase league identifier. Lowercase `environment`
identifiers are added. `preferredAttributes` uses the existing six BodyArea values;
`preferredArchetypes` remains empty because no real archetype system exists. These
are unused future preference metadata, not scouting or rating modifiers. Reputation
1–5 means development, growing competitive, established, high-level and elite.

## Career storage and invariants

`ascend.career.v1` stores:

```
{ version: 1, career: {
  playerId,
  clubHistory: [{ clubId, joinedAt, leftAt: null }]
} }
```

Missing storage loads `{version:1, career:null}` without writing. The first join
requires an existing initialized Growth Player ID; a user without one is directed
to PLAYER for explicit initialization. No Player is implicitly initialized and
no Club is inferred from old mock content. No OVR requirement applies.

Current Club/joinedAt are derived from the last history entry, avoiding a second
mutable currentClubId. Validation requires known stable catalog IDs, valid ISO
machine timestamps, exactly one open final tenure, nonnegative closed tenures and
contiguous boundaries. Unknown IDs or contradictions fail closed. Future history
entries are structurally supported, but no transition command is implemented.

Inspecting a club, backing out or opening a profile writes nothing. JOIN CLUB is
the only mutation. It queues a fresh storage read, creates one complete Career
document, captures the confirmation commit-attempt timestamp, and publishes only
after successful writing. Repeated confirmations return the saved Career rather
than duplicating history or switching clubs. A different Player ID cannot take over.
The repository writes only the Career key. Results are detached from stored state.

Corrupt, unsupported or unreadable data remains intact and blocks writes. A failed
join displays an independent retryable error, never claims membership and never
resets Player, workouts, PRs, Coins or presentation consumption. Explicit retry loads
again; if the failed attempt actually committed, it discovers the existing Career.
No reset/change-club control is exposed. Storage uses the same single-app-instance
queued AsyncStorage boundary as existing repositories, not a multi-device database.

## UI and compatibility

START CAREER opens the existing safe-area full-screen Sheet with three Japanese
choices. INSPECT opens the club details and JOIN confirmation. Active CAREER shows
current affiliation, an expandable profile, real OVR/tier, Club Member status and
joined/history dates. Season, Match and Transfer Center are Coming Soon only.

HOME/PLAYER read the same optional Career identity; no fake Tokyo Zenith appears
before joining. Club identity remains secondary to OVR and the earned card. The
Card Evolution view also receives this identity, without altering its snapshots,
thresholds, controller, repository or consumed IDs. Opening/joining Career does not
request Growth reconciliation or a progression presentation. Coins remain unchanged.

## Files

- `src/config/clubs.ts`, `src/types/club.ts`: expanded static catalog and metadata.
- `src/career/domain.ts`: state, parsing, initial selection and current derivation.
- `src/storage/career-repository.ts`: isolated queued load/join persistence.
- `src/career/provider.tsx`: root state, actions, errors and Player identity guard.
- `src/app/_layout.tsx`: CareerProvider inside GrowthProvider.
- CAREER rewritten; HOME and PLAYER use persisted affiliation.
- `src/components/player/rating-up.tsx`: optional current Club on evolved card.
- Removed obsolete `src/data/club-career.ts` mock.
- `tests/career.test.cjs`, `tests/browser-career.cjs`; strengthened browser-cards
  coverage for unchanged Club identity across tiers and evolution.
- README, Product Spec, Game System section 51, Roadmap and game architecture notes.

## Verification

- `npm test`: **220 passed, 0 failed** (200 existing + 20 Career/catalog tests).
- `npm run typecheck`: passed. `npm run lint`: passed with no new warnings.
- `env -u NO_COLOR CI=1 npx expo export --platform all --max-workers 1 --output-dir /tmp/ascend-career-export`:
  passed; iOS/Android Hermes bundles and 13 static web routes generated. An earlier
  export was interrupted; the complete rerun succeeded.
- `browser-career`: passed not-started state, Player initialization prerequisite,
  three Japanese options, inspect/back with zero writes, explicit confirmation,
  injected Career-only write failure/retry, double tap, one permanent tenure,
  current profile, HOME/PLAYER consistency, unchanged Player/reward/session storage,
  PR/history accessibility, reload, corrupt/newer schema preservation, 320px,
  enlarged text and reduced motion. No browser page exceptions occurred.
- Existing `browser-growth`, `browser-records`, `browser-input`, `browser-audit`,
  `browser-overlays`, `browser-sessions`, `browser-coach`, `browser-presentation`,
  `browser-cards` and `browser-rewards`: all passed against the production export.
- `browser-cards` now also verifies persisted Tokyo Zenith on earned card tiers
  and the new evolution card, without changing Career storage. Its initial run
  cleared the isolated Career fixture before the evolution scenario; restoring
  that fixture after the test reset fixed the test. Product code and existing
  assertions were not weakened. The focused rerun passed, including consumed-ID
  persistence and unchanged reward balance after restart.
- Development `browser-growth-debug`: passed, including zero storage writes on
  open/refresh, unchanged saved data and production debug-entry absence.
- Visually inspected 320px active Career, expanded profile, 1.5x browser text
  approximation and evolved-card screenshots. No horizontal overflow in the
  verified flows. Existing overlay regression checks simulated safe areas; native
  VoiceOver, Dynamic Type and iPhone safe areas still require device verification.
- `git diff --check`: passed. PR/Growth/Rewards/Coach/Session domain/provider files,
  Player/session repositories and presentation consumption are unchanged from
  the pre-Career commit. The evolved-card UI only receives optional Club identity.
- Development Metro retains the existing SVG `accessible={false}` React warning.
  This is not a new Career calculation/persistence warning. No new type/lint/export
  warning was reported; no unrelated dependency upgrade was made.
- Playwright is external QA tooling, not an app dependency. Most checks used
  `/tmp/ascend-rewards-qa`; after temporary tools were cleaned up, the final card
  rerun used `NODE_PATH=/tmp/ascend-phase4a-qa/node_modules` and
  `PLAYWRIGHT_BROWSERS_PATH=/tmp/ascend-phase4a-qa/browsers` with `ASCEND_QA_URL`
  pointing to the served export. Development Debug additionally uses Metro and
  `ASCEND_QA_PROD_URL`.
- Physical iPhone testing has **not** been performed for Phase 4A. Prior user
  verification of Phase 3C does not verify Career onboarding.

## Limitations and Phase 4B hand-off

History retains stable Club IDs and tenure dates permanently. This phase resolves
names/crests from the catalog; retain catalog IDs. Future immutable Season Cards
need copied Club identity snapshots before historical presentation is introduced.
There is no catalog editing UI, multi-account switch, cloud sync or transfer method.
The Player initialization prerequisite avoids inventing an identity or silently
writing Growth state. Club dates represent the successful commit attempt, not an
invented Season ID or a device-independent server timestamp.

Phase 4B may add a separately versioned Season lifecycle consuming Career affiliation
and existing factual Player evidence. It must preserve tenure history and avoid
rewriting Player data. Match, Rival generation, Transfers, roles, trophies and Career
rewards are deliberately not implemented here.

## Physical iPhone Expo Go checks

Physical-device verification has not been performed for Phase 4A.

1. `cd my-app` then `npx expo start --go --lan`; open the bundle in compatible Expo
   Go on the same Wi-Fi. Preserve existing data.
2. Check saved workouts, PRs, OVR/tier, Growth Debug, Coins and weekly progress.
   HOME/PLAYER must not show an automatically assigned Club.
3. Open CAREER: expect CAREER NOT STARTED. If Player is not initialized, use OPEN
   PLAYER and the existing explicit initialization flow; Career must remain missing.
4. START CAREER: inspect all three Japanese choices, including a recommendation
   above your OVR. BACK/CLOSE must not join or write Career data.
5. Inspect your chosen club and explicitly JOIN CLUB. Confirm current Club, country,
   reputation, expandable profile, real OVR/tier, Club Member and local joined date.
   No growth, Coins, Rating UP or evolution should occur merely from joining.
6. HOME and PLAYER must show the same Club. Confirm unchanged PRs/workout history,
   OVR, earned Card Tier, Coins and weekly progress. Growth Debug remains read-only.
7. Navigate away/back, Expo Reload and restart. Affiliation and one history entry
   remain. Initial selection/change/reset controls must not be available.
8. Continue normal workouts. Training, Coach, rewards and progression presentations
   should work normally; an evolved card retains Club identity.
9. Check a small iPhone with larger system text, VoiceOver and Reduce Motion: Sheet
   top/bottom safe areas, meaningful action labels, scrolling and reachable controls.

Do not corrupt/reset real phone storage to test failure; isolated tests cover that.
High Card Tier fixtures are synthetic QA only, never fabricated real workout data.
Stop after Phase 4A; do not begin Phase 4B automatically.
