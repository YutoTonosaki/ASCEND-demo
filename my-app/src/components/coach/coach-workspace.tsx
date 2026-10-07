import { useLocalization } from "@/localization";
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
  const l = useLocalization();
  const { tr } = useLocalization();
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
        <Panel title={tr("coach.profile")}>
          <ErrorText message={coach.error} />
          {coach.error ? (
            <>
              <Action
                label={tr("coach.retry")}
                onPress={() => void coach.retry()}
              />
              <Action
                label={tr("coach.reset")}
                onPress={() => setResetting(true)}
              />
            </>
          ) : (
            <Text style={s.muted}>{tr("coach.loading")}</Text>
          )}
        </Panel>
      ) : !coach.data.profile && !recommendation ? (
        <Panel title={tr("coach.setupTitle")}>
          <Text style={s.muted}>{tr("coach.setupNote")}</Text>
          <Action label={tr("coach.setup")} onPress={() => setEditing(true)} />
          <Action label={tr("coach.defaults")} onPress={generate} />
          <Action label={tr("coach.skip")} onPress={onManual} />
        </Panel>
      ) : recommendation?.status !== "ready" ? (
        <>
          <Panel title={tr("coach.today")}>
            <Text style={s.muted}>{tr("coach.todayNote")}</Text>
            <Action
              label={tr("coach.generate")}
              disabled={busy}
              onPress={generate}
            />
            <Action
              label={tr("coach.customizeToday")}
              onPress={customizeToday}
            />
            <Action
              label={tr("coach.editProfile")}
              onPress={() => setEditing(true)}
            />
          </Panel>
        </>
      ) : null}
      {customizing && preferences && (
        <Panel title={tr("coach.justToday")}>
          <Text style={s.fine}>{tr("coach.temporaryNote")}</Text>
          <CoachPreferencesForm
            focus
            value={preferences}
            onChange={setPreferences}
          />
          {training.library.some((e) => e.isCustom) && (
            <>
              <Text style={s.eyebrow}>{tr("coach.allowCustom")}</Text>
              <Text style={s.fine}>{tr("coach.customNote")}</Text>
              <View style={s.choices}>
                {training.library
                  .filter((e) => e.isCustom)
                  .map((exercise) => (
                    <Choice
                      key={exercise.id}
                      label={l.exercise(exercise)}
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
          <Action label={tr("coach.generateChoices")} onPress={generate} />
          <Action
            label={tr("coach.useDefaults")}
            onPress={() => {
              setPreferences(null);
              setCustomizing(false);
              setRecommendation(null);
            }}
          />
        </Panel>
      )}
      {recommendation?.status === "blocked" && (
        <Panel title={tr("coach.adjust")}>
          <Text style={s.muted}>{l.display(recommendation.reason)}</Text>
          <Action label={tr("coach.manual")} onPress={onManual} />
        </Panel>
      )}
      {recommendation?.status === "ready" && (
        <>
          <Panel title={tr("coach.review")}>
            <Text style={s.muted}>
              {recommendation.exercises.length}{" "}
              {recommendation.exercises.length === 1
                ? tr("units.exercise")
                : tr("units.exercisePlural")}{" "}
              {tr("coach.approximately")}{" "}
              {Math.ceil(recommendation.estimatedSeconds / 60)}{" "}
              {tr("units.min")}
            </Text>
            {recommendation.explanations.map((explanation) => (
              <Text key={explanation} style={s.fine}>
                {l.display(explanation)}
              </Text>
            ))}
            <Text style={s.fine}>{tr("coach.saveNote")}</Text>
          </Panel>
          {recommendation.exercises.map((entry) => (
            <Panel
              key={entry.exercise.id}
              title={l.exercise(entry.exercise)}
              kicker={
                entry.evidence === "session"
                  ? tr("coach.fromSession")
                  : entry.evidence === "baseline"
                    ? tr("coach.fromBaseline")
                    : entry.evidence === "confirmation"
                      ? tr("coach.chooseLoad")
                      : tr("coach.initial")
              }
            >
              <Text style={s.muted}>
                {entry.targets
                  .map((target) =>
                    target.type === "weight_reps"
                      ? `${target.weightKg === null ? tr("coach.load") : `${target.weightKg} kg`} × ${target.reps}`
                      : l.target(target),
                  )
                  .join(" / ")}
              </Text>
              <Text style={s.fine}>
                {entry.exercise.primaryBodyParts.map(l.display).join(", ")} ·{" "}
                {entry.exercise.equipment.map(l.display).join(", ")}{" "}
                {tr("coach.rest")} {entry.restSeconds} {tr("units.sec")}
              </Text>
              <Text style={s.fine}>{l.display(entry.explanation)}</Text>
              {unknownLoads.some(
                (e) => e.exercise.id === entry.exercise.id,
              ) && (
                <>
                  <Field
                    label={tr("coach.startKg", {
                      name: l.exercise(entry.exercise),
                    })}
                    value={loadText[entry.exercise.id] ?? ""}
                    maxLength={12}
                    placeholder={tr("coach.comfortableLoad")}
                    onChange={(value) => {
                      setLoadText({ ...loadText, [entry.exercise.id]: value });
                      const next = { ...confirmedLoads };
                      delete next[entry.exercise.id];
                      setConfirmedLoads(next);
                    }}
                  />
                  <Action
                    label={tr("coach.confirmLoad", {
                      name: l.exercise(entry.exercise),
                    })}
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
                      {tr("coach.loadConfirmed")}{" "}
                      {confirmedLoads[entry.exercise.id]} kg
                    </Text>
                  )}
                </>
              )}
            </Panel>
          ))}
          <Action
            label={tr("coach.save")}
            disabled={busy || needsLoad || !training.data}
            onPress={() => void accept(false)}
          />
          <Action
            label={tr("coach.customize")}
            disabled={busy || needsLoad || !training.data}
            onPress={() => void accept(true)}
          />
          <Action label={tr("coach.customizeToday")} onPress={customizeToday} />
          <Action
            label={tr("coach.editProfile")}
            onPress={() => setEditing(true)}
          />
          <Text style={s.fine}>{tr("coach.restNote")}</Text>
        </>
      )}
      {editing && (
        <Sheet title={tr("coach.profile")} onClose={() => setEditing(false)}>
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
          title={tr("coach.resetQuestion")}
          message={tr("coach.resetDetail")}
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
