import { useState } from "react";
import { Text, View } from "react-native";
import { Button, Panel, Placeholder, s } from "@/components/ui/primitives";
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
        label="WORKOUT NAME"
        value={plan.name}
        onChange={(name) => onChange({ ...plan, name })}
        placeholder="e.g. Push day"
      />
      <Text style={s.fine}>
        Set your targets. Adjust each set whenever you need.
      </Text>
      {plan.exercises.length === 0 && (
        <Panel title="BUILD YOUR SESSION">
          <Text style={s.muted}>
            Choose your first exercise to get started.
          </Text>
        </Panel>
      )}
      {plan.exercises.map((entry, index) => {
        const exercise = library.find((e) => e.id === entry.exerciseId);
        if (!exercise) return null;
        const first = entry.sets[0];
        return (
          <Panel
            key={entry.id}
            title={`${index + 1}. ${exercise.name}`}
            kicker={`${entry.sets.length} SETS`}
          >
            <Text style={s.muted}>
              {entry.sets.map(targetLabel).join(" / ")}
            </Text>
            <Counter
              displayLabel="Sets"
              label={`${exercise.name} sets`}
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
            <Text style={s.eyebrow}>TARGET FOR ALL SETS</Text>
            {entry.sets.some(
              (set) => targetLabel(set) !== targetLabel(first),
            ) && (
              <Text style={s.fine}>
                Targets vary by set. Changing these controls applies the shown
                target to every set.
              </Text>
            )}
            <TargetControls
              target={first}
              label={exercise.name}
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
                  ? "HIDE DETAILS"
                  : "EDIT SETS, REST & ORDER"
              }
              label={`${expanded === entry.id ? "HIDE" : "EDIT"} DETAILS · ${exercise.name}`}
              onPress={() =>
                setExpanded(expanded === entry.id ? null : entry.id)
              }
            />
            {expanded === entry.id && (
              <>
                <Text style={s.eyebrow}>INDIVIDUAL SET TARGETS</Text>
                {entry.sets.map((set, i) => (
                  <View key={set.id} style={{ gap: 6 }}>
                    <Text style={s.muted}>SET {i + 1}</Text>
                    <TargetControls
                      target={set}
                      label={`${exercise.name} set ${i + 1}`}
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
                  label={`${exercise.name} rest seconds`}
                  value={entry.restSeconds}
                  min={0}
                  max={c.maxRestSeconds}
                  step={15}
                  onChange={(restSeconds) => update({ ...entry, restSeconds })}
                />
                <View style={t.row}>
                  <Action
                    displayLabel="MOVE UP"
                    label={`MOVE UP · ${exercise.name}`}
                    disabled={index === 0}
                    onPress={() =>
                      onChange({
                        ...plan,
                        exercises: moveEntry(plan.exercises, index, -1),
                      })
                    }
                  />
                  <Action
                    displayLabel="MOVE DOWN"
                    label={`MOVE DOWN · ${exercise.name}`}
                    disabled={index === plan.exercises.length - 1}
                    onPress={() =>
                      onChange({
                        ...plan,
                        exercises: moveEntry(plan.exercises, index, 1),
                      })
                    }
                  />
                  <Action
                    displayLabel="REMOVE"
                    label={`REMOVE · ${exercise.name}`}
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
        label="+ ADD EXERCISE"
        disabled={plan.exercises.length >= c.maxExercises}
        onPress={() => setPicker(true)}
      />
      <ErrorText message={error} />
      {busy ? (
        <Text style={s.muted}>Saving…</Text>
      ) : (
        <Button label="SAVE WORKOUT" onPress={() => void save()} />
      )}
      <Placeholder
        title="START WORKOUT"
        description="Live workout sessions are coming soon."
        icon="train"
      />
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
  return (
    <View style={{ gap: 6 }}>
      {target.type === "time" ? (
        <Counter
          displayLabel="Seconds"
          label={`${label} seconds`}
          value={target.seconds}
          max={c.maxSeconds}
          step={5}
          onChange={(seconds) => onChange({ ...target, seconds })}
        />
      ) : (
        <>
          <Counter
            displayLabel="Reps"
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
