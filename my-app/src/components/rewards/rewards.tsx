import { useLocalization } from "@/localization";
import { Text } from "react-native";
import { Panel, s } from "../ui/primitives";
import { Action } from "../training/controls";
import { useRewards } from "../../rewards/provider";
import { balance, sessionRewards, weeklyDays } from "../../rewards/domain";
import { WEEKLY_TARGET_DAYS } from "../../config/rewards";
export function CoinBalance() {
 const l = useLocalization();
  const { tr } = useLocalization();
  const { data, error, retry } = useRewards();
  return (
    <Panel title={tr("rewards.coins")}>
      <Text testID="coin-balance" style={s.sectionTitle}>
        {data
          ? tr("rewards.balance",{amount:l.number(balance(data))})
          : error
            ? tr("rewards.unavailable")
            : tr("common.loading")}
      </Text>
      {error && <Action label={tr("rewards.retry")} onPress={() => void retry()} />}
    </Panel>
  );
}
export function WeeklyTraining() {
  const { tr } = useLocalization();
  const { data, currentWeek, error } = useRewards();
  return (
    <>
      <Text style={s.sectionTitle}>{tr("rewards.weekly")}</Text>
      <Text testID="weekly-training" style={s.sectionTitle}>
        {data
          ? tr("rewards.progress",{days:weeklyDays(data,currentWeek), target:WEEKLY_TARGET_DAYS})
          : error
            ? tr("rewards.progressUnavailable")
            : tr("common.loading")}
      </Text>
      <Text style={s.fine}>
        {tr("rewards.restNote")}</Text>
    </>
  );
}
export function WorkoutRewards({ sessionId }: { sessionId: string }) {
  const { tr } = useLocalization();
  const { data, statuses, error, retry } = useRewards();
  const result = data ? sessionRewards(data, sessionId) : null;
  const status = statuses[sessionId];
  if (!result && !status) return null; // Historical views never create requests.
  return (
    <Panel title={tr("rewards.title")}>
      {result ? (
        <>
          <Text style={s.muted}>
            {result.transactions.some((t) => t.type === "daily-workout")
              ? tr("rewards.daily",{amount:result.transactions.find(t => t.type === "daily-workout")!.amount})
              : tr("rewards.already")}
          </Text>
          <Text style={s.muted}>
            {tr("rewards.weeklyLabel")}{result.days} / {WEEKLY_TARGET_DAYS} {tr("rewards.days")}</Text>
          {result.transactions
            .filter((t) => t.type === "weekly-consistency")
            .map((t) => (
              <Text key={t.id} style={s.sectionTitle}>
                {tr("rewards.weeklyBonus")}{t.amount} {tr("rewards.coinUnit")}</Text>
            ))}
          <Text testID="workout-coins" style={s.sectionTitle}>
            {tr("rewards.total")}{result.total > 0 ? "+" : ""}
            {result.total} {tr("rewards.coinUnit")}</Text>
        </>
      ) : status === "failed" ? (
        <>
          <Text style={s.muted}>
            {tr("rewards.failed")}</Text>
          <Text style={s.fine}>{error}</Text>
          <Action label={tr("rewards.retry")} onPress={() => void retry()} />
        </>
      ) : (
        <Text style={s.muted}>{tr("rewards.checking")}</Text>
      )}
    </Panel>
  );
}
