import { useLocalization } from "@/localization";
import { Text, View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Screen, Panel, s } from "@/components/ui/primitives";
import { Emblem, Icon, type IconName } from "@/components/ui/icon";
import { CoinBalance } from "@/components/rewards/rewards";
import { colors, cosmeticCategories } from "@/config/theme";
const icons: IconName[] = [
  "grid",
  "player",
  "bolt",
  "train",
  "career",
  "player",
  "bolt",
];
export default function Shop() {
 const l = useLocalization();
  const { tr } = useLocalization();
  return (
    <Screen kicker={tr("shop.kicker")} title={tr("shop.title")}>
      <CoinBalance />
      <Text style={s.fine}>
        {tr("shop.note")}</Text>
      <Panel title={tr("shop.cosmetics")} kicker={tr("common.comingSoon")}>
        {cosmeticCategories.map((category, index) => (
          <View
            key={l.display(category)}
            accessible
            accessibilityLabel={`${l.display(category)}. Coming soon.`}
            accessibilityState={{ disabled: true }}
            style={t.category}
          >
            <LinearGradient colors={["#35303a", "#1c232d"]} style={t.art}>
              {index === 0 ? (
                <Emblem size={25} />
              ) : (
                <Icon name={icons[index]} size={24} color={colors.bronze} />
              )}
            </LinearGradient>
            <Text style={t.name}>{l.display(category)}</Text>
            <Icon name="lock" size={13} />
          </View>
        ))}
      </Panel>
      <Text style={s.fine}>{tr("shop.footer")}</Text>
    </Screen>
  );
}
const t = StyleSheet.create({
  category: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 52,
  },
  art: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  name: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.text },
});
