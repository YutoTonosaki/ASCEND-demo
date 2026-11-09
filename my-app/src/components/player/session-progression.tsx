import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useLocalization } from "@/localization";
import { useGrowth } from "@/growth/provider";
import { useSessions } from "@/sessions/provider";
import { sessionProgression, formatGrowthDelta } from "@/growth/session-progression";
import { Panel, s } from "@/components/ui/primitives";
import { Action } from "@/components/training/controls";

export function SessionProgressionSection({ sessionId }: { sessionId: string }) {
  const l = useLocalization();
  const growth = useGrowth();
  const sessions = useSessions();
  const [details, setDetails] = useState(false);
  const result = useMemo(() => sessionProgression(sessionId, sessions.data, growth.data, {
    growth: !!growth.error, sessions: !!sessions.error,
  }), [sessionId, sessions.data, sessions.error, growth.data, growth.error]);
  return (
    <Panel title={l.tr("progression.title")}>
      <View testID="session-progression" style={{ gap: 8 }}>
        {result.state === "ready" ? (
          <>
            {result.partiallyTracked && <Text style={s.fine}>{l.tr("progression.partial")}</Text>}
            {result.growth.length ? result.growth.map(change => (
              <Text key={change.area} style={s.muted}>
                {l.tr("progression.growth", {
                  area: l.display(change.area),
                  delta: change.delta < 0.01
                    ? l.tr("progression.smallGrowth") : `+${formatGrowthDelta(change.delta)}`,
                })}
              </Text>
            )) : <Text style={s.muted}>{l.tr("progression.noGrowth")}</Text>}
            {result.assessments.map(change => (
              <Text key={change.area} style={s.fine}>
                {l.tr("progression.assessment", {
                  area: l.display(change.area), before: change.before.toFixed(2), after: change.after.toFixed(2),
                })}
              </Text>
            ))}
            {result.ovr && <Text style={s.muted}>
              OVR {result.ovr.before} → {result.ovr.after}
            </Text>}
            {result.explainUnchangedOVR && <Text style={s.fine}>{l.tr("progression.ovrUnchanged")}</Text>}
          </>
        ) : <Text style={s.muted}>{l.tr(`progression.${result.state}`)}</Text>}
        {result.records.state === "ready" ? (
          <>
            <Text style={s.muted}>{l.tr("progression.prCount", { count: result.records.sets.length })}</Text>
            {result.records.sets.length > 0 && (
              <Action label={l.tr(details ? "progression.hidePR" : "progression.showPR")}
                onPress={() => setDetails(value => !value)} />
            )}
            {details && result.records.sets.map(set => (
              <View key={JSON.stringify([set.entryId, set.setId])} style={{ gap: 3 }}>
                <Text style={s.muted}>{l.tr("progression.prSet", {
                  exercise: l.exercise({ id: set.exerciseId, name: set.name }), set: set.setNumber,
                })}</Text>
                {set.metrics.map(metric => (
                  <Text key={metric.metric} style={s.fine}>
                    {l.tr("progression.prChange", {
                      metric: l.tr(`progression.metric.${metric.metric}`, { weight: metric.weightKg ?? "" }),
                      before: metric.previous!, after: metric.value,
                    })}
                  </Text>
                ))}
              </View>
            ))}
          </>
        ) : <Text style={s.fine}>{l.tr(result.records.state === "loading" ? "progression.prLoading" : "progression.prUnavailable")}</Text>}
      </View>
    </Panel>
  );
}
