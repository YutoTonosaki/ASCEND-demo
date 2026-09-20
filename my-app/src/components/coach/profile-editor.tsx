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
      <Text style={s.eyebrow}>TRAINING PROFILE · {step} / 3</Text>
      <ErrorText message={error} />
      {step === 1 && (
        <>
          <Text style={s.muted}>
            A few preferences to make training easier. Measurements are optional
            and never used to guess your strength.
          </Text>
          <Field
            label="HEIGHT CM · OPTIONAL"
            value={height}
            onChange={setHeight}
            placeholder="Not provided"
            maxLength={8}
          />
          <Field
            label="WEIGHT KG · OPTIONAL"
            value={weight}
            onChange={setWeight}
            placeholder="Not provided"
            maxLength={8}
          />
          <Text style={s.eyebrow}>EXPERIENCE</Text>
          <View style={s.choices}>
            {(
              Object.keys(experienceLabels) as (keyof typeof experienceLabels)[]
            ).map((key) => (
              <Choice
                key={key}
                label={experienceLabels[key]}
                selected={profile.experienceLevel === key}
                onPress={() => setProfile({ ...profile, experienceLevel: key })}
              />
            ))}
          </View>
          <Text style={s.eyebrow}>PRIMARY GOAL</Text>
          <View style={s.choices}>
            {(Object.keys(goalLabels) as (keyof typeof goalLabels)[]).map(
              (key) => (
                <Choice
                  key={key}
                  label={goalLabels[key]}
                  selected={profile.primaryGoal === key}
                  onPress={() => setProfile({ ...profile, primaryGoal: key })}
                />
              ),
            )}
          </View>
          <Action label="NEXT · ENVIRONMENT" onPress={basicNext} />
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
          <Text style={s.eyebrow}>TRAINING DAYS PER WEEK · OPTIONAL</Text>
          <View style={s.choices}>
            <Choice
              label="No preference"
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
          <Action label="NEXT · OPTIONAL BASELINE" onPress={() => setStep(3)} />
          <Action label="PREVIOUS STEP" onPress={() => setStep(1)} />
        </>
      )}
      {step === 3 && (
        <>
          <Text style={s.muted}>
            Optional starting reference. Choose a familiar movement, or enter a
            result you already know. No maximum effort needed.
          </Text>
          <Text style={s.fine}>
            Stop if you feel pain, dizziness or unusual discomfort. Skip any
            movement you are not comfortable with. These entries do not create
            workout history or fitness scores.
          </Text>
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
            label="SAVE TRAINING PROFILE"
            disabled={busy}
            onPress={() => void finish()}
          />
          <Action
            label="SKIP ALL BASELINES & SAVE"
            disabled={busy}
            onPress={() => void finish(true)}
          />
          <Action
            label="PREVIOUS STEP"
            disabled={busy}
            onPress={() => setStep(2)}
          />
        </>
      )}
      <Action
        label={data?.profile ? "CANCEL PROFILE EDIT" : "SKIP FOR NOW"}
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
    <Panel title={exercise.name}>
      {editing ? (
        <>
          <View style={s.choices}>
            <Choice
              label="Known result"
              selected={source === "known"}
              onPress={() => setSource("known")}
            />
            <Choice
              label="Performed now"
              selected={source === "performed"}
              onPress={() => setSource("performed")}
            />
          </View>
          <Counter
            label={`${exercise.name} baseline`}
            displayLabel={exercise.trackingType === "time" ? "Seconds" : "Reps"}
            value={value}
            min={0}
            max={exercise.trackingType === "time" ? 7200 : 999}
            onChange={setValue}
          />
          <Action
            label={`CONFIRM BASELINE · ${exercise.name}`}
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
            label={`SKIP · ${exercise.name}`}
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
              ? `Recorded · ${existing.actual.type === "time" ? `${existing.actual.seconds} sec` : `${existing.actual.reps} reps`}`
              : "Not assessed"}
          </Text>
          <Action
            label={`${existing ? "EDIT" : "ADD"} BASELINE · ${exercise.name}`}
            onPress={() => setEditing(true)}
          />
          {existing && (
            <Action
              label={`REMOVE BASELINE · ${exercise.name}`}
              onPress={() => onChange(null)}
            />
          )}
        </>
      )}
    </Panel>
  );
}
