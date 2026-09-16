import { useEffect, useState } from "react";
import { AccessibilityInfo, Animated, AppState, Easing } from "react-native";
import { useIsFocused } from "expo-router";

/** One native-driver loop, stopped off-screen, in the background, or for reduced motion. */
export function useCardMotion(enabled: boolean) {
  const [progress] = useState(() => new Animated.Value(0));
  const [reduced, setReduced] = useState(true);
  const [active, setActive] = useState(AppState.currentState === "active");
  const focused = useIsFocused();
  useEffect(() => {
    let mounted = true;
    let changed = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (mounted && !changed) setReduced(value);
      })
      .catch(() => {});
    const motion = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (value) => {
        changed = true;
        setReduced(value);
      },
    );
    const state = AppState.addEventListener("change", (value) =>
      setActive(value === "active"),
    );
    return () => {
      mounted = false;
      motion.remove();
      state.remove();
    };
  }, []);
  useEffect(() => {
    progress.setValue(0);
    if (!enabled || reduced || !active || !focused) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
          isInteraction: false,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
          isInteraction: false,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [enabled, reduced, active, focused, progress]);
  return progress;
}
