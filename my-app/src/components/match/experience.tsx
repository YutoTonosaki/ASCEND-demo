import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  AccessibilityInfo,
  AppState,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { SafeAreaModal } from "../ui/safe-area-modal";
import { Action } from "../training/controls";
import { s } from "../ui/primitives";
import { useLocalization } from "../../localization";
import { useMatches } from "../../matches/provider";
import { useMatchHistory } from "../../matches/use-history";
import {
  matchup,
  completedPresentation,
} from "../../matches/presentation/model";
import {
  CinematicController,
  type Stage,
} from "../../matches/presentation/controller";
import type { Match } from "../../matches/domain";
import { MatchCards, MatchRenderer } from "./renderer";
import { MatchReport } from "./report";

class RendererBoundary extends Component<
  PropsWithChildren<{ fallback: React.ReactNode }>,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
export function MatchExperience({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const { tr } = useLocalization(),
    matches = useMatches(),
    history = useMatchHistory();
  const [saved, setSaved] = useState<Match | null>(null);
  const [stage, setStage] = useState<Stage | "pre">("pre");
  const [failed, setFailed] = useState(false);
  const [controller] = useState(() => new CinematicController());
  const alive = useRef(true),
    busy = useRef(false),
    reduce = useRef(true),
    active = useRef(AppState.currentState === "active");

  const item = history.items.find((i) => i.match.id === id);
  const record = item?.match;
  const owner = history.owner;
  const candidate = saved ?? (record?.result ? record : null);
  const completed =
    candidate &&
    owner &&
    candidate.playerId === owner.playerId &&
    candidate.careerStartedAt === owner.careerStartedAt
      ? candidate
      : null;
  const shownStage = stage === "pre" && completed ? "report" : stage;
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    alive.current = true;
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (live) {
          reduce.current = value;
          if (value) controller.skip();
        }
      })
      .catch(() => {});
    const motion = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (value) => {
        reduce.current = value;
        if (value) controller.skip();
      },
    );
    const app = AppState.addEventListener("change", (state) => {
      active.current = state === "active";
      if (!active.current) controller.background();
    });
    return () => {
      live = false;
      alive.current = false;
      controller.dispose();
      motion.remove();
      app.remove();
    };
  }, [controller]);
  useFocusEffect(
    useCallback(() => {
      alive.current = true;
      return () => {
        alive.current = false;
        controller.dispose();
        closeRef.current();
      };
    }, [controller]),
  );
  const confirm = async () => {
    if (busy.current || !record || item?.status !== "READY") return;
    busy.current = true;
    setFailed(false);
    const result = await matches.play(id);
    busy.current = false;
    if (!alive.current) return;
    if (!result) {
      setFailed(true);
      return;
    }
    setSaved(result);
    controller.start(setStage, reduce.current || !active.current);
  };
  const report = completed ? (
    <MatchReport
      item={{
        match: completed,
        status: "COMPLETED",
        payment: (item?.match.result?.id === completed.result?.id
          ? item?.payment
          : null) ?? {
          state: "unavailable",
          expected: completedPresentation(completed).expectedReward,
          confirmed: null,
        },
      }}
      onDone={onClose}
    />
  ) : null;
  return (
    <SafeAreaModal
      visible
      animationType="none"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={s.safe}>
        <View testID="match-experience" style={[s.content, { flex: 1 }]}>
          <View style={s.sectionHeading}>
            <Text style={s.sectionTitle}>
              {tr(
                shownStage === "pre"
                  ? "cinematic.pre"
                  : shownStage === "report"
                    ? "cinematic.report"
                    : "cinematic.progress",
              )}
            </Text>
            <Action label={tr("common.close")} onPress={onClose} />
          </View>
          {shownStage !== "pre" && shownStage !== "report" && (
            <Action
              label={tr("cinematic.skip")}
              onPress={() => controller.skip()}
            />
          )}
          <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 32 }}>
            {shownStage === "pre" ? (
              <>
                {record?.weekEnd && item?.status === "READY" && (
                  <MatchCards model={matchup(record)} />
                )}
                {record && item?.status !== "READY" && (
                  <Text
                    testID="pre-match-status"
                    accessibilityLiveRegion="polite"
                    style={s.muted}
                  >
                    {tr(`match.status.${item!.status}`)}
                  </Text>
                )}
                {(failed || matches.error || !record) && (
                  <>
                    <Text accessibilityRole="alert" style={s.muted}>
                      {tr("cinematic.error")}
                    </Text>
                    <Action
                      label={tr("common.retry")}
                      onPress={() => void matches.retry()}
                    />
                  </>
                )}
                <Action
                  label={
                    matches.playing === id
                      ? tr("common.saving")
                      : tr("cinematic.confirm")
                  }
                  disabled={
                    matches.playing !== null || item?.status !== "READY"
                  }
                  onPress={() => void confirm()}
                />
              </>
            ) : completed ? (
              shownStage === "report" ? (
                report
              ) : (
                <RendererBoundary fallback={report}>
                  <MatchRenderer
                    model={completedPresentation(completed)}
                    stage={shownStage as Exclude<Stage, "report">}
                  />
                </RendererBoundary>
              )
            ) : (
              <Text style={s.muted}>{tr("history.unavailable")}</Text>
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </SafeAreaModal>
  );
}
