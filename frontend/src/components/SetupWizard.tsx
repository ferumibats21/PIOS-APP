import { ArrowLeft, ArrowRight, Check, Plus, X } from "lucide-react-native";
import React, { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import Animated, { FadeInRight } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Line } from "react-native-svg";

import { Btn, Card, Chip, Field, Txt } from "@/src/components/ui";
import { completeSetup } from "@/src/lib/actions";
import { CATEGORIES, catOf, fmtCompact, fmtIDR, fmtRpInput, parseDec, parseRp } from "@/src/lib/calc";
import { AssetDraft, CategoryId } from "@/src/lib/types";
import { useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

const STEPS = ["Profil", "Cash", "Aset Dasar", "FIRE"];

function GridBg() {
  const { colors } = useTheme();
  return (
    <Svg style={{ position: "absolute", top: 0, left: 0 }} width="100%" height={260} pointerEvents="none">
      {Array.from({ length: 14 }).map((_, i) => (
        <Line key={`v${i}`} x1={i * 32} y1={0} x2={i * 32} y2={260} stroke={colors.border} strokeWidth={1} />
      ))}
      {Array.from({ length: 9 }).map((_, i) => (
        <Line key={`h${i}`} x1={0} y1={i * 32} x2={460} y2={i * 32} stroke={colors.border} strokeWidth={1} />
      ))}
    </Svg>
  );
}

export function SetupWizard() {
  const { update } = useStore();
  const { colors } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [rate, setRate] = useState("15500");
  const [cashIdr, setCashIdr] = useState("");
  const [cashUsd, setCashUsd] = useState("");
  const [expense, setExpense] = useState("120.000.000");
  const [drafts, setDrafts] = useState<AssetDraft[]>([]);
  const [cat, setCat] = useState<CategoryId>("id_stocks");
  const [ticker, setTicker] = useState("");
  const [qty, setQty] = useState("");
  const [avg, setAvg] = useState("");
  const [cur, setCur] = useState("");

  const nonCash = CATEGORIES.filter((c) => c.id !== "cash");
  const canAddDraft = ticker.trim() && parseDec(qty) > 0 && parseDec(avg) > 0;
  const addDraft = () => {
    setDrafts((d) => [...d, { categoryId: cat, ticker: ticker.trim(), quantity: parseDec(qty), avgBuyPrice: parseDec(avg), currentPrice: parseDec(cur) || parseDec(avg) }]);
    setTicker("");
    setQty("");
    setAvg("");
    setCur("");
  };

  const finish = () => {
    update((st) =>
      completeSetup(st, {
        name,
        usdRate: parseDec(rate),
        annualExpense: parseRp(expense),
        cashIDR: parseRp(cashIdr),
        cashUSD: parseDec(cashUsd),
        assets: drafts,
      }),
    );
  };

  const last = step === STEPS.length - 1;

  return (
    <View style={s.root} testID="setup-wizard">
      <GridBg />
      <View style={{ paddingTop: insets.top + 24, paddingHorizontal: 16, gap: 6 }}>
        <Txt v="label" c="brandPrimary">
          PIOS · Setup Wizard
        </Txt>
        <Txt v="h1" style={{ fontSize: 34, lineHeight: 38 }}>
          Personal Investment{"\n"}Operating System
        </Txt>
        <View style={{ flexDirection: "row", gap: 6, marginTop: 12 }}>
          {STEPS.map((l, i) => (
            <View key={l} style={{ flex: 1, gap: 4 }}>
              <View style={{ height: 3, borderRadius: 2, backgroundColor: i <= step ? colors.brandPrimary : colors.surfaceTertiary }} />
              <Txt v="label" c={i === step ? "onSurface" : "muted"} style={{ fontSize: 9 }}>
                {i + 1}. {l}
              </Txt>
            </View>
          ))}
        </View>
      </View>

      <KeyboardAwareScrollView bottomOffset={100} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
        <Animated.View key={step} entering={FadeInRight.duration(250)} style={{ gap: 12 }}>
          {step === 0 && (
            <Card style={{ gap: 12 }}>
              <Txt v="body" c="onSurfaceSecondary">
                100% offline. Semua data tersimpan lokal di perangkat ini.
              </Txt>
              <Field label="Nama Anda" value={name} onChangeText={setName} placeholder="Investor" testID="wizard-name-input" />
              <Field label="Kurs USD/IDR (global)" prefix="Rp" keyboardType="decimal-pad" value={rate} onChangeText={setRate} testID="wizard-usd-rate-input" />
            </Card>
          )}
          {step === 1 && (
            <Card style={{ gap: 12 }}>
              <Txt v="title">Saldo Uang Cash Awal</Txt>
              <Field label="Kas IDR" prefix="Rp" keyboardType="number-pad" value={cashIdr} onChangeText={(v) => setCashIdr(fmtRpInput(v))} placeholder="0" testID="wizard-cash-idr-input" />
              <Field label="Kas USD (opsional)" prefix="$" keyboardType="decimal-pad" value={cashUsd} onChangeText={setCashUsd} placeholder="0" testID="wizard-cash-usd-input" />
            </Card>
          )}
          {step === 2 && (
            <>
              <Card style={{ gap: 12 }}>
                <Txt v="title">Aset Dasar (opsional)</Txt>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ height: 40, flexGrow: 0 }}>
                  {nonCash.map((c) => (
                    <Chip key={c.id} label={c.label} dotColor={colors[c.colorKey]} selected={cat === c.id} onPress={() => setCat(c.id)} testID={`wizard-category-${c.id}`} />
                  ))}
                </ScrollView>
                <Field label="Ticker / Nama" value={ticker} onChangeText={setTicker} placeholder={cat === "gold" ? "Emas Antam" : cat === "usd_stocks" ? "QQQ" : cat === "reksadana" ? "RD Pasar Uang" : "BBCA"} testID="wizard-ticker-input" />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Field containerStyle={{ flex: 1 }} label={`Qty (${catOf(cat).unit})`} keyboardType="decimal-pad" value={qty} onChangeText={setQty} placeholder="0" testID="wizard-qty-input" />
                  <Field containerStyle={{ flex: 1 }} label="Avg Price" prefix={cat === "usd_stocks" ? "$" : "Rp"} keyboardType="decimal-pad" value={avg} onChangeText={setAvg} placeholder="0" testID="wizard-avg-input" />
                </View>
                <Field label="Harga Terkini (kosong = avg)" prefix={cat === "usd_stocks" ? "$" : "Rp"} keyboardType="decimal-pad" value={cur} onChangeText={setCur} placeholder={avg || "0"} testID="wizard-current-input" />
                <Btn variant="secondary" icon={Plus} label="Tambah ke Daftar" disabled={!canAddDraft} onPress={addDraft} testID="wizard-add-asset-button" />
              </Card>
              {drafts.map((d, i) => (
                <View key={i} style={s.draft} testID={`wizard-draft-${i}`}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors[catOf(d.categoryId).colorKey] }} />
                  <View style={{ flex: 1 }}>
                    <Txt v="title">{d.ticker}</Txt>
                    <Txt v="caption">
                      {catOf(d.categoryId).label} · {d.quantity} {catOf(d.categoryId).unit} @ {d.avgBuyPrice}
                    </Txt>
                  </View>
                  <Pressable hitSlop={10} onPress={() => setDrafts((x) => x.filter((_, j) => j !== i))} testID={`wizard-draft-remove-${i}`}>
                    <X color={colors.muted} size={18} />
                  </Pressable>
                </View>
              ))}
            </>
          )}
          {step === 3 && (
            <Card style={{ gap: 12 }}>
              <Txt v="title">Target FIRE</Txt>
              <Field label="Pengeluaran Tahunan saat Pensiun" prefix="Rp" keyboardType="number-pad" value={expense} onChangeText={(v) => setExpense(fmtRpInput(v))} testID="wizard-expense-input" />
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Txt v="label">Target FIRE (×25)</Txt>
                <Txt v="numStrong" c="brandPrimary" testID="wizard-fire-target">
                  {fmtCompact(parseRp(expense) * 25)}
                </Txt>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Txt v="label">Kas IDR awal</Txt>
                <Txt v="num">{fmtIDR(parseRp(cashIdr))}</Txt>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Txt v="label">Aset dasar</Txt>
                <Txt v="num">{drafts.length} item</Txt>
              </View>
            </Card>
          )}
        </Animated.View>
      </KeyboardAwareScrollView>

      <KeyboardStickyView offset={{ opened: insets.bottom }}>
        <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
          {step > 0 && <Btn variant="secondary" icon={ArrowLeft} label="Kembali" onPress={() => setStep(step - 1)} testID="wizard-back-button" style={{ flex: 1 }} />}
          <Btn
            style={{ flex: 2 }}
            icon={last ? Check : ArrowRight}
            label={last ? "Mulai PIOS" : "Lanjut"}
            onPress={() => (last ? finish() : setStep(step + 1))}
            disabled={step === 0 && !(parseDec(rate) > 0)}
            testID={last ? "wizard-finish-button" : "wizard-next-button"}
          />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.surface, overflow: "hidden" },
  draft: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 12, backgroundColor: c.surfaceSecondary, borderWidth: 1, borderColor: c.border },
  footer: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border },
}));
