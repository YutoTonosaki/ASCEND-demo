import { useLocalization } from "@/localization";
import { useCareer } from "@/career/provider";
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
 const l = useLocalization();
  const { tr } = useLocalization();
  const { club: currentClub } = useCareer();
  const [debugOpen, setDebugOpen] = useState(false);
  const { data } = useGrowth();
  const player = data?.player;
  const appearance = player ? cardAppearance(overall(player.ratings)) : null;
  return (
    <Screen kicker={tr("player.kicker")} title={tr("player.title")}>
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
              name: tr("nav.player"),
              ovr: overall(player.ratings),
              bodyRatings: player.ratings,
              archetype: tr("coach.profile"),
            }}
          />
          {appearance && (
            <Panel
              title={tr("player.currentTier")}
              kicker={l.display(cardTiers[appearance.tier].label).toUpperCase()}
            >
              <Text style={s.fine}>
                {tr("player.finish")}{l.display(appearance.finish.toUpperCase())}
              </Text>
              <Text style={s.muted}>
                {appearance.next
                  ? tr("player.nextEvolution",{tier:l.display(cardTiers[appearance.next.tier].label).toUpperCase(),ovr:appearance.next.minimum})
                  : tr("player.maximum")}
              </Text>
            </Panel>
          )}
        </>
      )}
      <PersonalRecordsSection />
      {player && (
        <Panel title={tr("player.bodyRatings")} kicker={tr("player.outOf")}>
          {bodyParts.map((area) => (
            <View
              key={area}
              testID={`rating-${area}`}
              accessible
              accessibilityLabel={tr("player.ratingAccessibility",{area:l.display(area),rating:displayRating(player.ratings[area]),status:l.display(player.status[area].toUpperCase())})}
              style={r.rating}
            >
              <View style={r.labels}>
                <View style={s.flex}>
                  <Text style={r.label}>{l.display(area)}</Text>
                  <Text style={s.fine}>
                    {player.status[area] === "assessed"
                      ? tr("player.assessed")
                      : tr("player.provisional")}
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
            {tr("player.assessments")}</Text>
          <Text style={s.fine}>
            {tr("player.assessmentNote")}</Text>
        </Panel>
      )}
      <Panel title={tr("player.development")} kicker={tr("common.comingSoon")}>
        <Placeholder title={tr("player.skillTree")} icon="grid" />
        <Placeholder title={tr("player.archetype")} icon="player" />
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
