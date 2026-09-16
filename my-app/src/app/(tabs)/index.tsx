import { Text, View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Screen, Panel, Button, s } from "@/components/ui/primitives";
import { PlayerSummary } from "@/components/player/player-summary";
import { RivalPanel } from "@/components/rival/rival-panel";
import { player, weekly, recovery, season } from "@/data/mock";
import { colors } from "@/config/theme";
export default function Home() {
  return (
    <Screen
      home
      kicker={`THE FACILITY / SEASON ${season.number}`}
      title="YOUR NEXT LEVEL"
    >
      <PlayerSummary player={player} form={weekly.form} />
      <Panel>
        <View style={s.sectionHeading}>
          <Text style={s.sectionTitle}>WEEKLY TARGET</Text>
          <Text style={h.progress}>
            {weekly.completed}
            <Text style={h.target}> / {weekly.target} workouts</Text>
          </Text>
        </View>
        <View
          accessible
          accessibilityLabel={`${weekly.completed} of ${weekly.target} workouts this week`}
          style={h.segments}
        >
          {Array.from({ length: weekly.target }, (_, i) => (
            <View
              key={i}
              style={[
                h.segment,
                i < weekly.completed && { backgroundColor: colors.bronze },
              ]}
            />
          ))}
        </View>
        <Button
          label="START TODAY'S TRAINING"
          onPress={() => router.push("/train")}
        />
      </Panel>
      <RivalPanel />
      <Panel title="RECOVERY" kicker="REST IS PART OF THE PLAN">
        <View style={h.recovery}>
          {recovery.map((item) => (
            <View key={item.area} style={h.recoveryItem}>
              <Text style={h.body}>{item.area}</Text>
              <Text
                style={[
                  h.state,
                  {
                    color:
                      colors[
                        item.state.toLowerCase() as
                          "ready" | "moderate" | "recovering"
                      ],
                  },
                ]}
              >
                {item.state}
              </Text>
            </View>
          ))}
        </View>
      </Panel>
    </Screen>
  );
}
const h = StyleSheet.create({
  progress: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.text,
    fontVariant: ["tabular-nums"],
  },
  target: { fontSize: 13, color: colors.muted, fontWeight: "400" },
  segments: { flexDirection: "row", gap: 6 },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  recovery: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 16,
    rowGap: 10,
  },
  recoveryItem: { width: "46%", gap: 3 },
  body: { fontSize: 12, color: colors.text },
  state: { fontSize: 11 },
});
