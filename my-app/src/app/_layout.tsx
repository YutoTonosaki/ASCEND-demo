import { LocalizationProvider } from "@/localization";
import { DarkTheme, ThemeProvider, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@/config/theme";
import { TrainingProvider } from "@/training/provider";
import { SessionProvider } from "@/sessions/provider";
import { GrowthProvider } from "@/growth/provider";
import { CoachProvider } from "@/coach/provider";
import { GrowthPresentationProvider } from "@/presentation/provider";
import { RewardsProvider } from "@/rewards/provider";
import { CareerProvider } from "@/career/provider";
import { SeasonsProvider } from "@/seasons/provider";
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
        <LocalizationProvider><TrainingProvider>
          <SessionProvider>
            <CoachProvider>
              <GrowthProvider>
                <CareerProvider>
                  <SeasonsProvider>
                    <RewardsProvider>
                      <GrowthPresentationProvider>
                        <StatusBar style="light" />
                        <Stack screenOptions={{ headerShown: false }}>
                          <Stack.Screen name="(tabs)" />
                        </Stack>
                      </GrowthPresentationProvider>
                    </RewardsProvider>
                  </SeasonsProvider>
                </CareerProvider>
              </GrowthProvider>
            </CoachProvider>
          </SessionProvider>
        </TrainingProvider></LocalizationProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
