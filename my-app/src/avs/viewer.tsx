import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { SafeAreaModal } from "@/components/ui/safe-area-modal";
import { useLocalization } from "@/localization";
import { colors } from "@/config/theme";
import {
  frameBox,
  presetCamera,
  resetCamera,
  rotateCamera,
  zoomCamera,
  type CameraState,
  type CameraRig,
  type CameraPreset,
} from "./camera";
import { foregroundAtOpen } from "./lifecycle";
import type { Bounds } from "./scene-types";
import { ViewerScene } from "./viewer-scene";
import { CameraGestures } from "./gestures";
import { mark, recordError } from "./diagnostics";

class RenderBoundary extends React.Component<
  React.PropsWithChildren<{ onError: (error: unknown) => void }>,
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    recordError("renderer/boundary", error, true);
    this.props.onError(error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
function Button({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.disabled]}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}
/** Optional read-only surface. Unmount owns the renderer and its pending load. */
export function AthleteViewer({ onClose }: { onClose: () => void }) {
  const { tr } = useLocalization();
  const [failed, setFailed] = useState(false),
    [loading, setLoading] = useState(true),
    [epoch, setEpoch] = useState(0);
  const [foreground, setForeground] = useState(
    foregroundAtOpen(AppState.currentState),
  );
  const [bounds, setBounds] = useState<Bounds | null>(null),
    [camera, setCamera] = useState<CameraState | null>(null),
    [rig, setRig] = useState<CameraRig | null>(null);
  const aspect = useRef(0.5);
  const [gestures] = useState(() => new CameraGestures(setCamera));
  useFocusEffect(useCallback(() => () => onClose(), [onClose]));
  const fail = useCallback((error?: unknown) => {
    recordError("viewer", error);
    setFailed(true);
    setLoading(false);
  }, []);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      mark("app/state", state);
      const active = state === "active";
      setForeground(active);
      if (!active) {
        setLoading(true);
        gestures.reset();
      }
    });
    return () => sub.remove();
  }, [gestures]);
  const ready = useCallback(
    (value: Bounds) => {
      const next = frameBox(
        value.width,
        value.height,
        value.depth,
        aspect.current,
      );
      setBounds(value);
      setRig(next);
      gestures.setRig(next);
      setCamera(resetCamera(next));
    },
    [gestures],
  );
  const rendered = useCallback(() => {
    mark("viewer/frame-ready");
    setLoading(false);
  }, []);
  useEffect(() => {
    mark("viewer/mounted", {
      appState: AppState.currentState,
      platform: Platform.OS,
      rn: Platform.constants?.reactNativeVersion ?? null,
      hermes: "HermesInternal" in globalThis,
    });
    return () => mark("viewer/unmounted");
  }, []);
  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) =>
        gestures.start(
          e.nativeEvent.touches.map((p) => ({ x: p.pageX, y: p.pageY })),
        ),
      onPanResponderMove: (e) =>
        gestures.move(
          e.nativeEvent.touches.map((p) => ({ x: p.pageX, y: p.pageY })),
        ),
      onPanResponderRelease: () => gestures.reset(),
      onPanResponderTerminate: () => gestures.reset(),
    }),
  );
  const edit = (fn: (value: CameraState) => CameraState) =>
    setCamera((value) => (value ? fn(value) : value));
  const disabled = !rig || loading || !foreground;
  return (
    <SafeAreaModal
      visible
      onShow={() => mark("modal/onShow")}
      animationType="none"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            {tr("avs.title")}
          </Text>
          <Button label={tr("avs.close")} onPress={onClose} />
        </View>
        <View
          testID="athlete-viewport"
          style={styles.viewport}
          onLayout={(e) => {
            mark("viewport/layout", e.nativeEvent.layout);
            const { width, height } = e.nativeEvent.layout;
            if (width > 0 && height > 0) {
              aspect.current = width / height;
              if (bounds) {
                const next = frameBox(
                  bounds.width,
                  bounds.height,
                  bounds.depth,
                  aspect.current,
                );
                setRig(next);
                gestures.setRig(next);
                setCamera(resetCamera(next));
              }
            }
          }}
        >
          {foreground && !failed && (
            <RenderBoundary key={epoch} onError={fail}>
              <ViewerScene
                cameraState={camera}
                onModel={ready}
                onFrame={rendered}
                onError={fail}
              />
            </RenderBoundary>
          )}
          {foreground && !failed && (
            <View
              accessible={false}
              style={[
                StyleSheet.absoluteFill,
                Platform.OS === "web" && ({ touchAction: "none" } as object),
              ]}
              {...responder.panHandlers}
            />
          )}
          {(failed || loading || !foreground) && (
            <View pointerEvents="none" style={styles.overlay}>
              {loading && !failed && foreground && (
                <ActivityIndicator color={colors.bronze} />
              )}
              <Text
                accessibilityRole={failed ? "alert" : "text"}
                style={styles.text}
              >
                {tr(
                  failed
                    ? "avs.error"
                    : foreground
                      ? "avs.loading"
                      : "avs.paused",
                )}
              </Text>
            </View>
          )}
        </View>
        <ScrollView
          style={styles.controls}
          contentContainerStyle={styles.controlContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            testID="viewer-status"
            accessibilityLiveRegion="polite"
            style={styles.note}
          >
            {tr(failed ? "avs.error" : loading ? "avs.loading" : "avs.ready")}
          </Text>
          {failed ? (
            <Button
              label={tr("avs.retry")}
              onPress={() => {
                setFailed(false);
                setLoading(true);
                setRig(null);
                gestures.setRig(null);
                setBounds(null);
                setCamera(null);
                gestures.reset();
                setEpoch((v) => v + 1);
              }}
            />
          ) : (
            <>
              <View style={styles.row}>
                {(["front", "side", "back"] as CameraPreset[]).map((p) => (
                  <Button
                    key={p}
                    disabled={disabled}
                    label={tr(`avs.${p}`)}
                    onPress={() => edit((v) => presetCamera(v, p))}
                  />
                ))}
              </View>
              <View style={styles.row}>
                <Button
                  disabled={disabled}
                  label={tr("avs.left")}
                  onPress={() => edit((v) => rotateCamera(v, -Math.PI / 8))}
                />
                <Button
                  disabled={disabled}
                  label={tr("avs.right")}
                  onPress={() => edit((v) => rotateCamera(v, Math.PI / 8))}
                />
                <Button
                  disabled={disabled}
                  label={tr("avs.zoomIn")}
                  onPress={() => rig && edit((v) => zoomCamera(rig, v, 0.85))}
                />
                <Button
                  disabled={disabled}
                  label={tr("avs.zoomOut")}
                  onPress={() => rig && edit((v) => zoomCamera(rig, v, 1.18))}
                />
                <Button
                  disabled={disabled}
                  label={tr("avs.reset")}
                  onPress={() => rig && setCamera(resetCamera(rig))}
                />
              </View>
            </>
          )}
          <Text style={styles.note}>{tr("avs.instructions")}</Text>
          <Text style={styles.note}>{tr("avs.source")}</Text>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaModal>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    padding: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  title: { color: colors.text, fontSize: 18, fontWeight: "800", flexShrink: 1 },
  viewport: {
    flex: 1,
    minHeight: 100,
    backgroundColor: "#101820",
    overflow: "hidden",
  },
  overlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    gap: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  controls: { maxHeight: "38%", flexGrow: 0 },
  controlContent: { padding: 10, gap: 8, paddingBottom: 16 },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  button: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: "center",
    flexShrink: 1,
  },
  buttonText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    flexShrink: 1,
  },
  disabled: { opacity: 0.4 },
  text: { color: colors.text, fontSize: 14 },
  note: { color: colors.muted, fontSize: 11, lineHeight: 16 },
});
