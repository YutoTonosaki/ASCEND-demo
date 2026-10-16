import { useState } from "react";
import { MatchExperience } from "../match/experience";
import { Text, View } from "react-native";
import { useRewards } from "@/rewards/provider";
import { matchRewardId } from "@/rewards/matches";
import { useMatches } from "@/matches/provider";
import { useLocalization } from "@/localization";
import { Panel, s } from "@/components/ui/primitives";
import { Action } from "@/components/training/controls";

/** Compact manual entry only. Saved history and cinematic use the same authoritative Match. */
export function MatchPanel() {
  const [selected, setSelected] = useState<string | null>(null);
  const matches = useMatches();
  const rewards = useRewards();
  const l = useLocalization();
  const { tr } = l;
  return (
    <>
      {selected && (
        <MatchExperience
          key={selected}
          id={selected}
          onClose={() => setSelected(null)}
        />
      )}
      <Panel title={tr("match.title")}>
        {matches.error ? (
          <>
            <Text accessibilityRole="alert" style={s.muted}>
              {tr("match.error")}
            </Text>
            <Action
              label={tr("common.retry")}
              onPress={() => void matches.retry()}
            />
          </>
        ) : !matches.data ? (
          <Text style={s.muted}>{tr("common.loading")}</Text>
        ) : matches.data.matches.length === 0 ? (
          <Text style={s.muted}>{tr("match.empty")}</Text>
        ) : (
          [...matches.data.matches]
            .sort((a, b) => b.week.weekId.localeCompare(a.week.weekId))
            .slice(0, 2)
            .map((match) => {
              const status = matches.status(match);
              return (
                <View key={match.id} style={{ gap: 8 }}>
                  <Text style={s.fine}>
                    {tr("match.week", {
                      day: l.calendarDay(match.week.weekId),
                    })}
                  </Text>
                  <Text style={s.sectionTitle}>
                    {match.rival.name} · OVR {match.rival.ovr}
                  </Text>
                  <Text style={s.muted}>{match.rival.club.name}</Text>
                  <Text accessibilityLiveRegion="polite" style={s.eyebrow}>
                    {tr(`match.status.${status}`)}
                  </Text>
                  {status === "UPCOMING" && (
                    <Text style={s.fine}>
                      {tr("match.unlock", {
                        date: l.zonedDate(
                          match.week.endExclusiveAt,
                          match.week.timeZone,
                        ),
                      })}
                    </Text>
                  )}
                  {status === "PENDING_EVIDENCE" && (
                    <Text style={s.fine}>{tr("match.pending")}</Text>
                  )}
                  {match.result && (
                    <>
                      <Text style={s.sectionTitle}>
                        {tr(`match.outcome.${match.result.outcome}`)}
                      </Text>
                      <Text style={s.muted}>
                        {tr("match.power", {
                          player: match.result.playerMatchPower,
                          rival: match.result.rivalMatchPower,
                        })}
                      </Text>
                      <Text style={s.fine} testID="match-reward-status">
                        {rewards.error
                          ? tr("match.rewardError")
                          : rewards.data?.transactions.some(
                                (t) => t.id === matchRewardId(match.id),
                              )
                            ? tr("match.rewardPaid", {
                                amount: rewards.data.transactions.find(
                                  (t) => t.id === matchRewardId(match.id),
                                )!.amount,
                              })
                            : tr("match.rewardPending")}
                      </Text>
                      {rewards.error && (
                        <Action
                          label={tr("rewards.retry")}
                          onPress={() => void rewards.retry()}
                        />
                      )}
                    </>
                  )}
                  {status === "READY" && (
                    <Action
                      label={
                        matches.playing === match.id
                          ? tr("common.saving")
                          : tr("match.play")
                      }
                      disabled={matches.playing !== null}
                      onPress={() => setSelected(match.id)}
                    />
                  )}
                </View>
              );
            })
        )}
      </Panel>
    </>
  );
}
