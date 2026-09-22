import { currentClub } from "@/data/club-career";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Screen,
  Panel,
  Choice,
  Placeholder,
  s,
} from "@/components/ui/primitives";
import { PlayerCard } from "@/components/player/player-card";
import { PersonalRecordsSection } from "@/components/player/personal-records";
import { GrowthStatus } from "@/components/player/growth-status";
import { cardTiers } from "@/config/visuals";
import { bodyParts } from "@/config/training";
import { colors } from "@/config/theme";
import { useGrowth } from "@/growth/provider";
import { displayRating, overall } from "@/growth/domain";
import type { CardTier, CardIntensity } from "@/types/domain";
export default function PlayerScreen() {
  const [tier, setTier] = useState<CardTier>("bronze"),
    [intensity, setIntensity] = useState<CardIntensity>("high");
  const { data } = useGrowth();
  const player = data?.player;
  return (
    <Screen kicker="PLAYER / YOUR IDENTITY" title="BUILT, NOT GIVEN">
      <GrowthStatus />
      {player && (
        <>
          <PlayerCard
            club={currentClub}
            player={{
              name: "PLAYER",
              ovr: overall(player.ratings),
              bodyRatings: player.ratings,
              archetype: "TRAINING PROFILE",
              tier,
              intensity,
            }}
          />
          <Panel title="CARD FINISH PREVIEW">
            <Text style={s.fine}>
              Explore appearances. Preview choices do not change your ratings or
              save to your Player.
            </Text>
            <View style={s.choices}>
              {(Object.keys(cardTiers) as CardTier[]).map((key) => (
                <Choice
                  key={key}
                  label={key === "elite" ? "Purple" : cardTiers[key].label}
                  selected={tier === key}
                  onPress={() => setTier(key)}
                />
              ))}
            </View>
            <Text style={s.eyebrow}>EFFECT INTENSITY</Text>
            <View style={s.choices}>
              {(["low", "mid", "high"] as const).map((key) => (
                <Choice
                  key={key}
                  label={key.toUpperCase()}
                  selected={intensity === key}
                  onPress={() => setIntensity(key)}
                />
              ))}
            </View>
          </Panel>
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
