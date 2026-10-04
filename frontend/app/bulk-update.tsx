import { useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Btn, Card, Field, ScreenHeader, Txt, useToast } from "@/src/components/ui";
import { bulkPrices } from "@/src/lib/actions";
import { catOf, CATEGORIES, floating, fmtIDR, fmtPrice, isUSD, parseDec } from "@/src/lib/calc";
import { useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

export default function BulkUpdate() {
  const router = useRouter();
  const { state, update } = useStore();
  const toast = useToast();
  const { colors } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const items = useMemo(() => state.assets.filter((a) => a.categoryId !== "cash" && !a.hidden), [state.assets]);
  const [prices, setPrices] = useState<Record<string, string>>(() => Object.fromEntries(items.map((a) => [a.id, String(a.currentPrice)])));
  const [rate, setRate] = useState(String(state.settings.usdRate));

  const changed = items.filter((a) => {
    const p = parseDec(prices[a.id] ?? "");
    return p > 0 && p !== a.currentPrice;
  });
  const r = parseDec(rate);
  const rateChanged = r > 0 && r !== state.settings.usdRate;

  const save = () => {
    const map: Record<string, number> = {};
    changed.forEach((a) => (map[a.id] = parseDec(prices[a.id])));
    update((st) => bulkPrices(st, map, r > 0 ? r : st.settings.usdRate));
    toast(`${changed.length} harga diperbarui`);
    router.back();
  };

  return (
    <View style={s.root} testID="bulk-update-screen">
      <ScreenHeader title="Bulk Price Updater" subtitle={`${items.length} aset aktif`} back />
      <KeyboardAwareScrollView bottomOffset={96} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 120 }}>
        <Card>
          <Field label="Kurs USD/IDR" prefix="Rp" keyboardType="decimal-pad" value={rate} onChangeText={setRate} testID="bulk-usd-rate-input" />
        </Card>
        {items.length === 0 && (
          <Card>
            <Txt v="body" c="onSurfaceSecondary">
              Belum ada aset investasi untuk di-update.
            </Txt>
          </Card>
        )}
        {CATEGORIES.filter((c) => c.id !== "cash").map((c) => {
          const list = items.filter((a) => a.categoryId === c.id);
          if (!list.length) return null;
          return (
            <View key={c.id} style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors[catOf(c.id).colorKey] }} />
                <Txt v="label">{c.label}</Txt>
              </View>
              {list.map((a) => {
                const p = parseDec(prices[a.id] ?? "");
                const f = floating({ ...a, currentPrice: p || a.currentPrice }, r || state.settings.usdRate);
                const dirty = p > 0 && p !== a.currentPrice;
                return (
                  <View key={a.id} style={[s.row, dirty && { borderColor: colors.brandPrimary }]} testID={`bulk-row-${a.id}`}>
                    <View style={{ flex: 1 }}>
                      <Txt v="title" numberOfLines={1}>
                        {a.ticker}
                      </Txt>
                      <Txt v="caption" numberOfLines={1}>
                        Lama {fmtPrice(a, a.currentPrice)} · MV {fmtIDR(f.mv)}
                      </Txt>
                    </View>
                    <Field
                      containerStyle={{ width: 140 }}
                      prefix={isUSD(a) ? "$" : "Rp"}
                      keyboardType="decimal-pad"
                      value={prices[a.id] ?? ""}
                      onChangeText={(v) => setPrices((x) => ({ ...x, [a.id]: v }))}
                      testID={`bulk-price-input-${a.id}`}
                    />
                  </View>
                );
              })}
            </View>
          );
        })}
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ opened: insets.bottom }}>
        <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Btn
            label={`Simpan Semua (${changed.length}${rateChanged ? " + kurs" : ""})`}
            icon={Check}
            disabled={!changed.length && !rateChanged}
            onPress={save}
            testID="bulk-save-button"
          />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  row: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 12, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
  footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border },
}));
