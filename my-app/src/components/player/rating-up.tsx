import { Component, type PropsWithChildren } from "react";
import { Text, View } from "react-native";
import { Sheet, Action } from "@/components/training/controls";
import { Panel, s } from "@/components/ui/primitives";
import { colors } from "@/config/theme";
import type { RatingUp } from "@/presentation/domain";

/** A presentation error must not take down the saved workout/result screen. */
export class PresentationBoundary extends Component<
  PropsWithChildren,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
export function RatingUpScreen({
  result,
  onContinue,
}: {
  result: RatingUp;
  onContinue: () => void;
}) {
  return (
    <Sheet
      title={result.areas.length ? "RATING UP" : "OVR UP"}
      onClose={onContinue}
    >
      <Text style={s.eyebrow}>WORKOUT COMPLETE</Text>
      <Text
        accessibilityRole="header"
        style={[s.sectionTitle, { fontSize: 28 }]}
      >
        YOUR WORK. YOUR PROGRESS.
      </Text>
      <Text style={s.muted}>A new level, earned one session at a time.</Text>
      {result.areas.map((change) => (
        <Panel
          key={change.area}
          title={change.area.toUpperCase()}
          kicker={change.assessed ? "ASSESSMENT UPDATED" : "RATING UP"}
        >
          <Increase before={change.before} after={change.after} />
          {change.assessed && (
            <Text style={s.fine}>
              Includes your first assessment of this area.
            </Text>
          )}
        </Panel>
      ))}
      {result.ovr && (
        <Panel title="OVR UP" kicker="OVERALL RATING">
          <Increase {...result.ovr} />
        </Panel>
      )}
      <Action label="CONTINUE" onPress={onContinue} />
    </Sheet>
  );
}
function Increase({ before, after }: { before: number; after: number }) {
  return (
    <View
      accessible
      accessibilityLabel={`${before} to ${after}, up ${after - before}`}
      style={{ gap: 8 }}
    >
      <Text
        style={{
          color: colors.bronze,
          fontSize: 42,
          fontWeight: "800",
          fontVariant: ["tabular-nums"],
        }}
      >
        {before} → {after}
      </Text>
      <Text style={s.eyebrow}>↑ +{after - before}</Text>
    </View>
  );
}
