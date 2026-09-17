import { useState } from "react";
import { Text, View } from "react-native";
import { Choice, Button, s } from "@/components/ui/primitives";
import { Field, Action, ErrorText } from "./controls";
import {
  bodyParts,
  categories,
  equipmentOptions,
  trackingLabels,
} from "@/config/training";
import type { CustomExercise, TrackingType } from "@/types/training";
import { newId } from "@/training/plans";
import { useTraining } from "@/training/provider";
export function ExerciseEditor({
  existing,
  initialName = "",
  onDone,
  onCancel,
}: {
  existing?: CustomExercise;
  initialName?: string;
  onDone: (exercise: CustomExercise) => void;
  onCancel: () => void;
}) {
  const { commit } = useTraining();
  const [exercise, setExercise] = useState<CustomExercise>(() =>
    existing
      ? { ...existing }
      : {
          id: `custom-${newId()}`,
          name: initialName,
          primaryBodyParts: ["Chest"],
          secondaryBodyParts: [],
          equipment: ["Bodyweight"],
          trackingType: "reps",
          category: "Strength",
          difficulty: null,
          progressionFamily: null,
          isCustom: true,
        },
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save() {
    if (busy) return;
    setBusy(true);
    try {
      const next = { ...exercise, name: exercise.name.trim() };
      await commit({ type: "saveExercise", exercise: next });
      onDone(next);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 12 }}>
      <Field
        label="EXERCISE NAME"
        value={exercise.name}
        onChange={(name) => setExercise({ ...exercise, name })}
      />
      <Text style={s.eyebrow}>PRIMARY BODY PART</Text>
      <View style={s.choices}>
        {bodyParts.map((part) => (
          <Choice
            key={part}
            label={part}
            selected={exercise.primaryBodyParts.includes(part)}
            onPress={() =>
              setExercise({
                ...exercise,
                primaryBodyParts: [part],
                secondaryBodyParts: exercise.secondaryBodyParts.filter(
                  (x) => x !== part,
                ),
              })
            }
          />
        ))}
      </View>
      <Text style={s.eyebrow}>SECONDARY BODY PARTS · OPTIONAL</Text>
      <View style={s.choices}>
        {bodyParts
          .filter((p) => !exercise.primaryBodyParts.includes(p))
          .map((part) => (
            <Choice
              key={part}
              label={part}
              selected={exercise.secondaryBodyParts.includes(part)}
              onPress={() =>
                setExercise({
                  ...exercise,
                  secondaryBodyParts: exercise.secondaryBodyParts.includes(part)
                    ? exercise.secondaryBodyParts.filter((x) => x !== part)
                    : [...exercise.secondaryBodyParts, part],
                })
              }
            />
          ))}
      </View>
      <Text style={s.eyebrow}>EQUIPMENT</Text>
      <View style={s.choices}>
        {equipmentOptions.map((option) => (
          <Choice
            key={option}
            label={option}
            selected={exercise.equipment.includes(option)}
            onPress={() =>
              setExercise({
                ...exercise,
                equipment: exercise.equipment.includes(option)
                  ? exercise.equipment.filter((x) => x !== option)
                  : [...exercise.equipment, option],
              })
            }
          />
        ))}
      </View>
      <Text style={s.eyebrow}>TRACKING TYPE</Text>
      <View style={s.choices}>
        {(Object.keys(trackingLabels) as TrackingType[]).map((type) => (
          <Choice
            key={type}
            label={trackingLabels[type]}
            selected={exercise.trackingType === type}
            onPress={() => setExercise({ ...exercise, trackingType: type })}
          />
        ))}
      </View>
      <Text style={s.eyebrow}>CATEGORY</Text>
      <View style={s.choices}>
        {categories.map((category) => (
          <Choice
            key={category}
            label={category}
            selected={exercise.category === category}
            onPress={() => setExercise({ ...exercise, category })}
          />
        ))}
      </View>
      <ErrorText message={error} />
      {busy ? (
        <Text style={s.muted}>Saving…</Text>
      ) : (
        <Button label="SAVE EXERCISE" onPress={() => void save()} />
      )}
      <Action label="CANCEL" onPress={onCancel} />
    </View>
  );
}
