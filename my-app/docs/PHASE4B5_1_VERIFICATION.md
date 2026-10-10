# Phase 4B.5.1 — Localization Polish

## Changes and scope

Presentation-only patch on the existing English/Japanese localization layer.
No new dependency, UI redesign, navigation, schema or gameplay change. Phase 4C
was NOT started. The previous Phase 4B.5 verification completion is retained.

- HOME now renders RecoveryState through the existing centralized status adapter:
  Ready → トレーニング可能, Recovering → 回復中, Moderate → 一部回復中.
  English and the canonical values remain unchanged. The current recovery display
  comes from `data/mock.ts`; there is no recovery calculation to alter in this UI.
  These are the only production RecoveryState consumers found in the source audit.
- Japanese player/body/overall Rating terminology consistently uses 能力値.
  Explanations retain the distinction between initial assessment and growth.
- Card finish reads 仕上げ：スタンダード (or ハイ), preserving the finish concept.
  No tier/finish ID or threshold changes. PR labels use 最高重量 and
  1セットの最高記録. Upcoming placeholders retain 近日公開.
- HOME Season activity uses one interpolated semantic key:
  `{workouts}回のワークアウト・トレーニング{days}日`.
- Workout history's remaining English exercise/set count sentence now uses a
  semantic interpolated key. No count or statistics calculation changed.
- Existing locale-aware PR/history/Season date rendering remains unchanged.

## Exercise identity and alias policy

Audited all 42 built-in catalog entries and their localized mapping. Every built-in
has a Japanese name. Picker, builder, saved detail, live workout, history detail,
PRs, Coach recommendation and baseline views share the same exercise display helper.

Resolution requires a known stable built-in ID, a non-custom identity, and either
its original catalog name or an explicit exact alias scoped to that ID. The only
new observed alias backed by the current catalog is:

`decline-push-up` + `Decline Push-Up` → デクラインプッシュアップ.

The canonical `Decline Push-up` also displays the same Japanese name. English
continues to show the stored spelling. No fuzzy/case-folded/name-only lookup,
ID invention, catalog expansion, migration or saved-name rewrite is performed.
PR rows omit isCustom metadata, but custom exercise IDs use the existing `custom-`
namespace and cannot match a built-in mapping. Unknown/renamed names stay intact.

### Remaining names requiring authoritative identity

Bicycle Crunch, Hindu Push-up, Leg Raise, Reverse Crunch, Reverse Grip Push-Up,
V Up and typewriter Push-Up are **not** in the repository's built-in catalog or
known legacy ID mappings. They remain as stored. The screenshots' display names
alone cannot establish whether they are custom or historical built-ins. An exact
historical ID and provenance would be needed before adding a safe mapping.
Demo, Demo2, Demo4, Demo6 and all custom names are preserved, even if their names
resemble built-ins. This is intentional data/identity protection, not fuzzy matching.

## Files

- `src/app/(tabs)/index.tsx`: route recovery values through display localization.
- `src/components/career/seasons.tsx`: interpolated activity summary.
- `src/components/training/training-workspace.tsx`: localized history counts.
- `src/localization/locales/en.ts`, `ja.ts`: semantic keys and Japanese terminology.
- `src/localization/exercise-names.ts`, `presentation.ts`: scoped exact alias.
- `tests/localization-polish.test.cjs`: catalog/status/alias/immutable evidence tests.
- `tests/browser-localization.cjs`: stronger recovery/count/terminology assertions.
- `tests/browser-localization-polish.cjs`: isolated historical alias/custom-name QA.

## Integrity and verification

Verification results will be recorded after all checks complete. No physical-device
verification is claimed. Existing localization tests retain immediate switching,
restart persistence and settings-only write assertions. Targeted tests render saved
session snapshots and derived PR records without changing either source.

## iPhone Expo Go checklist

1. `cd my-app` then `npx expo start --go --lan`; open in Expo Go. Keep real data.
2. Settings → Language → 日本語. HOME recovery should show 回復中 /
   トレーニング可能 / 一部回復中 with unchanged body statuses and section order.
3. PLAYER: check 能力値 labels, finish wording and PR exercise names. An authoritative
   built-in Decline Push-up/Decline Push-Up should show デクラインプッシュアップ.
   Custom and unidentified names remain unchanged; do not edit history to test this.
4. Check TRAIN picker, existing workout/history detail and Coach exercise labels.
   Confirm OVR, PR values/dates, Coins, Club and Season statistics are unchanged.
5. HOME Season summary should read naturally for its actual counts. CAREER and SHOP
   keep their layouts and existing upcoming-feature labels.
6. Switch to English and reload, then Japanese and reload. Language persists;
   source data and custom names remain unchanged.
7. Check larger text, VoiceOver, safe areas and scrolling on the phone. Browser
   viewport/text approximations do not verify native behavior. Ignore Expo Go's
   own floating blue gear; this patch does not change it.

Stop after Phase 4B.5.1. No Rival, Match, Transfer or other Phase 4C feature added.
