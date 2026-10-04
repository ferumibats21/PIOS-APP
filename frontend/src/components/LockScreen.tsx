import { Delete, Lock } from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Txt } from "@/src/components/ui";
import { useStore } from "@/src/store";
import { fonts, makeStyles, useTheme } from "@/src/theme";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

export function LockScreen() {
  const { state, setLocked } = useStore();
  const { colors } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const shake = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.value }] }));

  const press = (k: string) => {
    if (k === "del") return setPin((p) => p.slice(0, -1));
    if (!k) return;
    const next = (pin + k).slice(0, 4);
    setPin(next);
    setError(false);
    if (next.length === 4) {
      if (next === state.settings.pin) {
        setLocked(false);
      } else {
        setError(true);
        shake.value = withSequence(withTiming(-10, { duration: 50 }), withTiming(10, { duration: 50 }), withTiming(-6, { duration: 50 }), withTiming(0, { duration: 50 }));
        setTimeout(() => setPin(""), 250);
      }
    }
  };

  return (
    <View style={[s.root, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]} testID="lock-screen">
      <View style={{ alignItems: "center", gap: 8 }}>
        <View style={s.icon}>
          <Lock color={colors.brandPrimary} size={26} />
        </View>
        <Txt v="h1">PIOS Terkunci</Txt>
        <Txt v="caption" c={error ? "error" : "muted"} testID="lock-message">
          {error ? "PIN salah, coba lagi" : "Masukkan PIN 4 digit"}
        </Txt>
        <Animated.View style={[{ flexDirection: "row", gap: 16, marginTop: 16 }, shakeStyle]}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={[s.dot, i < pin.length && { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary }]} />
          ))}
        </Animated.View>
      </View>
      <View style={s.pad}>
        {KEYS.map((k, i) => (
          <Pressable
            key={i}
            testID={k ? `lock-key-${k}` : undefined}
            disabled={!k}
            onPress={() => press(k)}
            style={({ pressed }) => [s.key, !k && { backgroundColor: "transparent" }, pressed && { opacity: 0.6 }]}
          >
            {k === "del" ? <Delete color={colors.onSurface} size={22} /> : <Text style={s.keyText}>{k}</Text>}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.surface, justifyContent: "space-between", paddingHorizontal: 32 },
  icon: { width: 56, height: 56, borderRadius: 16, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5, borderColor: c.borderStrong },
  pad: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 14, maxWidth: 300, alignSelf: "center", width: "100%" },
  key: { width: "30%", height: 64, borderRadius: 16, backgroundColor: c.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  keyText: { fontFamily: fonts.display, fontSize: 28, color: c.onSurface },
}));
