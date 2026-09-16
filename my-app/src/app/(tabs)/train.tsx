import { Text, View, StyleSheet, Pressable } from "react-native";
import { Screen, Panel, Placeholder, s } from "@/components/ui/primitives";
import { Icon } from "@/components/ui/icon";
import { colors } from "@/config/theme";
export default function Train() {
  return (
    <Screen kicker="TRAIN / FIND YOUR FOCUS" title="PUT IN THE WORK">
      <Text style={s.muted}>Choose your way to train.</Text>
      {[
        {
          title: "AI COACH",
          subtitle: "A plan that grows with you.",
          icon: "bolt" as const,
        },
        {
          title: "CUSTOM WORKOUT",
          subtitle: "Your session. Your approach.",
          icon: "train" as const,
        },
      ].map((mode) => (
        <Pressable
          key={mode.title}
          disabled
          accessibilityRole="button"
          accessibilityLabel={`${mode.title}. Coming soon.`}
          accessibilityState={{ disabled: true }}
          style={t.primary}
        >
          <View style={s.sectionHeading}>
            <Icon name={mode.icon} size={25} color={colors.bronze} />
            <Text style={s.tiny}>COMING SOON</Text>
          </View>
          <Text style={t.title}>{mode.title}</Text>
          <Text style={s.muted}>{mode.subtitle}</Text>
        </Pressable>
      ))}
      <Panel title="YOUR TRAINING">
        <Placeholder title="SAVED WORKOUTS" icon="grid" />
        <Placeholder title="WORKOUT HISTORY" icon="train" />
      </Panel>
    </Screen>
  );
}
const t = StyleSheet.create({
  primary: {
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.6,
    color: colors.text,
  },
});
