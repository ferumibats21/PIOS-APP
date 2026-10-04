import { Tabs } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { BookOpen, Layers, LayoutDashboard, SlidersHorizontal, Compass } from "lucide-react-native";
import { Platform } from "react-native";

import { usesNativeTabs } from "@/src/navigation";
import { fonts, useTheme } from "@/src/theme";

export default function TabsLayout() {
  const { colors } = useTheme();

  if (usesNativeTabs) {
    return (
      <NativeTabs tintColor={colors.brandPrimary}>
        <NativeTabs.Trigger name="index">
          <NativeTabs.Trigger.Icon sf="square.grid.2x2.fill" />
          <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="audit">
          <NativeTabs.Trigger.Icon sf="square.stack.3d.up.fill" />
          <NativeTabs.Trigger.Label>Audit</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="engine">
          <NativeTabs.Trigger.Icon sf="slider.horizontal.3" />
          <NativeTabs.Trigger.Label>Engine</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="journal">
          <NativeTabs.Trigger.Icon sf="book.fill" />
          <NativeTabs.Trigger.Label>Journal</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="playbook">
          <NativeTabs.Trigger.Icon sf="safari.fill" />
          <NativeTabs.Trigger.Label>Playbook</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }

  const tab = (name: string, title: string, Icon: typeof Layers) => (
    <Tabs.Screen
      name={name}
      options={{
        title,
        tabBarButtonTestID: `tab-${name}`,
        tabBarIcon: ({ color }) => <Icon color={color} size={20} strokeWidth={2} />,
      }}
    />
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          ...(Platform.OS === "web" ? { height: 64 } : {}),
        },
        tabBarItemStyle: { alignSelf: "center" },
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 10 },
      }}
    >
      {tab("index", "Dashboard", LayoutDashboard)}
      {tab("audit", "Audit", Layers)}
      {tab("engine", "Engine", SlidersHorizontal)}
      {tab("journal", "Journal", BookOpen)}
      {tab("playbook", "Playbook", Compass)}
    </Tabs>
  );
}
