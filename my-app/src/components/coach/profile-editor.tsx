import { useLocalization } from "@/localization";
import { useRef, useState } from "react";
import { Text, View } from "react-native";
import { Choice, Panel, s } from "@/components/ui/primitives";
import {
  Action,
  Counter,
  ErrorText,
  Field,
} from "@/components/training/controls";
import { useCoach } from "@/coach/provider";
import {
  copyProfile,
  defaultProfile,
  profilePreferences,
} from "@/coach/profile";
import { coachConfig, experienceLabels, goalLabels } from "@/config/coach";
import { standardExercises } from "@/data/exercises";
import { copyExercise } from "@/training/plans";
import { equipmentCompatible } from "@/coach/engine";
import { CoachPreferencesForm } from "./preferences";
import type { BaselineAssessment, TrainingProfile } from "@/types/coach";
import type { Exercise } from "@/types/training";
export function ProfileEditor({
  onDone,
  onCancel,
}: {
  onDone: () => void;
  onCancel: () => void;
}) {
  const { tr } = useLocalization();
  const l = useLocalization();
  const { data, save } = useCoach();
  const [profile, setProfile] = useState<TrainingProfile>(() =>
    data?.profile
      ? copyProfile(data.profile)
      : defaultProfile(new Date().toISOString()),
  );
  const [height, setHeight] = useState(
    profile.heightCm === null ? "" : String(profile.heightCm),
  );
  const [weight, setWeight] = useState(
    profile.weightKg === null ? "" : String(profile.weightKg),
  );
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState<string | null>(null);
  function basicNext() {
    const h = height.trim() ? Number(height.replace(",", ".")) : null;
    const w = weight.trim() ? Number(weight.replace(",", ".")) : null;
    if (
      (h !== null && (!Number.isFinite(h) || h < 50 || h > 300)) ||
      (w !== null && (!Number.isFinite(w) || w < 10 || w > 500))
    ) {
      setError(
        "Enter height from 50–300 cm and weight from 10–500 kg, or leave them blank.",
      );
      return;
    }
    setProfile({ ...profile, heightCm: h, weightKg: w });
    setError(null);
    setStep(2);
  }
  async function finish(skipBaseline = false) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setError(null);
    try {
      await save({
        ...profile,
        baselineAssessments: skipBaseline ? [] : profile.baselineAssessments,
        updatedAt: new Date().toISOString(),
      });
      onDone();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not save profile. Please retry.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Text style={s.eyebrow}>
        {tr("profile.step")} {step} / 3
      </Text>
      <ErrorText message={error} />
      {step === 1 && (
        <>
          <Text style={s.muted}>{tr("profile.note")}</Text>
          <Field
            label={tr("profile.height")}
            value={height}
            onChange={setHeight}
            placeholder={tr("profile.notProvided")}
            maxLength={8}
          />
          <Field
            label={tr("profile.weight")}
            value={weight}
            onChange={setWeight}
            placeholder={tr("profile.notProvided")}
            maxLength={8}
          />
          <Text style={s.eyebrow}>{tr("profile.experience")}</Text>
          <View style={s.choices}>
            {(
              Object.keys(experienceLabels) as (keyof typeof experienceLabels)[]
            ).map((key) => (
              <Choice
                key={key}
                label={l.display(experienceLabels[key])}
                selected={profile.experienceLevel === key}
                onPress={() => setProfile({ ...profile, experienceLevel: key })}
              />
            ))}
          </View>
          <Text style={s.eyebrow}>{tr("profile.goal")}</Text>
          <View style={s.choices}>
            {(Object.keys(goalLabels) as (keyof typeof goalLabels)[]).map(
              (key) => (
                <Choice
                  key={key}
                  label={l.display(goalLabels[key])}
                  selected={profile.primaryGoal === key}
                  onPress={() => setProfile({ ...profile, primaryGoal: key })}
                />
              ),
            )}
          </View>
          <Action label={tr("profile.nextEnvironment")} onPress={basicNext} />
        </>
      )}
      {step === 2 && (
        <>
          <CoachPreferencesForm
            value={profilePreferences(profile)}
            onChange={(v) =>
              setProfile({
                ...profile,
                preferredLocation: v.location,
                availableEquipment: v.equipment,
                preferredDurationMinutes: v.durationMinutes,
                preferredExerciseCount: v.exerciseCount,
              })
            }
          />
          <Text style={s.eyebrow}>{tr("profile.days")}</Text>
          <View style={s.choices}>
            <Choice
              label={tr("profile.noPreference")}
              selected={profile.preferredTrainingDaysPerWeek === null}
              onPress={() =>
                setProfile({ ...profile, preferredTrainingDaysPerWeek: null })
              }
            />
            {[1, 2, 3, 4, 5, 6, 7].map((days) => (
              <Choice
                key={days}
                label={`${days}`}
                selected={profile.preferredTrainingDaysPerWeek === days}
                onPress={() =>
                  setProfile({ ...profile, preferredTrainingDaysPerWeek: days })
                }
              />
            ))}
          </View>
          <Action
            label={tr("profile.nextBaseline")}
            onPress={() => setStep(3)}
          />
          <Action label={tr("profile.previous")} onPress={() => setStep(1)} />
        </>
      )}
      {step === 3 && (
        <>
          <Text style={s.muted}>{tr("profile.baselineNote")}</Text>
          <Text style={s.fine}>{tr("profile.safety")}</Text>
          {standardExercises
            .filter(
              (e) =>
                coachConfig.baselineIds.some((id) => id === e.id) &&
                equipmentCompatible(e, profile.availableEquipment),
            )
            .map((exercise) => (
              <BaselineInput
                key={exercise.id}
                exercise={exercise}
                existing={profile.baselineAssessments.find(
                  (b) => b.exercise.id === exercise.id,
                )}
                onChange={(baseline) =>
                  setProfile({
                    ...profile,
                    baselineAssessments: [
                      ...profile.baselineAssessments.filter(
                        (b) => b.exercise.id !== exercise.id,
                      ),
                      ...(baseline ? [baseline] : []),
                    ],
                  })
                }
              />
            ))}
          <Action
            label={tr("profile.save")}
            disabled={busy}
            onPress={() => void finish()}
          />
          <Action
            label={tr("profile.skipSave")}
            disabled={busy}
            onPress={() => void finish(true)}
          />
          <Action
            label={tr("profile.previous")}
            disabled={busy}
            onPress={() => setStep(2)}
          />
        </>
      )}
      <Action
        label={data?.profile ? tr("profile.cancel") : tr("coach.skip")}
        disabled={busy}
        onPress={onCancel}
      />
    </>
  );
}
function BaselineInput({
  exercise,
  existing,
  onChange,
}: {
  exercise: Exercise;
  existing?: BaselineAssessment;
  onChange: (baseline: BaselineAssessment | null) => void;
}) {
  const l = useLocalization();
  const { tr } = useLocalization();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(() =>
    existing
      ? existing.actual.type === "time"
        ? existing.actual.seconds
        : existing.actual.reps
      : 0,
  );
  const [source, setSource] = useState<BaselineAssessment["source"]>(
    existing?.source ?? "known",
  );
  return (
    <Panel title={l.exercise(exercise)}>
      {editing ? (
        <>
          <View style={s.choices}>
            <Choice
              label={tr("profile.known")}
              selected={source === "known"}
              onPress={() => setSource("known")}
            />
            <Choice
              label={tr("profile.now")}
              selected={source === "performed"}
              onPress={() => setSource("performed")}
            />
          </View>
          <Counter
            label={tr("profile.baselineName", { name: l.exercise(exercise) })}
            displayLabel={
              exercise.trackingType === "time"
                ? tr("units.seconds")
                : tr("units.reps")
            }
            value={value}
            min={0}
            max={exercise.trackingType === "time" ? 7200 : 999}
            onChange={setValue}
          />
          <Action
            label={tr("profile.confirmBaseline", {
              name: l.exercise(exercise),
            })}
            onPress={() => {
              onChange({
                exercise: copyExercise(exercise),
                actual:
                  exercise.trackingType === "time"
                    ? { type: "time", seconds: value }
                    : { type: "reps", reps: value },
                source,
                recordedAt: new Date().toISOString(),
              });
              setEditing(false);
            }}
          />
          <Action
            label={tr("profile.skipBaseline", { name: l.exercise(exercise) })}
            onPress={() => {
              onChange(null);
              setEditing(false);
            }}
          />
        </>
      ) : (
        <>
          <Text style={s.fine}>
            {existing
              ? tr("profile.recorded", { value: l.target(existing.actual) })
              : tr("profile.notAssessed")}
          </Text>
          <Action
            label={tr("profile.editBaseline", {
              action: existing ? tr("common.edit") : tr("common.add"),
              name: l.exercise(exercise),
            })}
            onPress={() => setEditing(true)}
          />
          {existing && (
            <Action
              label={tr("profile.removeBaseline", {
                name: l.exercise(exercise),
              })}
              onPress={() => onChange(null)}
            />
          )}
        </>
      )}
    </Panel>
  );
}
