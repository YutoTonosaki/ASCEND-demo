import { useState, type PropsWithChildren } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/config/theme";
import { s } from "@/components/ui/primitives";
export function Action({
  label,
  onPress,
  disabled = false,
  displayLabel,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  displayLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        t.action,
        disabled && { opacity: 0.45 },
        pressed && s.pressed,
      ]}
    >
      <Text style={t.actionText}>{displayLabel ?? label}</Text>
    </Pressable>
  );
}
export function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength = 80,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.eyebrow}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        maxLength={maxLength}
        style={t.input}
      />
    </View>
  );
}
export function Counter({
  label,
  value,
  onChange,
  min = 1,
  max,
  step = 1,
  displayLabel,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max: number;
  step?: number;
  displayLabel?: string;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const update = (n: number) => {
    setEditing(null);
    onChange(Math.min(max, Math.max(min, Math.round(n * 100) / 100)));
  };
  function finish() {
    if (editing !== null && editing.trim() && Number.isFinite(Number(editing)))
      update(
        Number.isInteger(step) ? Math.round(Number(editing)) : Number(editing),
      );
    setEditing(null);
  }
  return (
    <View style={t.counter}>
      <Text style={[s.muted, s.flex]}>{displayLabel ?? label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        disabled={value <= min}
        accessibilityState={{ disabled: value <= min }}
        onPress={() => update(value - step)}
        style={t.step}
      >
        <Text style={t.actionText}>−</Text>
      </Pressable>
      <TextInput
        accessibilityLabel={label}
        style={t.numeric}
        keyboardType="decimal-pad"
        inputMode="decimal"
        selectTextOnFocus
        value={editing ?? String(value)}
        placeholder={String(value)}
        placeholderTextColor={colors.muted}
        onChangeText={(text) => {
          const normalized = text.replace(",", ".");
          // Clearing a field while replacing its value must not truncate planned sets.
          if (!normalized.trim()) {
            setEditing("");
            return;
          }
          const n = Number(normalized);
          if (!Number.isFinite(n)) {
            setEditing(null);
            return;
          }
          const rounded = Number.isInteger(step) ? Math.round(n) : n;
          const bounded = Math.min(max, Math.max(min, rounded));
          onChange(bounded);
          setEditing(
            text.trim() && bounded !== n ? String(bounded) : normalized,
          );
        }}
        onBlur={finish}
        onSubmitEditing={finish}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        disabled={value >= max}
        accessibilityState={{ disabled: value >= max }}
        onPress={() => update(value + step)}
        style={t.step}
      >
        <Text style={t.actionText}>+</Text>
      </Pressable>
    </View>
  );
}
export function Sheet({
  title,
  onClose,
  children,
}: PropsWithChildren<{ title: string; onClose: () => void }>) {
  return (
    <Modal
      visible
      animationType="none"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <SafeAreaView style={s.safe}>
        <View style={{ flex: 1 }}>
          <View style={[s.content, { flex: 1 }]}>
            <View style={[s.sectionHeading, { paddingTop: 8 }]}>
              <Text accessibilityRole="header" style={s.sectionTitle}>
                {title}
              </Text>
              <Action label="CLOSE" onPress={onClose} />
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              automaticallyAdjustKeyboardInsets
              contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
            >
              {children}
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
export function Confirm({
  title,
  message,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal visible transparent animationType="none" onRequestClose={onCancel}>
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: "#000a",
          justifyContent: "center",
          padding: 20,
        }}
      >
        <View
          role="dialog"
          aria-label={title}
          accessibilityViewIsModal
          style={[
            s.panel,
            { width: "100%", maxWidth: 460, alignSelf: "center" },
          ]}
        >
          <Text accessibilityRole="header" style={s.sectionTitle}>
            {title}
          </Text>
          <Text style={s.muted}>{message}</Text>
          <Action label="CONFIRM" onPress={onConfirm} />
          <Action label="CANCEL" onPress={onCancel} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
export function ErrorText({ message }: { message: string | null }) {
  return message ? (
    <Text
      accessibilityRole="alert"
      style={{ color: colors.recovering, lineHeight: 20 }}
    >
      {message}
    </Text>
  ) : null;
}
export const t = StyleSheet.create({
  action: {
    maxWidth: "100%",
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  actionText: { color: colors.bronze, fontSize: 12, fontWeight: "700" },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    color: colors.text,
    fontSize: 16,
    backgroundColor: colors.surface,
  },
  counter: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
    flexWrap: "wrap",
  },
  step: {
    height: 44,
    width: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.raised,
    borderRadius: 8,
  },
  numeric: {
    height: 44,
    width: 64,
    textAlign: "center",
    color: colors.text,
    fontSize: 16,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  item: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  name: { fontSize: 16, fontWeight: "700", color: colors.text },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
