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
import { player } from "@/data/mock";
import { cardTiers, ratingLabels } from "@/config/visuals";
import { colors } from "@/config/theme";
import type { CardTier, CardIntensity, AthleticRating } from "@/types/domain";
export default function PlayerScreen() {
  const [tier, setTier] = useState<CardTier>(player.tier);
  const [intensity, setIntensity] = useState<CardIntensity>(player.intensity);
  return (
    <Screen kicker="PLAYER / YOUR IDENTITY" title="BUILT, NOT GIVEN">
      <PlayerCard player={player} tier={tier} intensity={intensity} />
      <Panel title="CARD FINISH">
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
      <Panel title="ATHLETIC RATINGS" kicker="OUT OF 99">
        {Object.entries(player.ratings).map(([key, value]) => (
          <Rating
            key={key}
            label={key}
            description={ratingLabels[key as AthleticRating]}
            value={value}
          />
        ))}
      </Panel>
      <Panel title="BODY RATINGS" kicker="OUT OF 99">
        {Object.entries(player.bodyRatings).map(([key, value]) => (
          <Rating key={key} label={key} value={value} />
        ))}
      </Panel>
      <Panel title="PLAYER DEVELOPMENT" kicker="COMING SOON">
        <Placeholder title="PERSONAL RECORDS" icon="career" />
        <Placeholder title="SKILL TREE" icon="grid" />
        <Placeholder
          title="ARCHETYPE"
          description={player.archetype}
          icon="player"
        />
      </Panel>
    </Screen>
  );
}
function Rating({
  label,
  description,
  value,
}: {
  label: string;
  description?: string;
  value: number;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}${description ? `, ${description}` : ""}: ${value} out of 99`}
      style={r.rating}
    >
      <View style={r.labels}>
        <View style={s.flex}>
          <Text style={r.label}>{label}</Text>
        </View>
        <Text style={r.value}>{value}</Text>
      </View>
      <View style={r.track}>
        <View style={[r.fill, { width: `${(value / 99) * 100}%` }]} />
      </View>
    </View>
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
