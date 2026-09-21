import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Panel, s } from "@/components/ui/primitives";
import { Action, ErrorText } from "@/components/training/controls";
import { useSessions } from "@/sessions/provider";
import { derivePersonalRecords } from "@/records/domain";
import { colors } from "@/config/theme";
import type { ExerciseRecord } from "@/types/records";

export function PersonalRecordsSection() {
  const { data, error, retry } = useSessions();
  const result = useMemo(
    () =>
      derivePersonalRecords(
        data ? [...data.completed, ...(data.active ? [data.active] : [])] : [],
      ),
    [data],
  );
  return (
    <Panel title="PERSONAL RECORDS" kicker="YOUR BEST SETS">
      {error ? (
        <>
          <ErrorText message="Workout records could not be loaded. Your saved data has been kept." />
          <Action label="RETRY RECORDS" onPress={() => void retry()} />
        </>
      ) : !data ? (
        <Text style={s.muted}>Loading records…</Text>
      ) : (
        <>
          <Text style={s.fine}>
            Confirmed sets only, including your current workout.
          </Text>
          {result.rejectedSessions > 0 && (
            <ErrorText message="Some workout records could not be read." />
          )}
          {result.records.length === 0 ? (
            <Text style={s.muted}>
              Your records start here. Confirm a workout set to see your best
              reps, time or weight. Weighted records need at least one completed
              rep.
            </Text>
          ) : (
            result.records.map((record) => (
              <RecordRow
                key={JSON.stringify([record.exerciseId, record.trackingType])}
                record={record}
              />
            ))
          )}
        </>
      )}
    </Panel>
  );
}
function RecordRow({ record }: { record: ExerciseRecord }) {
  const [expanded, setExpanded] = useState(false);
  const weighted = record.trackingType === "weight_reps";
  const unit = weighted
    ? "kg"
    : record.trackingType === "time"
      ? "sec"
      : "reps";
  const atMax = record.byWeight.find(
    (load) => load.weightKg === record.best.value,
  );
  return (
    <View
      style={r.record}
      testID={`pr-${record.exerciseId}-${record.trackingType}`}
    >
      <Text style={r.name}>{record.name}</Text>
      <Text style={s.eyebrow}>
        {weighted ? "MAX COMPLETED WEIGHT" : "BEST SINGLE SET"}
      </Text>
      <Text style={r.value}>
        {record.best.value} <Text style={r.unit}>{unit}</Text>
      </Text>
      {atMax && (
        <Text style={s.muted}>
          Best at this weight · {atMax.best.value} reps
        </Text>
      )}
      <Text style={s.fine}>
        First recorded{" "}
        {new Date(record.best.source.confirmedAt).toLocaleDateString()}
      </Text>
      {weighted && (
        <>
          <Action
            label={`${expanded ? "HIDE" : "VIEW"} RECORDS BY WEIGHT · ${record.name}`}
            displayLabel={
              expanded ? "HIDE RECORDS BY WEIGHT" : "VIEW RECORDS BY WEIGHT"
            }
            onPress={() => setExpanded(!expanded)}
          />
          {expanded &&
            record.byWeight.map((load) => (
              <View key={load.weightKg} style={r.load}>
                <Text style={s.muted}>{load.weightKg} kg</Text>
                <Text style={r.reps}>{load.best.value} reps</Text>
              </View>
            ))}
        </>
      )}
    </View>
  );
}
const r = StyleSheet.create({
  record: {
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  name: { color: colors.text, fontSize: 16, fontWeight: "700" },
  value: {
    color: colors.bronze,
    fontSize: 28,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
  },
  unit: { fontSize: 14, fontWeight: "600" },
  load: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
    paddingVertical: 4,
  },
  reps: { color: colors.text, fontSize: 14, fontWeight: "600" },
});
