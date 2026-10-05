import { useLocalization } from "@/localization";
import { displayRating } from "@/growth/domain";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { cardTiers } from "@/config/visuals";
import { cardAppearance } from "@/cards/domain";
import type { Player } from "@/types/domain";
import { ClubIdentity } from "@/components/club/club-identity";
import type { ClubIdentity as ClubIdentityData } from "@/types/club";
import { Emblem } from "@/components/ui/icon";
export function PlayerCard({
  player,
  club,
}: {
  player: Omit<Player, "ratings" | "tier" | "intensity">;
  club?: ClubIdentityData;
}) {
 const l = useLocalization();
  const { tr } = useLocalization();
  const { tier, finish, intensity } = cardAppearance(player.ovr);
  const palette = cardTiers[tier];
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
          <View
            pointerEvents="none"
            style={[
              c.shine,
              {
                opacity: intensity === "high" ? 0.12 : 0.06,
                transform: [{ rotate: "25deg" }],
                left: "50%",
              },
            ]}
          />
        )}
        {tier === "ascend" && (
          <View
            pointerEvents="none"
            style={[
              c.inset,
              {
                top: 13,
                left: 13,
                right: 13,
                bottom: 13,
                borderColor: "#f8e7a888",
                borderWidth: 2,
              },
            ]}
          />
        )}
        <View style={c.top}>
          <Text style={[c.brand, { color: palette.accent }]}>ASCEND</Text>
          <Text style={[c.micro, { color: palette.accent }]}>
            {tr("card.athlete")}</Text>
        </View>
        <View style={c.hero}>
          <View>
            <Text style={[c.ovr, { color: palette.accent }]}>{player.ovr}</Text>
            <Text style={[c.overall, { color: palette.accent }]}>{tr("card.overall")}</Text>
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
                    Chest: tr("card.chest"),
                    Back: tr("card.back"),
                    Shoulders: tr("card.shoulders"),
                    Arms: tr("card.arms"),
                    Core: tr("card.core"),
                    Legs: tr("card.legs"),
                  }[key]
                }
              </Text>
            </View>
          ))}
        </View>
        <View style={c.bottom}>
          <Text style={[c.micro, { color: palette.accent }]}>
            {l.display(palette.label).toUpperCase()}
          </Text>
          <Text style={[c.micro, { color: palette.accent }]}>
            {tier === "ascend"
              ? tr("player.maximum")
              : tr("card.finish",{finish:l.display(finish.toUpperCase())})}
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
    flexWrap: "wrap",
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
    flexWrap: "wrap",
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
    flexWrap: "wrap",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#ffffff28",
    paddingVertical: 17,
    marginVertical: 20,
  },
  stat: { gap: 5, flexGrow: 1, flexBasis: "30%", minWidth: 52 },
  value: { fontSize: 24, fontWeight: "700", color: "#fff2e7" },
  label: { fontSize: 9, letterSpacing: 0.5 },
  bottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    flexWrap: "wrap",
  },
});
