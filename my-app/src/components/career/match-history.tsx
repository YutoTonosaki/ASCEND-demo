import { memo, useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SafeAreaModal } from "../ui/safe-area-modal";
import { Panel, s } from "../ui/primitives";
import { Action } from "../training/controls";
import { ClubIdentity } from "../club/club-identity";
import { colors } from "../../config/theme";
import { useLocalization } from "../../localization";
import { useMatchHistory } from "../../matches/use-history";
import type { MatchHistoryItem } from "../../matches/history";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={s.fine}>{label}</Text>
      <Text style={s.muted}>{value}</Text>
    </View>
  );
}
const MatchHistoryCard = memo(function MatchHistoryCard({
  item,
  onSelect,
}: {
  item: MatchHistoryItem;
  onSelect: (id: string) => void;
}) {
  const l = useLocalization(),
    { tr } = l,
    { match: m, payment } = item;
  const status = m.result
    ? tr(`match.outcome.${m.result.outcome}`)
    : tr(`match.status.${item.status}`);
  const week = l.calendarDay(m.week.weekId);
  const accent = m.result?.outcome === "WIN" ? colors.bronze : colors.muted;
  return (
    <Pressable
      testID="history-card"
      accessibilityRole="button"
      accessibilityLabel={tr("history.openDetails", {
        week,
        rival: m.rival.name,
        status,
      })}
      onPress={() => onSelect(m.id)}
      style={({ pressed }) => [styles.card, pressed && s.pressed]}
    >
      <Text style={s.fine}>{tr("match.week", { day: week })}</Text>
      <Text style={s.sectionTitle}>
        {m.rival.name} · OVR {l.number(m.rival.ovr)}
      </Text>
      <Text style={s.muted}>
        {tr("history.rivalClub", { club: m.rival.club.name })}
      </Text>
      <Text style={s.fine}>
        {tr("history.playerClub", { club: m.club.name })}
      </Text>
      <Text style={[s.eyebrow, { color: accent }]}>{status}</Text>
      {m.result && (
        <Text style={s.muted}>
          {tr("match.power", {
            player: l.number(m.result.playerMatchPower),
            rival: l.number(m.result.rivalMatchPower),
          })}
        </Text>
      )}
      {m.result && (
        <Text style={s.fine}>
          {payment.state === "paid"
            ? tr("match.rewardPaid", { amount: l.number(payment.confirmed!) })
            : payment.state === "unavailable"
              ? tr("history.paymentUnavailable")
              : tr("match.rewardPending")}
        </Text>
      )}
      <Text style={s.fine}>{tr("history.viewDetails")}</Text>
    </Pressable>
  );
});

export function MatchDetails({ item }: { item: MatchHistoryItem }) {
  const l = useLocalization(),
    { tr } = l,
    { match: m, payment } = item;
  const unknown = tr("history.evidencePending");
  const playerPower = m.result?.playerMatchPower ?? m.weekEnd?.playerMatchPower;
  const rivalPower =
    m.result?.rivalMatchPower ??
    (m.weekEnd ? m.rival.ovr + m.rival.condition : null);
  const number = (n: number | null | undefined) =>
    n === null || n === undefined ? unknown : l.number(n);
  return (
    <>
      <Panel title={tr("history.rival")}>
        <Text style={s.sectionTitle}>{m.rival.name}</Text>
        <ClubIdentity club={m.rival.club} />
        <Row label="OVR" value={l.number(m.rival.ovr)} />
        <Row
          label={tr("history.condition")}
          value={`+${l.number(m.rival.condition)}`}
        />
        <Row
          label={tr("history.difficulty")}
          value={tr(`history.difficulty.${m.rival.difficulty}`)}
        />
      </Panel>
      <Panel title={tr("history.player")}>
        <ClubIdentity club={m.club} />
        <Row label={tr("history.weekEndOVR")} value={number(m.weekEnd?.ovr)} />
        <Row
          label={tr("history.goal")}
          value={tr("history.dayCount", { count: l.number(m.goalSnapshot) })}
        />
        <Row
          label={tr("history.trainingDays")}
          value={
            m.weekEnd
              ? tr("history.dayCount", {
                  count: l.number(m.weekEnd.trainingDays.length),
                })
              : unknown
          }
        />
        {m.weekEnd && m.weekEnd.trainingDays.length > 0 && (
          <Text style={s.fine}>
            {m.weekEnd.trainingDays.map(l.calendarDay).join(" · ")}
          </Text>
        )}
        <Row
          label={tr("history.bonus")}
          value={number(m.weekEnd?.weeklyBonus)}
        />
      </Panel>
      <Panel title={tr("history.match")}>
        <Row
          label={tr("history.trainingWeek")}
          value={l.calendarDay(m.week.weekId)}
        />
        <Row
          label={tr("history.unlock")}
          value={l.zonedDate(m.week.endExclusiveAt, m.week.timeZone)}
        />
        <Row
          label={tr("history.expires")}
          value={l.zonedDate(m.week.expiresAt, m.week.timeZone)}
        />
        <Text style={s.sectionTitle}>
          {m.result
            ? tr(`match.outcome.${m.result.outcome}`)
            : tr(`match.status.${item.status}`)}
        </Text>
        <Row label={tr("history.playerPower")} value={number(playerPower)} />
        <Row label={tr("history.rivalPower")} value={number(rivalPower)} />
        {m.result && (
          <Row
            label={tr("history.resolved")}
            value={l.zonedDate(m.result.resolvedAt, m.week.timeZone)}
          />
        )}
      </Panel>
      <Panel title={tr("history.reward")}>
        {m.result ? (
          <>
            <Row
              label={tr("history.expected")}
              value={tr("rewards.balance", {
                amount: l.number(payment.expected),
              })}
            />
            <Text style={s.muted}>
              {payment.state === "paid"
                ? tr("history.paid")
                : payment.state === "unavailable"
                  ? tr("history.paymentUnavailable")
                  : tr("match.rewardPending")}
            </Text>
            {payment.state === "paid" && (
              <Text testID="history-paid-coins" style={s.sectionTitle}>
                {tr("rewards.balance", {
                  amount: l.number(payment.confirmed!),
                })}
              </Text>
            )}
          </>
        ) : (
          <Text style={s.muted}>{tr("history.noReward")}</Text>
        )}
      </Panel>
    </>
  );
}

