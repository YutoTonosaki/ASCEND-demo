# Phase 5A — SHOP Foundation & Cosmetic Equipment

## Audit and architecture

Inspected AGENTS.md, the versioned Expo SDK 57 reference, README, the 4C.5 audit,
actual Rewards parser/provider/repository/shared queue, Player Card and progression
presentations, SHOP placeholder, root providers, localization and tests. The starting
working tree was clean. No app dependency, platform setting or gameplay schema changes.
The initial documentation fetch timed out; the exact SDK reference was subsequently
retrieved and read through curl before coding.

Rewards v1/v2 accept only validated positive workout/Match rewards. Their parser
strictly replays workout receipts and cross-validates Match payment sources. It is
not a spending API and is unchanged. No negative transaction is inserted there.

A separate `ShopRepository` writes only **ascend.shop.v1**. `ShopProvider` sits inside
RewardsProvider, before MatchProvider; existing provider relative order is retained.
It observes ordinary Rewards updates and foreground events to reread the wallet.
No purchase creates a workout, reward, PR, Growth, Match, Career or Season event.

## Purchase/ownership document

```
{
  version: 1,
  catalogVersion: 1,
  ownerId: playerId,
  purchases: [{
    id: JSON(["purchase", playerId, itemId]),
    ownerId, itemId, price, at,
    fundingIds: [confirmedRewardTransactionId, ...]
  }],
  equipment: {background: itemId|null, border: itemId|null,
              aura: itemId|null, title: itemId|null}
}
```

A purchase record is simultaneously the debit **and** permanent entitlement; there
is no separate inventory flag that can disagree with its charge. Equipment and
purchases validate together in the same document. Each category has exactly one
selection, with null representing its free default. Defaults never create records
or transactions. A missing store loads empty without writing, including before
Player initialization. Persisted empty/reset documents are not accepted.

The Owner is the existing initialized Growth Player ID; Career/Club membership is
not a purchase prerequisite. Every repository read checks the actual durable Player
and requested scope, then rejects foreign Shop data. Provider publication also checks
scope before exposing a snapshot; unavailable/foreign cosmetics fall back to the
original card. No automatic Player initialization, ownership reassignment or reset.

Validation rejects unsupported versions/catalog versions, unknown items, wrong
prices, duplicate identities, foreign purchase owners, malformed dates, unowned or
wrong-category equipment, missing funding evidence and unsafe/negative balances.
Funding ID snapshots retain only reward identities, not a second Rewards database.
Every referenced transaction must still exist in the validated Rewards ledger; the
funding set may grow but cannot shrink across successive purchases. Each purchase
prefix must have sufficient confirmed funding for cumulative charged spending.

Catalog v1 IDs/prices are immutable validation evidence. A future price rebalance
must introduce explicit versioned compatibility rather than silently changing the
meaning of old charges. Charged prices/times remain stored as originally committed.

## Wallet, atomicity and recovery

`shop/domain.ts:wallet` is the single available-balance selector:

**Available = confirmed earned Rewards sum − confirmed purchase price sum**.

Earned/spent/available are safe integers; available cannot be negative. HOME and
SHOP use the same ShopProvider snapshot through CoinBalance. Historical workout and
Match reward summaries still show factual earned rewards, not current spendable funds.
No fabricated balance is published during corrupt/unavailable state.

Purchase protocol inside the existing adapter-wide Match/Rewards/Shop queue:

1. Read/validate the durable Player scope, Shop document and Rewards v1/v2.
2. If Rewards contain Match payments, validate their actual durable Match sources.
3. Validate item and current wallet. Already-owned ID returns existing state without
   a charge/write; insufficient balance rejects without a debit or entitlement.
4. Append one deterministic purchase record, retaining equipment. Validate the entire
   candidate and funding proof, then write the whole Shop document once.
5. Reread/validate durable state and require equality before reporting success.
   The same readback runs after a rejected write acknowledgment. If the exact candidate
   exists, recover it; otherwise return an error, never optimistically claim ownership.

Concurrent buys on the same adapter serialize. Two different items competing for
limited funds reread the first committed debit before checking the second. Equipment
changes use the same protocol but cannot debit Coins. Identical equip/default actions
write nothing. BUY requires an explicit localized confirmation; cancel/preview is
read-only. Buttons and an immediate in-memory action lock prevent repeat taps; durable
identities provide idempotency across retries/restarts/Repository instances.

Only Shop is written by a purchase. Reward earnings are immutable, append-only under
existing supported APIs, so there is no two-key commit window for debit vs entitlement.
The queue serializes same-process operations using the **same adapter object**; it is
not cross-process/device locking or cross-key durability. Whole-document AsyncStorage
write/readback semantics are assumed. A torn/corrupt document fails closed, never resets.
No cryptographic tamper protection, server wallet, account switching or cloud recovery.

