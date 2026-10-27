# Phase 5B — SHOP Expansion & Cosmetic Progression

## Pre-implementation audit

Baseline `3554113`, clean working tree. Expo ^58.0.19, React Native 0.88.0,
React 19.3.0. Read AGENTS.md's exact SDK 57 reference and the actual SDK 58 reference,
all three 5A verification reports, Shop catalog/domain/provider/repository, wallet,
PlayerCard, cosmetic adapter, responsive grid, localization and tests before coding.
No dependency upgrade is planned.

Existing immutable catalog, in saved deterministic order:

| ID | Slot | Price | Rarity |
| --- | --- | ---: | --- |
| bg-midnight | background | 40 | bronze |
| bg-stadium | background | 90 | silver |
| bg-nebula | background | 180 | gold |
| border-steel | border | 35 | bronze |
| border-chrome | border | 85 | silver |
| border-gold | border | 175 | gold |
| aura-blue | aura | 100 | silver |
| aura-purple | aura | 260 | purple |
| title-rookie | title | 30 | bronze |
| title-rising-star | title | 150 | gold |

All four slots resolve by stable ID through cosmeticAppearance. Existing background
is a tier-based gradient, border an inset colored frame, aura a shadow/left stripe,
and title localized text. New static treatment metadata can extend these visuals
without changing Equipment, purchases, catalogVersion or any persistence schema.
Legacy rendering branches will remain unchanged. No new tier/unlock restriction.

## Curated additions and pricing plan

| ID | EN / JA | Slot | Price | Rarity | Shared visual treatment |
| --- | --- | --- | ---: | --- | --- |
| bg-training-ground | Training Ground / トレーニンググラウンド | background | 40 | bronze | Green field lanes |
| bg-night-arena | Night Arena / ナイトアリーナ | background | 110 | silver | Blue stadium beams |
| bg-cyber-grid | Cyber Grid / サイバーグリッド | background | 200 | purple | Cyan perspective grid |
| border-carbon | Carbon Frame / カーボンフレーム | border | 50 | bronze | Graphite segmented frame |
| border-platinum | Platinum Frame / プラチナフレーム | border | 120 | silver | Cool double frame |
| border-champion | Champion Frame / チャンピオンフレーム | border | 220 | gold | Gold corner brackets |
| aura-electric | Electric Pulse / エレクトリックパルス | aura | 130 | silver | Static cyan edge bolts |
| aura-crimson | Crimson Energy / クリムゾンエナジー | aura | 190 | gold | Red edge diamonds |
| title-challenger | Challenger / チャレンジャー | title | 45 | bronze | Cyan underline badge |
| title-legend | Legend in Progress / レジェンドへの道 | title | 210 | purple | Violet framed badge |

Rewards remain Daily 10, third distinct Monday–Sunday training day Weekly 30,
and completed Match WIN/DRAW/LOSS 25/15/10. Three training days normally earn 60
per week before any Match reward. Starter additions cost 40–50, mid-range 110–130,
premium 190–220 (about 3.2–3.7 such training weeks before Match Coins). No daily
streak, extra-workout incentive, scarcity, randomness, OVR gate or reward change.
The old 260 premium ceiling remains untouched. Prices are immutable v1 evidence.
All descriptions will state static presentation rather than advertise animation.

## Implementation / verification

In progress. No native testing claimed. Stop after Phase 5B; no Phase 5C or AVS.