export function MatchHistoryPanel() {
  const l = useLocalization(),
    { tr } = l,
    history = useMatchHistory();
  const [open, setOpen] = useState(false),
    [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    history.state === "ready"
      ? history.items.find((i) => i.match.id === selectedId)
      : undefined;
  const onSelect = useCallback((id: string) => setSelectedId(id), []);
  const renderItem = useCallback(
    ({ item }: { item: MatchHistoryItem }) => (
      <MatchHistoryCard item={item} onSelect={onSelect} />
    ),
    [onSelect],
  );
  const message =
    history.state === "loading"
      ? tr("common.loading")
      : history.state === "unavailable"
        ? tr("history.unavailable")
        : tr("history.empty");
  return (
    <>
      <Panel title={tr("history.title")}>
        {history.state === "ready" && history.items.length > 0 ? (
          <>
            <Text style={s.fine}>
              {tr("history.savedCount", {
                count: l.number(history.items.length),
              })}
            </Text>
            <Action label={tr("history.open")} onPress={() => setOpen(true)} />
          </>
        ) : (
          <Text style={s.muted}>{message}</Text>
        )}
      </Panel>
      {open && (
        <SafeAreaModal
          visible
          animationType="none"
          presentationStyle="fullScreen"
          onRequestClose={() => {
            setOpen(false);
            setSelectedId(null);
          }}
        >
          <SafeAreaView style={s.safe}>
            <View
              testID="match-history-surface"
              style={[s.content, { flex: 1 }]}
            >
              <View style={s.sectionHeading}>
                <Text accessibilityRole="header" style={s.sectionTitle}>
                  {tr(selectedId ? "history.details" : "history.title")}
                </Text>
                <Action
                  label={tr("common.close")}
                  onPress={() => {
                    setOpen(false);
                    setSelectedId(null);
                  }}
                />
              </View>
              {selectedId && (
                <Action
                  label={tr("common.back")}
                  onPress={() => setSelectedId(null)}
                />
              )}
              {selectedId ? (
                <ScrollView
                  testID="history-detail"
                  contentContainerStyle={styles.content}
                >
                  {selected ? (
                    <MatchDetails item={selected} />
                  ) : (
                    <Text style={s.muted}>{tr("history.unavailable")}</Text>
                  )}
                </ScrollView>
              ) : (
                <FlatList
                  testID="history-list"
                  data={history.state === "ready" ? history.items : []}
                  renderItem={renderItem}
                  keyExtractor={(item) => item.match.id}
                  initialNumToRender={8}
                  maxToRenderPerBatch={8}
                  windowSize={5}
                  contentContainerStyle={styles.content}
                  ListEmptyComponent={<Text style={s.muted}>{message}</Text>}
                />
              )}
            </View>
          </SafeAreaView>
        </SafeAreaModal>
      )}
    </>
  );
}
const styles = StyleSheet.create({
  content: { gap: 12, paddingBottom: 24 },
  row: { gap: 4 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
    minHeight: 44,
  },
});
