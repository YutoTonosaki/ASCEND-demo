import type { PropsWithChildren } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/config/theme";
import { Emblem, Icon, type IconName } from "./icon";
import { SettingsControl } from "./settings-control";
export function Screen({
  children,
  title,
  kicker,
  subtitle,
  home = false,
}: PropsWithChildren<{
  title: string;
  kicker: string;
  subtitle?: string;
  home?: boolean;
}>) {
  return (
    <SafeAreaView edges={["top", "left", "right"]} style={s.safe}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.content}>
          <View style={s.brandRow}>
            <View style={s.row}>
              <Emblem size={home ? 23 : 18} />
              <Text style={[s.brand, !home && s.compactBrand]}>ASCEND</Text>
            </View>
            <SettingsControl />
          </View>
          <View style={s.heading}>
            <Text style={s.eyebrow}>{kicker}</Text>
            <Text
              accessibilityRole="header"
              style={[s.title, !home && s.compactTitle]}
            >
              {title}
              <Text style={{ color: colors.bronze }}>.</Text>
            </Text>
            {subtitle && <Text style={s.muted}>{subtitle}</Text>}
          </View>
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
export function Panel({
  children,
  title,
  kicker,
  style,
}: PropsWithChildren<{
  title?: string;
  kicker?: string;
  style?: StyleProp<ViewStyle>;
}>) {
  return (
    <View style={[s.panel, style]}>
      {title && (
        <View style={s.sectionHeading}>
          <Text accessibilityRole="header" style={s.sectionTitle}>
            {title}
          </Text>
          {kicker && <Text style={s.tiny}>{kicker}</Text>}
        </View>
      )}
      {children}
    </View>
  );
}
export function Button({
  label,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [s.button, pressed && s.pressed]}
    >
      <Text style={s.buttonText}>{label}</Text>
      <Icon name="arrow" color={colors.background} size={19} />
    </Pressable>
  );
}
/** Compact unavailable entry point, intentionally without a fake action. */
export function Placeholder({
  title,
  description,
  icon = "lock",
}: {
  title: string;
  description?: string;
  icon?: IconName;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${title}. Coming soon.${description ? ` ${description}` : ""}`}
      accessibilityState={{ disabled: true }}
      style={s.utilityRow}
    >
      <Icon name={icon} size={20} />
      <View style={s.flex}>
        <Text style={s.utilityTitle}>{title}</Text>
        {description && <Text style={s.fine}>{description}</Text>}
      </View>
      <Icon name="lock" size={13} />
    </View>
  );
}
export function Choice({
  label,
  selected,
  onPress,
  color,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        s.choice,
        selected && s.choiceSelected,
        pressed && s.pressed,
      ]}
    >
      {color && <View style={[s.dot, { backgroundColor: color }]} />}
      <Text style={[s.choiceText, selected && { color: colors.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}
export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, paddingBottom: 24 },
  content: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 20,
    gap: 12,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  flex: { flex: 1, minWidth: 0 },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  brand: {
    fontSize: 24,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: 1.2,
    color: colors.text,
  },
  compactBrand: { fontSize: 19 },
  compactTitle: { fontSize: 26, lineHeight: 30, letterSpacing: -0.8 },
  utilityRow: {
    minHeight: 56,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  utilityTitle: { fontSize: 13, color: colors.muted, fontWeight: "600" },
  heading: { gap: 5, paddingVertical: 2 },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.muted,
    fontWeight: "600",
  },
  title: {
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 38,
    letterSpacing: -1.3,
    color: colors.text,
  },
  muted: { fontSize: 13, lineHeight: 20, color: colors.muted },
  panel: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 12,
  },
  sectionHeading: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    color: colors.text,
  },
  tiny: { fontSize: 9, letterSpacing: 1, color: colors.muted },
  button: {
    backgroundColor: colors.text,
    borderRadius: 9,
    paddingHorizontal: 17,
    paddingVertical: 17,
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  buttonText: {
    color: colors.background,
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  pressed: { opacity: 0.7 },
  choice: {
    minHeight: 48,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    flexDirection: "row",
  },
  choiceSelected: {
    backgroundColor: colors.raised,
    borderColor: colors.bronze,
  },
  choiceText: { fontSize: 12, color: colors.muted, fontWeight: "600" },
  dot: { width: 8, height: 8, borderRadius: 4 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  number: {
    fontSize: 52,
    fontWeight: "800",
    letterSpacing: -2,
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  fine: { fontSize: 11, lineHeight: 17, color: colors.muted },
});
