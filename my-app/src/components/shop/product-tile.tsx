import { CosmeticArt } from "./cosmetic-art";
import { treatmentBackground, titleTreatment } from "../../shop/visuals";
import { memo } from "react";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalization } from "../../localization";
import type { CosmeticItem } from "../../shop/catalog";
import { colors } from "../../config/theme";
import { s } from "../ui/primitives";
import { Action } from "../training/controls";
export const rarityColor = {
  bronze: colors.bronze,
  silver: "#d8e4ef",
  gold: "#f6d273",
  purple: "#c4a0ff",
};
export function CosmeticSwatch({
  item,
  compact = false,
}: {
  item: CosmeticItem;
  compact?: boolean;
}) {
  const { tr } = useLocalization();
  if (item.treatment)
    return (
      <LinearGradient
        colors={
          item.category === "background"
            ? treatmentBackground(item)
            : ["#171c23", "#202731"]
        }
        style={{
          padding: compact ? 10 : 20,
          minHeight: compact ? 54 : 82,
          justifyContent: "center",
          borderRadius: 8,
          overflow: "hidden",
        }}
      >
        <CosmeticArt item={item} />
        <Text
          style={[
            {
              color: colors.text,
              fontSize: compact ? 10 : 14,
              fontWeight: "800",
              letterSpacing: 1,
            },
            item.category === "title" && titleTreatment(item),
          ]}
        >
          {item.category === "title"
            ? tr(`shop.item.${item.id}.name`)
            : "ASCEND"}
        </Text>
      </LinearGradient>
    );
  return (
    <LinearGradient
      colors={[
        "#171c23",
        item.category === "background" ? item.color : "#202731",
      ]}
      style={{
        padding: compact ? 8 : 18,
        minHeight: compact ? 54 : 82,
        justifyContent: "center",
        borderRadius: 8,
        borderWidth: item.category === "border" ? 2 : 1,
        borderColor: item.category === "border" ? item.color : colors.border,
        gap: 6,
      }}
    >
      <Text
        style={{
          color: item.category === "aura" ? item.color : colors.text,
          fontSize: compact ? 10 : 14,
          fontWeight: "800",
          letterSpacing: 1,
        }}
      >
        {item.category === "title" ? tr(`shop.item.${item.id}.name`) : "ASCEND"}
      </Text>
      <View
        style={{ height: 3, backgroundColor: item.color, borderRadius: 2 }}
      />
    </LinearGradient>
  );
}
export const ProductTile = memo(function ProductTile({
  item,
  width,
  owned,
  equipped,
  disabled,
  insufficient,
  onView,
  onBuy,
  onEquip,
}: {
  item: CosmeticItem;
  width: number;
  owned: boolean;
  equipped: boolean;
  disabled: boolean;
  insufficient: boolean;
  onView: (id: string) => void;
  onBuy: (id: string) => void;
  onEquip: (id: string) => void;
}) {
  const l = useLocalization(),
    { tr } = l,
    name = tr(`shop.item.${item.id}.name`);
  return (
    <View
      testID={`shop-tile-${item.id}`}
      style={{
        width,
        padding: 10,
        borderWidth: 1,
        borderColor: equipped ? colors.bronze : colors.border,
        borderRadius: 12,
        backgroundColor: colors.surface,
        gap: 6,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr("shop.details", { name })}
        onPress={() => onView(item.id)}
        style={({ pressed }) => [
          { minHeight: 44, gap: 8 },
          pressed && s.pressed,
        ]}
      >
        <CosmeticSwatch item={item} compact />
        <Text
          style={{
            color: colors.text,
            fontSize: 13,
            lineHeight: 18,
            fontWeight: "700",
            minHeight: 36,
          }}
        >
          {name}
        </Text>
      </Pressable>
      <Text
        style={{
          color: rarityColor[item.rarity],
          fontSize: 10,
          lineHeight: 14,
        }}
      >
        {tr(`shop.rarity.${item.rarity}`)}
      </Text>
      <Text
        style={{
          color: equipped ? colors.bronze : colors.text,
          fontSize: 13,
          lineHeight: 18,
          fontWeight: "700",
        }}
      >
        {owned
          ? tr(equipped ? "shop.equipped" : "shop.owned")
          : tr("rewards.balance", { amount: l.number(item.price) })}
      </Text>
      <View style={{ flex: 1 }} />
      {insufficient && <Text style={s.fine}>{tr("shop.insufficient")}</Text>}
      <Action
        label={tr(
          owned
            ? equipped
              ? "shop.unequipItem"
              : "shop.equipItem"
            : "shop.buyItem",
          { name },
        )}
        displayLabel={tr(
          owned ? (equipped ? "shop.unequip" : "shop.equip") : "shop.buy",
        )}
        disabled={disabled || insufficient}
        onPress={() => (owned ? onEquip(item.id) : onBuy(item.id))}
      />
    </View>
  );
});
