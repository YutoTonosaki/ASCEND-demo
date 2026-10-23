import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalization } from "../../localization";
import { useShop } from "../../shop/provider";
import {
  catalog,
  categories,
  cosmeticById,
  defaultEquipment,
  type CosmeticCategory,
  type CosmeticItem,
} from "../../shop/catalog";
import { useGrowth } from "../../growth/provider";
import { useCareer } from "../../career/provider";
import { overall } from "../../growth/domain";
import { colors } from "../../config/theme";
import { Screen, Panel, s } from "../ui/primitives";
import { Action, Sheet, Confirm } from "../training/controls";
import { CoinBalance } from "../rewards/rewards";
import { PlayerCard } from "../player/player-card";
const rarityColor = {
  bronze: colors.bronze,
  silver: "#d8e4ef",
  gold: "#f6d273",
  purple: "#c4a0ff",
};
function Swatch({ item }: { item: CosmeticItem }) {
  const { tr } = useLocalization();
  return (
    <LinearGradient
      colors={[
        "#171c23",
        item.category === "background" ? item.color : "#202731",
      ]}
      style={{
        padding: 20,
        borderRadius: 12,
        borderWidth: item.category === "border" ? 3 : 1,
        borderColor: item.category === "border" ? item.color : colors.border,
        gap: 10,
      }}
    >
      <Text
        style={[
          s.sectionTitle,
          { color: item.category === "aura" ? item.color : colors.text },
        ]}
      >
        {item.category === "title" ? tr(`shop.item.${item.id}.name`) : "ASCEND"}
      </Text>
      <View
        style={{ height: 3, backgroundColor: item.color, borderRadius: 2 }}
      />
    </LinearGradient>
  );
}
export function Storefront() {
  const l = useLocalization(),
    { tr } = l,
    shop = useShop(),
    growth = useGrowth(),
    career = useCareer();
  const [category, setCategory] = useState<CosmeticCategory | "all">("all"),
    [selected, setSelected] = useState<string | null>(null),
    [confirming, setConfirming] = useState(false),
    [notice, setNotice] = useState<"purchased" | "updated" | null>(null);
  const item = selected ? cosmeticById(selected) : undefined,
    player = growth.data?.player;
  const state = shop.snapshot,
    equipment = state?.data.equipment ?? defaultEquipment();
  const owned = (id: string) =>
    !!state?.data.purchases.some((p) => p.itemId === id);
  const equipped = (i: CosmeticItem) => equipment[i.category] === i.id;
  const status = (i: CosmeticItem) =>
    !state
      ? tr(shop.error ? "common.unavailable" : "common.loading")
      : tr(
          equipped(i)
            ? "shop.equipped"
            : owned(i.id)
              ? "shop.owned"
              : state && state.wallet.available < i.price
                ? "shop.insufficient"
                : "shop.buy",
        );
  const visible = catalog.filter(
    (i) => category === "all" || i.category === category,
  );
  async function equipmentAction(i: CosmeticItem) {
    if (await shop.equip(i.category, equipped(i) ? null : i.id))
      setNotice("updated");
  }
  const error = shop.actionError ?? shop.error;
  return (
    <Screen kicker={tr("shop.kicker")} title={tr("shop.title")}>
      <CoinBalance />
      {state && (
        <Text testID="wallet-breakdown" style={s.fine}>
          {tr("shop.breakdown", {
            earned: l.number(state.wallet.earned),
            spent: l.number(state.wallet.spent),
          })}
        </Text>
      )}
      <Text style={s.fine}>{tr("shop.cosmeticOnly")}</Text>
      {!player && (
        <>
          <Text style={s.muted}>{tr("shop.initialize")}</Text>
          <Action
            label={tr("home.openPlayer")}
            onPress={() => router.push("/player")}
          />
        </>
      )}
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
          {tr(`shop.${notice}`)}
        </Text>
      )}
      <Text style={s.sectionTitle}>{tr("shop.cosmetics")}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {(["all", ...categories] as const).map((c) => (
          <Pressable
            key={c}
            accessibilityRole="button"
            accessibilityLabel={tr(`shop.category.${c}`)}
            accessibilityState={{ selected: category === c }}
            onPress={() => setCategory(c)}
            style={{
              padding: 12,
              minHeight: 44,
              borderWidth: 1,
              borderColor: category === c ? colors.bronze : colors.border,
              borderRadius: 8,
            }}
          >
            <Text style={s.muted}>{tr(`shop.category.${c}`)}</Text>
          </Pressable>
        ))}
      </View>
      {visible.length === 0 && (
        <Text style={s.muted}>{tr("shop.emptyCategory")}</Text>
      )}
      {visible.map((i) => (
        <Panel
          key={i.id}
          title={tr(`shop.item.${i.id}.name`)}
          kicker={tr(`shop.category.${i.category}`)}
        >
          <Swatch item={i} />
          <Text style={[s.eyebrow, { color: rarityColor[i.rarity] }]}>
            {tr(`shop.rarity.${i.rarity}`)}
          </Text>
          <Text style={s.muted}>
            {tr("rewards.balance", { amount: l.number(i.price) })} · {status(i)}
          </Text>
          <Action
            label={tr("shop.details", { name: tr(`shop.item.${i.id}.name`) })}
            onPress={() => {
              setSelected(i.id);
              setNotice(null);
            }}
          />
        </Panel>
      ))}
      {item && (
        <Sheet
          title={tr(`shop.item.${item.id}.name`)}
          onClose={() => {
            setSelected(null);
            setConfirming(false);
          }}
        >
          <Swatch item={item} />
          <Text style={s.muted}>{tr(`shop.item.${item.id}.description`)}</Text>
          <Text style={s.fine}>
            {tr(`shop.category.${item.category}`)} · {tr("shop.rarityLabel")} ·{" "}
            {tr(`shop.rarity.${item.rarity}`)}
          </Text>
          <Text style={s.sectionTitle}>
            {tr("rewards.balance", { amount: l.number(item.price) })}
          </Text>
          <Text style={s.eyebrow}>{status(item)}</Text>
          <Text style={s.fine}>{tr("shop.preview")}</Text>
          {player && (
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
              {tr(`shop.${notice}`)}
            </Text>
          )}
          {owned(item.id) ? (
            <Action
              label={tr(equipped(item) ? "shop.unequip" : "shop.equip")}
              disabled={shop.busy || !!error}
              onPress={() => void equipmentAction(item)}
            />
          ) : (
            <Action
              label={tr("shop.buy")}
              disabled={
                !player ||
                !state ||
                !!error ||
                shop.busy ||
                state.wallet.available < item.price
              }
              onPress={() => setConfirming(true)}
            />
          )}
          {state && !owned(item.id) && state.wallet.available < item.price && (
            <Text style={s.muted}>{tr("shop.insufficient")}</Text>
          )}
        </Sheet>
      )}
      {confirming && item && state && (
        <Confirm
          title={tr("shop.confirm")}
          message={tr("shop.confirmMessage", {
            name: tr(`shop.item.${item.id}.name`),
            price: l.number(item.price),
            remaining: l.number(state.wallet.available - item.price),
          })}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            void shop.purchase(item.id).then((saved) => {
              if (saved) setNotice("purchased");
            });
          }}
        />
      )}
    </Screen>
  );
}
