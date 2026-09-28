import { Text } from "react-native";
import { Panel, s } from "../ui/primitives";
import { Action } from "../training/controls";
import { useRewards } from "../../rewards/provider";
import { balance, sessionRewards, weeklyDays } from "../../rewards/domain";
import { WEEKLY_TARGET_DAYS } from "../../config/rewards";
export function CoinBalance() {
  const { data, error, retry } = useRewards();
  return (
    <Panel title="COINS">
      <Text testID="coin-balance" style={s.sectionTitle}>
        {data
          ? `${balance(data).toLocaleString()} Coins`
          : error
            ? "Balance unavailable"
            : "Loading…"}
      </Text>
      {error && <Action label="RETRY REWARDS" onPress={() => void retry()} />}
    </Panel>
  );
}
export function WeeklyTraining() {
  const { data, currentWeek, error } = useRewards();
  return (
    <>
      <Text style={s.sectionTitle}>WEEKLY TRAINING</Text>
      <Text testID="weekly-training" style={s.sectionTitle}>
        {data
          ? `${weeklyDays(data, currentWeek)} / ${WEEKLY_TARGET_DAYS} DAYS`
          : error
            ? "Progress unavailable"
            : "Loading…"}
      </Text>
      <Text style={s.fine}>
        Monday–Sunday · Rest days are part of training.
      </Text>
    </>
  );
}
export function WorkoutRewards({ sessionId }: { sessionId: string }) {
  const { data, statuses, error, retry } = useRewards();
  const result = data ? sessionRewards(data, sessionId) : null;
  const status = statuses[sessionId];
  if (!result && !status) return null; // Historical views never create requests.
  return (
    <Panel title="REWARDS">
      {result ? (
        <>
          <Text style={s.muted}>
            {result.transactions.some((t) => t.type === "daily-workout")
              ? `Daily Workout · +${result.transactions.find((t) => t.type === "daily-workout")!.amount} Coins`
              : "Daily reward already earned today"}
          </Text>
          <Text style={s.muted}>
            Weekly Training · {result.days} / {WEEKLY_TARGET_DAYS} DAYS
          </Text>
          {result.transactions
            .filter((t) => t.type === "weekly-consistency")
            .map((t) => (
              <Text key={t.id} style={s.sectionTitle}>
                Weekly Consistency Bonus · +{t.amount} Coins
              </Text>
            ))}
          <Text testID="workout-coins" style={s.sectionTitle}>
            TOTAL EARNED · {result.total > 0 ? "+" : ""}
            {result.total} Coins
          </Text>
        </>
      ) : status === "failed" ? (
        <>
          <Text style={s.muted}>
            Workout saved. Rewards could not be confirmed.
          </Text>
          <Text style={s.fine}>{error}</Text>
          <Action label="RETRY REWARDS" onPress={() => void retry()} />
        </>
      ) : (
        <Text style={s.muted}>Workout saved. Checking rewards…</Text>
      )}
    </Panel>
  );
}
