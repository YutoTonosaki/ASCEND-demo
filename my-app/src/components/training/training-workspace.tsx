import { useEffect, useState } from "react";
import { BackHandler, Text, View } from "react-native";
import { useIsFocused } from "expo-router";
import {
  Button,
  Panel,
  Placeholder,
  Screen,
  s,
} from "@/components/ui/primitives";
import { Action, Confirm, ErrorText, Sheet, t } from "./controls";
import { ExerciseEditor } from "./exercise-editor";
import { WorkoutBuilder } from "./workout-builder";
import { useTraining } from "@/training/provider";
import { copyWorkoutPlan, duplicateWorkout, newWorkout, targetLabel } from "@/training/plans";
import type { CustomExercise, WorkoutPlan } from "@/types/training";
import { trackingLabels } from "@/config/training";
type Page = "home" | "saved" | "builder" | "detail" | "exercises";
export function TrainingWorkspace() {
  const {
    data,
    library,
    error: loadError,
    retry,
    reset,
    commit,
  } = useTraining();
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
  return (
    <Screen
      key={page}
      kicker="TRAIN / FIND YOUR FOCUS"
      title={
        page === "home"
          ? "PUT IN THE WORK"
          : page === "builder"
            ? "CUSTOM WORKOUT"
            : page === "saved"
              ? "SAVED WORKOUTS"
              : page === "exercises"
                ? "MY EXERCISES"
                : "YOUR WORKOUT"
      }
    >
      {page !== "home" && <Action label="BACK" onPress={back} />}
      <ErrorText message={error} />
      {notice && (
        <Text accessibilityLiveRegion="polite" style={s.muted}>
          {notice}
        </Text>
      )}
      {!data ? (
        <Panel title={loadError ? "TRAINING DATA" : "LOADING"}>
          <ErrorText message={loadError} />
          {loadError && (
            <>
              <Action label="RETRY" onPress={() => void retry()} />
              <Action
                label="RESET TRAINING DATA"
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
              <Text style={s.muted}>Choose your way to train.</Text>
              <Panel title="AI COACH">
                <Text style={s.muted}>A plan that grows with you.</Text>
                <Text style={s.tiny}>COMING SOON</Text>
              </Panel>
              <Panel title="CUSTOM WORKOUT">
                <Text style={s.muted}>Your session. Your approach.</Text>
                <Button label="CREATE WORKOUT" onPress={create} />
              </Panel>
              <Panel title="YOUR TRAINING">
                <Action
                  label={`SAVED WORKOUTS · ${data.workouts.length}`}
                  onPress={() => navigate("saved")}
                />
                <Action
                  label={`MY EXERCISES · ${data.customExercises.length}`}
                  onPress={() => navigate("exercises")}
                />
                <Placeholder title="WORKOUT HISTORY" icon="train" />
              </Panel>
            </>
          )}
          {page === "saved" && (
            <>
              <Button label="+ CREATE WORKOUT" onPress={create} />
              {data.workouts.length === 0 && (
                <Panel title="YOUR NEXT SESSION STARTS HERE">
                  <Text style={s.muted}>Save a workout and make it yours.</Text>
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
                    sets
                  </Text>
                  <Action
                    label={`VIEW · ${workout.name}`}
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
                      {library.find((e) => e.id === entry.exerciseId)?.name}
                    </Text>
                    <Text style={s.muted}>
                      {entry.sets.map(targetLabel).join(" / ")}
                    </Text>
                    <Text style={s.fine}>
                      Rest target · {entry.restSeconds} sec
                    </Text>
                  </View>
                ))}
              </Panel>
              <Button
                label="EDIT WORKOUT"
                onPress={() => {
                  setPlan(copyWorkoutPlan(selected));
                  setDirty(false);
                  navigate("builder");
                }}
              />
              <View style={t.row}>
                <Action
                  label="DUPLICATE WORKOUT"
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
                  label="DELETE WORKOUT"
                  disabled={busy}
                  onPress={() =>
                    setConfirmation({
                      title: "DELETE WORKOUT?",
                      message: `Delete ${selected.name}? This cannot be undone.`,
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
              <Placeholder
                title="START WORKOUT"
                description="Live workout sessions are coming soon."
                icon="train"
              />
            </>
          )}
          {page === "exercises" && (
            <>
              <Button
                label="+ CREATE CUSTOM EXERCISE"
                onPress={() => setEditor("new")}
              />
              {data.customExercises.length === 0 && (
                <Text style={s.muted}>
                  Add your own movements once, then select them whenever you
                  train.
                </Text>
              )}
              {data.customExercises.map((exercise) => (
                <Panel key={exercise.id} title={exercise.name}>
                  <Text style={s.muted}>
                    {exercise.primaryBodyParts.join(", ")} ·{" "}
                    {trackingLabels[exercise.trackingType]}
                  </Text>
                  <View style={t.row}>
                    <Action
                      label={`EDIT · ${exercise.name}`}
                      onPress={() => setEditor(exercise)}
                    />
                    <Action
                      label={`DELETE · ${exercise.name}`}
                      disabled={busy}
                      onPress={() =>
                        setConfirmation({
                          title: "DELETE EXERCISE?",
                          message: `Delete ${exercise.name}? Exercises used in saved workouts must be removed from those workouts first.`,
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
          title={editor === "new" ? "CREATE EXERCISE" : "EDIT EXERCISE"}
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
          title={confirmation.title}
          message={confirmation.message}
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
