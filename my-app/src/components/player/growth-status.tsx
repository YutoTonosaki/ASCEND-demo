import { useLocalization } from "@/localization";
import { Text } from "react-native";
import { router } from "expo-router";
import { Panel, s } from "@/components/ui/primitives";
import { Action, ErrorText } from "@/components/training/controls";
import { useGrowth } from "@/growth/provider";
import { useCoach } from "@/coach/provider";
import { useSessions } from "@/sessions/provider";
import { overall } from "@/growth/domain";
export function GrowthStatus() {
  const { tr } = useLocalization();
  const growth = useGrowth(),
    coach = useCoach(),
    sessions = useSessions();
  const player = growth.data?.player;
  return (
    <Panel
      title={player ? tr("player.rating") : tr("player.startingPoint")}
      kicker={player ? `OVR ${overall(player.ratings)}` : undefined}
    >
      {growth.error && (
        <>
          <ErrorText message={growth.error} />
          <Action
            label={tr("player.retry")}
            disabled={growth.busy}
            onPress={() => void growth.retry()}
          />
        </>
      )}
      {sessions.error && (
        <>
          <ErrorText message={tr("player.paused")} />
          <Action
            label={tr("train.retryHistory")}
            onPress={() => void sessions.retry()}
          />
        </>
      )}
      {!growth.data && !growth.error && (
        <Text style={s.muted}>{tr("player.loading")}</Text>
      )}
      {player ? (
        <Text style={s.fine}>{tr("player.gameNote")}</Text>
      ) : (
        growth.data &&
        !growth.error && (
          <>
            <Text style={s.muted}>{tr("player.initializeNote")}</Text>
            {coach.error && (
              <>
                <ErrorText message={tr("player.profileError")} />
                <Action
                  label={tr("coach.retryProfile")}
                  onPress={() => void coach.retry()}
                />
              </>
            )}
            {(!coach.data || !sessions.data) &&
              !coach.error &&
              !sessions.error && (
                <Text style={s.fine}>{tr("player.loadingEvidence")}</Text>
              )}
            <Action
              label={
                growth.busy ? tr("player.starting") : tr("player.initialize")
              }
              disabled={growth.busy || !coach.data || !sessions.data}
              onPress={() => void growth.initialize()}
            />
            <Action
              label={tr("player.reviewBaselines")}
              onPress={() => router.push("/training-profile")}
            />
            <Text style={s.fine}>{tr("player.baselinesOptional")}</Text>
          </>
        )
      )}
    </Panel>
  );
}
