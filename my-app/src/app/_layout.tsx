import { DarkTheme, ThemeProvider, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@/config/theme";
import { TrainingProvider } from "@/training/provider";
import { SessionProvider } from "@/sessions/provider";
import { GrowthProvider } from "@/growth/provider";
import { CoachProvider } from "@/coach/provider";
import { GrowthPresentationProvider } from "@/presentation/provider";
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider
        value={{
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            background: colors.background,
            card: colors.surface,
            text: colors.text,
            border: colors.border,
            primary: colors.bronze,
          },
        }}
      >
        <TrainingProvider>
          <SessionProvider>
            <CoachProvider>
              <GrowthProvider>
                <GrowthPresentationProvider>
                  <StatusBar style="light" />
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" />
                  </Stack>
                </GrowthPresentationProvider>
              </GrowthProvider>
            </CoachProvider>
          </SessionProvider>
        </TrainingProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
