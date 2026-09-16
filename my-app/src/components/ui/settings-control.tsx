import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/config/theme";
import { Icon } from "./icon";
export function SettingsControl() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Settings"
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.control, pressed && { opacity: 0.65 }]}
      >
        <Icon name="settings" size={20} />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={styles.overlay}>
          <View
            accessibilityViewIsModal
            role="dialog"
            aria-label="Settings"
            style={styles.sheet}
          >
            <View style={styles.heading}>
              <Text accessibilityRole="header" style={styles.title}>
                SETTINGS
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close settings"
                onPress={() => setOpen(false)}
                style={styles.control}
              >
                <Icon name="close" />
              </Pressable>
            </View>
            <Text style={styles.copy}>Make ASCEND your own.</Text>
            <View style={styles.row}>
              <Text style={styles.label}>App preferences</Text>
              <Text style={styles.soon}>COMING SOON</Text>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}
const styles = StyleSheet.create({
  control: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  overlay: {
    flex: 1,
    backgroundColor: "#000a",
    justifyContent: "center",
    padding: 20,
  },
  sheet: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 16,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
    color: colors.text,
  },
  copy: { fontSize: 14, color: colors.muted },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: 14, color: colors.muted },
  soon: { fontSize: 10, letterSpacing: 1, color: colors.muted },
});
