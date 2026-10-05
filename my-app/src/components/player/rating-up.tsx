import { useLocalization } from "@/localization";
import { useCareer } from "@/career/provider";
import { Component, type PropsWithChildren } from "react";
import { Text, View } from "react-native";
import { Sheet, Action } from "@/components/training/controls";
import { Panel, s } from "@/components/ui/primitives";
import { colors } from "@/config/theme";
import { PlayerCard } from "./player-card";
import { cardTiers } from "@/config/visuals";
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
 const l = useLocalization();
  const { tr } = useLocalization();
  const { club } = useCareer();
  return (
    <Sheet
      title={result.areas.length ? tr("presentation.ratingUp") : tr("presentation.ovrUp")}
      onClose={onContinue}
    >
      <Text style={s.eyebrow}>{tr("train.complete")}</Text>
      <Text
        accessibilityRole="header"
        style={[s.sectionTitle, { fontSize: 28 }]}
      >
        {tr("presentation.kicker")}</Text>
      <Text style={s.muted}>{tr("presentation.description")}</Text>
      {result.areas.map((change) => (
        <Panel
          key={l.display(change.area)}
          title={change.area.toUpperCase()}
          kicker={change.assessed ? tr("presentation.assessed") : tr("presentation.ratingUp")}
        >
          <Increase before={change.before} after={change.after} />
          {change.assessed && (
            <Text style={s.fine}>
              {tr("presentation.assessmentNote")}</Text>
          )}
        </Panel>
      ))}
      {result.ovr && (
        <Panel title={tr("presentation.ovrUp")} kicker={tr("presentation.overall")}>
          <Increase {...result.ovr} />
        </Panel>
      )}
      {result.evolution && (
        <View testID="card-evolution" style={{ gap: 12 }}>
          <Text
            accessibilityRole="header"
            style={[s.sectionTitle, { fontSize: 26 }]}
          >
            {result.evolution.to === "ascend"
              ? tr("presentation.final")
              : tr("presentation.evolution")}
          </Text>
          <Text style={s.eyebrow}>
            {cardTiers[result.evolution.from].label.toUpperCase()} →{" "}
            {cardTiers[result.evolution.to].label.toUpperCase()}
          </Text>
          <PlayerCard
            club={club}
            player={{
              name: tr("nav.player"),
              ovr: result.evolution.ovr,
              bodyRatings: result.afterRatings,
              archetype:
                result.evolution.to === "ascend"
                  ? tr("presentation.achieved")
                  : tr("presentation.newTier"),
            }}
          />
        </View>
      )}
      <Action label={tr("common.continue")} onPress={onContinue} />
    </Sheet>
  );
}
function Increase({ before, after }: { before: number; after: number }) {
 const { tr } = useLocalization();
  return (
    <View
      accessible
      accessibilityLabel={tr("presentation.increase",{before,after,delta:after-before})}
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
