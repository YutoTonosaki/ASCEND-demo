import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type PropsWithChildren,
} from "react";
import { CareerRepository } from "../storage/career-repository";
import { localStorageAdapter } from "../storage/local";
import { useGrowth } from "../growth/provider";
import { currentTenure, type CareerData } from "./domain";
import { clubById } from "../config/clubs";
import type { Club } from "../types/club";
interface Value {
  data: CareerData | null;
  club: Club | undefined;
  error: string | null;
  busy: boolean;
  retry: () => Promise<void>;
  join: (id: string) => Promise<void>;
}
const Context = createContext<Value | null>(null);
export function CareerProvider({ children }: PropsWithChildren) {
  const [repository] = useState(
    () => new CareerRepository(localStorageAdapter),
  );
  const [data, setData] = useState<CareerData | null>(null),
    [error, setError] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  const growth = useGrowth();
  const playerId = growth.data?.player?.id;
  const fail = (e: unknown) =>
    setError(
      e instanceof Error
        ? e.message
        : "Career could not be saved. Please retry.",
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
  const retry = useCallback(async () => {
    setBusy(true);
    try {
      setData(await repository.load());
      setError(null);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }, [repository]);
  const mismatch =
    !!data?.career && !!growth.data && data.career.playerId !== playerId;
  async function join(id: string) {
    if (busy || !data || data.career || !playerId || growth.error || mismatch)
      return;
    setBusy(true);
    try {
      setData(await repository.join(playerId, id));
      setError(null);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  }
  const problem = mismatch
    ? "Career Player identity does not match. Saved data is preserved."
    : error;
  const club =
    data?.career && !problem
      ? clubById(currentTenure(data.career).clubId)
      : undefined;
  return (
    <Context.Provider value={{ data, club, error: problem, busy, retry, join }}>
      {children}
    </Context.Provider>
  );
}
export function useCareer() {
  const value = useContext(Context);
  if (!value) throw new Error("CareerProvider required");
  return value;
}
