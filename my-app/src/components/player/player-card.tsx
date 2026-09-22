import { displayRating } from "@/growth/domain";
import { Animated, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { cardTiers } from "@/config/visuals";
import { useCardMotion } from "@/animations/use-card-motion";
import type { CardIntensity, CardTier, Player } from "@/types/domain";
import { ClubIdentity } from "@/components/club/club-identity";
import type { ClubIdentity as ClubIdentityData } from "@/types/club";
import { Emblem } from "@/components/ui/icon";
export function PlayerCard({
  player,
  club,
  tier = player.tier,
  intensity = player.intensity,
}: {
  player: Omit<Player, "ratings">;
  club?: ClubIdentityData;
  tier?: CardTier;
  intensity?: CardIntensity;
}) {
  const palette = cardTiers[tier];
  const motion = useCardMotion(intensity !== "low");
  return (
    <View
      testID="player-card"
      style={[
        c.outer,
        {
          borderColor: palette.accent,
          boxShadow:
            intensity === "high" ? `0px 4px 24px ${palette.accent}30` : "none",
        },
      ]}
    >
      <LinearGradient
        colors={[palette.deep, "#191b20", palette.deep]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={c.card}
      >
        <View
          pointerEvents="none"
          style={[c.inset, { borderColor: palette.accent + "45" }]}
        />
        {intensity !== "low" && (
          <Animated.View
            pointerEvents="none"
            style={[
              c.shine,
              {
                opacity: motion.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.06, 0.2],
                }),
                transform: [
                  {
                    translateX: motion.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-80, 160],
                    }),
                  },
                  { rotate: "25deg" },
                ],
              },
            ]}
          />
        )}
        {intensity === "high" && (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                opacity: motion.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.35, 0.95],
                }),
              },
            ]}
          >
            {[18, 39, 63, 82].map((left, index) => (
              <View
                key={left}
                style={{
                  position: "absolute",
                  left: `${left}%`,
                  top: 35 + index * 48,
                  width: 3,
                  height: 3,
                  borderRadius: 2,
                  backgroundColor: palette.accent,
                }}
              />
            ))}
          </Animated.View>
        )}
        <View style={c.top}>
          <Text style={[c.brand, { color: palette.accent }]}>ASCEND</Text>
          <Text style={[c.micro, { color: palette.accent }]}>
            ATHLETE ID // 001
          </Text>
        </View>
        <View style={c.hero}>
          <View>
            <Text style={[c.ovr, { color: palette.accent }]}>{player.ovr}</Text>
            <Text style={[c.overall, { color: palette.accent }]}>OVERALL</Text>
          </View>
          <Emblem size={104} color={palette.accent} />
        </View>
        <Text style={[c.archetype, { color: palette.accent }]}>
          {player.archetype}
        </Text>
        <Text style={c.name}>{player.name}</Text>
        {club && (
          <View style={{ marginTop: 6 }}>
            <ClubIdentity club={club} />
          </View>
        )}
        <View style={c.ratings}>
          {Object.entries(player.bodyRatings).map(([key, value]) => (
            <View key={key} style={c.stat}>
              <Text style={c.value}>{displayRating(value)}</Text>
              <Text style={[c.label, { color: palette.accent }]}>
                {
                  {
                    Chest: "CHST",
                    Back: "BACK",
                    Shoulders: "SHLD",
                    Arms: "ARMS",
                    Core: "CORE",
                    Legs: "LEGS",
                  }[key]
                }
              </Text>
            </View>
          ))}
        </View>
        <View style={c.bottom}>
          <Text style={[c.micro, { color: palette.accent }]}>
            {palette.label.toUpperCase()}
          </Text>
          <Text style={[c.micro, { color: palette.accent }]}>
            {intensity.toUpperCase()} FINISH
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}
const c = StyleSheet.create({
  outer: { borderWidth: 1, borderRadius: 18, borderBottomRightRadius: 35 },
  card: {
    borderRadius: 17,
    borderBottomRightRadius: 34,
    overflow: "hidden",
    padding: 24,
  },
  inset: {
    position: "absolute",
    top: 8,
    left: 8,
    right: 8,
    bottom: 8,
    borderWidth: 1,
    borderRadius: 10,
    borderBottomRightRadius: 26,
  },
  shine: {
    position: "absolute",
    top: -100,
    bottom: -100,
    width: 75,
    backgroundColor: "#fff",
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  brand: {
    fontSize: 14,
    fontWeight: "900",
    fontStyle: "italic",
    letterSpacing: 1,
  },
  micro: { fontSize: 9, letterSpacing: 1 },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 24,
  },
  ovr: {
    fontSize: 100,
    lineHeight: 105,
    fontWeight: "900",
    letterSpacing: -5,
    fontVariant: ["tabular-nums"],
  },
  overall: { fontSize: 10, letterSpacing: 3 },
  archetype: { fontSize: 10, letterSpacing: 2, marginBottom: 8 },
  name: { fontSize: 34, fontWeight: "900", letterSpacing: 1, color: "#fff2e7" },
  ratings: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#ffffff28",
    paddingVertical: 17,
    marginVertical: 20,
  },
  stat: { gap: 5, flex: 1 },
  value: { fontSize: 24, fontWeight: "700", color: "#fff2e7" },
  label: { fontSize: 9, letterSpacing: 0.5 },
  bottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
});