A failed write/readback suppresses success and the wallet becomes retryable unavailable.
A committed purchase whose readback fails remains durable: reload/retry recognizes its
ID without another debit. Explicit wallet retry reuses the ordinary Rewards retry,
then reloads Shop; it is not a new reward/growth algorithm. New purchases reject clock
values earlier than initialization, confirmed funding or earlier purchases; stored
funding transactions cannot postdate the purchase. No timestamps are invented.

## Catalog and visual integration

| ID                | Category   | Rarity | Coins |
| ----------------- | ---------- | ------ | ----: |
| bg-midnight       | Background | Bronze |    40 |
| bg-stadium        | Background | Silver |    90 |
| bg-nebula         | Background | Gold   |   180 |
| border-steel      | Border     | Bronze |    35 |
| border-chrome     | Border     | Silver |    85 |
| border-gold       | Border     | Gold   |   175 |
| aura-blue         | Aura       | Silver |   100 |
| aura-purple       | Aura       | Purple |   260 |
| title-rookie      | Title      | Bronze |    30 |
| title-rising-star | Title      | Gold   |   150 |

Catalog order is deterministic. All names/descriptions, states, confirmations and
errors have typed English/Japanese semantic keys. Cosmetic rarity is independent
of earned Card Tier; no minimum OVR, purchasable ASCEND rarity or rating boost exists.
The former unused seven-category placeholder list is removed; this storefront
contains only the four supported categories. No badge, Rival color or Victory Effect.

SHOP provides a shared-wallet header, earned/spent breakdown, category filters, local
swatch previews, item detail, explicit confirmation with remaining balance, permanent
ownership status and equip/unequip actions. No network image/asset request. Without
an initialized Player, browsing remains available and an explicit OPEN PLAYER link
uses existing initialization. No fictional preview ratings are introduced.

Existing PlayerCard is the shared renderer for real cards and Shop previews. The
pure `cosmeticAppearance` adapter resolves typed equipment to local visual metadata:
background gradient tint, inner border, static aura edge/shadow and optional localized
title. Earned outer Tier accent, Tier/Finish labels, OVR, body ratings and ASCEND's
final treatment remain derived by the unchanged card engine. Defaults reproduce the
original appearance. Preview passes an explicit override and never persists it.
The optional read-only context adapter keeps PlayerCard usable with no Shop context
or with unavailable/foreign data. Current equipped cosmetics are presentation-only
on Player and progression cards, not copied into historical Growth/Match snapshots.

New effects are static and compatible with Reduce Motion. Existing safe-area Sheet/
confirmation patterns, wrapping text and accessible button roles/disabled states
are reused. Selected category has an accessible selected state. Ownership/equipment
are labeled with text, not color alone. Future AVS can consume validated equipment
and ownership through this read-only model; no 3D assets or renderer coupling is added.

## Files

Added:

- `src/shop/catalog.ts`, `domain.ts`, `provider.tsx`.
- `src/storage/shop-repository.ts`.
- `src/components/shop/storefront.tsx`.
- `tests/shop.test.cjs`, `tests/browser-shop.cjs`.
- This report.

Modified:

- `src/app/(tabs)/shop.tsx`, `src/app/_layout.tsx`.
- `src/components/rewards/rewards.tsx` (shared available Coin balance only).
- `src/components/player/player-card.tsx` (composable cosmetic layers).
- `src/config/theme.ts` (remove unused placeholder category list).
- `src/localization/locales/en.ts`, `ja.ts`; `README.md`.
- `tests/browser-career.cjs` (explicit UTC test context, preserving all assertions).
- `tests/browser-localization.cjs` (localized real SHOP category/item instead of the
  removed placeholder; all settings-only write and gameplay equality checks retained).

No existing Rewards parser/repository/provider, reward constants, Growth/PR/OVR,
Match algorithms/repositories, workout history, Career/Season schemas/repositories,
card threshold rules or progression-presentation consumption is changed.

## Verification

- `npm test`: **502 passed, 0 failed** (455 existing + 47 SHOP tests).
- `npm run typecheck` and `npm run lint`: passed without errors/warnings.
- Expo production export for iOS/Android/web passed, generating Hermes bundles and
  13 static web routes in `/tmp/ascend-shop-verified-export`. No app dependency added.
- **All 21 browser suites passed**: 19 existing production suites, the new SHOP
  suite and the existing development Growth Debug suite. No existing suite skipped.
  Production checks used the final `/tmp/ascend-shop-verified-export`.
- Existing production regressions: Rewards, Match Rewards, Match Resolution,
  Match History, Cinematic (all 14 scenarios), Career, Seasons, Growth, Cards,
  Localization, Sessions, Presentation, Records, Input, custom CRUD Audit,
  Overlays, Coach, Localization Polish and Match Integration. The full loop retains
  actual completion → Growth → week-end snapshot → manual PLAY → payment/history,
  closed Season byte equality, ownership isolation and no duplicate foreground writes.
