import { useGrowth } from "@/growth/provider";
import { overall } from "@/growth/domain";
import { currentClub } from "@/data/club-career";
import { Text, View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Screen, Panel, Button, s } from "@/components/ui/primitives";
import { PlayerSummary } from "@/components/player/player-summary";
import { RivalPanel } from "@/components/rival/rival-panel";
import { weekly, recovery, season } from "@/data/mock";
import { colors } from "@/config/theme";
import { CoinBalance, WeeklyTraining } from "@/components/rewards/rewards";
export default function Home() {
  const { data } = useGrowth();
  const player = data?.player;
  return (
    <Screen
      home
      kicker={`THE FACILITY / SEASON ${season.number}`}
      title="YOUR NEXT LEVEL"
    >
      {player ? (
        <PlayerSummary
          club={currentClub}
          player={{
            name: "PLAYER",
            ovr: overall(player.ratings),
            archetype: "TRAINING PROFILE",
          }}
          form={weekly.form}
        />
      ) : (
        <Panel>
          <Text style={s.muted}>
            Your player rating starts with your training evidence.
          </Text>
          <Button label="OPEN PLAYER" onPress={() => router.push("/player")} />
        </Panel>
      )}
      <CoinBalance />
      <Panel>
        <WeeklyTraining />
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
