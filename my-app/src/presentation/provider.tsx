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
import { useSessions } from "../sessions/provider";
import { localStorageAdapter } from "../storage/local";
import { PresentationRepository } from "../storage/presentation-repository";
import { PresentationController } from "./controller";
import type { RatingUp } from "./domain";
import {
  PresentationBoundary,
  RatingUpScreen,
} from "../components/player/rating-up";

const Context = createContext<(sessionId: string) => void>(() => {});
export function GrowthPresentationProvider({ children }: PropsWithChildren) {
  const growth = useGrowth(),
    sessions = useSessions();
  const [controller] = useState(
    () =>
      new PresentationController(
        new PresentationRepository(localStorageAdapter),
      ),
  );
  const [revision, setRevision] = useState(0);
  const [visible, setVisible] = useState<RatingUp | null>(null);
  const alive = useRef(false);
  const inFlight = useRef(false);
  const changedDuringRead = useRef(false);
  const [foreground, setForeground] = useState(
    AppState.currentState === "active",
  );
  useEffect(() => {
    alive.current = true;
    const sub = AppState.addEventListener("change", (state) => {
      setForeground(state === "active");
      if (state !== "active") setVisible(null); // consumed; interruption never replays
    });
    return () => {
      alive.current = false;
      sub.remove();
    };
  }, []);
  const request = useCallback(
    (id: string) => {
      controller.request(id);
      setRevision((n) => n + 1);
    },
    [controller],
  );
  useEffect(() => {
    if (
      !foreground ||
      visible ||
      growth.error ||
      !growth.data?.player ||
      !sessions.data
    )
      return;
    if (inFlight.current) {
      changedDuringRead.current = true;
      return;
    }
    inFlight.current = true;
    // Reads only the Provider's successfully persisted result, including final bonus.
    void controller
      .next(
        growth.data.player,
        sessions.data.completed.map((s) => s.id),
      )
      .then((result) => {
        if (alive.current && AppState.currentState === "active" && result)
          setVisible(result);
      })
      .finally(() => {
        inFlight.current = false;
        if (alive.current && changedDuringRead.current) {
          changedDuringRead.current = false;
          setRevision((n) => n + 1);
        }
      });
  }, [
    controller,
    foreground,
    visible,
    growth.data,
    growth.error,
    sessions.data,
    revision,
  ]);
  return (
    <Context.Provider value={request}>
      {children}
      {visible && (
        <PresentationBoundary key={visible.identity}>
          <RatingUpScreen
            result={visible}
            onContinue={() => setVisible(null)}
          />
        </PresentationBoundary>
      )}
    </Context.Provider>
  );
}
export const useGrowthPresentation = () => useContext(Context);
