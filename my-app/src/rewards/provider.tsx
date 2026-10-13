import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { AppState } from "react-native";
import { useCareer } from "../career/provider";
import { useGrowth } from "../growth/provider";
import { RewardsRepository } from "../storage/rewards-repository";
import { localStorageAdapter } from "../storage/local";
import { localDay, weekId, type RewardData } from "./domain";
import type { WorkoutSession } from "../types/session";
import { RewardsController, type RewardStatus } from "./controller";
interface Value {
  data: RewardData | null;
  error: string | null;
  currentWeek: string;
  statuses: Record<string, RewardStatus>;
  retry: () => Promise<void>;
  request: (session: WorkoutSession, settled: () => void) => void;
  reconcileMatchRewards: () => Promise<void>;
}
const Context = createContext<Value | null>(null);
export function RewardsProvider({ children }: PropsWithChildren) {
  const growth = useGrowth(),
    career = useCareer();
  const [repository] = useState(
    () => new RewardsRepository(localStorageAdapter),
  );
  const [data, setData] = useState<RewardData | null>(null),
    [error, setError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, RewardStatus>>({});
  const [controller] = useState(() => new RewardsController());
  const [currentWeek, setWeek] = useState(() => weekId(localDay(new Date())));
  const alive = useRef(false);
  const fail = useCallback((e: unknown) => {
    if (alive.current) {
      setData(null);
      setError(
        e instanceof Error
          ? e.message
          : "Rewards unavailable. Your workout is saved.",
      );
    }
  }, []);
  const playerId = growth.data?.player?.id;
  const careerStartedAt = career.data?.career?.clubHistory[0]?.joinedAt;
  const eligible =
    !!playerId &&
    career.data?.career?.playerId === playerId &&
    !growth.error &&
    !career.error;
  const reconcileMatchRewards = useCallback(async () => {
    if (!eligible || !playerId || !careerStartedAt) return;
    try {
      const next = await repository.reconcileMatches({
        playerId,
        careerStartedAt,
      });
      if (alive.current) {
        setData(next);
        setError(null);
      }
    } catch (e) {
      fail(e);
    }
  }, [repository, eligible, playerId, careerStartedAt, fail]);
  useEffect(() => {
    alive.current = true;
    void repository
      .load()
      .then((d) => {
        if (alive.current) setData(d);
      })
      .catch(fail);
    const update = () => setWeek(weekId(localDay(new Date())));
    const timer = setInterval(update, 30000);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") update();
    });
    return () => {
      alive.current = false;
      clearInterval(timer);
      sub.remove();
    };
  }, [repository, fail]);
  // Only saved Match results are scanned. This never creates workout intents,
  // Rivals or outcomes, and does not depend on Rewards data/error updates.
  useEffect(() => {
    // Schedule the storage synchronization asynchronously; state is published
    // only after the repository operation, not during effect setup.
    void Promise.resolve().then(reconcileMatchRewards);
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") void reconcileMatchRewards();
    });
    return () => sub.remove();
  }, [reconcileMatchRewards]);
  const request = useCallback(
    (session: WorkoutSession, settled: () => void) => {
      try {
        controller.request(session, growth.data?.player?.id ?? null, settled);
        setStatuses(controller.statuses());
      } catch (e) {
        fail(e);
        settled();
      }
    },
    [controller, growth.data, fail],
  );
  useEffect(() => {
    const jobs = controller.claim(
      growth.data?.player?.finalizedSessionIds ?? [],
      !!growth.error || (!!growth.data && !growth.data.player),
    );
    for (const intent of jobs) {
      let outcome: "saved" | "failed" = "failed";
      void repository
        .award(intent)
        .then((next) => {
          outcome = "saved";
          if (alive.current) {
            setData(next);
            setError(null);
          }
        })
        .catch(fail)
        .finally(() => {
          const settled = controller.finish(intent.sessionId, outcome);
          if (alive.current) {
            setStatuses(controller.statuses());
            settled?.();
          }
        });
    }
  }, [controller, growth.data, growth.error, statuses, repository, fail]);
  const retry = useCallback(async () => {
    try {
      const next = await repository.load();
      if (!alive.current) return;
      setData(next);
      setError(null);
      controller.retryFailed();
      setStatuses(controller.statuses());
      await reconcileMatchRewards();
    } catch (e) {
      fail(e);
    }
  }, [controller, repository, fail, reconcileMatchRewards]);
  return (
    <Context.Provider
      value={{
        data,
        error,
        currentWeek,
        statuses,
        retry,
        request,
        reconcileMatchRewards,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useRewards() {
  const context = useContext(Context);
  if (!context) throw new Error("RewardsProvider required");
  return context;
}
