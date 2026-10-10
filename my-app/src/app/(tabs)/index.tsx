import { useLocalization } from "@/localization";
import { HomeSeason } from "@/components/career/seasons";
import { useGrowth } from "@/growth/provider";
import { overall } from "@/growth/domain";
import { useCareer } from "@/career/provider";
import { Text, View, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Screen, Panel, Button, s } from "@/components/ui/primitives";
import { PlayerSummary } from "@/components/player/player-summary";
import { weekly, recovery } from "@/data/mock";
import { colors } from "@/config/theme";
import { CoinBalance, WeeklyTraining } from "@/components/rewards/rewards";
export default function Home() {
  const l = useLocalization();
  const { tr } = useLocalization();
  const { club: currentClub } = useCareer();
  const { data } = useGrowth();
  const player = data?.player;
  return (
    <Screen home kicker={tr("home.kicker")} title={tr("home.title")}>
      {player ? (
        <PlayerSummary
          club={currentClub}
          player={{
            name: tr("nav.player"),
            ovr: overall(player.ratings),
            archetype: tr("coach.profile"),
          }}
          form={weekly.form}
        />
      ) : (
        <Panel>
          <Text style={s.muted}>{tr("home.evidence")}</Text>
          <Button
            label={tr("home.openPlayer")}
            onPress={() => router.push("/player")}
          />
        </Panel>
      )}
      <CoinBalance />
      <Panel>
        <WeeklyTraining />
        <Button
          label={tr("home.start")}
          onPress={() => router.push("/train")}
        />
      </Panel>
      <HomeSeason />
      <Panel title={tr("home.recovery")} kicker={tr("home.rest")}>
        <View style={h.recovery}>
          {recovery.map((item) => (
            <View key={item.area} style={h.recoveryItem}>
              <Text style={h.body}>{l.display(item.area)}</Text>
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
                {l.display(item.state)}
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
