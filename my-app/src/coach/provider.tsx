import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import { CoachRepository } from "../storage/coach-repository";
import { localStorageAdapter } from "../storage/local";
import type { CoachData, TrainingProfile } from "../types/coach";
interface Value {
  data: CoachData | null;
  error: string | null;
  retry: () => Promise<void>;
  reset: () => Promise<void>;
  save: (profile: TrainingProfile) => Promise<void>;
}
const Context = createContext<Value | null>(null);
export function CoachProvider({ children }: PropsWithChildren) {
  const [repository] = useState(() => new CoachRepository(localStorageAdapter));
  const [data, setData] = useState<CoachData | null>(null);
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
          : "Unable to load your training profile.",
      );
    }
  }, [repository]);
  useEffect(() => {
    let mounted = true;
    repository
      .load()
      .then((next) => {
        if (mounted) setData(next);
      })
      .catch((e) => {
        if (mounted)
          setError(
            e instanceof Error
              ? e.message
              : "Unable to load your training profile.",
          );
      });
    return () => {
      mounted = false;
    };
  }, [repository]);
  async function save(profile: TrainingProfile) {
    setData(await repository.save(profile));
    setError(null);
  }
  async function reset() {
    try {
      setData(await repository.reset());
      setError(null);
    } catch {
      setError(
        "Could not back up and reset the profile. Your data has been kept.",
      );
    }
  }
  return (
    <Context.Provider value={{ data, error, retry, reset, save }}>
      {children}
    </Context.Provider>
  );
}
export function useCoach() {
  const value = useContext(Context);
  if (!value) throw new Error("CoachProvider is required");
  return value;
}
