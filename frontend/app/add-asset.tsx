import { useLocalSearchParams, useRouter } from "expo-router";
import { Check } from "lucide-react-native";
import React, { useState } from "react";
import { ScrollView, View } from "react-native";
import { KeyboardAwareScrollView, KeyboardStickyView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Btn, Card, Chip, Field, ScreenHeader, Segmented, Txt, useToast } from "@/src/components/ui";
import { addOrMergeAsset } from "@/src/lib/actions";
import { CATEGORIES, fmtIDR, lotMult, parseDec } from "@/src/lib/calc";
import { CategoryId } from "@/src/lib/types";
import { useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

const PLACEHOLDER: Record<CategoryId, string> = {
  cash: "Kas IDR / Rekening BCA",
  reksadana: "Sucorinvest Money Market",
  id_stocks: "BBCA",
  usd_stocks: "QQQ",
  gold: "Emas Antam",
};
const QTY_LABEL: Record<CategoryId, string> = {
  cash: "Saldo",
  reksadana: "Jumlah Unit",
  id_stocks: "Jumlah Lot (1 lot = 100 lembar)",
  usd_stocks: "Jumlah Unit / Shares",
  gold: "Berat (gram)",
};

export default function AddAsset() {
  const params = useLocalSearchParams<{ cat?: string }>();
  const router = useRouter();
  const { state, update } = useStore();
  const toast = useToast();
  const { colors } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const initialCat = (CATEGORIES.find((c) => c.id === params.cat)?.id ?? "id_stocks") as CategoryId;
  const [cat, setCat] = useState<CategoryId>(initialCat);
  const [currency, setCurrency] = useState<"IDR" | "USD">("IDR");
  const [ticker, setTicker] = useState("");
  const [qty, setQty] = useState("");
  const [avg, setAvg] = useState("");
  const [cur, setCur] = useState("");

  const isCash = cat === "cash";
  const usd = cat === "usd_stocks" || (isCash && currency === "USD");
  const q = parseDec(qty);
  const a = parseDec(avg);
  const c = parseDec(cur) || a;
  const invested = q * (isCash ? 1 : a) * lotMult({ categoryId: cat }) * (usd ? state.settings.usdRate : 1);
  const valid = q > 0 && (isCash || a > 0) && (isCash || ticker.trim().length > 0);

  const save = () => {
    update((st) =>
      addOrMergeAsset(st, {
        categoryId: cat,
        ticker: ticker.trim() || (isCash ? `Kas ${currency}` : ""),
        quantity: q,
        avgBuyPrice: isCash ? 1 : a,
        currentPrice: isCash ? 1 : c,
        currency: isCash ? currency : undefined,
      }),
    );
    toast("Aset tersimpan");
    router.back();
  };

  return (
    <View style={s.root} testID="add-asset-screen">
      <ScreenHeader title="Tambah Aset Baru" subtitle="Multi-item per kategori" back />
      <View style={{ height: 56 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, alignItems: "center" }}>
          {CATEGORIES.map((x) => (
            <Chip key={x.id} label={x.label} dotColor={colors[x.colorKey]} selected={cat === x.id} onPress={() => setCat(x.id)} testID={`add-asset-category-${x.id}`} />
          ))}
        </ScrollView>
      </View>
      <KeyboardAwareScrollView bottomOffset={96} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 12, paddingBottom: 120 }}>
        <Card style={{ gap: 12 }}>
          {isCash && (
            <View style={{ gap: 6 }}>
              <Txt v="label">Mata Uang</Txt>
              <Segmented
                testIDPrefix="add-asset-currency"
                value={currency}
                onChange={setCurrency}
                options={[
                  { value: "IDR", label: "IDR" },
                  { value: "USD", label: "USD" },
                ]}
              />
            </View>
          )}
          <Field label={isCash ? "Nama Akun (opsional)" : "Ticker / Nama"} value={ticker} onChangeText={setTicker} autoCapitalize={cat === "id_stocks" || cat === "usd_stocks" ? "characters" : "words"} placeholder={PLACEHOLDER[cat]} testID="add-asset-ticker-input" />
          <Field label={QTY_LABEL[cat]} value={qty} onChangeText={setQty} keyboardType="decimal-pad" prefix={isCash ? (currency === "USD" ? "$" : "Rp") : undefined} placeholder="0" testID="add-asset-qty-input" />
          {!isCash && (
            <>
              <Field label={`Avg Buy Price per ${cat === "gold" ? "gram" : cat === "id_stocks" ? "lembar" : "unit"}`} prefix={usd ? "$" : "Rp"} value={avg} onChangeText={setAvg} keyboardType="decimal-pad" placeholder="0" testID="add-asset-avg-input" />
              <Field label="Harga Pasar Terkini (kosong = avg)" prefix={usd ? "$" : "Rp"} value={cur} onChangeText={setCur} keyboardType="decimal-pad" placeholder={avg || "0"} testID="add-asset-current-input" />
            </>
          )}
          <View style={s.summary}>
            <Txt v="label">Modal (IDR)</Txt>
            <Txt v="numStrong" testID="add-asset-invested-preview">
              {fmtIDR(invested)}
            </Txt>
          </View>
          {usd && <Txt v="caption">Kurs global USD/IDR: {state.settings.usdRate.toLocaleString("id-ID")}</Txt>}
        </Card>
        <Txt v="caption">Jika ticker sudah ada di kategori yang sama, posisi akan digabung dengan Weighted Average Cost.</Txt>
      </KeyboardAwareScrollView>
      <KeyboardStickyView offset={{ opened: insets.bottom }}>
        <View style={[s.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Btn label="Simpan Aset" icon={Check} onPress={save} disabled={!valid} testID="add-asset-save-button" />
        </View>
      </KeyboardStickyView>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  summary: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTopWidth: 1, borderTopColor: c.border },
  footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.border },
}));
