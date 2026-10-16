import { useEffect, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalization } from "../../localization";
import { colors } from "../../config/theme";
import { s, Panel } from "../ui/primitives";
import { PlayerCard } from "../player/player-card";
import { ClubIdentity } from "../club/club-identity";
import { Emblem } from "../ui/icon";
import type {
  Matchup,
  MatchPresentation,
} from "../../matches/presentation/model";
import { STAGE_MS, type Stage } from "../../matches/presentation/controller";

export function MatchCards({ model }: { model: Matchup }) {
  const { tr } = useLocalization();
  return (
    <View style={{ gap: 16 }}>
      <PlayerCard
        player={{
          name: tr("history.player"),
          archetype: tr("cinematic.frozen"),
          ovr: model.player.ovr,
          bodyRatings: model.player.ratings,
        }}
        club={model.player.club}
      />
      <Text style={v.vs}>{tr("cinematic.vs")}</Text>
      <Panel title={tr("history.rival")}>
        <View style={[s.row, { flexWrap: "wrap" }]}>
          <Emblem size={64} color={model.rival.appearance.kitColor} />
          <Text style={[s.sectionTitle, { fontSize: 28, flexShrink: 1 }]}>
            {model.rival.name}
          </Text>
        </View>
        <Text style={v.power}>OVR {model.rival.ovr}</Text>
        <ClubIdentity club={model.rival.club} />
        <Text style={s.muted}>
          {tr("history.condition")} +{model.rival.condition}
        </Text>
      </Panel>
      <Panel title={tr("cinematic.powers")}>
        <Text style={s.muted}>
          {tr("history.weekEndOVR")} · {model.player.ovr}
        </Text>
        <Text style={s.muted}>
          {tr("history.bonus")} · +{model.player.bonus}
        </Text>
        <Text style={s.sectionTitle}>
          {tr("history.playerPower")} · {model.player.power}
        </Text>
        <Text style={s.sectionTitle}>
          {tr("history.rivalPower")} · {model.rival.power}
        </Text>
      </Panel>
    </View>
  );
}

/** Replaceable 2D renderer: only consumes immutable factual model and playback stage. */
export function MatchRenderer({
  model,
  stage,
}: {
  model: MatchPresentation;
  stage: Exclude<Stage, "report">;
}) {
  const { tr } = useLocalization();
  const [progress] = useState(() => new Animated.Value(0));
  useEffect(() => {
    progress.setValue(0);
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: STAGE_MS[stage],
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [progress, stage]);
  const headline =
    stage === "vs"
      ? tr("cinematic.vs")
      : stage === "simulation"
        ? tr("cinematic.progress")
        : tr(`cinematic.outcome.${model.result.outcome}`);
  return (
    <LinearGradient
      colors={["#253448", colors.background, "#36281e"]}
      style={v.arena}
    >
      <Text
        testID={`cinematic-${stage}`}
        accessibilityRole="header"
        accessibilityLiveRegion="polite"
        style={v.vs}
      >
        {headline}
      </Text>
      <Text style={s.sectionTitle}>
        {tr("history.player")} · {model.rival.name}
      </Text>
      <View
        style={v.pitch}
        accessible
        accessibilityLabel={tr("cinematic.visualOnly")}
      >
        <View style={v.midline} />
        <View style={v.circle} />
        <Animated.View
          style={[
            v.marker,
            {
              backgroundColor: colors.bronze,
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 0.35, 0.65, 1],
                    outputRange: [45, -45, 20, -30],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View
          style={[
            v.marker,
            {
              right: "25%",
              left: undefined,
              backgroundColor: model.rival.appearance.kitColor,
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 0.35, 0.65, 1],
                    outputRange: [-45, 20, -20, 30],
                  }),
                },
              ],
            },
          ]}
        />
      </View>
      <Text style={s.fine}>{tr("cinematic.visualOnly")}</Text>
      <Text style={v.power}>
        {model.player.power} · {model.rival.power}
      </Text>
      <Text style={s.muted}>{tr("cinematic.powers")}</Text>
      <View style={v.track}>
        <Animated.View
          style={[v.fill, { transform: [{ scaleX: progress }] }]}
        />
      </View>
      <Text style={s.fine}>
        {tr(
          stage === "vs"
            ? "cinematic.intro"
            : stage === "simulation"
              ? "cinematic.momentum"
              : "cinematic.saved",
        )}
      </Text>
    </LinearGradient>
  );
}
const v = StyleSheet.create({
  arena: {
    padding: 20,
    borderRadius: 20,
    borderColor: colors.border,
    borderWidth: 1,
    gap: 18,
  },
  vs: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
    flexShrink: 1,
  },
  power: {
    color: colors.bronze,
    fontSize: 36,
    fontWeight: "800",
    textAlign: "center",
  },
  pitch: {
    height: 210,
    borderWidth: 1,
    borderColor: "#647589",
    borderRadius: 12,
    backgroundColor: "#132326",
    overflow: "hidden",
  },
  midline: {
    position: "absolute",
    top: "50%",
    width: "100%",
    borderTopWidth: 1,
    borderColor: "#647589",
  },
  circle: {
    position: "absolute",
    alignSelf: "center",
    top: 65,
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: "#647589",
  },
  marker: {
    position: "absolute",
    left: "25%",
    top: 95,
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  track: {
    height: 4,
    backgroundColor: colors.border,
    overflow: "hidden",
    borderRadius: 2,
  },
  fill: { height: 4, width: "100%", backgroundColor: colors.bronze },
});
