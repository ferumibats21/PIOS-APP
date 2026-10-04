// Design tokens for PIOS. Dark default + Light, toggled in-app (persisted by the store).
// Keys match the "color" block of /app/design_guidelines.json.

import { useMemo, useSyncExternalStore } from "react";
import { Appearance, StyleSheet } from "react-native";

export type ColorScheme = "light" | "dark";

const dark = {
  surface: "#0F1014",
  onSurface: "#F8F9FA",
  surfaceSecondary: "#1A1B22",
  onSurfaceSecondary: "#E4E4E7",
  surfaceTertiary: "#272831",
  onSurfaceTertiary: "#D4D4D8",
  surfaceInverse: "#FFFFFF",
  onSurfaceInverse: "#0F1014",
  muted: "#8B8B94",

  brand: "#059669",
  onBrand: "#FFFFFF",
  brandPrimary: "#10B981",
  onBrandPrimary: "#04281D",
  brandSecondary: "#34D399",
  onBrandSecondary: "#022C22",
  brandTertiary: "#0B3B2D",
  onBrandTertiary: "#A3E635",

  success: "#10B981",
  onSuccess: "#FFFFFF",
  warning: "#F5A623",
  onWarning: "#4A2800",
  error: "#EF4444",
  onError: "#FFFFFF",
  info: "#F5A623",
  onInfo: "#4A2800",

  border: "#272831",
  borderStrong: "#3F414D",
  divider: "#1A1B22",

  // 5 asset category colors (no blues)
  catCash: "#A1A1AA",
  catReksadana: "#A3E635",
  catIdStocks: "#10B981",
  catUsdStocks: "#F97316",
  catGold: "#FACC15",
  backdrop: "rgba(0,0,0,0.6)",
};

export type ThemeColors = typeof dark;

const light: ThemeColors = {
  surface: "#FFFFFF",
  onSurface: "#0F1014",
  surfaceSecondary: "#F4F4F5",
  onSurfaceSecondary: "#27272A",
  surfaceTertiary: "#E8E8EB",
  onSurfaceTertiary: "#3F3F46",
  surfaceInverse: "#0F1014",
  onSurfaceInverse: "#FFFFFF",
  muted: "#6B6B74",

  brand: "#059669",
  onBrand: "#FFFFFF",
  brandPrimary: "#059669",
  onBrandPrimary: "#FFFFFF",
  brandSecondary: "#047857",
  onBrandSecondary: "#FFFFFF",
  brandTertiary: "#D1FAE5",
  onBrandTertiary: "#064E3B",

  success: "#059669",
  onSuccess: "#FFFFFF",
  warning: "#B45309",
  onWarning: "#FFFFFF",
  error: "#DC2626",
  onError: "#FFFFFF",
  info: "#B45309",
  onInfo: "#FFFFFF",

  border: "#E4E4E7",
  borderStrong: "#C9C9CF",
  divider: "#EFEFF1",

  catCash: "#71717A",
  catReksadana: "#65A30D",
  catIdStocks: "#059669",
  catUsdStocks: "#EA580C",
  catGold: "#CA8A04",
  backdrop: "rgba(0,0,0,0.45)",
};

export const themes: { light: ThemeColors; dark: ThemeColors } = { light, dark };
export const defaultScheme: ColorScheme = "dark";

export const fonts = {
  display: "Barlow-SemiBold",
  displayBold: "Barlow-Bold",
  regular: "Plex-Regular",
  medium: "Plex-Medium",
  semibold: "Plex-SemiBold",
};

let current: ColorScheme = defaultScheme;
const listeners = new Set<() => void>();

export function setColorScheme(scheme: ColorScheme | null) {
  const next = scheme ?? defaultScheme;
  if (next === current) return;
  current = next;
  try {
    Appearance.setColorScheme?.(next);
  } catch {}
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useTheme(): { scheme: ColorScheme; colors: ThemeColors } {
  const scheme = useSyncExternalStore(subscribe, () => current, () => current);
  return { scheme, colors: themes[scheme] };
}

export function makeStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (colors: ThemeColors) => T & StyleSheet.NamedStyles<any>,
): () => T {
  return function useStyles(): T {
    const { colors } = useTheme();
    return useMemo(() => StyleSheet.create(factory(colors)), [colors]);
  };
}
