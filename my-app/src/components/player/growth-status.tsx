import { Text } from "react-native";
import { router } from "expo-router";
import { Panel, s } from "@/components/ui/primitives";
import { Action, ErrorText } from "@/components/training/controls";
import { useGrowth } from "@/growth/provider";
import { useCoach } from "@/coach/provider";
import { useSessions } from "@/sessions/provider";
import { overall } from "@/growth/domain";
export function GrowthStatus() {
  const growth = useGrowth(),
    coach = useCoach(),
    sessions = useSessions();
  const player = growth.data?.player;
  return (
    <Panel
      title={player ? "PLAYER RATING" : "YOUR STARTING POINT"}
      kicker={player ? `OVR ${overall(player.ratings)}` : undefined}
    >
      {growth.error && (
        <>
          <ErrorText message={growth.error} />
          <Action
            label="RETRY PLAYER DATA"
            disabled={growth.busy}
            onPress={() => void growth.retry()}
          />
        </>
      )}
      {sessions.error && (
        <>
          <ErrorText message="Growth is paused until workout history can be read." />
          <Action
            label="RETRY WORKOUT HISTORY"
            onPress={() => void sessions.retry()}
          />
        </>
      )}
      {!growth.data && !growth.error && (
        <Text style={s.muted}>Loading player ratings…</Text>
      )}
      {player ? (
        <Text style={s.fine}>
          Game ratings, not a fitness ranking. Provisional areas await a
          supported assessment. Lower workout results do not reduce assessed
          ratings.
        </Text>
      ) : (
        growth.data &&
        !growth.error && (
          <>
            <Text style={s.muted}>
              Start from your existing Push-up, Bodyweight Squat and Plank
              baselines. Missing areas begin provisional. Earlier workouts
              remain PR evidence; growth starts here.
            </Text>
            {coach.error && (
              <>
                <ErrorText message="Your training profile could not be read." />
                <Action
                  label="RETRY TRAINING PROFILE"
                  onPress={() => void coach.retry()}
                />
              </>
            )}
            {(!coach.data || !sessions.data) &&
              !coach.error &&
              !sessions.error && (
                <Text style={s.fine}>
                  Loading your profile and workout history…
                </Text>
              )}
            <Action
              label={growth.busy ? "STARTING…" : "INITIALIZE PLAYER"}
              disabled={growth.busy || !coach.data || !sessions.data}
              onPress={() => void growth.initialize()}
            />
            <Action
              label="REVIEW BASELINES"
              onPress={() => router.push("/training-profile")}
            />
            <Text style={s.fine}>
              Baselines are optional. Later profile edits will not rewrite your
              starting ratings.
            </Text>
          </>
        )
      )}
    </Panel>
  );
}
