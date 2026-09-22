import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { useSessions } from "../sessions/provider";
import { useCoach } from "../coach/provider";
import { PlayerRepository } from "../storage/player-repository";
import { localStorageAdapter } from "../storage/local";
import type { PlayerData } from "../types/growth";
interface Value {
  data: PlayerData | null;
  error: string | null;
  busy: boolean;
  initialize: () => Promise<void>;
  retry: () => Promise<void>;
}
const Context = createContext<Value | null>(null);
export function GrowthProvider({ children }: PropsWithChildren) {
  const [repository] = useState(
    () => new PlayerRepository(localStorageAdapter),
  );
  const sessions = useSessions(),
    coach = useCoach();
  const [data, setData] = useState<PlayerData | null>(null),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const fail = (e: unknown) =>
    setError(
      e instanceof Error
        ? e.message
        : "Player growth could not be saved. Please retry.",
    );
  useEffect(() => {
    let mounted = true;
    repository
      .load()
      .then((d) => {
        if (mounted) setData(d);
      })
      .catch((e) => {
        if (mounted) fail(e);
      });
    return () => {
      mounted = false;
    };
  }, [repository]);
  const playerId = data?.player?.id;
  useEffect(() => {
    if (!playerId || !sessions.data) return;
    let mounted = true;
    repository
      .reconcile(sessions.data)
      .then((d) => {
        if (mounted) {
          setData(d);
          setError(null);
        }
      })
      .catch((e) => {
        if (mounted) fail(e);
      });
    return () => {
      mounted = false;
    };
  }, [playerId, repository, sessions.data]);
  const retry = useCallback(async () => {
    setBusy(true);
    try {
      let next = await repository.load();
      if (next.player && sessions.data)
        next = await repository.reconcile(sessions.data);
      setData(next);
      setError(null);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }, [repository, sessions.data]);
  async function initialize() {
    if (!coach.data || !sessions.data || busy) return;
    setBusy(true);
    try {
      setData(await repository.initialize(coach.data.profile, sessions.data));
      setError(null);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Context.Provider value={{ data, error, busy, initialize, retry }}>
      {children}
    </Context.Provider>
  );
}
export function useGrowth() {
  const value = useContext(Context);
  if (!value) throw new Error("GrowthProvider is required");
  return value;
}
