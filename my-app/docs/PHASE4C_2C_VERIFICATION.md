# Phase 4C-2C — Career Match History & Season Integration

## Audit and scope

Read AGENTS.md and the applicable Expo SDK 57 reference. Inspected the actual Match
schema/calendar/provider/repository, Rewards schemas and validated transaction
references, Career/Season identities and snapshots, root navigation, safe-area modal
and Sheet controls, localization and existing test fixtures before editing. The
working tree was clean at the beginning; no unrelated changes were overwritten.
No dependency, platform configuration, persistence schema or storage key is added.

The existing Weekly Rival Match panel remains the only PLAY entry point. CAREER now
places Current Club → Weekly Rival Match → Match History → Season Overview, retaining
its existing Player status, Club history and future Transfer placeholder. This phase
adds read-only history/detail and Season associations, not a new Match database.

## Sources and architecture

- `ascend.matches.v1` via the existing MatchProvider supplies all authoritative
  snapshots, optional skippedAt, immutable results and lifecycle timing.
- `ascend.rewards.v1` via RewardsProvider supplies already validated workout/Match
  transaction unions. Reward IDs/result/owner/amount are cross-checked as established
  by 4C-2B; history does not create a receipt or request payment.
- `src/matches/history.ts` contains pure scope/order/payment/Season/statistics
  selectors. `historyAt` accepts an injected clock; UI reuses existing `matchStatus`
  through the Provider. There is no second lifecycle or resolution engine.
- `src/matches/use-history.ts` is a memoized read-only context adapter. It checks
  current Player/Career identity and existing errors before exposing rows. Ownership
  mismatches fail closed, and no old row is shown after a scope change.

There is no Repository call, effect, refresh, reconciliation, initialization or
persistence operation in the new history components/selectors. Existing root
startup/foreground services retain their normal behavior, including first eligible
access Rival generation and recovery of genuinely unpaid completed Match rewards.
Those services are independent of opening a history card.

## History and details

A compact CAREER section opens a full-screen safe-area modal with a virtualized
FlatList: reverse target-week order, stable Match keys, eight initial/batch rows and
bounded rendering window. Cards are memoized. Every saved record for the current
Player/Career is available; no missing weeks or sample data are inserted.

Rows show the frozen training Monday, Rival name/Club/OVR, Player Club snapshot,
lifecycle or WIN/DRAW/LOSS, saved result powers, and confirmed or pending/unavailable
payment. SKIPPED remains distinct from LOSS; READY and PENDING_EVIDENCE are not
outcomes. No replay, PLAY or CLAIM is present in history.

Selecting a row switches content within the same modal surface. Fixed BACK/CLOSE
controls stay outside the scrollable detail. Selection retains only a Match ID;
the row is resolved from the current validated scope on each render, avoiding a
retained stale detail snapshot after ownership/source changes.

Detail sections show:

- Rival: saved name/Club, OVR, Condition and localized difficulty.
- Player: saved Club, week-end OVR, goal, qualifying days/dates and Weekly Bonus.
- Match: frozen training week, unlock/exclusive expiration, lifecycle/outcome,
  powers and resolution time.
- Reward: expected amount from the shared existing outcome constants, pending vs
  confirmed payment, and actual paid Coins only when validated evidence exists.

Completed powers come from the immutable result. For a non-completed Match with
valid week-end evidence, Player power is its stored value and Rival power is the
saved Rival OVR plus saved Condition. Without week-end evidence, unavailable labels
replace both powers/OVR/day counts/bonus; current Player ratings are never substituted.
The goal is always the saved goal. No outcome is inferred or resolved by rendering.
Ordinary UI does not expose internal IDs, Growth decimals or debug metadata.

## Season association and statistics

`matchMonth` reads the month prefix of the already canonical target Monday
`match.week.weekId`. Association also requires identical Player ID and Career start
identity. It never uses resolution/payment date, current timezone or Club catalog
lookups. A September 28 week belongs to September even when played/paid in October.
No Season is created if its corresponding month has no actual Season record.

Existing active Season and completed Season detail each include a compact Match
statistics section. These are live read-only joins, separate from frozen `end.stats`:

- Played = WIN + DRAW + LOSS.
- SKIPPED does not contribute to played or win rate.
- Win rate = wins / played × 100; zero played is null and displays “No matches played”.
  UI rounds nonzero rates to at most one decimal; this changes no stored value.
- Expected Coins total uses actual completed outcomes only.
- Match Coins Earned sums confirmed associated Match payments only, excluding workout
  transactions and unpaid expected rewards. Match IDs are deduplicated defensively.

If Rewards are loading/unavailable, confirmed Coins are unavailable (null), not a
fabricated zero; valid counts and expected amounts can still be shown. Match-source
errors hide Match counts behind an unavailable message rather than an empty record.
Late completion/payment can update these displayed joins without writing Season,
changing its OVR snapshots, completion rules, evidence or frozen workout statistics.
An explanatory note distinguishes the two kinds of information.

## Localization and accessibility

New semantic `history.*` keys cover English/Japanese states, detail labels,
difficulty, counts, rewards and statistics. Proper Rival/Club names remain their
saved values. No display string becomes an identity.

`formatCalendarDay` formats a saved wall-date in UTC solely to preserve its calendar
components across device timezone changes. `formatZonedDate` formats unlock,
expiration and resolution using the Match's saved IANA timezone and selected ASCEND
locale. Both use deterministic em-dash fallback for invalid presentation input.
Existing date/month helpers and all stored dates/calendar rules remain unchanged.

