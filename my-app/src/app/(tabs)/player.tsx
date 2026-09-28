import { currentClub } from "@/data/club-career";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Screen, Panel, Placeholder, s } from "@/components/ui/primitives";
import { PlayerCard } from "@/components/player/player-card";
import { PersonalRecordsSection } from "@/components/player/personal-records";
import { Action } from "@/components/training/controls";
import { GrowthDebugPanel } from "@/components/player/growth-debug-panel";
import { GrowthStatus } from "@/components/player/growth-status";
import { cardTiers } from "@/config/visuals";
import { bodyParts } from "@/config/training";
import { colors } from "@/config/theme";
import { useGrowth } from "@/growth/provider";
import { displayRating, overall } from "@/growth/domain";
import { cardAppearance } from "@/cards/domain";
export default function PlayerScreen() {
  const [debugOpen, setDebugOpen] = useState(false);
  const { data } = useGrowth();
  const player = data?.player;
  const appearance = player ? cardAppearance(overall(player.ratings)) : null;
  return (
    <Screen kicker="PLAYER / YOUR IDENTITY" title="BUILT, NOT GIVEN">
      <GrowthStatus />
      {__DEV__ && (
        <Action label="GROWTH DEBUG" onPress={() => setDebugOpen(true)} />
      )}
      {__DEV__ && debugOpen && (
        <GrowthDebugPanel onClose={() => setDebugOpen(false)} />
      )}
      {player && (
        <>
          <PlayerCard
            club={currentClub}
            player={{
              name: "PLAYER",
              ovr: overall(player.ratings),
              bodyRatings: player.ratings,
              archetype: "TRAINING PROFILE",
            }}
          />
          {appearance && (
            <Panel
              title="CURRENT TIER"
              kicker={cardTiers[appearance.tier].label.toUpperCase()}
            >
              <Text style={s.fine}>
                CURRENT FINISH · {appearance.finish.toUpperCase()}
              </Text>
              <Text style={s.muted}>
                {appearance.next
                  ? `NEXT EVOLUTION · ${cardTiers[appearance.next.tier].label.toUpperCase()} — OVR ${appearance.next.minimum}`
                  : "MAXIMUM EVOLUTION"}
              </Text>
            </Panel>
          )}
        </>
      )}
      <PersonalRecordsSection />
      {player && (
        <Panel title="BODY RATINGS" kicker="OUT OF 99">
          {bodyParts.map((area) => (
            <View
              key={area}
              testID={`rating-${area}`}
              accessible
              accessibilityLabel={`${area}: ${displayRating(player.ratings[area])} out of 99, ${player.status[area]}`}
              style={r.rating}
            >
              <View style={r.labels}>
                <View style={s.flex}>
                  <Text style={r.label}>{area}</Text>
                  <Text style={s.fine}>
                    {player.status[area] === "assessed"
                      ? "ASSESSED"
                      : "PROVISIONAL"}
                  </Text>
                </View>
                <Text style={r.value}>
                  {displayRating(player.ratings[area])}
                </Text>
              </View>
              <View style={r.track}>
                <View
                  style={[
                    r.fill,
                    { width: `${(player.ratings[area] / 99) * 100}%` },
                  ]}
                />
              </View>
            </View>
          ))}
          <Text style={s.fine}>
            Direct assessments: Push-up → Chest; Pull-up → Back; Overhead Press
            (5+ reps) → Shoulders; Diamond Push-up → Arms; Plank → Core;
            Bodyweight Squat → Legs. Other movements can improve assessed areas
            but cannot establish an initial rating.
          </Text>
          <Text style={s.fine}>
            A first assessment replaces the provisional estimate and may move it
            up or down. It is not a growth reward.
          </Text>
        </Panel>
      )}
      <Panel title="PLAYER DEVELOPMENT" kicker="COMING SOON">
        <Placeholder title="SKILL TREE" icon="grid" />
        <Placeholder title="ARCHETYPE" icon="player" />
      </Panel>
    </Screen>
  );
}
const r = StyleSheet.create({
  rating: { gap: 5 },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  label: { fontSize: 13, color: colors.text, fontWeight: "600" },
  value: {
    fontSize: 21,
    color: colors.text,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  track: {
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: "hidden",
  },
  fill: { height: 5, backgroundColor: colors.bronze, borderRadius: 4 },
});
