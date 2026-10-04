import { Divide, RotateCcw, Zap } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Btn, Card, Field, ScreenHeader, Segmented, Txt, useToast } from "@/src/components/ui";
import { executeAllocation, previewUnits } from "@/src/lib/actions";
import { cashIDR, catOf, fmtIDR, fmtNum, fmtPrice, fmtRpInput, parseDec, parseRp } from "@/src/lib/calc";
import { usesNativeTabs } from "@/src/navigation";
import { useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

type Row = { pct: string; nom: string };

const trimPct = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

export default function Engine() {
  const { state, update } = useStore();
  const toast = useToast();
  const { colors } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const rate = state.settings.usdRate;

  const [rutin, setRutin] = useState(state.settings.lastRutin ? fmtRpInput(String(state.settings.lastRutin)) : "");
  const [bonus, setBonus] = useState("");
  const [source, setSource] = useState<"new" | "cash">("new");
  const [rows, setRows] = useState<Record<string, Row>>({});

  const R = parseRp(rutin);
  const B = parseRp(bonus);
  const T = R + B;
  const cash = cashIDR(state);

  const eligible = useMemo(
    () => state.assets.filter((a) => !a.hidden && a.currentPrice > 0 && (source === "new" || a.categoryId !== "cash")),
    [state.assets, source],
  );

  // Keep nominal in sync when total changes (percentage is the anchor)
  useEffect(() => {
    setRows((prev) => {
      const next: Record<string, Row> = {};
      for (const [id, r] of Object.entries(prev)) {
        const p = parseDec(r.pct);
        next[id] = { pct: r.pct, nom: p > 0 && T > 0 ? fmtRpInput(String(Math.round((T * p) / 100))) : r.pct ? "0" : "" };
      }
      return next;
    });
  }, [T]);

  const setPct = (id: string, v: string) => {
    const clean = v.replace(/[^0-9.,]/g, "");
    const p = parseDec(clean);
    setRows((r) => ({ ...r, [id]: { pct: clean, nom: clean ? fmtRpInput(String(Math.round((T * p) / 100))) : "" } }));
  };
  const setNom = (id: string, v: string) => {
    const n = parseRp(v);
    setRows((r) => ({ ...r, [id]: { nom: fmtRpInput(v), pct: v ? (T > 0 ? trimPct((n / T) * 100) : "0") : "" } }));
  };

  const sumNom = eligible.reduce((acc, a) => acc + parseRp(rows[a.id]?.nom ?? ""), 0);
  const sumPct = eligible.reduce((acc, a) => acc + parseDec(rows[a.id]?.pct ?? ""), 0);
  const exact = T > 0 && (sumNom === T || Math.abs(sumPct - 100) < 0.005);
  const cashOk = source === "new" || cash >= T;
  const valid = exact && cashOk;
  const remaining = T - sumNom;

  const splitEven = () => {
    if (!eligible.length) return;
    const base = Math.floor((100 / eligible.length) * 100) / 100;
    const next: Record<string, Row> = {};
    eligible.forEach((a, i) => {
      const p = i === eligible.length - 1 ? Math.round((100 - base * (eligible.length - 1)) * 100) / 100 : base;
      next[a.id] = { pct: trimPct(p), nom: fmtRpInput(String(Math.round((T * p) / 100))) };
    });
    setRows(next);
  };

  const execute = () => {
    // Build nominal rows; fix rounding remainder on largest row
    const list = eligible.map((a) => ({ assetId: a.id, nominal: parseRp(rows[a.id]?.nom ?? "") })).filter((r) => r.nominal > 0);
    const diff = T - list.reduce((x, r) => x + r.nominal, 0);
    if (diff !== 0 && list.length) {
      const big = list.reduce((m, r) => (r.nominal > m.nominal ? r : m), list[0]);
      big.nominal += diff;
    }
    update((st) => executeAllocation(st, { rutin: R, bonus: B, source, rows: list }));
    setRows({});
    setBonus("");
    toast(`Alokasi ${fmtIDR(T)} tersimpan & portfolio tersinkron`);
  };

  return (
    <View style={s.root} testID="engine-screen">
      <ScreenHeader title="Decision Engine" subtitle="Universal Multi-Asset Allocation" />
      <KeyboardAwareScrollView bottomOffset={24} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        <Card style={{ gap: 12 }}>
          <Field label="Alokasi Rutin Bulanan" prefix="Rp" keyboardType="number-pad" value={rutin} onChangeText={(v) => setRutin(fmtRpInput(v))} placeholder="0" testID="engine-rutin-input" />
          <Field label="Dana Bonus / Dadakan (opsional)" prefix="Rp" keyboardType="number-pad" value={bonus} onChangeText={(v) => setBonus(fmtRpInput(v))} placeholder="0" testID="engine-bonus-input" />
          <View style={{ gap: 6 }}>
            <Txt v="label">Sumber Dana</Txt>
            <Segmented
              testIDPrefix="engine-source"
              value={source}
              onChange={(v) => {
                setSource(v);
                setRows({});
              }}
              options={[
                { value: "new", label: "Dana Baru (Setor)" },
                { value: "cash", label: "Potong Saldo Cash" },
              ]}
            />
            {source === "cash" && (
              <Txt v="caption" c={cashOk ? "muted" : "error"} testID="engine-cash-balance">
                Saldo Kas IDR: {fmtIDR(cash)}
                {cashOk ? "" : " — tidak cukup"}
              </Txt>
            )}
          </View>
          <View style={s.totalRow}>
            <Txt v="label">Total Input</Txt>
            <Txt v="numStrong" testID="engine-total-input">
              {fmtIDR(T)}
            </Txt>
          </View>
        </Card>

        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Txt v="label">Target Aset ({eligible.length})</Txt>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Btn size="sm" variant="secondary" icon={Divide} label="Bagi Rata" onPress={splitEven} disabled={!T || !eligible.length} testID="engine-split-even-button" />
            <Btn size="sm" variant="secondary" icon={RotateCcw} label="Reset" onPress={() => setRows({})} testID="engine-reset-button" />
          </View>
        </View>

        {eligible.length === 0 ? (
          <Card>
            <Txt v="body" c="onSurfaceSecondary">
              Belum ada aset dengan harga terkini. Tambahkan aset di tab Audit terlebih dahulu.
            </Txt>
          </Card>
        ) : (
          eligible.map((a) => {
            const r = rows[a.id] ?? { pct: "", nom: "" };
            const nominal = parseRp(r.nom);
            const pv = previewUnits(a, nominal, rate);
            const cat = catOf(a.categoryId);
            return (
              <View key={a.id} style={s.allocRow} testID={`alloc-row-${a.id}`}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors[cat.colorKey] }} />
                  <Txt v="title" style={{ flex: 1 }} numberOfLines={1}>
                    {a.ticker}
                  </Txt>
                  <Txt v="caption">
                    {cat.label} · {fmtPrice(a, a.currentPrice)}
                  </Txt>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Field containerStyle={{ width: 96 }} suffix="%" keyboardType="decimal-pad" value={r.pct} onChangeText={(v) => setPct(a.id, v)} placeholder="0" testID={`alloc-pct-${a.id}`} />
                  <Field containerStyle={{ flex: 1 }} prefix="Rp" keyboardType="number-pad" value={r.nom} onChangeText={(v) => setNom(a.id, v)} placeholder="0" testID={`alloc-nominal-${a.id}`} />
                </View>
                {nominal > 0 && (
                  <Txt v="caption" style={{ marginTop: 6 }} testID={`alloc-preview-${a.id}`}>
                    ≈ +{a.categoryId === "cash" ? fmtNum(pv.units, 2) : `${fmtNum(pv.units, 4)} ${cat.unit}`}
                    {a.categoryId === "id_stocks" && pv.spent < nominal ? ` · sisa ${fmtIDR(nominal - pv.spent)} ke Cash` : ""}
                  </Txt>
                )}
              </View>
            );
          })
        )}
      </KeyboardAwareScrollView>

      <View style={[s.footer, { paddingBottom: bottomChrome + 12 }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <Txt v="caption" testID="engine-allocated-summary">
            Teralokasi {fmtNum(sumPct, 2)}% · {fmtIDR(sumNom)}
          </Txt>
          <Txt v="caption" c={exact ? "success" : remaining < 0 ? "error" : "warning"} testID="engine-remaining">
            {exact ? "✓ 100% Valid" : `Sisa ${fmtIDR(remaining)}`}
          </Txt>
        </View>
        <Btn label="Simpan & Sync Portfolio" icon={Zap} disabled={!valid} onPress={execute} testID="engine-save-sync-button" />
      </View>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTopWidth: 1, borderTopColor: c.border },
  allocRow: { backgroundColor: c.surfaceSecondary, borderRadius: 12, borderWidth: 1, borderColor: c.border, padding: 12 },
  footer: { paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.border, backgroundColor: c.surface },
}));
