import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import type { Player } from "@/types/domain";
import { cardTiers } from "@/config/visuals";
import { colors } from "@/config/theme";
import { ClubIdentity } from "@/components/club/club-identity";
import type { ClubIdentity as ClubIdentityData } from "@/types/club";
import { Icon } from "@/components/ui/icon";
export function PlayerSummary({
  player,
  club,
  form,
}: {
  player: Player;
  club?: ClubIdentityData;
  form: string;
}) {
  const palette = cardTiers[player.tier];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${player.name}, OVR ${player.ovr}, form ${form}${club ? `, ${club.name}` : ""}. Open Player`}
      onPress={() => router.push("/player")}
      style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
    >
      <LinearGradient
        colors={[palette.deep, "#1b1d21"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor: palette.accent + "70" }]}
      >
        <View>
          <Text style={[styles.number, { color: palette.accent }]}>
            {player.ovr}
          </Text>
          <Text style={[styles.overall, { color: palette.accent }]}>OVR</Text>
        </View>
        <View style={styles.identity}>
          <Text style={styles.name}>{player.name}</Text>
          <Text style={styles.archetype}>{player.archetype}</Text>
          {club && <ClubIdentity club={club} compact />}
          <Text style={styles.form}>● FORM {form}</Text>
        </View>
        <Icon name="arrow" size={16} color={palette.accent} />
      </LinearGradient>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
  },
  number: {
    fontSize: 56,
    lineHeight: 60,
    fontWeight: "900",
    letterSpacing: -2,
  },
  overall: { fontSize: 10, letterSpacing: 2 },
  identity: { flex: 1, gap: 5, minWidth: 0 },
  name: { fontSize: 18, fontWeight: "800", color: colors.text },
  archetype: { fontSize: 9, letterSpacing: 0.6, color: colors.muted },
  form: { fontSize: 10, fontWeight: "700", color: colors.ready },
});
