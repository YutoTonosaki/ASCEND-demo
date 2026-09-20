import { useRef, useState } from "react";
import { Text, View } from "react-native";
import { Panel, Choice, s } from "@/components/ui/primitives";
import {
  Action,
  Confirm,
  ErrorText,
  Field,
  Sheet,
} from "@/components/training/controls";
import { useCoach } from "@/coach/provider";
import { useTraining } from "@/training/provider";
import { useSessions } from "@/sessions/provider";
import {
  generateWorkoutRecommendation,
  recommendationToPlan,
} from "@/coach/engine";
import { defaultProfile, profilePreferences } from "@/coach/profile";
import { targetLabel } from "@/training/plans";
import { trainingConfig } from "@/config/training";
import type { CoachPreferences, WorkoutRecommendation } from "@/types/coach";
import type { WorkoutPlan } from "@/types/training";
import { ProfileEditor } from "./profile-editor";
import { CoachPreferencesForm } from "./preferences";
export function CoachWorkspace({
  onManual,
  onDraft,
  onSaved,
}: {
  onManual: () => void;
  onDraft: (plan: WorkoutPlan) => void;
  onSaved: (plan: WorkoutPlan) => void;
}) {
  const coach = useCoach();
  const training = useTraining();
  const sessions = useSessions();
  const [editing, setEditing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [preferences, setPreferences] = useState<CoachPreferences | null>(null);
  const [customizing, setCustomizing] = useState(false);
  const [recommendation, setRecommendation] =
    useState<WorkoutRecommendation | null>(null);
  const [loadText, setLoadText] = useState<Record<string, string>>({});
  const [confirmedLoads, setConfirmedLoads] = useState<Record<string, number>>(
    {},
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  function generate() {
    setError(null);
    setLoadText({});
    setConfirmedLoads({});
    setRecommendation(
      generateWorkoutRecommendation(
        coach.data?.profile ?? null,
        training.library,
        sessions.data?.completed ?? null,
        preferences,
        new Date().toISOString(),
      ),
    );
    setCustomizing(false);
  }
  async function accept(customize: boolean) {
    if (lock.current || !recommendation) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const plan = recommendationToPlan(
        recommendation,
        training.library,
        confirmedLoads,
      );
      if (customize) onDraft(plan);
      else {
        await training.commit({ type: "saveWorkout", workout: plan });
        onSaved(plan);
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not prepare workout. Please retry.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function customizeToday() {
    setPreferences(
      preferences ??
        profilePreferences(
          coach.data?.profile ?? defaultProfile(new Date().toISOString()),
        ),
    );
    setCustomizing(true);
    setRecommendation(null);
  }
  const unknownLoads =
    recommendation?.status === "ready"
      ? recommendation.exercises.filter((entry) =>
          entry.targets.some(
            (target) =>
              target.type === "weight_reps" && target.weightKg === null,
          ),
        )
      : [];
  const needsLoad = unknownLoads.some(
    (entry) => !Object.hasOwn(confirmedLoads, entry.exercise.id),
  );
  return (
    <>
      <ErrorText message={error} />
      {!coach.data ? (
        <Panel title="TRAINING PROFILE">
          <ErrorText message={coach.error} />
          {coach.error ? (
            <>
              <Action
                label="RETRY PROFILE"
                onPress={() => void coach.retry()}
              />
              <Action
                label="RESET COACH PROFILE"
                onPress={() => setResetting(true)}
              />
            </>
          ) : (
            <Text style={s.muted}>Loading preferences…</Text>
          )}
        </Panel>
      ) : !coach.data.profile && !recommendation ? (
        <Panel title="MAKE IT YOUR TRAINING">
          <Text style={s.muted}>
            Set up a few preferences and an optional starting reference. Manual
            workouts are always available.
          </Text>
          <Action
            label="SET UP YOUR PROFILE"
            onPress={() => setEditing(true)}
          />
          <Action label="TRY WITH DEFAULTS" onPress={generate} />
          <Action label="SKIP FOR NOW" onPress={onManual} />
        </Panel>
      ) : recommendation?.status !== "ready" ? (
        <>
          <Panel title="TODAY'S TRAINING">
            <Text style={s.muted}>
              A short proposal from your preferences and confirmed training.
            </Text>
            <Action
              label="GENERATE WORKOUT"
              disabled={busy}
              onPress={generate}
            />
            <Action label="CUSTOMIZE TODAY" onPress={customizeToday} />
            <Action
              label="EDIT TRAINING PROFILE"
              onPress={() => setEditing(true)}
            />
          </Panel>
        </>
      ) : null}
      {customizing && preferences && (
        <Panel title="JUST FOR TODAY">
          <Text style={s.fine}>
            These choices do not change your saved profile.
          </Text>
          <CoachPreferencesForm
            focus
            value={preferences}
            onChange={setPreferences}
          />
          {training.library.some((e) => e.isCustom) && (
            <>
              <Text style={s.eyebrow}>ALLOW FAMILIAR CUSTOM EXERCISES</Text>
              <Text style={s.fine}>
                Difficulty is unknown. Select only movements you know and want
                to consider.
              </Text>
              <View style={s.choices}>
                {training.library
                  .filter((e) => e.isCustom)
                  .map((exercise) => (
                    <Choice
                      key={exercise.id}
                      label={exercise.name}
                      selected={preferences.customExerciseIds.includes(
                        exercise.id,
                      )}
                      onPress={() =>
                        setPreferences({
                          ...preferences,
                          customExerciseIds:
                            preferences.customExerciseIds.includes(exercise.id)
                              ? preferences.customExerciseIds.filter(
                                  (id) => id !== exercise.id,
                                )
                              : [...preferences.customExerciseIds, exercise.id],
                        })
                      }
                    />
                  ))}
              </View>
            </>
          )}
          <Action label="GENERATE WITH THESE CHOICES" onPress={generate} />
          <Action
            label="USE PROFILE DEFAULTS"
            onPress={() => {
              setPreferences(null);
              setCustomizing(false);
              setRecommendation(null);
            }}
          />
        </Panel>
      )}
      {recommendation?.status === "blocked" && (
        <Panel title="ADJUST YOUR PLAN">
          <Text style={s.muted}>{recommendation.reason}</Text>
          <Action label="CREATE MANUAL WORKOUT" onPress={onManual} />
        </Panel>
      )}
      {recommendation?.status === "ready" && (
        <>
          <Panel title="REVIEW YOUR WORKOUT">
            <Text style={s.muted}>
              {recommendation.exercises.length}{" "}
              {recommendation.exercises.length === 1 ? "exercise" : "exercises"}{" "}
              · approximately {Math.ceil(recommendation.estimatedSeconds / 60)}{" "}
              min
            </Text>
            {recommendation.explanations.map((explanation) => (
              <Text key={explanation} style={s.fine}>
                {explanation}
              </Text>
            ))}
            <Text style={s.fine}>
              Nothing is saved until you choose SAVE RECOMMENDATION or save in
              the workout builder.
            </Text>
          </Panel>
          {recommendation.exercises.map((entry) => (
            <Panel
              key={entry.exercise.id}
              title={entry.exercise.name}
              kicker={
                entry.evidence === "session"
                  ? "FROM COMPLETED TRAINING"
                  : entry.evidence === "baseline"
                    ? "FROM YOUR BASELINE"
                    : entry.evidence === "confirmation"
                      ? "CHOOSE STARTING LOAD"
                      : "INITIAL SUGGESTION"
              }
            >
              <Text style={s.muted}>
                {entry.targets
                  .map((target) =>
                    target.type === "weight_reps"
                      ? `${target.weightKg === null ? "Choose load" : `${target.weightKg} kg`} × ${target.reps}`
                      : targetLabel({ ...target, id: "display" }),
                  )
                  .join(" / ")}
              </Text>
              <Text style={s.fine}>
                {entry.exercise.primaryBodyParts.join(", ")} ·{" "}
                {entry.exercise.equipment.join(", ")} · Rest {entry.restSeconds}{" "}
                sec
              </Text>
              <Text style={s.fine}>{entry.explanation}</Text>
              {unknownLoads.some(
                (e) => e.exercise.id === entry.exercise.id,
              ) && (
                <>
                  <Field
                    label={`STARTING KG · ${entry.exercise.name}`}
                    value={loadText[entry.exercise.id] ?? ""}
                    maxLength={12}
                    placeholder="Choose a comfortable load"
                    onChange={(value) => {
                      setLoadText({ ...loadText, [entry.exercise.id]: value });
                      const next = { ...confirmedLoads };
                      delete next[entry.exercise.id];
                      setConfirmedLoads(next);
                    }}
                  />
                  <Action
                    label={`CONFIRM LOAD · ${entry.exercise.name}`}
                    onPress={() => {
                      const text = loadText[entry.exercise.id] ?? "";
                      const value = Number(text.replace(",", "."));
                      if (
                        !text.trim() ||
                        !Number.isFinite(value) ||
                        value < 0 ||
                        value > trainingConfig.maxWeightKg
                      ) {
                        setError(
                          "Enter a nonnegative starting load within the workout editor's range.",
                        );
                        return;
                      }
                      setError(null);
                      setConfirmedLoads({
                        ...confirmedLoads,
                        [entry.exercise.id]: value,
                      });
                    }}
                  />
                  {Object.hasOwn(confirmedLoads, entry.exercise.id) && (
                    <Text style={s.fine}>
                      Load confirmed · {confirmedLoads[entry.exercise.id]} kg
                    </Text>
                  )}
                </>
              )}
            </Panel>
          ))}
          <Action
            label="SAVE RECOMMENDATION"
            disabled={busy || needsLoad || !training.data}
            onPress={() => void accept(false)}
          />
          <Action
            label="CUSTOMIZE WORKOUT"
            disabled={busy || needsLoad || !training.data}
            onPress={() => void accept(true)}
          />
          <Action label="CUSTOMIZE TODAY" onPress={customizeToday} />
          <Action
            label="EDIT TRAINING PROFILE"
            onPress={() => setEditing(true)}
          />
          <Text style={s.fine}>
            You can change the focus or equipment to get a different proposal.
            Resting today is also a valid choice.
          </Text>
        </>
      )}
      {editing && (
        <Sheet title="TRAINING PROFILE" onClose={() => setEditing(false)}>
          <ProfileEditor
            onDone={() => {
              setEditing(false);
              setRecommendation(null);
              setPreferences(null);
              setCustomizing(false);
            }}
            onCancel={() => setEditing(false)}
          />
        </Sheet>
      )}
      {resetting && (
        <Confirm
          title="RESET COACH PROFILE?"
          message="Reset preferences and baseline entries only. A raw backup is saved first. Workouts and session history remain unchanged."
          onCancel={() => setResetting(false)}
          onConfirm={() => {
            setResetting(false);
            setRecommendation(null);
            setPreferences(null);
            void coach.reset();
          }}
        />
      )}
    </>
  );
}
