import { useMemo } from "react";
import { Text, View, StyleSheet } from "react-native";
import { useMatchHistory } from "../../matches/use-history";
import { seasonMatches, matchStatistics } from "../../matches/history";
import type { Season } from "../../seasons/domain";
import { useLocalization } from "../../localization";
import { s } from "../ui/primitives";

/** Live read-only association, independent of the Season's frozen end.stats. */
export function SeasonMatchStats({ season }: { season: Season }) {
  const history = useMatchHistory(),
    l = useLocalization(),
    { tr } = l;
  const stats = useMemo(
    () =>
      matchStatistics(
        seasonMatches(history.items, season),
        history.paymentsAvailable,
      ),
    [history.items, history.paymentsAvailable, season],
  );
  const owned =
    history.owner?.playerId === season.playerId &&
    history.owner?.careerStartedAt === season.careerStartedAt;
  return (
    <View style={{ gap: 8 }} testID="season-match-statistics">
      <Text accessibilityRole="header" style={s.eyebrow}>
        {tr("history.seasonStats")}
      </Text>
      {history.state !== "ready" || !owned ? (
        <Text style={s.muted}>
          {history.state === "loading"
            ? tr("common.loading")
            : tr("history.unavailable")}
        </Text>
      ) : (
        <>
          <View style={styles.grid}>
            {(
              [
                ["played", tr("history.played"), l.number(stats.played)],
                ["wins", tr("history.wins"), l.number(stats.wins)],
                ["draws", tr("history.draws"), l.number(stats.draws)],
                ["losses", tr("history.losses"), l.number(stats.losses)],
                ["skipped", tr("history.skipped"), l.number(stats.skipped)],
                [
                  "win-rate",
                  tr("history.winRate"),
                  stats.winRate === null
                    ? tr("history.noPlayed")
                    : tr("history.percent", {
                        value: l.number(Math.round(stats.winRate * 10) / 10),
                      }),
                ],
              ] as const
            ).map(([id, label, value]) => (
              <View key={id} style={styles.stat}>
                <Text style={s.fine}>{label}</Text>
                <Text testID={`season-match-${id}`} style={s.muted}>
                  {value}
                </Text>
              </View>
            ))}
          </View>
          <Text style={s.muted}>{tr("history.coinsEarned")}</Text>
          <Text testID="season-match-coins" style={s.sectionTitle}>
            {stats.confirmedCoins === null
              ? tr("common.unavailable")
              : tr("rewards.balance", {
                  amount: l.number(stats.confirmedCoins),
                })}
          </Text>
          <Text style={s.fine}>
            {tr("history.expectedTotal", {
              amount: l.number(stats.expectedCoins),
            })}
          </Text>
          {!history.paymentsAvailable && (
            <Text style={s.fine}>{tr("history.paymentUnavailable")}</Text>
          )}
          <Text style={s.fine}>{tr("history.seasonLiveNote")}</Text>
        </>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  stat: { flexBasis: "45%", flexGrow: 1, minWidth: 0, gap: 4 },
});
