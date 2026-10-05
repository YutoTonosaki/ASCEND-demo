import { useLocalization, type TranslationKey } from "@/localization";
import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/config/theme";
import { Icon, type IconName } from "@/components/ui/icon";
const tabs: { name: string; title: TranslationKey; icon: IconName }[] = [
  { name: "index", title: "nav.home", icon: "home" },
  { name: "train", title: "nav.train", icon: "train" },
  { name: "player", title: "nav.player", icon: "player" },
  { name: "career", title: "nav.career", icon: "career" },
  { name: "shop", title: "nav.shop", icon: "shop" },
];
export default function TabLayout() {
  const { tr } = useLocalization();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.bronze,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64 + Math.max(insets.bottom, 8),
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "700",
          letterSpacing: 0.6,
        },
        tabBarHideOnKeyboard: true,
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tr(tab.title),
            tabBarAccessibilityLabel: tr(tab.title),
            tabBarIcon: ({ color }) => <Icon name={tab.icon} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