The existing SafeAreaModal/inner SafeAreaProvider pattern is reused. Headers wrap;
actions retain existing accessible button labels/minimum targets. Detail sections
scroll, statistics use wrapping two-column utility rows, and list cards have
localized accessible date/Rival/status labels. Static presentation works with
Reduce Motion; no animation/sound/chart dependency is introduced.

## Files

Added:

- `src/matches/history.ts`, `src/matches/use-history.ts`.
- `src/components/career/match-history.tsx`.
- `src/components/career/season-match-stats.tsx`.
- `tests/match-history.test.cjs`, `tests/browser-match-history.cjs`.
- This report.

Updated:

- `src/app/(tabs)/career.tsx`: history entry and minimal section ordering.
- `src/components/career/seasons.tsx`: read-only statistics in existing Details.
- `src/localization/core.ts`, `provider.tsx`, `locales/en.ts`, `locales/ja.ts`.
- `tests/browser-career.cjs`: recognizes the already-existing 4C-1 Rival generation
  after explicit Club joining, validates the single owned UPCOMING record, and
  retains exact unrelated-data and later navigation/reload preservation assertions.

Match/Rewards domains, providers and repositories, Growth/PR/Session/Coach/Career/
Season domain/persistence, card rules and presentation consumption remain unchanged.

## Verification

- `npm test`: **431 passed, 0 failed** (403 existing + 28 history/statistics tests),
  exit 0. Existing gameplay and persistence regressions are included.
- `npm run typecheck`: passed, exit 0.
- `npm run lint`: passed without warnings/errors, exit 0.
- `git diff --check`: passed.
- `env -u NO_COLOR CI=1 npx expo export --platform all --max-workers 1
  --output-dir /tmp/ascend-match-history-export`: passed; iOS/Android Hermes bundles
  and 13 static web routes generated. Bundles do not constitute native execution.
- `browser-match-history`: passed saved history ordering/state/detail, immutable
  Club identities, exact powers/payments, no replay/CLAIM, absent week-end evidence,
  Season played/skipped/rate/Coins, frozen Monday display in a different device
  timezone, immediate EN/JA switching, root restart, and exact gameplay bytes.
  Repeated history/detail/Season opens generated zero storage writes; language
  selection wrote settings only. Corrupt Match/Rewards cases preserved raw bytes,
  showed unavailable states and never fabricated earned Coins. 320px, enlarged
  detail/Season statistics and Reduce Motion had no horizontal overflow/page errors.
- Existing browser regressions passed: `browser-match-resolution`,
  `browser-match-rewards`, `browser-rewards`, `browser-seasons`, `browser-career`,
  and `browser-localization`. Other legacy browser scripts were not rerun here;
  all existing unit tests were run.
- Visually inspected the enlarged Japanese detail and Season-statistics screenshots.
  Existing simulated-safe-area tests are not native device validation.
- The original Career browser test failed because its pre-Match assertion expected
  only a Career key after joining. 4C-1 already generates a current Rival then.
  The test now waits for and validates exactly one owned UPCOMING Rival with null
  result/rewardDelivery/weekEnd. All other storage remains byte-identical; later
  assertions still compare every key exactly. No product generation rule changed.
- One initial win-rate test compared different floating-point evaluation orders
  exactly. The test now checks the expected rate within 1e-12; no formula changed.
- Playwright/Prettier remain external tooling under `/tmp/ascend-polish-qa`, not app
  dependencies. Browser commands use its NODE_PATH/PLAYWRIGHT_BROWSERS_PATH and
  ASCEND_QA_URL to the served export. Restart uses `/` because the simple QA static
  server lacks extensionless route fallback. All deliberate records/errors are
  isolated fixtures, never actual phone history.

## Limitations and iPhone checklist

No physical iPhone/Hermes runtime test was performed. The user's earlier Rival/
Coins smoke test does not verify native READY → PLAY → payment or this new UI.
Virtualization has been implemented, but no multi-year native performance benchmark
is claimed. Browser enlarged text and visibility are not Dynamic Type/VoiceOver.

1. Preserve existing data. Run `cd my-app` and `npx expo start --go --lan`, open Expo Go.
2. CAREER → Match History. Inspect actual saved weeks newest first. Existing current
   Rival/Club/OVR/Coins/Season must remain unchanged; no missing-week samples appear.
3. Open a row. Verify original Rival/Player Clubs, goal and saved evidence. Upcoming
   or missing evidence must not display a completed outcome or invented week-end OVR.
   READY's PLAY action remains only in Weekly Rival Match, not history.
4. For a genuine completed Match, check immutable powers/outcome and expected vs paid
   reward. No CLAIM/replay. Do not fabricate records or alter the phone clock to test it.
5. Open an actual Season/detail. Check Monday-month association, played/W/D/L/skipped,
   win rate and confirmed Match Coins. Its old OVR/workout snapshots remain unchanged.
6. Close/reopen, navigate and Expo Reload. No history-triggered result/payment or
   duplicate record. Normal existing automatic recovery remains independent.
7. Switch EN/JA, then check large Dynamic Type, VoiceOver, Reduce Motion, safe areas,
   list/detail scrolling and reachable fixed BACK/CLOSE on a small iPhone.

Data corruption remains non-destructively blocked by the existing repositories;
there is no new repair/reset, history persistence or reward reconciliation path.
Cinematic Hybrid, Season rewards, transfers and Shop spending remain unimplemented.
Stop after Phase 4C-2C; do not begin Phase 4C-3.
