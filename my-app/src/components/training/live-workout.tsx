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
  const { commit } = useSessions();
  const presentGrowth = useGrowthPresentation();
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
        if (next.completed.some((x) => x.id === session.id)) {
          onComplete(session.id);
          presentGrowth(session.id);
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
    [current, commit, session.id, onComplete, presentGrowth],
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
        {completed} / {total} sets completed
      </Text>
      <ErrorText message={error} />
      {deadline ? (
        <Panel title="REST">
          <Text
            accessibilityLabel="Rest remaining"
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
          <Text style={s.eyebrow}>NEXT</Text>
          <Text style={t.name}>
            {current.entry.exercise.name} · Set {current.setIndex + 1}
          </Text>
          <Action
            label="SKIP REST"
            disabled={busy}
            onPress={() => void skipRest()}
          />
        </Panel>
      ) : (
        <Panel
          title={current.entry.exercise.name}
          kicker={`EXERCISE ${current.exerciseIndex + 1} / ${session.exercises.length}`}
        >
          <Text style={s.eyebrow}>
            SET {current.setIndex + 1} / {current.entry.sets.length}
          </Text>
          <Text style={s.fine}>TARGET</Text>
          <Text
            style={{ color: colors.bronze, fontSize: 28, fontWeight: "800" }}
          >
            {targetLabel(current.set.target)}
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
        <Panel title="CONFIRMED SETS">
          {session.exercises.map((entry) => (
            <View key={entry.id} style={{ gap: 6 }}>
              {entry.sets.map((set, i) =>
                set.result ? (
                  <View key={set.id} style={t.item}>
                    <Text style={t.name}>
                      ✓ {entry.exercise.name} · Set {i + 1} complete
                    </Text>
                    <Text style={s.fine}>
                      Target · {targetLabel(set.target)}
                    </Text>
                    <Text style={s.muted}>
                      Actual · {actualLabel(set.result.actual)}
                    </Text>
                  </View>
                ) : null,
              )}
            </View>
          ))}
        </Panel>
      )}
      <Text style={s.fine}>
        Confirmed sets are saved. You can leave this screen and resume from
        TRAIN.
      </Text>
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
      <Text style={s.eyebrow}>ACTUAL</Text>
      {actual.type === "time" ? (
        <Counter
          label="Actual seconds"
          displayLabel="Seconds"
          value={actual.seconds}
          min={0}
          max={Number.MAX_SAFE_INTEGER}
          step={5}
          onChange={(seconds) => setActual({ ...actual, seconds })}
        />
      ) : (
        <>
          <Counter
            label="Actual reps"
            displayLabel="Reps"
            value={actual.reps}
            min={0}
            max={Number.MAX_SAFE_INTEGER}
            onChange={(reps) => setActual({ ...actual, reps })}
          />
          {actual.type === "weight_reps" && (
            <Counter
              label="Actual weight kg"
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
        <Action label="SAVING SET…" disabled onPress={() => {}} />
      ) : (
        <Button label="COMPLETE SET" onPress={() => void submit()} />
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
  const total = session.exercises.reduce((n, e) => n + e.sets.length, 0);
  return (
    <>
      <Panel title={session.name} kicker="COMPLETED">
        <Text style={s.muted}>
          {new Date(session.completedAt!).toLocaleString()}
        </Text>
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
        <Text style={s.fine}>Duration · includes rest and time away</Text>
        <Text style={s.muted}>
          {session.exercises.length} exercises · {total} / {total} sets
          completed
        </Text>
      </Panel>
      {session.exercises.map((entry) => (
        <Panel key={entry.id} title={entry.exercise.name}>
          {entry.sets.map((set, i) => (
            <View key={set.id} style={t.item}>
              <Text style={s.eyebrow}>SET {i + 1} · COMPLETE</Text>
              <Text style={s.fine}>Target · {targetLabel(set.target)}</Text>
              <Text style={t.name}>
                Actual ·{" "}
                {set.result ? actualLabel(set.result.actual) : "Not recorded"}
              </Text>
            </View>
          ))}
        </Panel>
      ))}
      <Button label="FINISH" onPress={onFinish} />
    </>
  );
}
