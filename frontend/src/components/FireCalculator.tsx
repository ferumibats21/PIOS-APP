import { ChevronDown, ChevronRight, Flame, RefreshCw } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Pressable, View } from "react-native";

import { LineChart } from "@/src/components/charts";
import { Btn, Card, Field, Txt } from "@/src/components/ui";
import { setSettings } from "@/src/lib/actions";
import { CATEGORIES, emaDCA, fmtCompact, fmtIDR, fmtNum, fmtRpInput, monteCarlo, parseDec, parseRp, portfolioAssumption, totals } from "@/src/lib/calc";
import { CategoryId } from "@/src/lib/types";
import { useStore } from "@/src/store";
import { useTheme } from "@/src/theme";

function AssumeField({ label, initial, onCommit, testID }: { label: string; initial: number; onCommit: (v: string) => void; testID: string }) {
  const [v, setV] = useState(String(initial));
  return <Field containerStyle={{ width: 90 }} suffix="%" label={label} keyboardType="decimal-pad" value={v} onChangeText={setV} onBlur={() => onCommit(v)} onSubmitEditing={() => onCommit(v)} testID={testID} />;
}

export function FireCalculator() {
  const { state, update } = useStore();
  const { colors } = useTheme();
  const [expense, setExpense] = useState(fmtRpInput(String(state.settings.annualExpense)));
  const [seed, setSeed] = useState(0);
  const [showAssume, setShowAssume] = useState(false);

  const nw = useMemo(() => totals(state).netWorth, [state]);
  const ema = useMemo(() => emaDCA(state.ledger), [state.ledger]);
  const monthly = ema.ema > 0 ? ema.ema : state.settings.lastRutin;
  const { mu, sigma } = useMemo(() => portfolioAssumption(state), [state]);
  const target = state.settings.annualExpense * 25;
  const progress = target > 0 ? (nw / target) * 100 : 0;

  const result = useMemo(
    () => (target > 0 ? monteCarlo({ start: nw, monthly, mu, sigma, target, years: 40, iterations: 250 }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nw, monthly, mu, sigma, target, seed],
  );

  const year = new Date().getFullYear();
  const fmtYears = (y: number) => (isFinite(y) ? `${fmtNum(y, 1)} thn` : "> 40 thn");
  const fmtYear = (y: number) => (isFinite(y) ? `≈ ${Math.round(year + y)}` : "belum tercapai");
  const maxBar = Math.max(...ema.values, 1);
  const horizon = result ? Math.min(result.years, 30) : 0;

  const scenarios = result
    ? [
        { key: "conservative", label: "Conservative", sub: "90% probabilitas sukses", y: result.conservative, color: colors.warning },
        { key: "baseline", label: "Baseline", sub: "50% probabilitas sukses", y: result.baseline, color: colors.brandPrimary },
        { key: "optimistic", label: "Optimistic", sub: "10% probabilitas sukses", y: result.optimistic, color: colors.catReksadana },
      ]
    : [];

  const setAssume = (id: CategoryId, field: "ret" | "vol", v: string) =>
    update((st) =>
      setSettings(st, { assumptions: { ...st.settings.assumptions, [id]: { ...st.settings.assumptions[id], [field]: parseDec(v) } } }),
    );

  return (
    <Card testID="fire-calculator-card" style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Flame color={colors.warning} size={18} />
        <Txt v="title" style={{ flex: 1 }}>
          FIRE Calculator · Monte Carlo
        </Txt>
        <Txt v="label">250 iterasi</Txt>
      </View>

      <Field
        label="Target Pengeluaran Tahunan (Retirement)"
        prefix="Rp"
        keyboardType="number-pad"
        value={expense}
        onChangeText={(v) => setExpense(fmtRpInput(v))}
        onBlur={() => update((st) => setSettings(st, { annualExpense: parseRp(expense) }))}
        onSubmitEditing={() => update((st) => setSettings(st, { annualExpense: parseRp(expense) }))}
        testID="fire-expense-input"
      />

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Txt v="label">Target FIRE (×25)</Txt>
          <Txt v="numStrong" testID="fire-target-number">
            {fmtCompact(target)}
          </Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt v="label">Progress</Txt>
          <Txt v="numStrong" c="brandPrimary" testID="fire-progress-percent">
            {fmtNum(progress, 1)}%
          </Txt>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Txt v="label">Auto DCA (EMA α0.2)</Txt>
          <Txt v="num" testID="fire-auto-dca">
            {fmtIDR(monthly)}/bln
          </Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt v="label">E[Return] · Vol</Txt>
          <Txt v="num" testID="fire-expected-return">
            {fmtNum(mu, 1)}% · {fmtNum(sigma, 1)}%
          </Txt>
        </View>
      </View>

      <View>
        <Txt v="caption" style={{ marginBottom: 4 }}>
          Alokasi Rutin 6 bulan terakhir (exclude Dana Bonus){ema.ema === 0 ? " — belum ada data, pakai input terakhir" : ""}
        </Txt>
        <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 6, height: 44 }} testID="fire-ema-bars">
          {ema.values.map((v, i) => (
            <View key={i} style={{ flex: 1, alignItems: "center", gap: 2 }}>
              <View style={{ width: "100%", height: Math.max(2, (v / maxBar) * 30), backgroundColor: v > 0 ? colors.brandPrimary : colors.surfaceTertiary, borderRadius: 2 }} />
              <Txt v="caption" style={{ fontSize: 9 }}>
                {ema.months[i].slice(5)}
              </Txt>
            </View>
          ))}
        </View>
      </View>

      {result ? (
        <>
          <View style={{ gap: 8 }}>
            {scenarios.map((sc) => (
              <View key={sc.key} testID={`fire-scenario-${sc.key}`} style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 10, backgroundColor: colors.surfaceTertiary }}>
                <View style={{ width: 4, height: 32, borderRadius: 2, backgroundColor: sc.color }} />
                <View style={{ flex: 1 }}>
                  <Txt v="bodyStrong">{sc.label}</Txt>
                  <Txt v="caption">{sc.sub}</Txt>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Txt v="numStrong" style={{ color: sc.color }}>
                    {fmtYears(sc.y)}
                  </Txt>
                  <Txt v="caption">{fmtYear(sc.y)}</Txt>
                </View>
              </View>
            ))}
          </View>
          <View>
            <Txt v="caption" style={{ marginBottom: 4 }}>
              Proyeksi portofolio {horizon} tahun (P10 / P50 / P90) vs Target
            </Txt>
            <LineChart
              testID="fire-projection-chart"
              height={150}
              formatY={fmtCompact}
              labels={Array.from({ length: horizon + 1 }, (_, i) => String(year + i).slice(2))}
              series={[
                { values: result.p10.slice(0, horizon + 1), color: colors.warning },
                { values: result.p50.slice(0, horizon + 1), color: colors.brandPrimary, fill: true },
                { values: result.p90.slice(0, horizon + 1), color: colors.catReksadana },
                { values: Array(horizon + 1).fill(target), color: colors.muted, dashed: true },
              ]}
            />
            <Txt v="caption" style={{ marginTop: 4 }} testID="fire-success-rate">
              Peluang mencapai FIRE dalam 40 tahun: {fmtNum(result.successRate, 0)}%
            </Txt>
          </View>
          <Btn size="sm" variant="secondary" icon={RefreshCw} label="Jalankan Ulang Simulasi" onPress={() => setSeed((x) => x + 1)} testID="fire-rerun-button" />
        </>
      ) : (
        <Txt v="caption">Isi target pengeluaran tahunan untuk menjalankan simulasi.</Txt>
      )}

      <Pressable testID="fire-assumptions-toggle" onPress={() => setShowAssume((v) => !v)} style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36 }}>
        {showAssume ? <ChevronDown color={colors.muted} size={16} /> : <ChevronRight color={colors.muted} size={16} />}
        <Txt v="label">Asumsi Return & Volatilitas per Aset</Txt>
      </Pressable>
      {showAssume &&
        CATEGORIES.map((c) => (
          <View key={c.id} style={{ flexDirection: "row", alignItems: "flex-end", gap: 8 }}>
            <Txt v="caption" c="onSurfaceSecondary" style={{ flex: 1, paddingBottom: 12 }}>
              {c.label}
            </Txt>
            <AssumeField label="Return" initial={state.settings.assumptions[c.id].ret} onCommit={(v) => setAssume(c.id, "ret", v)} testID={`assume-ret-${c.id}`} />
            <AssumeField label="Vol" initial={state.settings.assumptions[c.id].vol} onCommit={(v) => setAssume(c.id, "vol", v)} testID={`assume-vol-${c.id}`} />
          </View>
        ))}
    </Card>
  );
}
