import { useRouter } from "expo-router";
import { Bell, Bitcoin, ChevronRight, Plus } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Donut, LineChart } from "@/src/components/charts";
import { Btn, Card, Divider, PL, Segmented, StatBox, Txt } from "@/src/components/ui";
import { setSettings } from "@/src/lib/actions";
import { btcCycle, CATEGORIES, fmtCompact, fmtIDR, fmtNum, monthKey, monthName, netWorthSeries, totalContribution, totals } from "@/src/lib/calc";
import { usesNativeTabs } from "@/src/navigation";
import { useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 19) return "Selamat sore";
  return "Selamat malam";
}

export default function Dashboard() {
  const { state, update } = useStore();
  const { colors } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const [mode, setMode] = useState<"month" | "year">("month");

  const t = useMemo(() => totals(state), [state]);
  const contribution = totalContribution(state);
  const target = state.settings.annualExpense * 25;
  const fireP = target > 0 ? (t.netWorth / target) * 100 : 0;
  const series = netWorthSeries(state.snapshots, mode);
  const now = new Date();
  const cycle = btcCycle(now);
  const showReview = now.getDate() >= 25 && state.settings.reviewDoneMonth !== monthKey(now);
  const hasAssets = state.assets.some((a) => a.quantity > 0);

  return (
    <View style={s.root} testID="dashboard-screen">
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ flex: 1 }}>
          <Txt v="caption">{greeting()},</Txt>
          <Txt v="h1" numberOfLines={1} testID="dashboard-welcome">
            {state.settings.userName || "Investor"}
          </Txt>
        </View>
        <View style={s.dateChip}>
          <Txt v="label" c="onSurfaceSecondary">
            {monthName(now)}
          </Txt>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomChrome + 24 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(350)}>
          <Card testID="networth-hero">
            <Txt v="label">Total Net Worth</Txt>
            <Txt v="hero" testID="networth-value" numberOfLines={1} adjustsFontSizeToFit>
              {fmtIDR(t.netWorth)}
            </Txt>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
              <Txt v="caption">Floating P/L</Txt>
              <PL value={t.floatingPL} pct={t.floatingPct} testID="networth-floating-pl" />
            </View>
            <View style={{ marginTop: 12, gap: 6 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Txt v="label">FIRE Progress</Txt>
                <Txt v="num" c="brandPrimary" testID="fire-progress-value">
                  {fmtNum(fireP, 1)}%
                </Txt>
              </View>
              <View style={s.track}>
                <View style={[s.fill, { width: `${Math.min(100, fireP)}%` }]} />
              </View>
            </View>
            <View style={{ height: 12 }} />
            <Divider />
            <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
              <StatBox label="Total Kontribusi" value={fmtIDR(contribution)} testID="total-contribution-value" />
              <StatBox label="Target FIRE" value={fmtCompact(target)} testID="fire-target-value" />
            </View>
          </Card>
        </Animated.View>

        {showReview && (
          <Animated.View entering={FadeInDown.delay(60)}>
            <View style={s.review} testID="review-reminder-widget">
              <Bell color={colors.onWarning} size={18} />
              <View style={{ flex: 1 }}>
                <Txt v="title" c="onWarning">
                  Review Bulanan — tgl 25
                </Txt>
                <Txt v="caption" c="onWarning">
                  Update harga pasar, cek alokasi & tulis thesis bulan ini.
                </Txt>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                  <Btn size="sm" variant="secondary" label="Update Harga" testID="review-update-prices-button" onPress={() => router.push("/bulk-update")} />
                  <Btn size="sm" variant="secondary" label="Selesai" testID="review-done-button" onPress={() => update((st) => setSettings(st, { reviewDoneMonth: monthKey(now) }))} />
                </View>
              </View>
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(100)}>
          <Pressable testID="btc-cycle-banner" onPress={() => router.push("/(tabs)/playbook")} style={({ pressed }) => [s.btc, { borderLeftColor: colors[cycle.phase.colorKey], opacity: pressed ? 0.8 : 1 }]}>
            <View style={[s.btcIcon, { backgroundColor: colors.surfaceTertiary }]}>
              <Bitcoin color={colors[cycle.phase.colorKey]} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Txt v="label">BTC Cycle Signal · {monthName(now)}</Txt>
              <Txt v="h2" style={{ color: colors[cycle.phase.colorKey] }} numberOfLines={2} testID="btc-cycle-phase">
                {cycle.phase.title} / {cycle.phase.subtitle}
              </Txt>
              <Txt v="caption">
                {cycle.monthsSinceHalving} bln sejak halving · {cycle.monthsToNext} bln ke halving berikutnya
              </Txt>
            </View>
            <ChevronRight color={colors.muted} size={18} />
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150)}>
          <Card testID="allocation-card">
            <Txt v="label" style={{ marginBottom: 10 }}>
              Portfolio Allocation
            </Txt>
            {hasAssets ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                <Donut data={CATEGORIES.map((c) => ({ value: Math.max(0, t.byCat[c.id].mv), color: colors[c.colorKey] }))} testID="allocation-donut">
                  <Txt v="label">Aset</Txt>
                  <Txt v="numStrong">{fmtCompact(t.netWorth)}</Txt>
                </Donut>
                <View style={{ flex: 1, gap: 8 }}>
                  {CATEGORIES.map((c) => {
                    const pct = t.netWorth > 0 ? (t.byCat[c.id].mv / t.netWorth) * 100 : 0;
                    return (
                      <View key={c.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }} testID={`allocation-legend-${c.id}`}>
                        <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: colors[c.colorKey] }} />
                        <Txt v="caption" c="onSurfaceSecondary" style={{ flex: 1 }} numberOfLines={1}>
                          {c.label}
                        </Txt>
                        <Txt v="num" style={{ fontSize: 14 }}>
                          {fmtNum(pct, 1)}%
                        </Txt>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : (
              <View style={{ alignItems: "flex-start", gap: 10 }}>
                <Txt v="body" c="onSurfaceSecondary">
                  Belum ada aset untuk ditampilkan.
                </Txt>
                <Btn label="Tambah Aset Pertama" icon={Plus} size="sm" testID="dashboard-add-first-asset-button" onPress={() => router.push("/add-asset")} />
              </View>
            )}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200)}>
          <Card testID="networth-chart-card">
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <Txt v="label">Net Worth Evolution</Txt>
              <View style={{ width: 150 }}>
                <Segmented
                  testIDPrefix="networth-mode"
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: "month", label: "Bulanan" },
                    { value: "year", label: "Tahunan" },
                  ]}
                />
              </View>
            </View>
            <LineChart
              testID="networth-chart"
              series={[{ values: series.map((p) => p.value), color: colors.brandPrimary, fill: true }]}
              labels={series.map((p) => p.label)}
              formatY={fmtCompact}
              height={170}
            />
            <Txt v="caption" style={{ marginTop: 6 }}>
              Snapshot otomatis tersimpan setiap ada perubahan portofolio (jam perangkat).
            </Txt>
          </Card>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  header: { paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: c.border, backgroundColor: c.surface },
  dateChip: { paddingHorizontal: 10, height: 28, borderRadius: 999, backgroundColor: c.surfaceTertiary, justifyContent: "center" },
  track: { height: 6, borderRadius: 3, backgroundColor: c.surfaceTertiary, overflow: "hidden" },
  fill: { height: 6, borderRadius: 3, backgroundColor: c.brandPrimary },
  review: { flexDirection: "row", gap: 12, padding: 12, borderRadius: 12, backgroundColor: c.warning },
  btc: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border, borderLeftWidth: 4 },
  btcIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
}));
