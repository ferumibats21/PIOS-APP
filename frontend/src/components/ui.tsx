import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleProp,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import Animated, { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { useRouter } from "expo-router";

import { fonts, makeStyles, ThemeColors, useTheme } from "@/src/theme";
import { fmtIDR, fmtPct } from "@/src/lib/calc";

type Variant = "hero" | "h1" | "h2" | "title" | "body" | "bodyStrong" | "label" | "caption" | "num" | "numStrong";

const variantStyle: Record<Variant, TextStyle> = {
  hero: { fontFamily: fonts.displayBold, fontSize: 38, lineHeight: 42, fontVariant: ["tabular-nums"] },
  h1: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 32, letterSpacing: 0.2 },
  h2: { fontFamily: fonts.display, fontSize: 20, lineHeight: 24, letterSpacing: 0.3 },
  title: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 20 },
  body: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  bodyStrong: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  label: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, letterSpacing: 0.8, textTransform: "uppercase" },
  caption: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
  num: { fontFamily: fonts.display, fontSize: 16, lineHeight: 20, fontVariant: ["tabular-nums"] },
  numStrong: { fontFamily: fonts.displayBold, fontSize: 20, lineHeight: 24, fontVariant: ["tabular-nums"] },
};

export function Txt({
  v = "body",
  c,
  style,
  ...rest
}: TextProps & { v?: Variant; c?: keyof ThemeColors }) {
  const { colors } = useTheme();
  const color = colors[c ?? (v === "label" || v === "caption" ? "muted" : "onSurface")];
  return <Text {...rest} style={[variantStyle[v], { color }, style]} />;
}

