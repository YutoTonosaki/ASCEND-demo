# Phase 5A.1 — iPhone SHOP Purchase Flow Fix

Date: 2026-10-26. Pre-fix baseline commit: `1df186e`.

## Investigation and root cause

Read AGENTS.md, the Phase 5A report and the actual Storefront, Sheet/Confirm,
SafeAreaModal, ShopProvider, ShopRepository and wallet implementation. The starting
working tree was clean. Read the repository-required [SDK 57 reference](https://docs.expo.dev/versions/v57.0.0/)
and the [SDK 58 reference](https://docs.expo.dev/versions/v58.0.0/), because this checkout
already uses Expo 58 / React Native 0.88. No dependency/configuration upgrade was made.

Confirmed source defect: the old `Storefront` item-detail BUY/EQUIP branch was the
last content inside `Sheet`'s ScrollView, after the full PlayerCard and explanatory
text (`1df186e` storefront lines 227–244; preview lines 198–209). It had no independent
visible action area. Above the preview, a plain non-pressable Text also rendered
“BUY” through `status(item)` (old line 196), making it possible to confuse a status
label with the offscreen action. The Sheet **was scrollable**; the defect was the action's
placement below the initial viewport, rather than evidence of a non-scrollable modal.
A 70-Coin initialized/unowned fixture on the comparison build measured the old
BUY at **y=835.59, height=44** in a **320×568** viewport, before scrolling.
Prior Playwright `.click()` tests automatically scrolled the button into view, so
those passes did not establish initial visibility or physical iPhone touch behavior.

The old BUY condition was `!player || !state || error || busy || available < price`.
For a validated initialized owner, unowned Midnight and 70 available Coins, none of
these conditions is true: 70 is sufficient for the unchanged price 40. There is no
wallet rule requiring more Coins. With no prior purchase, the branch renders BUY;
with ownership it intentionally renders EQUIP/UNEQUIP instead. Provider publication
continues to require validated owner scope and Rewards. Loading/uninitialized/busy
conditions previously disabled the detail button without an adjacent explanation.

The old purchase confirmation also rendered `Confirm` as a sibling of the still-open
`Sheet` (old storefront lines 251 onward); both instantiate native Modals. This unnecessary second native presentation
is removed. It is a native presentation risk, **not a reproduced device-level diagnosis**.
There is no evidence here that a tab bar or the unrelated floating blue gear consumed
the user's touches. Neither is modified.

The exact original phone's scroll position, hydration/error state and responder chain
were not recorded. The confirmed offscreen action defect is addressed; whether it
fully explains that phone's symptom requires the native retest below. No physical
native diagnosis is inferred from browser automation.

## Minimal changes

- `src/components/training/controls.tsx:Sheet`: optional `footer` below its bounded
  ScrollView and inside the existing full-screen SafeAreaModal/SafeAreaView. Only
  footer consumers opt into the explicit flex/min-height scroll bound; other Sheets
  retain their existing layout. CLOSE remains in the fixed header.
- `src/components/shop/storefront.tsx`: BUY/EQUIP/UNEQUIP now occupy this fixed safe-area
  footer. Card preview and descriptions scroll independently. Existing Action controls
  retain their accessible names, disabled states and minimum 44-point targets.
  Unowned detail no longer repeats “BUY” as a non-pressable status label; OWNED and
  EQUIPPED status labels remain.
- Confirmation changes the content/actions of the **same Sheet**: localized item,
  price and remaining balance; fixed CONFIRM/CANCEL. No second Modal or platform
  presentation timing dependency. CANCEL changes only in-memory UI state.
- Every disabled action has adjacent existing localized copy: initialization required,
  loading, saving, insufficient funds, or the specific Shop storage/owner/action error.
  No new strings, locale IDs or business rules are introduced.
- `src/app/+html.tsx`: a pre-existing SDK 58 Web compatibility blocker prevented
  browser hydration: export emitted neither generated React Native CSS nor bootstrap
  scripts. Render `useServerDocumentContext()` head/body nodes and attributes as
  required by [Expo's static-rendering documentation](https://docs.expo.dev/router/web/static-rendering/#root-html).
  This is web-only; it changes no native screen or data. The before/after comparison
  applies this identical compatibility fix to both builds, isolating the SHOP layout.
- `tests/shop.test.cjs`: exact 70 → purchase 40 → 30, equip/reload and repeated/concurrent
  retry coverage using the existing repository/valid Rewards fixture conventions.
- `tests/browser-overlays.cjs`: wait for the selected tab's Settings control before
  the original strict count check. SDK 58 tab publication is asynchronous; no count,
  hit-target, safe-area or modal assertion is removed or relaxed.
- `tests/browser-shop-purchase-fix.cjs`: independent touch-enabled 320×568 fixture;
  initial visibility, hit testing, fixed position while preview scrolls, confirmation,
  cancel zero writes, ownership/equip/restart, EN/JA large text and disabled reasons.

## Wallet safety

`src/shop/domain.ts:wallet/buy/equip`, `src/shop/provider.tsx` and
`src/storage/shop-repository.ts` are unchanged. The repository still validates the
current durable Player, Rewards and funding sources inside the shared adapter queue.
One deterministic purchase record represents both debit and permanent entitlement;
readback precedes success publication. Duplicate purchase IDs cannot charge again.
The visible button is not purchase authority: CONFIRM still calls `shop.purchase`,
which rechecks the current persisted balance and owner. No optimistic Coins/ownership,
free grant, data reset, schema change or fake production reward is added.

The UI retains all guards, including when state changes during confirmation. Owned
items get equipment actions even when their remaining balance is below the item's
price; equipping does not debit Coins. Player, Rewards, Match, Career, Season, PR,
Growth, OVR and Card Tier algorithms/storage are untouched.

## Verification

- `npm test`: **503 passed, 0 failed** (502 existing + one exact 70/40 regression).
- `npm run typecheck`: passed. `npm run lint`: passed without warnings/errors.
- `CI=1 EXPO_OFFLINE=1 npx expo export --platform all --max-workers 1
--output-dir /tmp/ascend-shop-fix-final-export`: passed; iOS/Android Hermes bundles,
  Web bundles and 13 static routes. No dependency or platform configuration change.
- The new purchase browser suite passed **all five scenarios**: valid English,
  Japanese with 1.5× text/line-height approximation, unavailable wallet, insufficient
  Coins and uninitialized Player. It checks BUY's on-screen geometry and hit target
  **before** any automatic scroll, then sends an actual browser coordinate touch.
  Preview scrolling cannot move the footer. Only one actionable BUY label exists;
  confirmation uses one modal, shows 40/remaining 30, CANCEL produces zero writes,
  purchase is owned once, EQUIP affects PLAYER, and reload retains exact data/30 Coins.
  Failed eligibility remains visibly disabled with a localized reason and zero writes.
- **All eight related existing browser suites passed on the final export**:
  `browser-shop`, `browser-rewards`, `browser-match-rewards`, `browser-cards`,
  `browser-presentation`, `browser-overlays`, `browser-sessions` and
  `browser-localization`. Together with the new five-scenario purchase suite,
  **nine browser scripts passed**. Other legacy browser suites and development
  Growth Debug were not rerun in this fix; the entire existing unit suite was run.
- The purchase suite also simulates modal-only top 59px / bottom 34px insets and
  verifies CLOSE and fixed actions stay inside them. This is a CSS inset simulation,
  not a measurement from an iPhone.
- `git diff --check`: passed. Protected-source diff review confirms the Shop
  catalog/domain/provider/repository, all gameplay/Rewards repositories and domains,
  package files and platform settings remain unchanged.
- Visually inspected the before-fix screenshot, fixed 320×568 Japanese detail and
  enlarged Japanese confirmation. BUY and CONFIRM/CANCEL stay in the viewport;
  preview text scrolls. No horizontal overflow or page exceptions in the five scenarios.

An initial export waited on an external connection; the completed exports use Expo's
offline mode. Earlier `/tmp` artifacts had been cleaned, so a HEAD copy was built in
an isolated directory for comparison. SDK 58's missing generated HTML nodes initially
prevented hydration on both old and new code. The official web-only compatibility
fix is applied to both sides of the comparison. These are disclosed QA/environment
issues, not a reason to bypass a wallet guard or reinterpret the native report.

All deliberate reward values and errors use isolated automated fixtures. No user's
phone history, Coins or purchases were read or altered. External QA tooling stays
outside app dependencies (`/tmp/ascend-shop-fix-qa/node_modules` and
`/tmp/ascend-shop-qa/browsers`). Set `NODE_PATH` / `PLAYWRIGHT_BROWSERS_PATH` to those
paths and `ASCEND_QA_URL` to the locally served final export to rerun browser QA.

## Native limitations and iPhone retest

No physical iPhone, simulator, Hermes runtime, VoiceOver or Dynamic Type execution
was performed. Touch-enabled Chromium coordinates and browser text scaling do not
prove UIKit touch delivery, native modal behavior or actual safe-area measurements.
Exported Hermes bundles are compilation evidence only.

1. Preserve existing data. Run `cd my-app` then `npx expo start --go --lan`; reload the
   updated bundle in compatible Expo Go. Do not reset data or change the phone clock.
2. Confirm HOME/SHOP agree on the actual available balance and Player is initialized.
   With the reported 70 Coins, open the unowned Midnight Background (40 Coins).
3. BUY should be visible at the bottom immediately, above the safe area, while the
   preview scrolls independently. If disabled, read the adjacent localized reason;
   valid 70/40/initialized/unowned state should enable it. Ignore Expo Go's blue gear.
4. Tap BUY: the same sheet shows confirmation and remaining 30 Coins. CANCEL, reopen
   BUY, and check balance/ownership unchanged before confirming an intended purchase.
5. CONFIRM once. Check available 30, OWNED/EQUIP, equip and inspect PLAYER. Existing
   OVR/body ratings/Tier, workout history, Club and Season must remain unchanged.
6. Navigate, Expo Reload and restart: one purchase, equipped Midnight, 30 available
   (unless ordinary new rewards were earned), and no second BUY/duplicate charge.
7. Check EN/JA, larger Dynamic Type, VoiceOver, Reduce Motion, small-screen scrolling,
   fixed CLOSE/CONFIRM/CANCEL and bottom insets. Do not fabricate rewards or corrupt
   real data to force errors; automated fixtures cover those branches.

Stop after Phase 5A.1. No Phase 5B or later feature is implemented.
