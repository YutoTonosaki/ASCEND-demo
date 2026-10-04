import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";
import { useCareer } from "../career/provider";
import { useGrowth } from "../growth/provider";
import { SeasonsRepository } from "../storage/seasons-repository";
import { localStorageAdapter } from "../storage/local";
import { activeSeason, assertOwner, copy, type SeasonsData } from "./domain";
import { calendarContext, localMonth, type CalendarContext } from "./calendar";
import type { SessionData, WorkoutSession } from "../types/session";
class Pending {
  jobs = new Map<
    string,
    { session: WorkoutSession; history: SessionData; clock: CalendarContext }
  >();
  add(session: WorkoutSession, history: SessionData) {
    if (!this.jobs.has(session.id))
      this.jobs.set(session.id, {
        session: copy(session),
        history: copy(history),
        clock: calendarContext(new Date(session.completedAt!)),
      });
  }
}
interface Value {
  data: SeasonsData | null;
  error: string | null;
  busy: boolean;
  month: string;
  start: () => Promise<void>;
  complete: () => Promise<void>;
  retry: () => Promise<void>;
  record: (s: WorkoutSession, h: SessionData) => void;
}
const Context = createContext<Value | null>(null);
export function SeasonsProvider({ children }: PropsWithChildren) {
  const career = useCareer(),
    growth = useGrowth();
  const [repo] = useState(() => new SeasonsRepository(localStorageAdapter)),
    [pending] = useState(() => new Pending());
  const [data, setData] = useState<SeasonsData | null>(null),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [month, setMonth] = useState(() => localMonth(new Date()));
  const fail = useCallback(
    (e: unknown) =>
      setError(
        e instanceof Error
          ? e.message
          : "Season could not be saved. Your workout is safe.",
      ),
    [],
  );
  useEffect(() => {
    let alive = true;
    repo
      .load()
      .then((d) => {
        if (alive) setData(d);
      })
      .catch((e) => {
        if (alive) fail(e);
      });
    const update = () => setMonth(localMonth(new Date()));
    const timer = setInterval(update, 30000),
      sub = AppState.addEventListener("change", (s) => {
        if (s === "active") update();
      });
    return () => {
      alive = false;
      clearInterval(timer);
      sub.remove();
    };
  }, [repo, fail]);
  const flush = useCallback(async () => {
    for (const [id, job] of pending.jobs) {
      if (!career.data?.career || !growth.data?.player || career.error)
        throw Error("Season requires its valid Career and Player.");
      const d = await repo.record(
        { career: career.data.career, player: growth.data.player },
        job.session,
        job.history,
        job.clock,
      );
      pending.jobs.delete(id);
      setData(d);
    }
  }, [pending, repo, career.data, career.error, growth.data]);
  const record = useCallback(
    (s: WorkoutSession, h: SessionData) => {
      if (!career.data?.career || !growth.data?.player) return;
      try {
        if (career.error) throw Error(career.error);
        pending.add(s, h);
        void flush().catch(fail);
      } catch (e) {
        fail(e);
      }
    },
    [pending, flush, fail, career.data, career.error, growth.data],
  );
  const retry = useCallback(async () => {
    setBusy(true);
    try {
      setData(await repo.load());
      await flush();
      setError(null);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }, [repo, flush, fail]);
  const c = career.data?.career,
    p = growth.data?.player;
  let problem = error;
  if (data?.seasons.length && career.data && growth.data) {
    try {
      if (!c || !p)
        throw Error("Season requires its original Career and Player.");
      assertOwner(data, c, p);
    } catch (e) {
      problem = e instanceof Error ? e.message : "Season identity mismatch";
    }
  }
  async function act(kind: "start" | "complete") {
    if (
      busy ||
      !data ||
      problem ||
      !c ||
      !p ||
      !career.club ||
      career.error ||
      growth.error
    )
      return;
    setBusy(true);
    try {
      await flush();
      const clock = calendarContext(new Date());
      setMonth(clock.monthId);
      if (kind === "start") setData(await repo.start(c, p, career.club, clock));
      else {
        const s = activeSeason(data);
        if (s) setData(await repo.complete(s.id, c, p, clock));
      }
      setError(null);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Context.Provider
      value={{
        data,
        error: problem,
        busy,
        month,
        start: () => act("start"),
        complete: () => act("complete"),
        retry,
        record,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useSeasons() {
  const value = useContext(Context);
  if (!value) throw Error("SeasonsProvider required");
  return value;
}
