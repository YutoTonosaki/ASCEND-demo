import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import {
  SessionRepository,
  type SessionCommand,
} from "../storage/session-repository";
import { localStorageAdapter } from "../storage/local";
import type { SessionData } from "../types/session";
interface SessionContextValue {
  data: SessionData | null;
  error: string | null;
  retry: () => Promise<void>;
  reset: () => Promise<void>;
  commit: (command: SessionCommand) => Promise<SessionData>;
}
const Context = createContext<SessionContextValue | null>(null);
export function SessionProvider({ children }: PropsWithChildren) {
  const [repository] = useState(
    () => new SessionRepository(localStorageAdapter),
  );
  const [data, setData] = useState<SessionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const retry = useCallback(async () => {
    setData(null);
    try {
      setData(await repository.load());
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to load sessions. Please retry.",
      );
    }
  }, [repository]);
  useEffect(() => {
    let mounted = true;
    repository.load().then(next => { if (mounted) setData(next); }).catch(e => {
      if (mounted) setError(e instanceof Error ? e.message : "Unable to load sessions. Please retry.");
    });
    return () => { mounted = false; };
  }, [repository]);
  const commit = useCallback(
    async (command: SessionCommand) => {
      const next = await repository.commit(command);
      setData(next);
      return next;
    },
    [repository],
  );
  async function reset() {
    try {
      setData(await repository.reset());
      setError(null);
    } catch {
      setError(
        "Could not back up and reset sessions. Existing data has been kept.",
      );
    }
  }
  return (
    <Context.Provider value={{ data, error, retry, reset, commit }}>
      {children}
    </Context.Provider>
  );
}
export function useSessions() {
  const value = useContext(Context);
  if (!value) throw new Error("SessionProvider is required");
  return value;
}
