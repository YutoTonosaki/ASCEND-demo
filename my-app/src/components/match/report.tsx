import { useEffect } from "react";
import { AccessibilityInfo, Text } from "react-native";
import { useLocalization } from "../../localization";
import { MatchDetails } from "../career/match-history";
import { s } from "../ui/primitives";
import { Action } from "../training/controls";
import type { MatchHistoryItem } from "../../matches/history";
import { reportModel } from "../../matches/presentation/model";

/** Independently usable factual report; payment may update without replaying presentation. */
export function MatchReport({
  item,
  onDone,
}: {
  item: MatchHistoryItem;
  onDone: () => void;
}) {
  const { tr } = useLocalization();
  const { model } = reportModel(item);
  const announcement = tr(`cinematic.outcome.${model.result.outcome}`);
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(announcement);
  }, [announcement]);
  return (
    <>
      <Text
        testID="cinematic-report"
        accessibilityRole="header"
        accessibilityLiveRegion="polite"
        style={[s.sectionTitle, { fontSize: 28 }]}
      >
        {tr(`cinematic.outcome.${model.result.outcome}`)}
      </Text>
      <Text style={s.muted}>
        {tr("history.player")} · {model.rival.name}
      </Text>
      <MatchDetails item={item} />
      <Action label={tr("cinematic.done")} onPress={onDone} />
    </>
  );
}
