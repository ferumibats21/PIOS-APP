import { useRouter } from "expo-router";
import { ChevronDown, ChevronRight, Eye, EyeOff, Plus, RefreshCw } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Btn, Card, IconBtn, PL, ScreenHeader, Txt } from "@/src/components/ui";
import { CATEGORIES, floating, fmtIDR, fmtPrice, fmtQty, totals } from "@/src/lib/calc";
import { Asset } from "@/src/lib/types";
import { usesNativeTabs } from "@/src/navigation";
import { useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

function AssetRow({ a, rate, onPress }: { a: Asset; rate: number; onPress: () => void }) {
  const s = useStyles();
  const f = floating(a, rate);
  const isCash = a.categoryId === "cash";
  return (
    <Pressable testID={`asset-row-${a.id}`} onPress={onPress} style={({ pressed }) => [s.row, pressed && { opacity: 0.7 }]}>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Txt v="title" numberOfLines={1}>
            {a.ticker}
          </Txt>
          {a.hidden ? <Txt v="label">· hidden</Txt> : null}
        </View>
        <Txt v="caption" numberOfLines={1}>
          {fmtQty(a)}
          {isCash ? "" : ` · Avg ${fmtPrice(a, a.avgBuyPrice)} → ${fmtPrice(a, a.currentPrice)}`}
        </Txt>
      </View>
      <View style={{ alignItems: "flex-end", gap: 2 }}>
        <Txt v="num">{fmtIDR(f.mv)}</Txt>
        {isCash ? <Txt v="caption">{a.currency ?? "IDR"}</Txt> : <PL value={f.pl} pct={f.pct} />}
      </View>
    </Pressable>
  );
}

export default function Audit() {
  const { state } = useStore();
  const { colors } = useTheme();
  const s = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const [open, setOpen] = useState<Record<string, boolean>>({ cash: true, id_stocks: true });
  const [showHidden, setShowHidden] = useState(false);
  const t = useMemo(() => totals(state), [state]);
  const rate = state.settings.usdRate;

  return (
    <View style={s.root} testID="audit-screen">
      <ScreenHeader
        title="Audit"
        subtitle={`Total ${fmtIDR(t.netWorth)} · USD/IDR ${rate.toLocaleString("id-ID")}`}
        right={<IconBtn testID="toggle-hidden-assets-button" icon={showHidden ? EyeOff : Eye} onPress={() => setShowHidden((v) => !v)} />}
      />
      <View style={s.actions}>
        <Btn style={{ flex: 1 }} variant="secondary" size="sm" icon={RefreshCw} label="Bulk Price Updater" testID="open-bulk-updater-button" onPress={() => router.push("/bulk-update")} />
        <Btn style={{ flex: 1 }} size="sm" icon={Plus} label="Tambah Aset Baru" testID="open-add-asset-button" onPress={() => router.push("/add-asset")} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: bottomChrome + 24 }}>
        {state.assets.length === 0 && (
          <Card testID="audit-empty-state">
            <Txt v="title">Belum ada aset terdaftar.</Txt>
            <Txt v="caption" style={{ marginVertical: 6 }}>
              Tambahkan Cash, Reksadana, Saham ID/US, atau Emas untuk mulai tracking.
            </Txt>
            <Btn label="Tambah Aset" icon={Plus} size="sm" testID="audit-empty-add-button" onPress={() => router.push("/add-asset")} style={{ alignSelf: "flex-start" }} />
          </Card>
        )}
        {CATEGORIES.map((c) => {
          const items = state.assets.filter((a) => a.categoryId === c.id && (showHidden || !a.hidden));
          const cat = t.byCat[c.id];
          const pl = cat.mv - cat.inv;
          const isOpen = !!open[c.id];
          return (
            <View key={c.id} style={s.cat} testID={`category-${c.id}`}>
              <Pressable testID={`category-toggle-${c.id}`} onPress={() => setOpen((o) => ({ ...o, [c.id]: !o[c.id] }))} style={s.catHead}>
                <View style={[s.catBar, { backgroundColor: colors[c.colorKey] }]} />
                <View style={{ flex: 1 }}>
                  <Txt v="title">{c.label}</Txt>
                  <Txt v="caption">
                    {items.length} item · {t.netWorth > 0 ? ((cat.mv / t.netWorth) * 100).toFixed(1) : "0.0"}%
                  </Txt>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Txt v="num" testID={`category-value-${c.id}`}>
                    {fmtIDR(cat.mv)}
                  </Txt>
                  {c.id !== "cash" && <PL value={pl} pct={cat.inv > 0 ? (pl / cat.inv) * 100 : 0} />}
                </View>
                {isOpen ? <ChevronDown color={colors.muted} size={18} /> : <ChevronRight color={colors.muted} size={18} />}
              </Pressable>
              {isOpen && (
                <Animated.View entering={FadeIn.duration(200)}>
                  {items.length === 0 ? (
                    <Pressable testID={`category-add-${c.id}`} onPress={() => router.push(`/add-asset?cat=${c.id}`)} style={s.emptyRow}>
                      <Plus color={colors.brandPrimary} size={14} />
                      <Txt v="caption" c="brandPrimary">
                        Tambah {c.label}
                      </Txt>
                    </Pressable>
                  ) : (
                    items.map((a) => <AssetRow key={a.id} a={a} rate={rate} onPress={() => router.push(`/asset/${a.id}`)} />)
                  )}
                </Animated.View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  actions: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: c.border },
  cat: { backgroundColor: c.surfaceSecondary, borderRadius: 12, borderWidth: 1, borderColor: c.border, overflow: "hidden" },
  catHead: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, minHeight: 60 },
  catBar: { width: 4, height: 32, borderRadius: 2 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: c.border, minHeight: 56 },
  emptyRow: { flexDirection: "row", alignItems: "center", gap: 6, padding: 12, borderTopWidth: 1, borderTopColor: c.border },
}));
