import { createContext, useCallback, useContext, useEffect, useState, type PropsWithChildren } from "react";
import { AppState } from "react-native";
import { useCareer } from "../career/provider";
import { useCoach } from "../coach/provider";
import { useGrowth } from "../growth/provider";
import { useSessions } from "../sessions/provider";
import { MatchRepository } from "../storage/match-repository";
import { localStorageAdapter } from "../storage/local";
import type { MatchData } from "./domain";
interface Value {
  data: MatchData | null;
  error: string | null;
  pending: Record<string, string>;
  retry: () => Promise<void>;
}
const Context = createContext<Value | null>(null);
export function MatchProvider({ children }: PropsWithChildren) {
  const [repository] = useState(() => new MatchRepository(localStorageAdapter));
  const [data, setData] = useState<MatchData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<Record<string, string>>({});
  const growth = useGrowth(), career = useCareer(), coach = useCoach(), sessions = useSessions();
  const player = growth.data?.player, ownerCareer = career.data?.career;
  const ready = !!player && !!ownerCareer && !!coach.data && !!sessions.data && !growth.error && !career.error && !coach.error && !sessions.error;
  const retry = useCallback(async () => {
    try {
      if (ready && player && ownerCareer && coach.data && sessions.data) {
        const result = await repository.refresh({ player, career: ownerCareer }, coach.data.profile, sessions.data, new Date().toISOString(), Intl.DateTimeFormat().resolvedOptions().timeZone);
        setData(result.data);
        setPending(result.pending);
      }
      else
        setData(await repository.load());
      setError(null);
    }
    catch (e) {
      setError(e instanceof Error ? e.message : "Match data could not be loaded. Please retry.");
    }
  }, [repository, ready, player, ownerCareer, coach.data, sessions.data]);
  useEffect(() => {
    let mounted = true;
    // Cleanup suppresses publication of stale inputs while repository serialization protects persistence.
    const run = async () => {
      try {
        if (ready && player && ownerCareer && coach.data && sessions.data) {
          const result = await repository.refresh({ player, career: ownerCareer }, coach.data.profile, sessions.data, new Date().toISOString(), Intl.DateTimeFormat().resolvedOptions().timeZone);
          if (mounted) {
            setData(result.data);
            setPending(result.pending);
            setError(null);
          }
        }
        else {
          const saved = await repository.load();
          if (mounted) {
            setData(saved);
            setError(null);
          }
        }
      }
      catch (e) {
        if (mounted)
          setError(e instanceof Error ? e.message : "Match data could not be loaded. Please retry.");
      }
    };
    void run();
    const subscription = AppState.addEventListener("change", state => { if (state === "active")
      void run(); });
    const timer = setInterval(() => { if (AppState.currentState === "active")
      void run(); }, 30000);
    return () => { mounted = false; subscription.remove(); clearInterval(timer); };
  }, [repository, ready, player, ownerCareer, coach.data, sessions.data]);
  const prerequisiteError = growth.error || career.error || coach.error || sessions.error;
  return <Context.Provider value={{ data: ready && !prerequisiteError && !error ? data : null, error: prerequisiteError || error, pending, retry }}>{children}</Context.Provider>;
}
export function useMatches() {
  const value = useContext(Context);
  if (!value)
    throw Error("MatchProvider required");
  return value;
}
