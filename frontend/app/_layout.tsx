import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, LogBox, View } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { LockScreen } from "@/src/components/LockScreen";
import { SetupWizard } from "@/src/components/SetupWizard";
import { ToastProvider } from "@/src/components/ui";
import { queryClient } from "@/src/query-client";
import { StoreProvider, useStore } from "@/src/store";
import { useTheme } from "@/src/theme";

// Disable logbox errors etc so that users can see the app
// and agent works as expected.
LogBox.ignoreAllLogs(true);

function Gate({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { ready, state, locked } = useStore();
  const { colors, scheme } = useTheme();
  const loading = !fontsLoaded || !ready;
  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="asset/[id]" />
        <Stack.Screen name="add-asset" />
        <Stack.Screen name="bulk-update" />
      </Stack>
      {loading ? (
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : !state.isInitialized ? (
        <SetupWizard />
      ) : locked && state.settings.pinEnabled ? (
        <LockScreen />
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "Barlow-SemiBold": require("../assets/fonts/BarlowCondensed-SemiBold.ttf"),
    "Barlow-Bold": require("../assets/fonts/BarlowCondensed-Bold.ttf"),
    "Plex-Regular": require("../assets/fonts/IBMPlexSans-Regular.ttf"),
    "Plex-Medium": require("../assets/fonts/IBMPlexSans-Medium.ttf"),
    "Plex-SemiBold": require("../assets/fonts/IBMPlexSans-SemiBold.ttf"),
  });
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <KeyboardProvider>
          <StoreProvider>
            <ToastProvider>
              <Gate fontsLoaded={fontsLoaded || !!fontError} />
            </ToastProvider>
          </StoreProvider>
        </KeyboardProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
