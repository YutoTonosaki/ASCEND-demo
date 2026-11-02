import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  BackHandler,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import Scene from "./src/Scene";
import {
  frameBox,
  presetCamera,
  resetCamera,
  rotateCamera,
  zoomCamera,
} from "./src/camera";
import {
  gestureDelta,
  shouldMountRenderer,
  foregroundAtOpen,
} from "./src/lifecycle";
import { translate } from "./src/strings";

/** @type {import('react-native').ViewStyle & {touchAction: 'none'}} */
const webTouchStyle = { touchAction: "none" };

/** @extends {React.Component<{onError:()=>void,children:React.ReactNode}>} */
class RenderBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}
function Button({ label, onPress, disabled = false, selected = false }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={[s.button, selected && s.selected, disabled && s.disabled]}
    >
      <Text style={s.buttonText}>
        {label}
        {selected ? " ✓" : ""}
      </Text>
    </Pressable>
  );
}
function Lab() {
  const [locale, setLocale] = useState(
    /** @type {import('./src/strings').Locale} */ ("en"),
  );
  const [open, setOpen] = useState(false),
    [foreground, setForeground] = useState(
      foregroundAtOpen(AppState.currentState),
    );
  const [failed, setFailed] = useState(false),
    [loading, setLoading] = useState(true),
    [epoch, setEpoch] = useState(0);
  const aspectRef = useRef(0.5);
  const [bounds, setBounds] = useState(
    /** @type {{width:number,height:number,depth:number}|null} */ (null),
  );
  const [camera, setCamera] = useState(
    /** @type {import('./src/camera').CameraState|null} */ (null),
  );
  const [rig, setRig] = useState(
    /** @type {import('./src/camera').CameraRig|null} */ (null),
  );
  const rigRef = useRef(rig);
  const t = (key) => translate(locale, key);
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      const active = state === "active";
      setForeground(active);
      if (!active) setLoading(true);
    });
    return () => sub.remove();
  }, []);
  const fail = useCallback(() => {
    setFailed(true);
    setLoading(false);
  }, []);
  const ready = useCallback((value) => {
    const next = frameBox(
      value.width,
      value.height,
      value.depth,
      aspectRef.current,
    );
    setBounds(value);
    setRig(next);
    rigRef.current = next;
    setCamera(resetCamera(next));
    setLoading(false);
  }, []);
  const mount = shouldMountRenderer(open, foreground, failed);
  useEffect(() => {
    if (!mount || !loading) return;
    const timer = setTimeout(fail, 30000);
    return () => clearTimeout(timer);
  }, [mount, loading, fail]);
  const touches = useRef(/** @type {import('./src/lifecycle').Touch[]} */ ([]));
  const [responder] = useState(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        touches.current = e.nativeEvent.touches.map((p) => ({
          x: p.pageX,
          y: p.pageY,
        }));
      },
      onPanResponderMove: (e) => {
        const next = e.nativeEvent.touches.map((p) => ({
          x: p.pageX,
          y: p.pageY,
        }));
        const delta = gestureDelta(touches.current, next);
        touches.current = next;
        setCamera((value) =>
          value && rigRef.current
            ? zoomCamera(
                rigRef.current,
                rotateCamera(value, -delta.rotation),
                delta.zoom,
              )
            : value,
        );
      },
      onPanResponderRelease: () => {
        touches.current = [];
      },
      onPanResponderTerminate: () => {
        touches.current = [];
      },
    }),
  );
  const close = useCallback(() => {
    setOpen(false);
    setBounds(null);
    setCamera(null);
    setRig(null);
    rigRef.current = null;
    touches.current = [];
  }, []);
  useEffect(() => {
    if (!open) return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        close();
        return true;
      },
    );
    return () => subscription.remove();
  }, [open, close]);
  function start() {
    setForeground(foregroundAtOpen(AppState.currentState));
    setFailed(false);
    setLoading(true);
    setBounds(null);
    setCamera(null);
    setRig(null);
    rigRef.current = null;
    touches.current = [];
    setEpoch((v) => v + 1);
    setOpen(true);
  }
  const edit = (fn) => setCamera((value) => (value ? fn(value) : value));
  return (
    <SafeAreaView style={s.root}>
      <StatusBar style="light" />
      <View style={s.header}>
        <Text accessibilityRole="header" style={s.title}>
          {t("title")}
        </Text>
        {open && <Button label={t("close")} onPress={close} />}
      </View>
      <View style={s.row} accessibilityLabel={t("language")}>
        <Button
          label="English"
          selected={locale === "en"}
          onPress={() => setLocale("en")}
        />
        <Button
          label="日本語"
          selected={locale === "ja"}
          onPress={() => setLocale("ja")}
        />
      </View>
      {!open ? (
        <View style={s.intro}>
          <Text style={s.text}>{t("intro")}</Text>
          <Button label={t("open")} onPress={start} />
        </View>
      ) : (
        <>
          <View
            testID="athlete-viewport"
            style={s.viewport}
            onLayout={(e) => {
              const { width, height } = e.nativeEvent.layout;
              if (width > 0 && height > 0) {
                aspectRef.current = width / height;
                if (bounds) {
                  const next = frameBox(
                    bounds.width,
                    bounds.height,
                    bounds.depth,
                    width / height,
                  );
                  setRig(next);
                  rigRef.current = next;
                  setCamera(resetCamera(next));
                }
              }
            }}
          >
            {mount && (
              <RenderBoundary key={epoch} onError={fail}>
                <Scene cameraState={camera} onReady={ready} onError={fail} />
              </RenderBoundary>
            )}
            {mount && (
              <View
                style={[
                  StyleSheet.absoluteFill,
                  Platform.OS === "web" && webTouchStyle,
                ]}
                {...responder.panHandlers}
                accessible={false}
              />
            )}
            {(failed || loading || !foreground) && (
              <View style={s.overlay} pointerEvents="none">
                {loading && !failed && foreground && (
                  <ActivityIndicator color="#b9e6df" />
                )}
                <Text
                  accessibilityRole={failed ? "alert" : "text"}
                  style={s.text}
                >
                  {failed
                    ? t("error")
                    : foreground
                      ? t("loading")
                      : t("paused")}
                </Text>
              </View>
            )}
          </View>
          <ScrollView
            style={s.controls}
            contentContainerStyle={s.controlContent}
          >
            <Text
              testID="viewer-status"
              accessibilityLiveRegion="polite"
              style={s.text}
            >
              {failed ? t("error") : loading ? t("loading") : t("ready")}
            </Text>
            {failed ? (
              <Button label={t("retry")} onPress={start} />
            ) : (
              <>
                <Text style={s.text}>{t("instructions")}</Text>
                <View style={s.row}>
                  {
                    /** @type {import('./src/camera').CameraPreset[]} */ ([
                      "front",
                      "side",
                      "back",
                    ]).map((p) => (
                      <Button
                        key={p}
                        disabled={!rig || loading}
                        label={t(p)}
                        onPress={() => edit((v) => presetCamera(v, p))}
                      />
                    ))
                  }
                </View>
                <View style={s.row}>
                  <Button
                    disabled={!rig || loading}
                    label={t("left")}
                    onPress={() => edit((v) => rotateCamera(v, -Math.PI / 8))}
                  />
                  <Button
                    disabled={!rig || loading}
                    label={t("right")}
                    onPress={() => edit((v) => rotateCamera(v, Math.PI / 8))}
                  />
                  <Button
                    disabled={!rig || loading}
                    label={t("zoomIn")}
                    onPress={() => rig && edit((v) => zoomCamera(rig, v, 0.85))}
                  />
                  <Button
                    disabled={!rig || loading}
                    label={t("zoomOut")}
                    onPress={() => rig && edit((v) => zoomCamera(rig, v, 1.18))}
                  />
                  <Button
                    disabled={!rig || loading}
                    label={t("reset")}
                    onPress={() => rig && setCamera(resetCamera(rig))}
                  />
                </View>
              </>
            )}
            <Text style={s.note}>{t("source")}</Text>
            <Button label={t("failureTest")} onPress={fail} />
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <Lab />
    </SafeAreaProvider>
  );
}
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0c1118" },
  header: {
    padding: 12,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  title: { color: "#edf5f5", fontSize: 23, fontWeight: "800", flexShrink: 1 },
  row: {
    paddingHorizontal: 10,
    gap: 8,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  button: {
    padding: 12,
    minHeight: 48,
    minWidth: 48,
    backgroundColor: "#202c37",
    borderWidth: 1,
    borderColor: "#50616e",
    borderRadius: 8,
    justifyContent: "center",
    flexShrink: 1,
  },
  selected: { borderColor: "#b9e6df", backgroundColor: "#244742" },
  disabled: { opacity: 0.4 },
  buttonText: {
    color: "#f1f6f7",
    fontSize: 14,
    fontWeight: "700",
    flexShrink: 1,
  },
  intro: { padding: 20, gap: 24 },
  text: { color: "#e6eded", fontSize: 15, lineHeight: 23, flexShrink: 1 },
  note: { color: "#adc1c5", fontSize: 12, lineHeight: 18 },
  viewport: {
    flex: 1,
    minHeight: 100,
    marginTop: 10,
    overflow: "hidden",
    backgroundColor: "#101820",
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
  controls: { maxHeight: "44%", flexGrow: 0 },
  controlContent: { padding: 12, gap: 14, paddingBottom: 24 },
});