- `git diff --check`: passed. Final protected-source review confirms existing
  Rewards/Growth/PR/Match/Session/Coach/Career/Season algorithms and repositories,
  card thresholds, presentation consumption, package files and platform configuration
  are unchanged. Only the listed presentation/root integration and new SHOP modules
  affect production code.

The dedicated SHOP browser test verifies category filtering, preview/cancel with zero
writes, four purchased/equipped layers, default restoration, exact wallet spending,
insufficient funds, write failure/retry, lost acknowledgment, corrupt/newer and
foreign-owner storage, HOME/SHOP agreement and restart. EN/JA switching changes only
settings; the saved purchase/equipment document and gameplay bytes remain identical.
It covers 320px, 1.5x font/line-height approximation, Reduce Motion and no page errors.
The equipped-card and enlarged Japanese item-detail screenshots were visually checked.

Development Growth Debug passed unchanged: zero writes on open/refresh, exact decimal
ratings/events, missing/corrupt/retry cases, 320/390px and production-entry absence.
Metro emitted the pre-existing SVG `accessible={false}` Web warning and color-environment
notices; no Debug page exceptions occurred. Final typecheck/lint/export had no warnings.
Playwright/Prettier remain external under `/tmp/ascend-shop-qa`, not app dependencies.
QA uses its `NODE_PATH`/`PLAYWRIGHT_BROWSERS_PATH`, `ASCEND_QA_URL` pointing to the
served final export and (for Debug) the development Metro URL plus `ASCEND_QA_PROD_URL`.
All deliberately altered balances/errors are isolated fixtures, never real phone data.

Unit coverage includes all catalog items, default/missing storage without writes,
purchase/equipment validation, insufficient funds, duplicate/concurrent purchases,
competing balances, failed/dropped writes, lost acknowledgments, confirmation-read
failure, reload, scope isolation, corrupt/newer data, funding chronology, immutable
Rewards v1/v2 and concurrent actual Match payment/purchase. Unrelated gameplay bytes
are checked exactly, including Player, workout, Career, Season and Match records.

The initial Career browser run found a host-tool timezone database mismatch:
Chromium resolved the Vancouver November 2 boundary to 07:00 UTC while Node's ICU
76.1 resolved it to 08:00 UTC. Its Node-side strict Match validator rejected the
browser-created record. The ownership/onboarding test now explicitly uses UTC;
all original ownership, lifecycle and byte-equality assertions remain. No Match
calendar rule, saved timestamp or production validation was changed. Cross-runtime
IANA database consistency remains a platform verification consideration.

The localization regression originally waited for the removed SHOP placeholder's
“カード背景” text. It now checks the real localized Backgrounds filter and Midnight
item action; all original settings-only write, exact gameplay bytes, language
persistence and completion/reward assertions remain. A resumed test attempt also
encountered a stopped QA HTTP server; restarting that server and rerunning the
remaining suites passed without an application change.

## Native verification and limitations

No physical iPhone/Hermes runtime verification is claimed. Platform exports are
compiled bundles, not device execution. Browser font scaling/reduced motion are
not native Dynamic Type/VoiceOver/safe-area/box-shadow verification.

This is one local Player/store, not multi-account inventory or cross-device commerce.
Foreign-owner storage blocks spending/equipment; there is no automatic reassignment,
refund, repair, reset, resale, gifting or trading. Missing/changed funding evidence
blocks wallet reads rather than replacing it with zero. Native storage durability
and manual clock changes retain the existing application's limitations.

## iPhone Expo Go checklist

1. Preserve real data; run `cd my-app` then `npx expo start --go --lan`, open Expo Go.
2. Check existing Player OVR/Tier, PRs, history, Club, Season and Coins. HOME/SHOP must
   agree on available balance; first use creates no purchase merely by browsing.
3. SHOP: browse all four filters and details/preview. Cancel a BUY confirmation;
   check no balance or ownership change. Do not reset real Coins for testing.
4. With genuine sufficient Coins, confirm one intended purchase. Check remaining
   balance, permanent OWNED status and unchanged earned rewards/history/ratings.
5. EQUIP, inspect PLAYER, then UNEQUIP. Verify the relevant cosmetic layer appears
   and default returns, without another charge or a Tier/OVR change.
6. Navigate, Expo Reload and restart: ownership, equipment and available balance
   persist; no duplicate charge. Normal training/Match rewards add to the same wallet.
7. Check EN/JA, large Dynamic Type, VoiceOver, Reduce Motion, scrolling and reachable
   confirmation/CANCEL/CLOSE/actions on a small iPhone. Storage failure/foreign-owner
   scenarios are isolated automated tests, never corruption of real phone storage.

Stop after Phase 5A. No later SHOP phases, AVS, purchases with real money,
subscriptions, transfers, consumables or gameplay advantages are implemented.
