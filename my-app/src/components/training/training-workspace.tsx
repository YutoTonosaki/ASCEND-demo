import { useLocalization } from "@/localization";
import { useEffect, useState } from "react";
import { BackHandler, Text, View } from "react-native";
import { useIsFocused } from "expo-router";
import { Button, Panel, Screen, s } from "@/components/ui/primitives";
import { Action, Confirm, ErrorText, Sheet, t } from "./controls";
import { ExerciseEditor } from "./exercise-editor";
import { WorkoutBuilder } from "./workout-builder";
import { useTraining } from "@/training/provider";
import {
  copyWorkoutPlan,
  duplicateWorkout,
  newWorkout,
} from "@/training/plans";
import type { CustomExercise, WorkoutPlan } from "@/types/training";
import { trackingLabels } from "@/config/training";
import { useSessions } from "@/sessions/provider";
import { LiveWorkout, SessionSummary } from "./live-workout";
import { CoachWorkspace } from "@/components/coach/coach-workspace";
type Page =
  | "home"
  | "saved"
  | "builder"
  | "detail"
  | "exercises"
  | "live"
  | "history"
  | "summary"
  | "coach";
export function TrainingWorkspace() {
  const l = useLocalization();
  const { tr } = useLocalization();
  const {
    data,
    library,
    error: loadError,
    retry,
    reset,
    commit,
  } = useTraining();
  const sessions = useSessions();
  const [summaryId, setSummaryId] = useState<string | null>(null);
  const [page, setPage] = useState<Page>("home");
  const [plan, setPlan] = useState<WorkoutPlan>(() => newWorkout());
  const [dirty, setDirty] = useState(false);
  const [editor, setEditor] = useState<CustomExercise | "new" | null>(null);
  const [confirmation, setConfirmation] = useState<{
    title: string;
    message: string;
    action: () => void;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const focused = useIsFocused();
  function navigate(next: Page) {
    setPage(next);
    setError(null);
    setNotice(null);
  }
  function back() {
    if (page === "builder" && dirty)
      setConfirmation({
        title: "DISCARD CHANGES?",
        message: "Your unsaved workout changes will be lost.",
        action: () => {
          setDirty(false);
          navigate("saved");
        },
      });
    else navigate("home");
  }
  useEffect(() => {
    if (!focused || page === "home") return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        back();
        return true;
      },
    );
    return () => subscription.remove();
  });
  async function perform(action: () => Promise<void>, message?: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await action();
      if (message) setNotice(message);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  function create() {
    setPlan(newWorkout());
    setDirty(false);
    navigate("builder");
  }
  const selected = data?.workouts.find((w) => w.id === plan.id) ?? plan;
  const historical = sessions.data?.completed.find((x) => x.id === summaryId);
  return (
    <Screen
      key={page}
      kicker={tr("train.kicker")}
      title={
        page === "coach"
          ? tr("train.coach")
          : page === "live"
            ? tr("train.live")
            : page === "history"
              ? tr("train.history")
              : page === "summary"
                ? tr("train.complete")
                : page === "home"
                  ? tr("train.title")
                  : page === "builder"
                    ? tr("train.custom")
                    : page === "saved"
                      ? tr("train.saved")
                      : page === "exercises"
                        ? tr("train.myExercises")
                        : tr("train.yourWorkout")
      }
    >
      {page !== "home" && <Action label={tr("common.back")} onPress={back} />}
      <ErrorText message={error} />
      {notice && (
        <Text accessibilityLiveRegion="polite" style={s.muted}>
          {l.display(notice)}
        </Text>
      )}
      {!sessions.data && (
        <Panel
          title={
            sessions.error ? tr("train.sessions") : tr("train.loadingSessions")
          }
        >
          <ErrorText message={sessions.error} />
          {sessions.error && (
            <>
              <Action
                label={tr("train.retrySessions")}
                onPress={() => void sessions.retry()}
              />
              <Action
                label={tr("train.resetSessions")}
                onPress={() =>
                  setConfirmation({
                    title: "RESET SESSION DATA?",
                    message:
                      "Clear active and completed sessions only. A raw backup will be kept on this device first. Saved workouts and exercises are unchanged.",
                    action: () => void sessions.reset(),
                  })
                }
              />
            </>
          )}
        </Panel>
      )}
      {page === "live" && sessions.data?.active && (
        <LiveWorkout
          session={sessions.data.active}
          onComplete={(id) => {
            setSummaryId(id);
            navigate("summary");
          }}
        />
      )}
      {page === "summary" && historical && (
        <SessionSummary
          session={historical}
          onFinish={() => navigate("home")}
        />
      )}
      {page === "history" && sessions.data && (
        <>
          {sessions.data.completed.length === 0 && (
            <Text style={s.muted}>{tr("train.historyEmpty")}</Text>
          )}
          {sessions.data.completed.map((session) => (
            <Panel
              key={session.id}
              title={session.name}
              kicker={l.date(session.completedAt!)}
            >
              <Text style={s.muted}>
                {tr("train.historyCounts", {
                  exercises: session.exercises.length,
                  sets: session.exercises.reduce(
                    (n, e) => n + e.sets.length,
                    0,
                  ),
                })}
              </Text>
              <Action
                label={tr("train.viewSession", { name: session.name })}
                onPress={() => {
                  setSummaryId(session.id);
                  navigate("summary");
                }}
              />
            </Panel>
          ))}
        </>
      )}
      {page === "home" && !data && sessions.data && (
        <Panel title={tr("train.yourSessions")}>
          {sessions.data.active && (
            <Button
              label={tr("train.resume")}
              onPress={() => navigate("live")}
            />
          )}
          <Action
            label={tr("train.history")}
            onPress={() => navigate("history")}
          />
        </Panel>
      )}
      {!data ? (
        <Panel title={loadError ? tr("train.data") : tr("common.loadingUpper")}>
          <ErrorText message={loadError} />
          {loadError && (
            <>
              <Action label={tr("common.retry")} onPress={() => void retry()} />
              <Action
                label={tr("train.resetData")}
                onPress={() =>
                  setConfirmation({
                    title: "RESET TRAINING DATA?",
                    message:
                      "Start with an empty training library. A copy of the existing saved data will be kept on this device before resetting.",
                    action: () => void reset(),
                  })
                }
              />
            </>
          )}
        </Panel>
      ) : (
        <>
          {page === "home" && (
            <>
              {sessions.data?.active && (
                <Panel
                  title={sessions.data.active.name}
                  kicker={tr("train.inProgress")}
                >
                  <Button
                    label={tr("train.resume")}
                    onPress={() => navigate("live")}
                  />
                </Panel>
              )}
              <Text style={s.muted}>{tr("train.choose")}</Text>
              <Panel title={tr("train.coach")}>
                <Text style={s.muted}>{tr("train.coachNote")}</Text>
                <Action
                  label={tr("train.openCoach")}
                  onPress={() => navigate("coach")}
                />
              </Panel>
              <Panel title={tr("train.custom")}>
                <Text style={s.muted}>{tr("train.customNote")}</Text>
                <Button label={tr("train.create")} onPress={create} />
              </Panel>
              <Panel title={tr("train.yourTraining")}>
                <Action
                  label={tr("train.savedCount", {
                    count: data.workouts.length,
                  })}
                  onPress={() => navigate("saved")}
                />
                <Action
                  label={tr("train.exerciseCount", {
                    count: data.customExercises.length,
                  })}
                  onPress={() => navigate("exercises")}
                />
                <Action
                  label={tr("train.history")}
                  disabled={!sessions.data}
                  onPress={() => navigate("history")}
                />
              </Panel>
            </>
          )}
          {page === "coach" && (
            <CoachWorkspace
              onManual={create}
              onDraft={(draft) => {
                setPlan(draft);
                setDirty(true);
                navigate("builder");
              }}
              onSaved={(saved) => {
                setPlan(saved);
                setDirty(false);
                navigate("detail");
              }}
            />
          )}
          {page === "saved" && (
            <>
              <Button label={tr("train.createPlus")} onPress={create} />
              {data.workouts.length === 0 && (
                <Panel title={tr("train.emptyTitle")}>
                  <Text style={s.muted}>{tr("train.emptyNote")}</Text>
                </Panel>
              )}
              {data.workouts.map((workout) => (
                <Panel key={workout.id} title={workout.name}>
                  <Text style={s.muted}>
                    {workout.exercises.length} exercises ·{" "}
                    {workout.exercises.reduce(
                      (sum, e) => sum + e.sets.length,
                      0,
                    )}{" "}
                    {tr("units.sets")}
                  </Text>
                  <Action
                    label={tr("train.viewName", { name: workout.name })}
                    onPress={() => {
                      setPlan(workout);
                      navigate("detail");
                    }}
                  />
                </Panel>
              ))}
            </>
          )}
          {page === "builder" && (
            <WorkoutBuilder
              key={plan.id}
              plan={plan}
              onChange={(next) => {
                setPlan(next);
                setDirty(true);
              }}
              onSaved={() => {
                setDirty(false);
                navigate("detail");
                setNotice("Workout saved on this device.");
              }}
            />
          )}
          {page === "detail" && (
            <>
              <Panel title={selected.name}>
                {selected.exercises.map((entry, index) => (
                  <View key={entry.id} style={t.item}>
                    <Text style={t.name}>
                      {index + 1}.{" "}
                      {(() => {
                        const exercise = library.find(
                          (e) => e.id === entry.exerciseId,
                        );
                        return exercise ? l.exercise(exercise) : "";
                      })()}
                    </Text>
                    <Text style={s.muted}>
                      {entry.sets.map(l.target).join(" / ")}
                    </Text>
                    <Text style={s.fine}>
                      {tr("train.restTarget")} {entry.restSeconds}{" "}
                      {tr("units.sec")}
                    </Text>
                  </View>
                ))}
              </Panel>
              <Button
                label={tr("train.edit")}
                onPress={() => {
                  setPlan(copyWorkoutPlan(selected));
                  setDirty(false);
                  navigate("builder");
                }}
              />
              <View style={t.row}>
                <Action
                  label={tr("train.duplicate")}
                  disabled={busy}
                  onPress={() =>
                    void perform(async () => {
                      const copy = duplicateWorkout(selected);
                      await commit({ type: "saveWorkout", workout: copy });
                      setPlan(copy);
                    }, "Workout duplicated.")
                  }
                />
                <Action
                  label={tr("train.delete")}
                  disabled={busy}
                  onPress={() =>
                    setConfirmation({
                      title: "DELETE WORKOUT?",
                      message: tr("train.deleteNote", { name: selected.name }),
                      action: () =>
                        void perform(async () => {
                          await commit({
                            type: "deleteWorkout",
                            id: selected.id,
                          });
                          navigate("saved");
                        }, "Workout deleted."),
                    })
                  }
                />
              </View>
              <Action
                label={
                  sessions.data?.active ? tr("train.resume") : tr("train.start")
                }
                disabled={busy || !sessions.data}
                onPress={() =>
                  void perform(async () => {
                    if (!sessions.data?.active)
                      await sessions.commit({
                        type: "start",
                        plan: selected,
                        library,
                      });
                    navigate("live");
                  })
                }
              />
            </>
          )}
          {page === "exercises" && (
            <>
              <Button
                label={tr("train.createExercisePlus")}
                onPress={() => setEditor("new")}
              />
              {data.customExercises.length === 0 && (
                <Text style={s.muted}>{tr("train.exerciseNote")}</Text>
              )}
              {data.customExercises.map((exercise) => (
                <Panel key={exercise.id} title={l.exercise(exercise)}>
                  <Text style={s.muted}>
                    {exercise.primaryBodyParts.map(l.display).join(", ")} ·{" "}
                    {l.display(trackingLabels[exercise.trackingType])}
                  </Text>
                  <View style={t.row}>
                    <Action
                      label={tr("train.editName", {
                        name: l.exercise(exercise),
                      })}
                      onPress={() => setEditor(exercise)}
                    />
                    <Action
                      label={tr("train.deleteName", {
                        name: l.exercise(exercise),
                      })}
                      disabled={busy}
                      onPress={() =>
                        setConfirmation({
                          title: "DELETE EXERCISE?",
                          message: tr("train.deleteExerciseNote", {
                            name: l.exercise(exercise),
                          }),
                          action: () =>
                            void perform(
                              () =>
                                commit({
                                  type: "deleteExercise",
                                  id: exercise.id,
                                }),
                              "Exercise deleted.",
                            ),
                        })
                      }
                    />
                  </View>
                </Panel>
              ))}
            </>
          )}
        </>
      )}
      {editor && (
        <Sheet
          title={
            editor === "new"
              ? tr("train.createExercise")
              : tr("train.editExercise")
          }
          onClose={() => setEditor(null)}
        >
          <ExerciseEditor
            existing={editor === "new" ? undefined : editor}
            onCancel={() => setEditor(null)}
            onDone={() => {
              setEditor(null);
              setNotice("Exercise saved on this device.");
            }}
          />
        </Sheet>
      )}
      {confirmation && (
        <Confirm
          title={l.display(confirmation.title)}
          message={l.display(confirmation.message)}
          onCancel={() => setConfirmation(null)}
          onConfirm={() => {
            const action = confirmation.action;
            setConfirmation(null);
            action();
          }}
        />
      )}
    </Screen>
  );
}
