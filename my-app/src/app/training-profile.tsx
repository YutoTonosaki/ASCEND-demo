import { useLocalization } from "@/localization";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Screen, Panel, s } from "@/components/ui/primitives";
import { ProfileEditor } from "@/components/coach/profile-editor";
import { Action, Confirm, ErrorText } from "@/components/training/controls";
import { useCoach } from "@/coach/provider";
import { useState } from "react";
export default function TrainingProfileScreen() {
  const { tr } = useLocalization();
  const coach = useCoach();
  const [resetting, setResetting] = useState(false);
  const back = () =>
    router.canGoBack() ? router.back() : router.replace("/(tabs)/train");
  return (
    <SafeAreaView edges={["bottom"]} style={s.safe}>
      <Screen title={tr("coach.profile")} kicker={tr("coach.preferences")}>
        {coach.data ? (
          <ProfileEditor onDone={back} onCancel={back} />
        ) : (
          <Panel title={tr("coach.profile")}>
            <ErrorText message={coach.error} />
            <Action label={tr("coach.retry")} onPress={() => void coach.retry()} />
            {coach.error && (
              <Action
                label={tr("coach.reset")}
                onPress={() => setResetting(true)}
              />
            )}
            <Action label={tr("common.back")} onPress={back} />
          </Panel>
        )}
        {resetting && (
          <Confirm
            title={tr("coach.resetQuestion")}
            message={tr("coach.resetNote")}
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
