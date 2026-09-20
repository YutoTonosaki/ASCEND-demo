import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Screen, Panel, s } from "@/components/ui/primitives";
import { ProfileEditor } from "@/components/coach/profile-editor";
import { Action, Confirm, ErrorText } from "@/components/training/controls";
import { useCoach } from "@/coach/provider";
import { useState } from "react";
export default function TrainingProfileScreen() {
  const coach = useCoach();
  const [resetting, setResetting] = useState(false);
  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/(tabs)/train");
  return (
    <SafeAreaView edges={["bottom"]} style={s.safe}>
      <Screen title="TRAINING PROFILE" kicker="YOUR PREFERENCES">
        {coach.data ? (
          <ProfileEditor onDone={back} onCancel={back} />
        ) : (
          <Panel title="TRAINING PROFILE">
            <ErrorText message={coach.error} />
            <Action label="RETRY PROFILE" onPress={() => void coach.retry()} />
            {coach.error && (
              <Action
                label="RESET COACH PROFILE"
                onPress={() => setResetting(true)}
              />
            )}
            <Action label="BACK" onPress={back} />
          </Panel>
        )}
        {resetting && (
          <Confirm
            title="RESET COACH PROFILE?"
            message="Back up and clear your profile only. Workouts and history are unchanged."
            onCancel={() => setResetting(false)}
            onConfirm={() => {
              setResetting(false);
              void coach.reset();
            }}
          />
        )}
      </Screen>
    </SafeAreaView>
  );
}
