import { Text, View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Screen, Panel, s } from "@/components/ui/primitives";
import { Emblem, Icon, type IconName } from "@/components/ui/icon";
import { creditBalance } from "@/data/mock";
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
  return (
    <Screen kicker="SHOP / MAKE IT YOURS" title="YOUR OWN SIGNATURE">
      <Panel>
        <View style={s.sectionHeading}>
          <Text style={s.eyebrow}>CREDIT BALANCE</Text>
          <Text style={t.balance}>
            {creditBalance.toLocaleString("en-US")} <Text style={t.cr}>CR</Text>
          </Text>
        </View>
      </Panel>
      <Panel title="COSMETICS" kicker="COMING SOON">
        {cosmeticCategories.map((category, index) => (
          <View
            key={category}
            accessible
            accessibilityLabel={`${category}. Coming soon.`}
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
            <Text style={t.name}>{category}</Text>
            <Icon name="lock" size={13} />
          </View>
        ))}
      </Panel>
      <Text style={s.fine}>Your style is yours. Your ratings are earned.</Text>
    </Screen>
  );
}
const t = StyleSheet.create({
  balance: { fontSize: 26, fontWeight: "800", color: colors.text },
  cr: { fontSize: 13, color: colors.bronze },
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
