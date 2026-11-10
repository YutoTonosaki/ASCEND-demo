import { useState } from "react";
import { Text, View } from "react-native";
import type { GrowthPlayer } from "@/types/growth";
import { ratingDetails } from "@/growth/rating-details";
import { useLocalization } from "@/localization";
import { Action } from "@/components/training/controls";
import { s } from "@/components/ui/primitives";

export function RatingDetails({ player, available }: { player: GrowthPlayer; available: boolean }) {
  const l = useLocalization();
  const [expanded, setExpanded] = useState(false);
  const details = available ? ratingDetails(player) : null;
  return (
    <>
      <Action label={l.tr(expanded ? "ratingDetails.hide" : "ratingDetails.show")}
        expanded={expanded} onPress={() => setExpanded(value => !value)} />
      {expanded && (
        <View testID="player-rating-details" style={{ gap: 8 }}>
          {details ? <>
            {details.regions.map(region => (
              <Text key={region.area} style={s.muted}>
                {l.tr("ratingDetails.region", {
                  area: l.display(region.area), value: region.formatted,
                  status: l.tr(region.status === "assessed" ? "player.assessed" : "player.provisional"),
                })}
              </Text>
            ))}
            <Text style={s.fine}>{l.tr("ratingDetails.precision")}</Text>
            <Text style={s.muted}>{l.tr("ratingDetails.mean", { value: details.meanFormatted })}</Text>
            {details.nextOVR === null ? (
              <Text style={s.muted}>{l.tr("ratingDetails.maximum")}</Text>
            ) : <>
              <Text style={s.muted}>{l.tr("ratingDetails.next", { ovr: details.nextOVR })}</Text>
              <Text style={s.fine}>{details.remainingFormatted === null
                ? l.tr("ratingDetails.tinyRemaining")
                : l.tr("ratingDetails.remaining", { value: details.remainingFormatted })}</Text>
            </>}
            <Text style={s.fine}>{l.tr("ratingDetails.explanation")}</Text>
            {details.provisionalCount > 0 && <Text style={s.fine}>
              {l.tr("ratingDetails.provisional", { count: details.provisionalCount })}
            </Text>}
          </> : <Text style={s.muted}>{l.tr("ratingDetails.unavailable")}</Text>}
        </View>
      )}
    </>
  );
}
