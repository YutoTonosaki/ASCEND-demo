import { useLocalization, supportedLocales } from "@/localization";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SafeAreaModal } from "./safe-area-modal";
import { colors } from "@/config/theme";
import { Icon } from "./icon";
export function SettingsControl() {
 const l = useLocalization();
  const { tr, locale, setLocale, retry, error, busy, loading } = useLocalization();
  const [language, setLanguage] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr("settings.open")}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [
          styles.control,
          (pressed || open) && styles.active,
        ]}
      >
        {({ pressed }) => (
          <Icon
            name="settings"
            size={20}
            color={pressed || open ? colors.bronze : colors.muted}
          />
        )}
      </Pressable>
      <SafeAreaModal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
      >
        <SafeAreaView style={styles.overlay}>
          <ScrollView
            accessibilityViewIsModal
            role="dialog"
            aria-label={tr("settings.open")}
            style={{maxHeight:"90%",width:"100%",maxWidth:460,alignSelf:"center"}}
            contentContainerStyle={styles.sheet}
          >
            <View style={styles.heading}>
              <Text accessibilityRole="header" style={styles.title}>
                {tr("settings.title")}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={tr("settings.close")}
                onPress={() => setOpen(false)}
                style={({ pressed }) => [
                  styles.control,
                  pressed && styles.active,
                ]}
              >
                <Icon name="close" />
              </Pressable>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={tr("settings.language")} style={styles.row} onPress={() => setLanguage(!language)}>
              <Text style={styles.label}>{tr("settings.language")}</Text>
              <Text style={styles.label}>{supportedLocales.find(l => l.id === locale)!.name}</Text>
            </Pressable>
            {language && <View style={{gap:8}}>
              {supportedLocales.map(option => <Pressable key={option.id} accessibilityRole="button" accessibilityLabel={option.name} accessibilityState={{selected:locale === option.id, disabled: busy || loading || error}} disabled={busy || loading || error} onPress={() => void setLocale(option.id)} style={[styles.row, {minHeight:48}]}>
                <Text style={styles.label}>{option.name}</Text>
                {locale === option.id && <Text style={styles.label}>✓ {tr("settings.selected")}</Text>}
              </Pressable>)}
            </View>}
            {error && <View style={{gap:8}}><Text accessibilityRole="alert" style={styles.copy}>{tr("settings.failure")}</Text><Pressable accessibilityRole="button" onPress={() => void retry()} disabled={busy} style={styles.row}><Text style={styles.label}>{tr("settings.retry")}</Text></Pressable></View>}
            <Text style={styles.copy}>{tr("settings.description")}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={tr("settings.profile")}
              style={styles.row}
              onPress={() => {
                setOpen(false);
                router.push("/training-profile");
              }}
            >
              <Text style={styles.label}>{tr("settings.profile")}</Text>
              <Text style={styles.soon}>{tr("common.edit")}</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </SafeAreaModal>
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
  active: { borderColor: colors.bronze, backgroundColor: "#302820" },
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
