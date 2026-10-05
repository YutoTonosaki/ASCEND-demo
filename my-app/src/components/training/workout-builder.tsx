import { useLocalization } from "@/localization";
import { useState } from "react";
import { Text, View } from "react-native";
import { Button, Panel, s } from "@/components/ui/primitives";
import { Action, Counter, ErrorText, Field, t } from "./controls";
import { ExercisePicker } from "./exercise-picker";
import { trainingConfig as c } from "@/config/training";
import { useTraining } from "@/training/provider";
import { moveEntry, newEntry, newId, targetLabel } from "@/training/plans";
import type { SetTarget, WorkoutExercise, WorkoutPlan } from "@/types/training";
export function WorkoutBuilder({
  plan,
  onChange,
  onSaved,
}: {
  plan: WorkoutPlan;
  onChange: (p: WorkoutPlan) => void;
  onSaved: () => void;
}) {
 const l = useLocalization();
  const { tr } = useLocalization();
  const { library, commit } = useTraining();
  const [picker, setPicker] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  function update(entry: WorkoutExercise) {
    onChange({
      ...plan,
      exercises: plan.exercises.map((e) => (e.id === entry.id ? entry : e)),
    });
  }
  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      await commit({
        type: "saveWorkout",
        workout: {
          ...plan,
          name: plan.name.trim(),
          updatedAt: new Date().toISOString(),
        },
      });
      onSaved();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save workout. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Field
        label={tr("train.workoutName")}
        value={plan.name}
        onChange={(name) => onChange({ ...plan, name })}
        placeholder={tr("train.workoutPlaceholder")}
      />
      <Text style={s.fine}>
        {tr("train.targetsNote")}</Text>
      {plan.exercises.length === 0 && (
        <Panel title={tr("train.build")}>
          <Text style={s.muted}>
            {tr("train.firstExercise")}</Text>
        </Panel>
      )}
      {plan.exercises.map((entry, index) => {
        const exercise = library.find((e) => e.id === entry.exerciseId);
        if (!exercise) return null;
        const first = entry.sets[0];
        return (
          <Panel
            key={entry.id}
            title={`${index + 1}. ${l.exercise(exercise)}`}
            kicker={`${entry.sets.length} SETS`}
          >
            <Text style={s.muted}>
              {entry.sets.map(targetLabel).join(" / ")}
            </Text>
            <Counter
              displayLabel="Sets"
              label={`${l.exercise(exercise)} sets`}
              value={entry.sets.length}
              max={c.maxSets}
              onChange={(count) =>
                update({
                  ...entry,
                  sets:
                    count > entry.sets.length
                      ? [
                          ...entry.sets,
                          ...Array.from(
                            { length: count - entry.sets.length },
                            () => ({
                              ...entry.sets[entry.sets.length - 1],
                              id: newId(),
                            }),
                          ),
                        ]
                      : entry.sets.slice(0, count),
                })
              }
            />
            <Text style={s.eyebrow}>{tr("train.allTargets")}</Text>
            {entry.sets.some(
              (set) => targetLabel(set) !== targetLabel(first),
            ) && (
              <Text style={s.fine}>
                {tr("train.varyTargets")}</Text>
            )}
            <TargetControls
              target={first}
              label={l.exercise(exercise)}
              onChange={(target) =>
                update({
                  ...entry,
                  sets: entry.sets.map((set) => ({ ...target, id: set.id })),
                })
              }
            />
            <Action
              displayLabel={
                expanded === entry.id
                  ? tr("train.hideDetails")
                  : tr("train.editDetails")
              }
              label={`${expanded === entry.id ? tr("common.hide") : tr("common.edit")} DETAILS · ${l.exercise(exercise)}`}
              onPress={() =>
                setExpanded(expanded === entry.id ? null : entry.id)
              }
            />
            {expanded === entry.id && (
              <>
                <Text style={s.eyebrow}>{tr("train.individualTargets")}</Text>
                {entry.sets.map((set, i) => (
                  <View key={set.id} style={{ gap: 6 }}>
                    <Text style={s.muted}>{tr("train.set")} {i + 1}</Text>
                    <TargetControls
                      target={set}
                      label={`${l.exercise(exercise)} set ${i + 1}`}
                      onChange={(target) =>
                        update({
                          ...entry,
                          sets: entry.sets.map((old) =>
                            old.id === set.id ? target : old,
                          ),
                        })
                      }
                    />
                  </View>
                ))}
                <Counter
                  displayLabel="Rest · sec"
                  label={`${l.exercise(exercise)} rest seconds`}
                  value={entry.restSeconds}
                  min={0}
                  max={c.maxRestSeconds}
                  step={15}
                  onChange={(restSeconds) => update({ ...entry, restSeconds })}
                />
                <View style={t.row}>
                  <Action
                    displayLabel={tr("train.moveUp")}
                    label={`MOVE UP · ${l.exercise(exercise)}`}
                    disabled={index === 0}
                    onPress={() =>
                      onChange({
                        ...plan,
                        exercises: moveEntry(plan.exercises, index, -1),
                      })
                    }
                  />
                  <Action
                    displayLabel={tr("train.moveDown")}
                    label={`MOVE DOWN · ${l.exercise(exercise)}`}
                    disabled={index === plan.exercises.length - 1}
                    onPress={() =>
                      onChange({
                        ...plan,
                        exercises: moveEntry(plan.exercises, index, 1),
                      })
                    }
                  />
                  <Action
                    displayLabel={tr("train.remove")}
                    label={`REMOVE · ${l.exercise(exercise)}`}
                    onPress={() =>
                      onChange({
                        ...plan,
                        exercises: plan.exercises.filter(
                          (e) => e.id !== entry.id,
                        ),
                      })
                    }
                  />
                </View>
              </>
            )}
          </Panel>
        );
      })}
      <Action
        label={tr("train.addExercisePlus")}
        disabled={plan.exercises.length >= c.maxExercises}
        onPress={() => setPicker(true)}
      />
      <ErrorText message={error} />
      {busy ? (
        <Text style={s.muted}>{tr("common.saving")}</Text>
      ) : (
        <Button label={tr("train.save")} onPress={() => void save()} />
      )}
      <Text style={s.fine}>{tr("train.saveToStart")}</Text>
      {picker && (
        <ExercisePicker
          onClose={() => setPicker(false)}
          onSelect={(exercise) => {
            onChange({
              ...plan,
              exercises: [...plan.exercises, newEntry(exercise)],
            });
            setPicker(false);
          }}
        />
      )}
    </>
  );
}
function TargetControls({
  target,
  onChange,
  label,
}: {
  target: SetTarget;
  onChange: (t: SetTarget) => void;
  label: string;
}) {
  const { tr } = useLocalization();
  return (
    <View style={{ gap: 6 }}>
      {target.type === "time" ? (
        <Counter
          displayLabel={tr("units.seconds")}
          label={`${label} seconds`}
          value={target.seconds}
          max={c.maxSeconds}
          step={5}
          onChange={(seconds) => onChange({ ...target, seconds })}
        />
      ) : (
        <>
          <Counter
            displayLabel={tr("units.reps")}
            label={`${label} reps`}
            value={target.reps}
            max={c.maxReps}
            onChange={(reps) => onChange({ ...target, reps })}
          />
          {target.type === "weight_reps" && (
            <Counter
              displayLabel="Weight · kg"
              label={`${label} kg`}
              value={target.weightKg}
              min={0}
              max={c.maxWeightKg}
              step={2.5}
              onChange={(weightKg) => onChange({ ...target, weightKg })}
            />
          )}
        </>
      )}
    </View>
  );
}
