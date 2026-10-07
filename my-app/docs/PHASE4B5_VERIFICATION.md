# Phase 4B.5 — Localization & Language Settings

## Architecture and scope

English (`en`) and Japanese (`ja`) are presentation-only locales. Both new and
existing installations default to English, regardless of device language. Header
Settings → Language offers English / 日本語 with accessible selected/disabled state.
Successful selection updates mounted consumers immediately, without restart or
provider remount. The five existing tabs are retained. No Phase 4C work is included.

`LocalizationProvider` wraps the existing gameplay providers without changing their
relative order or keys. It owns a separate SettingsRepository. Components use the
typed `tr(key, parameters)` API and locale-aware date/month/number formatters.
`locales/en.ts` defines semantic keys; `ja.ts` must satisfy the same key set.
Interpolation substitutes named values and leaves absent placeholders literal.
Unknown runtime keys display the key deterministically; unsupported runtime locale
rendering falls back to English. Storage accepts only the supported IDs.

`display-keys.ts` is an explicit adapter for existing canonical enum labels and
legacy English messages. Coach explanation templates are adapted at the rendering
boundary; the recommendation engine and its stored inputs/outputs are unchanged.
New features should use semantic keys directly, rather than expanding English-text
matching. Unknown external errors get a localized generic retry message; original
errors remain unchanged in their owning provider. Already localized messages remain
readable. Debug data/precision and debug read-only behavior are unchanged.

## Storage and failure behavior

Only `ascend.settings.v1` is written:

```
{ version: 1, settings: { locale: "en" | "ja" } }
```

Missing storage loads English with zero writes. Explicit selection may create the
settings record; repeated selection of the saved locale does not rewrite it. Queued
read/validate/write operations prevent overlapping selections from losing order.
Locale publishes after a successful durable write. Failed selection retains the
last valid in-memory locale and exposes a retryable Settings error. A failed initial
read renders English. Corrupt/unsupported/newer settings are preserved and block
selection until a successful reread; no automatic reset or overwrite exists.

There is no locale field in Player, Career, Seasons, Rewards, Coach or sessions.
Language selection never requests their commands or reconciliation, and never scans
workout history. The Provider does not remount gameplay providers on selection.
Existing timestamps, month/day IDs, Club IDs, body-area keys, exercise IDs and
presentation consumption identities remain unchanged.

## Translation coverage and identity

- Five tabs, shared actions, modal controls, loading/empty states and Settings.
- HOME training CTA, recovery/status labels, real Coins and weekly/Season labels.
- Workout planning, picker/filter controls, custom exercises, saved templates,
  actual inputs, rest, factual completion/history and reward summaries.
- Coach/profile/baseline setup, recommendation explanations and review controls.
- PLAYER body ratings/status, PRs, card state, Rating/OVR/Card Evolution presentation.
- Career onboarding/Club details, Season lifecycle/statistics/history/detail.
- SHOP placeholder categories and Coin display; spending remains unavailable.
- Accessibility labels follow translated actions. Tab labels wrap; bar height can
  grow with native font scale. Existing modal safe areas remain intact.

Club proper names remain original. Countries, reputation and known descriptions
are translated only for presentation. Season detail still reads its copied Club
snapshot, never a replacement current catalog identity. Unknown/changed descriptive
text is preserved rather than guessed. No translated text is saved into snapshots.

The 42 built-in exercise IDs map to Japanese display names only when the stored
name matches the known original. Custom names, unknown IDs and renamed historical
names are preserved. Search accepts the localized built-in name as well as English.
User-entered workout names and previously generated/saved Coach workout names remain
as saved. Development-only Growth Debug keeps its technical English content; shared
close controls follow the selected language.

Date formatting uses the selected `en-US` / `ja-JP` locale, preserving timestamps.
Season month formatting uses the canonical month with a fixed UTC mid-month anchor
for display only; Phase 4B local-calendar identity helpers are unchanged. Number
formatting is presentation-only. No displayed rounding is written back to ratings.

## Adding translations

1. Add a semantic key to `src/localization/locales/en.ts` and its Japanese value to
   `ja.ts`. Use the same named placeholders, e.g. `{number}`.
2. In a component, call `const { tr } = useLocalization()` and render
   `tr("season.label", { number: "01" })`. Do not translate IDs or pass localized
   labels into domain commands. Format dates using the shared `date`/`month` API.
3. For another future locale, extend `Locale`, supported locale metadata, validator,
   dictionary selection and locale-tag formatting; add a dictionary satisfying the
   English keys. Define compatibility for previously unsupported settings explicitly.
4. Run key/placeholder tests, typecheck and bilingual UI verification. New Match,
   Rival or Transfer UI can add `match.*`, `rival.*`, `transfer.*` keys later.

## Files

- Added `src/localization/{types,core,provider,index,presentation,display-keys,exercise-names}`
  and `locales/en.ts`, `locales/ja.ts`.
- Added `src/storage/settings-repository.ts`.
- Updated root provider wrapper, tab labels, header Settings and production UI
  components/routes under `src/app` and `src/components` to render translations.
- Added `tests/localization.test.cjs` and `tests/browser-localization.cjs`.
- Updated project README/spec/roadmap and this verification report.

## Verification

Final verification results are recorded below when complete. No physical iPhone
verification is claimed for this phase.

## Limitations

This phase does not translate arbitrary user-authored text, proper Club names,
unknown historical names, or technical debug content. Future engine-message changes
must update the legacy display adapter until those systems expose semantic message
codes in a separately scoped change. Unknown storage/platform errors use a generic
localized explanation. Settings has no repair/reset UI and no multi-device sync.
Browser text enlargement is not native Dynamic Type/VoiceOver verification.

## Physical iPhone Expo Go checklist

1. `cd my-app` then `npx expo start --go --lan`. Open in compatible Expo Go on the
   same Wi-Fi. Preserve all real data; do not reset your installation.
2. Before switching, check existing OVR/tier, Coins, Club, Season statistics and
   workout/PR history. An installation without a saved locale should open English.
3. Tap the header gear → Language → 日本語. Confirm the selected indicator and
   immediate Japanese UI; close Settings without reloading.
4. Visit ホーム / トレーニング / プレイヤー / キャリア / ショップ. Check inputs,
   saved workout names, Japanese built-in exercise search, body labels, PRs and
   Season month/details. OVR/Coins/Club/Season counts and historical data stay equal.
5. Reload Expo and fully restart the app. Japanese should remain selected with no
   new growth, reward, Season or replayed presentation.
6. 設定 → 言語 → English. Confirm immediate English UI; reload/restart again to
   confirm persistence. Repeatedly choosing English must not change game data.
7. Check larger Dynamic Type, VoiceOver selected-language announcements, small
   screen tab labels, safe areas, scrolling and reachable dialog actions. Neither
   language should require sideways scrolling or unreadably small text.
8. Continue normal training in the preferred language. Workouts, Coach, PR/Growth,
   Coins and Career/Season behavior must retain their established rules.

Phase 4C was NOT started. No Rival, Match, Transfer, Season reward, Shop purchase,
monetization, advertising or cloud functionality is introduced.