export function Card({ children, style, testID }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; testID?: string }) {
  const s = useStyles();
  return (
    <View testID={testID} style={[s.card, style]}>
      {children}
    </View>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
export function Btn({
  label,
  onPress,
  variant = "primary",
  icon: Icon,
  disabled,
  loading,
  testID,
  size = "md",
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: BtnVariant;
  icon?: React.ComponentType<{ color?: string; size?: number; strokeWidth?: number }>;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  size?: "sm" | "md";
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const map: Record<BtnVariant, [keyof ThemeColors, keyof ThemeColors]> = {
    primary: ["brandPrimary", "onBrandPrimary"],
    secondary: ["surfaceTertiary", "onSurface"],
    ghost: ["surface", "onSurface"],
    danger: ["error", "onError"],
  };
  const [bg, fg] = map[variant];
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          height: size === "md" ? 48 : 36,
          paddingHorizontal: size === "md" ? 16 : 12,
          borderRadius: 12,
          backgroundColor: variant === "ghost" ? "transparent" : colors[bg],
          borderWidth: variant === "ghost" ? 1 : 0,
          borderColor: colors.borderStrong,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors[fg]} />
      ) : (
        <>
          {Icon ? <Icon color={colors[fg]} size={size === "md" ? 18 : 15} strokeWidth={2.2} /> : null}
          <Text style={{ color: colors[fg], fontFamily: fonts.semibold, fontSize: size === "md" ? 14 : 12 }} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function IconBtn({
  icon: Icon,
  onPress,
  testID,
  tint,
}: {
  icon: React.ComponentType<{ color?: string; size?: number }>;
  onPress: () => void;
  testID?: string;
  tint?: keyof ThemeColors;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => ({
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: colors.surfaceTertiary,
        alignItems: "center",
        justifyContent: "center",
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <Icon color={colors[tint ?? "onSurface"]} size={18} />
    </Pressable>
  );
}

export function Field({
  label,
  prefix,
  suffix,
  containerStyle,
  multiline,
  ...props
}: TextInputProps & { label?: string; prefix?: string; suffix?: string; containerStyle?: StyleProp<ViewStyle> }) {
  const s = useStyles();
  const { colors } = useTheme();
  const [focus, setFocus] = useState(false);
  return (
    <View style={[{ gap: 6 }, containerStyle]}>
      {label ? <Txt v="label">{label}</Txt> : null}
      <View style={[s.inputBox, multiline && { height: undefined, minHeight: 110, alignItems: "flex-start", paddingVertical: 10 }, focus && { borderColor: colors.brandPrimary }]}>
        {prefix ? <Text style={s.affix}>{prefix}</Text> : null}
        <TextInput
          placeholderTextColor={colors.muted}
          {...props}
          multiline={multiline}
          onFocus={(e) => {
            setFocus(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocus(false);
            props.onBlur?.(e);
          }}
          style={[s.input, multiline && { textAlignVertical: "top", minHeight: 90 }]}
        />
        {suffix ? <Text style={s.affix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

export function Chip({ label, selected, onPress, testID, dotColor }: { label: string; selected?: boolean; onPress: () => void; testID?: string; dotColor?: string }) {
  const { colors } = useTheme();
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => ({
        height: 36,
        flexShrink: 0,
        paddingHorizontal: 12,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? colors.brandPrimary : colors.border,
        backgroundColor: selected ? colors.brandTertiary : colors.surfaceSecondary,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      {dotColor ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: dotColor }} /> : null}
      <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: selected ? colors.onBrandTertiary : colors.onSurfaceSecondary }}>{label}</Text>
    </Pressable>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  testIDPrefix,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  testIDPrefix: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", backgroundColor: colors.surfaceTertiary, borderRadius: 10, padding: 3 }}>
      {options.map((o) => {
        const sel = o.value === value;
        return (
          <Pressable
            key={o.value}
            testID={`${testIDPrefix}-${o.value}`}
            onPress={() => onChange(o.value)}
            style={{ flex: 1, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: sel ? colors.surface : "transparent" }}
          >
            <Text style={{ fontFamily: sel ? fonts.semibold : fonts.regular, fontSize: 12, color: sel ? colors.onSurface : colors.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function PL({ value, pct, size = "sm", testID }: { value: number; pct?: number; size?: "sm" | "md"; testID?: string }) {
  const { colors } = useTheme();
  const color = value > 0.5 ? colors.success : value < -0.5 ? colors.error : colors.muted;
  return (
    <Text testID={testID} style={{ color, fontFamily: fonts.display, fontSize: size === "md" ? 16 : 13, fontVariant: ["tabular-nums"] }}>
      {value > 0 ? "+" : ""}
      {fmtIDR(value)}
      {pct !== undefined ? ` (${fmtPct(pct)})` : ""}
    </Text>
  );
}

export function Divider() {
  const { colors } = useTheme();
  return <View style={{ height: 1, backgroundColor: colors.border }} />;
}

export function ScreenHeader({ title, subtitle, right, back, testID }: { title: string; subtitle?: string; right?: React.ReactNode; back?: boolean; testID?: string }) {
  const insets = useSafeAreaInsets();
  const s = useStyles();
  const router = useRouter();
  const { colors } = useTheme();
  return (
    <View testID={testID} style={[s.header, { paddingTop: insets.top + 8 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
        {back ? (
          <Pressable testID="header-back-button" onPress={() => router.back()} hitSlop={10} style={{ width: 36, height: 44, justifyContent: "center" }}>
            <ChevronLeft color={colors.onSurface} size={24} />
          </Pressable>
        ) : null}
        <View style={{ flex: 1 }}>
          <Txt v="h1" numberOfLines={1}>
            {title}
          </Txt>
          {subtitle ? <Txt v="caption" numberOfLines={1}>{subtitle}</Txt> : null}
        </View>
      </View>
      {right}
    </View>
  );
}

export function Sheet({ visible, onClose, title, children, testID }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode; testID?: string }) {
  const insets = useSafeAreaInsets();
  const s = useStyles();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable testID={testID ? `${testID}-backdrop` : undefined} style={s.backdrop} onPress={onClose} />
        <View testID={testID} style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.grabber} />
          <Txt v="h2" style={{ marginBottom: 12 }}>
            {title}
          </Txt>
          {children}
        </View>
      </View>
    </Modal>
  );
}

type ToastKind = "success" | "error" | "warning";
const ToastCtx = createContext<(msg: string, kind?: ToastKind) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ id: number; msg: string; kind: ToastKind } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const show = useCallback((msg: string, kind: ToastKind = "success") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), msg, kind });
    timer.current = setTimeout(() => setToast(null), 2600);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {toast ? (
        <Animated.View
          key={toast.id}
          entering={FadeInUp}
          exiting={FadeOutUp}
          pointerEvents="none"
          testID="toast-message"
          style={{
            position: "absolute",
            top: insets.top + 8,
            left: 16,
            right: 16,
            backgroundColor: colors.surfaceInverse,
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
          }}
        >
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors[toast.kind] }} />
          <Text style={{ color: colors.onSurfaceInverse, fontFamily: fonts.medium, fontSize: 13, flex: 1 }}>{toast.msg}</Text>
        </Animated.View>
      ) : null}
    </ToastCtx.Provider>
  );
}

export function StatBox({ label, value, testID, color }: { label: string; value: string; testID?: string; color?: keyof ThemeColors }) {
  return (
    <View style={{ flex: 1, gap: 2 }}>
      <Txt v="label">{label}</Txt>
      <Txt v="num" c={color} testID={testID} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Txt>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  card: { backgroundColor: c.surfaceSecondary, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 12 },
  inputBox: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: c.surfaceTertiary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.surfaceTertiary,
    paddingHorizontal: 12,
    gap: 6,
  },
  input: { flex: 1, color: c.onSurface, fontFamily: fonts.medium, fontSize: 15, paddingVertical: 0, height: "100%" as any },
  affix: { color: c.muted, fontFamily: fonts.medium, fontSize: 13 },
  header: {
    backgroundColor: c.surface,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.backdrop },
  sheet: { backgroundColor: c.surfaceSecondary, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 8 },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: c.borderStrong, marginBottom: 12 },
}));
