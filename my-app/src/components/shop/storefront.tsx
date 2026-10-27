import { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useLocalization } from "../../localization";
import { useShop } from "../../shop/provider";
import {
  catalog,
  categories,
  cosmeticById,
  defaultEquipment,
  type CosmeticCategory,
} from "../../shop/catalog";
import { useGrowth } from "../../growth/provider";
import { useCareer } from "../../career/provider";
import { overall } from "../../growth/domain";
import { colors } from "../../config/theme";
import { s } from "../ui/primitives";
import { SettingsControl } from "../ui/settings-control";
import { Emblem } from "../ui/icon";
import { Action, Sheet } from "../training/controls";
import { CoinBalance } from "../rewards/rewards";
import { PlayerCard } from "../player/player-card";
import { CosmeticSwatch, ProductTile } from "./product-tile";
import { shopColumns } from "./layout";
export function Storefront() {
  const l = useLocalization(),
    { tr } = l,
    shop = useShop(),
    growth = useGrowth(),
    career = useCareer();
  const { fontScale } = useWindowDimensions();
  const [category, setCategory] = useState<CosmeticCategory | "all">("all"),
    [selected, setSelected] = useState<string | null>(null),
    [confirming, setConfirming] = useState(false),
    [origin, setOrigin] = useState<"grid" | "detail">("detail"),
    [showCard, setShowCard] = useState(false),
    [info, setInfo] = useState(false),
    [notice, setNotice] = useState<"purchased" | "updated" | null>(null),
    [contentWidth, setContentWidth] = useState(0),
    [titleHeight, setTitleHeight] = useState(24);
  const list = useRef<FlatList<(typeof catalog)[number]>>(null),
    offset = useRef(0),
    intent = useRef(0),
    restore = useRef(false);
  const item = selected ? cosmeticById(selected) : undefined,
    player = growth.data?.player,
    state = shop.snapshot,
    equipment = state?.data.equipment ?? defaultEquipment(),
    error = shop.actionError ?? shop.error;
  // A deterministic first render also keeps static-web hydration consistent.
  const columns =
    contentWidth === 0
      ? 2
      : shopColumns(contentWidth + 40, fontScale, titleHeight);
  const visible = useMemo(
    () => catalog.filter((i) => category === "all" || i.category === category),
    [category],
  );
  const tileWidth = Math.max(
    0,
    ((contentWidth || 280) - 10 * (columns - 1)) / columns,
  );
  const owned = (id: string) =>
    !!state?.data.purchases.some((p) => p.itemId === id);
  const commonReason = error
    ? tr(`shop.error.${error}`)
    : !player
      ? tr(growth.data ? "shop.initialize" : "common.loading")
      : !state
        ? tr("common.loading")
        : shop.busy
          ? tr("common.saving")
          : null;
  const blockedReason =
    commonReason ??
    (item && !owned(item.id) && state && state.wallet.available < item.price
      ? tr("shop.insufficient")
      : null);
  const openDetail = useCallback((id: string) => {
    intent.current++;
    setSelected(id);
    setConfirming(false);
    setOrigin("detail");
    setShowCard(false);
    setNotice(null);
  }, []);
  const openBuy = useCallback((id: string) => {
    intent.current++;
    setSelected(id);
    setConfirming(true);
    setOrigin("grid");
    setShowCard(false);
    setNotice(null);
  }, []);
  const close = () => {
    intent.current++;
    setSelected(null);
    setConfirming(false);
  };
  const equipmentAction = useCallback(
    async (id: string) => {
      const product = cosmeticById(id);
      if (
        product &&
        (await shop.equip(
          product.category,
          equipment[product.category] === id ? null : id,
        ))
      )
        setNotice("updated");
    },
    [shop, equipment],
  );
  async function confirm() {
    if (!item || blockedReason || owned(item.id)) return;
    const currentIntent = intent.current;
    setConfirming(false);
    if (await shop.purchase(item.id)) {
      setNotice("purchased");
      if (origin === "grid" && currentIntent === intent.current)
        setSelected(null);
    }
  }
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={s.safe}>
      <View style={[s.content, { flex: 1, minHeight: 0 }]}>
        <View style={[s.brandRow, { paddingTop: 4, paddingBottom: 4 }]}>
          <View style={s.row}>
            <Emblem size={18} />
            <Text style={[s.brand, s.compactBrand]}>ASCEND</Text>
          </View>
          <SettingsControl />
        </View>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Text
            accessibilityRole="header"
            onLayout={(e) => setTitleHeight(e.nativeEvent.layout.height)}
            style={{
              color: colors.text,
              fontSize: 18,
              lineHeight: 24,
              fontWeight: "800",
            }}
          >
            {tr("nav.shop")}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr("shop.walletSummary", {
              balance: state
                ? tr("rewards.balance", {
                    amount: l.number(state.wallet.available),
                  })
                : tr(error ? "rewards.unavailable" : "common.loading"),
            })}
            accessibilityState={{ expanded: info }}
            aria-expanded={info}
            onPress={() => setInfo(!info)}
            style={({ pressed }) => [
              {
                padding: 8,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: colors.border,
                minHeight: 44,
                maxWidth: "75%",
              },
              pressed && s.pressed,
            ]}
          >
            <CoinBalance compact />
          </Pressable>
        </View>
        {info && (
          <View style={{ gap: 6 }}>
            {state && (
              <Text testID="wallet-breakdown" style={s.fine}>
                {tr("shop.breakdown", {
                  earned: l.number(state.wallet.earned),
                  spent: l.number(state.wallet.spent),
                })}
              </Text>
            )}
            <Text style={s.fine}>{tr("shop.cosmeticOnly")}</Text>
          </View>
        )}
        {error && (
          <View style={{ gap: 6 }}>
            <Text accessibilityRole="alert" style={s.fine}>
              {tr(`shop.error.${error}`)}
            </Text>
            <Action
              label={tr("common.retry")}
              onPress={() => void shop.reload()}
            />
          </View>
        )}
        {!player && growth.data && !error && (
          <View style={{ gap: 6 }}>
            <Text style={s.fine}>{tr("shop.initialize")}</Text>
            <Action
              label={tr("home.openPlayer")}
              onPress={() => router.push("/player")}
            />
          </View>
        )}
        <ScrollView
          testID="shop-categories"
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, flexShrink: 0 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {(["all", ...categories] as const).map((c) => (
            <Pressable
              key={c}
              accessibilityRole="button"
              accessibilityLabel={tr(`shop.category.${c}`)}
              accessibilityState={{ selected: category === c }}
              aria-selected={category === c}
              onPress={() => {
                if (category !== c) {
                  offset.current = 0;
                  setCategory(c);
                  list.current?.scrollToOffset({ offset: 0, animated: false });
                }
              }}
              style={({ pressed }) => [
                {
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  minHeight: 44,
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: category === c ? colors.bronze : colors.border,
                  borderRadius: 8,
                },
                pressed && s.pressed,
              ]}
            >
              <Text
                style={{
                  color: category === c ? colors.bronze : colors.muted,
                  fontSize: 12,
                  lineHeight: 18,
                }}
              >
                {tr(`shop.category.${c}`)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
        <Text
          accessibilityLiveRegion="polite"
          style={[s.fine, { minHeight: 18 }]}
        >
          {notice && !error
            ? tr(notice === "purchased" ? "shop.purchaseSaved" : "shop.updated")
            : tr("shop.cosmetics")}
        </Text>
        {commonReason && !error && player && (
          <Text style={s.fine}>{commonReason}</Text>
        )}
        <View
          style={{ flex: 1, minHeight: 0 }}
          onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}
        >
          <FlatList
            key={columns}
            ref={list}
            testID={`shop-grid-${columns}`}
            data={visible}
            numColumns={columns}
            keyExtractor={(i) => i.id}
            initialNumToRender={6}
            maxToRenderPerBatch={6}
            windowSize={5}
            columnWrapperStyle={columns === 2 ? { gap: 10 } : undefined}
            contentContainerStyle={{ paddingBottom: 16, gap: 10 }}
            style={{ flex: 1 }}
            onScroll={(e) => {
              if (!restore.current)
                offset.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={32}
            onLayout={() => {
              const currentList = list.current,
                savedOffset = offset.current;
              restore.current = true;
              requestAnimationFrame(() => {
                if (currentList === list.current) {
                  list.current?.scrollToOffset({
                    offset: savedOffset,
                    animated: false,
                  });
                  restore.current = false;
                }
              });
            }}
            ListEmptyComponent={
              <Text style={s.muted}>{tr("shop.emptyCategory")}</Text>
            }
            renderItem={({ item: i }) => (
              <ProductTile
                item={i}
                width={tileWidth}
                owned={owned(i.id)}
                equipped={equipment[i.category] === i.id}
                disabled={!!commonReason}
                insufficient={
                  !!state && !owned(i.id) && state.wallet.available < i.price
                }
                onView={openDetail}
                onBuy={openBuy}
                onEquip={equipmentAction}
              />
            )}
          />
        </View>
      </View>
      {item && (
        <Sheet
          title={
            confirming ? tr("shop.confirm") : tr(`shop.item.${item.id}.name`)
          }
          onClose={close}
          footer={
            <View
              testID="shop-item-actions"
              style={{ gap: 8, paddingBottom: 8 }}
            >
              {blockedReason && (
                <Text accessibilityLiveRegion="polite" style={s.fine}>
                  {blockedReason}
                </Text>
              )}
              {confirming ? (
                <>
                  <Action
                    label={tr("common.confirm")}
                    disabled={!!blockedReason || owned(item.id)}
                    onPress={() => void confirm()}
                  />
                  <Action
                    label={tr("common.cancel")}
                    onPress={() =>
                      origin === "grid" ? close() : setConfirming(false)
                    }
                  />
                </>
              ) : (
                <Action
                  label={tr(
                    owned(item.id)
                      ? equipment[item.category] === item.id
                        ? "shop.unequip"
                        : "shop.equip"
                      : "shop.buy",
                  )}
                  disabled={!!blockedReason}
                  onPress={() =>
                    owned(item.id)
                      ? void equipmentAction(item.id)
                      : setConfirming(true)
                  }
                />
              )}
            </View>
          }
        >
          {confirming && state ? (
            <Text style={s.muted} testID="shop-purchase-confirmation">
              {tr("shop.confirmMessage", {
                name: tr(`shop.item.${item.id}.name`),
                price: l.number(item.price),
                remaining: l.number(state.wallet.available - item.price),
              })}
            </Text>
          ) : (
            <>
              <CosmeticSwatch item={item} />
              <Text style={s.muted}>
                {tr(`shop.item.${item.id}.description`)}
              </Text>
              <Text style={s.fine}>
                {tr(`shop.category.${item.category}`)} ·{" "}
                {tr("shop.rarityLabel")} · {tr(`shop.rarity.${item.rarity}`)}
              </Text>
              <Text style={s.sectionTitle}>
                {tr("rewards.balance", { amount: l.number(item.price) })}
              </Text>
              {owned(item.id) && (
                <Text style={s.eyebrow}>
                  {tr(
                    equipment[item.category] === item.id
                      ? "shop.equipped"
                      : "shop.owned",
                  )}
                </Text>
              )}
              {player && (
                <Action
                  label={tr(showCard ? "shop.hideCard" : "shop.showCard")}
                  onPress={() => setShowCard(!showCard)}
                />
              )}
              {showCard && player && (
                <>
                  <Text style={s.fine}>{tr("shop.preview")}</Text>
                  <PlayerCard
                    player={{
                      name: tr("history.player"),
                      ovr: overall(player.ratings),
                      bodyRatings: player.ratings,
                      archetype: tr("coach.profile"),
                    }}
                    club={career.club}
                    cosmetics={{ ...equipment, [item.category]: item.id }}
                  />
                </>
              )}
              <Text style={s.fine}>{tr("shop.defaults")}</Text>
              {error && (
                <>
                  <Text accessibilityRole="alert" style={s.muted}>
                    {tr(`shop.error.${error}`)}
                  </Text>
                  <Action
                    label={tr("common.retry")}
                    onPress={() => void shop.reload()}
                  />
                </>
              )}
              {notice && !error && (
                <Text accessibilityLiveRegion="polite" style={s.muted}>
                  {tr(
                    notice === "purchased"
                      ? "shop.purchaseSaved"
                      : "shop.updated",
                  )}
                </Text>
              )}
            </>
          )}
        </Sheet>
      )}
    </SafeAreaView>
  );
}
