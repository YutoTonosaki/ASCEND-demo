import { useLocalization } from "@/localization";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Choice, s } from "@/components/ui/primitives";
import { Action, ErrorText, Field, Sheet, t } from "./controls";
import { ExerciseEditor } from "./exercise-editor";
import { bodyParts, equipmentOptions, trackingLabels } from "@/config/training";
import type { BodyArea } from "@/types/domain";
import type { Exercise, Equipment, TrackingType } from "@/types/training";
import { useTraining } from "@/training/provider";
export function ExercisePicker({
  onSelect,
  onClose,
}: {
  onSelect: (exercise: Exercise) => void;
  onClose: () => void;
}) {
 const l = useLocalization();
  const { tr } = useLocalization();
  const { data, library, commit } = useTraining();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(false);
  const [creating, setCreating] = useState(false);
  const [body, setBody] = useState<BodyArea | null>(null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [tracking, setTracking] = useState<TrackingType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const matches = library.filter(
    (e) =>
      (e.name.toLowerCase().includes(query.trim().toLowerCase()) || l.exercise(e).includes(query.trim())) &&
      (!body ||
        e.primaryBodyParts.includes(body) ||
        e.secondaryBodyParts.includes(body)) &&
      (!equipment || e.equipment.includes(equipment)) &&
      (!tracking || e.trackingType === tracking),
  );
  async function select(exercise: Exercise) {
    if (busy) return;
    setBusy(true);
    try {
      await commit({ type: "recent", id: exercise.id });
      onSelect(exercise);
    } catch {
      setError("Could not save your selection. Please retry.");
    } finally {
      setBusy(false);
    }
  }
  const recent = (data?.recentExerciseIds ?? []).flatMap((id) =>
    matches.filter((e) => e.id === id),
  );
  return (
    <Sheet
      title={creating ? tr("train.createExercise") : tr("exercise.add")}
      onClose={creating ? () => setCreating(false) : onClose}
    >
      {creating ? (
        <ExerciseEditor
          initialName={query}
          onCancel={() => setCreating(false)}
          onDone={(exercise) => {
            setCreating(false);
            setQuery(exercise.name);
            setBody(null);
            setEquipment(null);
            setTracking(null);
            void select(exercise);
          }}
        />
      ) : (
        <>
          <Field
            label={tr("exercise.search")}
            value={query}
            onChange={setQuery}
            placeholder={tr("exercise.searchPlaceholder")}
          />
          <Action
            label={
              filters
                ? tr("exercise.hideFilters")
                : tr("exercise.filters") + (body || equipment || tracking ? " · " + tr("season.active") : "")
            }
            onPress={() => setFilters(!filters)}
          />
          {filters && (
            <View style={{ gap: 10 }}>
              <Text style={s.eyebrow}>{tr("exercise.bodyPart")}</Text>
              <View style={s.choices}>
                {bodyParts.map((x) => (
                  <Choice
                    key={x}
                    label={l.display(x)}
                    selected={body === x}
                    onPress={() => setBody(body === x ? null : x)}
                  />
                ))}
              </View>
              <Text style={s.eyebrow}>{tr("exercise.equipment")}</Text>
              <View style={s.choices}>
                {equipmentOptions.map((x) => (
                  <Choice
                    key={x}
                    label={l.display(x)}
                    selected={equipment === x}
                    onPress={() => setEquipment(equipment === x ? null : x)}
                  />
                ))}
              </View>
              <Text style={s.eyebrow}>{tr("exercise.tracking")}</Text>
              <View style={s.choices}>
                {(Object.keys(trackingLabels) as TrackingType[]).map((x) => (
                  <Choice
                    key={x}
                    label={l.display(trackingLabels[x])}
                    selected={tracking === x}
                    onPress={() => setTracking(tracking === x ? null : x)}
                  />
                ))}
              </View>
              <Action
                label={tr("exercise.clearFilters")}
                onPress={() => {
                  setBody(null);
                  setEquipment(null);
                  setTracking(null);
                }}
              />
            </View>
          )}
          <ErrorText message={error} />
          {matches.length === 0 && (
            <Text style={s.muted}>{tr("exercise.none")}</Text>
          )}
          <Action
            label={tr("train.createExercisePlus")}
            onPress={() => setCreating(true)}
          />
          {[
            { title: "RECENT", items: recent },
            { title: "MY EXERCISES", items: matches.filter((e) => e.isCustom) },
            {
              title: "ALL EXERCISES",
              items: matches.filter((e) => !e.isCustom),
            },
          ].map((section) => (
            <View key={l.display(section.title)} style={{ gap: 4 }}>
              <Text accessibilityRole="header" style={s.eyebrow}>
                {l.display(section.title)}
              </Text>
              {section.items.length === 0 ? (
                <Text style={s.fine}>
                  {section.title === "RECENT"
                    ? tr("exercise.recentEmpty")
                    : tr("exercise.matchEmpty")}
                </Text>
              ) : (
                section.items.map((exercise) => (
                  <Pressable
                    key={exercise.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${l.exercise(exercise)}`}
                    disabled={busy}
                    onPress={() => void select(exercise)}
                    style={t.item}
                  >
                    <Text style={t.name}>{l.exercise(exercise)}</Text>
                    <Text style={s.fine}>
                      {exercise.primaryBodyParts.map(l.display).join(", ")} ·{" "}
                      {exercise.equipment.map(l.display).join(" / ")} ·{" "}
                      {l.display(trackingLabels[exercise.trackingType])}
                    </Text>
                  </Pressable>
                ))
              )}
            </View>
          ))}
        </>
      )}
    </Sheet>
  );
}
