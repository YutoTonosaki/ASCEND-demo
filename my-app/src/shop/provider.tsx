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
import { useGrowth } from "../growth/provider";
import { useRewards } from "../rewards/provider";
import { ShopRepository, type ShopSnapshot } from "../storage/shop-repository";
import { localStorageAdapter } from "../storage/local";
import { ShopError, type ShopProblem } from "./domain";
import { defaultEquipment, type CosmeticCategory } from "./catalog";
interface Value {
  snapshot: ShopSnapshot | null;
  error: ShopProblem | null;
  actionError: ShopProblem | null;
  busy: boolean;
  reload: () => Promise<void>;
  purchase: (id: string) => Promise<boolean>;
  equip: (category: CosmeticCategory, id: string | null) => Promise<boolean>;
}
const Context = createContext<Value | null>(null);
const problem = (e: unknown): ShopProblem =>
  e instanceof ShopError ? e.code : "storage";
export function ShopProvider({ children }: PropsWithChildren) {
  const growth = useGrowth(),
    rewards = useRewards(),
    ownerId = growth.data?.player?.id ?? null;
  const ready = !!growth.data && !growth.error;
  const [repo] = useState(() => new ShopRepository(localStorageAdapter));
  const [snapshot, setSnapshot] = useState<ShopSnapshot | null>(null),
    [error, setError] = useState<ShopProblem | null>(null),
    [actionError, setActionError] = useState<ShopProblem | null>(null),
    [busy, setBusy] = useState(false);
  const alive = useRef(false),
    lock = useRef(false);
  const reload = useCallback(async () => {
    if (!ready) return;
    try {
      const saved = await repo.load(ownerId);
      if (alive.current) {
        setSnapshot(saved);
        setError(null);
        setActionError(null);
      }
    } catch (e) {
      if (alive.current) {
        setSnapshot(null);
        setError(problem(e));
      }
    }
  }, [repo, ownerId, ready]);
  useEffect(() => {
    alive.current = true;
    const run = () => {
      void reload();
    };
    run();
    const app = AppState.addEventListener("change", (state) => {
      if (state === "active") run();
    });
    return () => {
      alive.current = false;
      app.remove();
    };
  }, [reload, rewards.data, rewards.error]);
  async function act(work: () => Promise<ShopSnapshot>) {
    if (
      lock.current ||
      !ready ||
      !ownerId ||
      !snapshot ||
      error ||
      rewards.error
    )
      return false;
    lock.current = true;
    setBusy(true);
    setActionError(null);
    try {
      const saved = await work();
      if (alive.current) {
        setSnapshot(saved);
        setError(null);
      }
      return true;
    } catch (e) {
      if (alive.current) {
        setActionError(problem(e));
        setSnapshot(null);
        setError(problem(e));
      }
      return false;
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const scoped =
    ready &&
    !growth.error &&
    !rewards.error &&
    snapshot?.scope === ownerId &&
    (snapshot.data.ownerId === null || snapshot.data.ownerId === ownerId);
  return (
    <Context.Provider
      value={{
        snapshot: scoped ? snapshot : null,
        error: !ready
          ? growth.error
            ? "owner"
            : null
          : rewards.error
            ? "storage"
            : error,
        actionError,
        busy,
        reload: async () => {
          await rewards.retry();
          await reload();
        },
        purchase: (id) => act(() => repo.purchase(ownerId!, id)),
        equip: (category, id) => act(() => repo.equip(ownerId!, category, id)),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useShop() {
  const v = useContext(Context);
  if (!v) throw Error("ShopProvider required");
  return v;
}
/** Optional read-only renderer adapter; absent/unavailable/foreign data falls back to defaults. */
export function useCosmetics() {
  return useContext(Context)?.snapshot?.data.equipment ?? defaultEquipment();
}
