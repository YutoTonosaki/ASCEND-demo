import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import {
  TrainingRepository,
  type TrainingCommand,
} from "../storage/training-repository";
import { localStorageAdapter } from "../storage/local";
import { standardExercises } from "../data/exercises";
import type { Exercise, TrainingData } from "../types/training";
interface TrainingContextValue {
  data: TrainingData | null;
  library: Exercise[];
  error: string | null;
  retry: () => Promise<void>;
  reset: () => Promise<void>;
  commit: (command: TrainingCommand) => Promise<void>;
}
const Context = createContext<TrainingContextValue | null>(null);
export function TrainingProvider({ children }: PropsWithChildren) {
  const [repository] = useState(
    () => new TrainingRepository(localStorageAdapter),
  );
  const [data, setData] = useState<TrainingData | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function retry() {
    try {
      setData(await repository.load());
      setError(null);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Unable to load training data. Please retry.",
      );
    }
  }
  useEffect(() => {
    let mounted = true;
    repository
      .load()
      .then((value) => {
        if (mounted) setData(value);
      })
      .catch((e) => {
        if (mounted)
          setError(
            e instanceof Error
              ? e.message
              : "Unable to load training data. Please retry.",
          );
      });
    return () => {
      mounted = false;
    };
  }, [repository]);
  async function reset() {
    try {
      setData(await repository.reset());
      setError(null);
    } catch {
      setError(
        "Could not back up and reset training data. Your existing data has been kept.",
      );
    }
  }
  async function commit(command: TrainingCommand) {
    setData(await repository.commit(command));
  }
  return (
    <Context.Provider
      value={{
        data,
        library: [...standardExercises, ...(data?.customExercises ?? [])],
        error,
        retry,
        reset,
        commit,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useTraining() {
  const value = useContext(Context);
  if (!value) throw new Error("TrainingProvider is required");
  return value;
}
