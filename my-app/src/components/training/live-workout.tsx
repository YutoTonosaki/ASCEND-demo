import { useLocalization } from "@/localization";
import { useSeasons } from "@/seasons/provider";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Text, View } from "react-native";
import { useIsFocused } from "expo-router";
import { Button, Panel, s } from "@/components/ui/primitives";
import { Action, Counter, ErrorText, t } from "./controls";
import { useSessions } from "@/sessions/provider";
import { position, prefill } from "@/sessions/domain";
import { targetLabel } from "@/training/plans";
import type { ActualResult, WorkoutSession } from "@/types/session";
import type { SetTarget } from "@/types/training";
import { colors } from "@/config/theme";
import { useGrowthPresentation } from "@/presentation/provider";
import { useRewards } from "@/rewards/provider";
import { WorkoutRewards } from "@/components/rewards/rewards";
export const durationLabel = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
export const actualLabel = (actual: ActualResult) =>
  targetLabel({ ...actual, id: "display" });
export function LiveWorkout({
  session,
  onComplete,
}: {
  session: WorkoutSession;
  onComplete: (id: string) => void;
}) {
  const l = useLocalization();
  const { tr } = useLocalization();
  const { commit } = useSessions();
  const { record: recordSeason } = useSeasons();
  const presentGrowth = useGrowthPresentation();
  const { request: requestRewards } = useRewards();
  const current = position(session);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef(false);
  const nextTapAt = useRef(0);
  const focused = useIsFocused();
  const deadline = session.restUntil;
  useEffect(() => {
    if (!deadline || !focused) return;
    const tick = () => setNow(Date.now());
    tick();
    const timer = setInterval(tick, 250);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") tick();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [deadline, focused]);
  useEffect(() => {
    if (
      !deadline ||
      !focused ||
      now < Date.parse(deadline) ||
      lock.current ||
      error
    )
      return;
    lock.current = true;
    setBusy(true);
    commit({ type: "rest", sessionId: session.id, deadline, skip: false })
      .catch((e) =>
        setError(
          e instanceof Error ? e.message : "Could not save. Please retry.",
        ),
      )
      .finally(() => {
        lock.current = false;
        setBusy(false);
      });
  }, [now, deadline, focused, commit, session.id, error]);
  const onConfirm = useCallback(
    async (actual: ActualResult) => {
      if (lock.current || !current || Date.now() < nextTapAt.current) return;
      nextTapAt.current = Date.now() + 600;
      lock.current = true;
      setBusy(true);
      setError(null);
      try {
        const next = await commit({
          type: "confirm",
          sessionId: session.id,
          setId: current.set.id,
          actual,
        });
        const completed = next.completed.find((x) => x.id === session.id);
        if (completed) {
          onComplete(session.id);
          requestRewards(completed, () => presentGrowth(session.id));
          recordSeason(completed, next);
        }
      } catch (e) {
        setError(
          e instanceof Error ? e.message : "Could not save. Please retry.",
        );
      } finally {
        lock.current = false;
        setBusy(false);
      }
    },
    [
      current,
      commit,
      session.id,
      onComplete,
      presentGrowth,
      requestRewards,
      recordSeason,
    ],
  );
  async function skipRest() {
    if (lock.current || !deadline) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      await commit({
        type: "rest",
        sessionId: session.id,
        deadline,
        skip: true,
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Please retry.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (!current) return null;
  const completed = session.exercises
    .flatMap((e) => e.sets)
    .filter((set) => set.result !== null).length;
  const total = session.exercises.reduce((sum, e) => sum + e.sets.length, 0);
  return (
    <>
      <Text style={t.name}>{session.name}</Text>
      <Text style={s.fine}>
        {completed} / {total} {tr("train.setsCompleted")}
      </Text>
      <ErrorText message={error} />
      {deadline ? (
        <Panel title={tr("train.rest")}>
          <Text
            accessibilityLabel={tr("train.restRemaining")}
            style={{
              fontSize: 56,
              fontWeight: "800",
              color: colors.text,
              fontVariant: ["tabular-nums"],
            }}
          >
            {durationLabel(
              Math.max(0, Math.ceil((Date.parse(deadline) - now) / 1000)),
            )}
          </Text>
          <Text style={s.eyebrow}>{tr("common.next")}</Text>
          <Text style={t.name}>
            {l.exercise(current.entry.exercise)} {tr("train.setNumber")}{" "}
            {current.setIndex + 1}
          </Text>
          <Action
            label={tr("train.skipRest")}
            disabled={busy}
            onPress={() => void skipRest()}
          />
        </Panel>
      ) : (
        <Panel
          title={l.exercise(current.entry.exercise)}
          kicker={tr("train.exercisePosition", {
            current: current.exerciseIndex + 1,
            total: session.exercises.length,
          })}
        >
          <Text style={s.eyebrow}>
            {tr("train.set")} {current.setIndex + 1} /{" "}
            {current.entry.sets.length}
          </Text>
          <Text style={s.fine}>{tr("train.target")}</Text>
          <Text
            style={{ color: colors.bronze, fontSize: 28, fontWeight: "800" }}
          >
            {l.target(current.set.target)}
          </Text>
          <ActualInput
            key={current.set.id}
            target={current.set.target}
            busy={busy}
            onConfirm={onConfirm}
          />
        </Panel>
      )}
      {session.exercises.some((e) => e.sets.some((set) => set.result)) && (
        <Panel title={tr("train.confirmed")}>
          {session.exercises.map((entry) => (
            <View key={entry.id} style={{ gap: 6 }}>
              {entry.sets.map((set, i) =>
                set.result ? (
                  <View key={set.id} style={t.item}>
                    <Text style={t.name}>
                      ✓ {l.exercise(entry.exercise)} {tr("train.setNumber")}{" "}
                      {i + 1} {tr("train.completeSuffix")}
                    </Text>
                    <Text style={s.fine}>
                      {tr("train.targetLabel")} {l.target(set.target)}
                    </Text>
                    <Text style={s.muted}>
                      {tr("train.actualLabel")} {l.target(set.result.actual)}
                    </Text>
                  </View>
                ) : null,
              )}
            </View>
          ))}
        </Panel>
      )}
      <Text style={s.fine}>{tr("train.confirmedNote")}</Text>
    </>
  );
}
function ActualInput({
  target,
  busy,
  onConfirm,
}: {
  target: SetTarget;
  busy: boolean;
  onConfirm: (actual: ActualResult) => Promise<void>;
}) {
  const { tr } = useLocalization();
  const [actual, setActual] = useState(() => prefill(target));
  const submitted = useRef(false);
  async function submit() {
    if (submitted.current || busy) return;
    submitted.current = true;
    await onConfirm(actual);
    submitted.current = false;
  }
  return (
    <View style={{ gap: 12 }}>
      <Text style={s.eyebrow}>{tr("train.actual")}</Text>
      {actual.type === "time" ? (
        <Counter
          label={tr("train.actualSeconds")}
          displayLabel={tr("units.seconds")}
          value={actual.seconds}
          min={0}
          max={Number.MAX_SAFE_INTEGER}
          step={5}
          onChange={(seconds) => setActual({ ...actual, seconds })}
        />
      ) : (
        <>
          <Counter
            label={tr("train.actualReps")}
            displayLabel={tr("units.reps")}
            value={actual.reps}
            min={0}
            max={Number.MAX_SAFE_INTEGER}
            onChange={(reps) => setActual({ ...actual, reps })}
          />
          {actual.type === "weight_reps" && (
            <Counter
              label={tr("train.actualKg")}
              displayLabel="kg"
              value={actual.weightKg}
              min={0}
              max={Number.MAX_SAFE_INTEGER}
              step={2.5}
              onChange={(weightKg) => setActual({ ...actual, weightKg })}
            />
          )}
        </>
      )}
      {busy ? (
        <Action label={tr("train.savingSet")} disabled onPress={() => {}} />
      ) : (
        <Button label={tr("train.completeSet")} onPress={() => void submit()} />
      )}
    </View>
  );
}
export function SessionSummary({
  session,
  onFinish,
}: {
  session: WorkoutSession;
  onFinish: () => void;
}) {
  const l = useLocalization();
  const { tr } = useLocalization();
  const total = session.exercises.reduce((n, e) => n + e.sets.length, 0);
  return (
    <>
      <Panel title={session.name} kicker={tr("common.completed")}>
        <Text style={s.muted}>{l.date(session.completedAt!, true)}</Text>
        <Text style={s.sectionTitle}>
          {durationLabel(
            Math.max(
              0,
              (Date.parse(session.completedAt!) -
                Date.parse(session.startedAt)) /
                1000,
            ),
          )}
        </Text>
        <Text style={s.fine}>{tr("train.durationNote")}</Text>
        <Text style={s.muted}>
          {session.exercises.length} {tr("train.exercisesSeparator")} {total} /{" "}
          {total} {tr("train.setsCompleted")}
        </Text>
      </Panel>
      <WorkoutRewards sessionId={session.id} />
      {session.exercises.map((entry) => (
        <Panel key={entry.id} title={l.exercise(entry.exercise)}>
          {entry.sets.map((set, i) => (
            <View key={set.id} style={t.item}>
              <Text style={s.eyebrow}>
                {tr("train.set")} {i + 1} {tr("train.completedSeparator")}
              </Text>
              <Text style={s.fine}>
                {tr("train.targetLabel")} {l.target(set.target)}
              </Text>
              <Text style={t.name}>
                {tr("train.actualLabel")}{" "}
                {set.result
                  ? l.target(set.result.actual)
                  : tr("common.notRecorded")}
              </Text>
            </View>
          ))}
        </Panel>
      ))}
      <Button label={tr("common.finish")} onPress={onFinish} />
    </>
  );
}
