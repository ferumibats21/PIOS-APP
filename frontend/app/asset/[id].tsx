import { useLocalSearchParams, useRouter } from "expo-router";
import { Eye, EyeOff, Trash2 } from "lucide-react-native";
import React, { useState } from "react";
import { View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Btn, Card, Chip, Divider, Field, PL, ScreenHeader, Sheet, StatBox, Txt, useToast } from "@/src/components/ui";
import { TxRow } from "@/src/components/TxRow";
import { correctAsset, deleteAsset, sellAsset, setHidden, updatePrice } from "@/src/lib/actions";
import { catOf, floating, fmtIDR, fmtPrice, fmtQty, isUSD, lotMult, parseDec } from "@/src/lib/calc";
import { useStore } from "@/src/store";
import { makeStyles } from "@/src/theme";

export default function AssetDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, update } = useStore();
  const toast = useToast();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const a = state.assets.find((x) => x.id === id);

  const [price, setPrice] = useState(a ? String(a.currentPrice) : "");
  const [qty, setQty] = useState(a ? String(a.quantity) : "");
  const [avg, setAvg] = useState(a ? String(a.avgBuyPrice) : "");
  const [sellUnits, setSellUnits] = useState("");
  const [sellPrice, setSellPrice] = useState(a ? String(a.currentPrice) : "");
  const [confirmSell, setConfirmSell] = useState(false);
  const [zeroSheet, setZeroSheet] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!a) {
    return (
      <View style={s.root}>
        <ScreenHeader title="Aset" back />
        <View style={{ padding: 16 }}>
          <Txt v="body" testID="asset-not-found">
            Aset tidak ditemukan.
          </Txt>
        </View>
      </View>
    );
  }

  const rate = state.settings.usdRate;
  const f = floating(a, rate);
  const isCash = a.categoryId === "cash";
  const cat = catOf(a.categoryId);
  const cur = isUSD(a) ? "$" : "Rp";
  const fx = isUSD(a) ? rate : 1;
  const su = parseDec(sellUnits);
  const sp = parseDec(sellPrice);
  const proceeds = su * sp * lotMult(a) * fx;
  const realized = su * lotMult(a) * (sp - a.avgBuyPrice) * fx;
  const sellValid = su > 0 && su <= a.quantity + 1e-9 && sp > 0;
  const history = state.ledger.filter((t) => t.assetId === a.id).sort((x, y) => y.date.localeCompare(x.date));

  const doSell = () => {
    const remaining = a.quantity - su;
    update((st) => sellAsset(st, a.id, Math.min(su, a.quantity), sp));
    setConfirmSell(false);
    setSellUnits("");
    toast(`Terjual · ${fmtIDR(proceeds)} masuk ke Kas IDR`);
    if (remaining <= 1e-9) setZeroSheet(true);
    else setQty(String(remaining));
  };

  return (
    <View style={s.root} testID="asset-detail-screen">
      <ScreenHeader
        title={a.ticker}
        subtitle={`${cat.label}${a.hidden ? " · hidden" : ""}`}
        back
      />
      <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 24 }}>
        <Card>
          <Txt v="label">Market Value</Txt>
          <Txt v="hero" testID="asset-market-value" numberOfLines={1} adjustsFontSizeToFit>
            {fmtIDR(f.mv)}
          </Txt>
          {!isCash && <PL value={f.pl} pct={f.pct} size="md" testID="asset-floating-pl" />}
          <View style={{ height: 12 }} />
          <Divider />
          <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
            <StatBox label="Quantity" value={fmtQty(a)} testID="asset-qty" />
            {!isCash && <StatBox label="Avg Price" value={fmtPrice(a, a.avgBuyPrice)} testID="asset-avg" />}
            {!isCash && <StatBox label="Harga Kini" value={fmtPrice(a, a.currentPrice)} testID="asset-current" />}
          </View>
          {!isCash && (
            <Txt v="caption" style={{ marginTop: 8 }}>
              Modal {fmtIDR(f.inv)}
              {a.categoryId === "id_stocks" ? " · 1 lot = 100 lembar" : ""}
              {isUSD(a) ? ` · kurs ${rate.toLocaleString("id-ID")}` : ""}
            </Txt>
          )}
        </Card>

        {!isCash && (
          <Card style={{ gap: 10 }}>
            <Txt v="title">Update Harga</Txt>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
              <Field containerStyle={{ flex: 1 }} prefix={cur} keyboardType="decimal-pad" value={price} onChangeText={setPrice} testID="asset-price-input" />
              <Btn
                label="Simpan"
                testID="asset-price-save-button"
                disabled={!(parseDec(price) > 0) || parseDec(price) === a.currentPrice}
                onPress={() => {
                  update((st) => updatePrice(st, a.id, parseDec(price)));
                  setSellPrice(price);
                  toast("Harga diperbarui");
                }}
              />
            </View>
          </Card>
        )}

        {!isCash && (
          <Card style={{ gap: 10 }} testID="sell-card">
            <Txt v="title">Jual / Sell</Txt>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Field containerStyle={{ flex: 1 }} label={`Unit dijual (${cat.unit})`} keyboardType="decimal-pad" value={sellUnits} onChangeText={setSellUnits} placeholder="0" testID="sell-units-input" />
              <Field containerStyle={{ flex: 1 }} label="Harga jual" prefix={cur} keyboardType="decimal-pad" value={sellPrice} onChangeText={setSellPrice} testID="sell-price-input" />
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {[0.25, 0.5, 1].map((p) => (
                <Chip key={p} label={p === 1 ? "MAX" : `${p * 100}%`} onPress={() => setSellUnits(String(a.categoryId === "id_stocks" ? Math.floor(a.quantity * p) : Math.round(a.quantity * p * 10000) / 10000))} testID={`sell-preset-${p * 100}`} />
              ))}
            </View>
            {su > 0 && (
              <View style={s.preview} testID="sell-preview">
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Txt v="caption">Dana masuk ke Cash</Txt>
                  <Txt v="num">{fmtIDR(proceeds)}</Txt>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Txt v="caption">Realized P/L</Txt>
                  <PL value={realized} testID="sell-realized-pl" />
                </View>
                {su > a.quantity && (
                  <Txt v="caption" c="error">
                    Melebihi jumlah yang dimiliki
                  </Txt>
                )}
              </View>
            )}
            <Btn variant="danger" label="Jual / Sell" disabled={!sellValid} onPress={() => setConfirmSell(true)} testID="sell-submit-button" />
          </Card>
        )}

        <Card style={{ gap: 10 }}>
          <Txt v="title">Koreksi Manual</Txt>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Field containerStyle={{ flex: 1 }} label={isCash ? "Saldo" : "Quantity"} keyboardType="decimal-pad" value={qty} onChangeText={setQty} testID="correct-qty-input" />
            {!isCash && <Field containerStyle={{ flex: 1 }} label="Avg Price" prefix={cur} keyboardType="decimal-pad" value={avg} onChangeText={setAvg} testID="correct-avg-input" />}
          </View>
          <Btn
            variant="secondary"
            label="Simpan Koreksi"
            testID="correct-save-button"
            disabled={parseDec(qty) === a.quantity && (isCash || parseDec(avg) === a.avgBuyPrice)}
            onPress={() => {
              update((st) => correctAsset(st, a.id, parseDec(qty), parseDec(avg)));
              toast("Koreksi tersimpan");
            }}
          />
        </Card>

        <Card style={{ gap: 8 }}>
          <Txt v="title">Riwayat Transaksi ({history.length})</Txt>
          {history.length === 0 ? <Txt v="caption">Belum ada transaksi.</Txt> : history.map((t) => <TxRow key={t.id} t={t} />)}
        </Card>

        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn
            style={{ flex: 1 }}
            variant="secondary"
            icon={a.hidden ? Eye : EyeOff}
            label={a.hidden ? "Tampilkan" : "Sembunyikan"}
            testID="asset-toggle-hidden-button"
            onPress={() => update((st) => setHidden(st, a.id, !a.hidden))}
          />
          <Btn style={{ flex: 1 }} variant="ghost" icon={Trash2} label="Hapus Aset" onPress={() => setConfirmDelete(true)} testID="asset-delete-button" />
        </View>
      </KeyboardAwareScrollView>

      <Sheet visible={confirmSell} onClose={() => setConfirmSell(false)} title={`Jual ${a.ticker}?`} testID="sell-confirm-sheet">
        <Txt v="body" c="onSurfaceSecondary">
          {sellUnits} {cat.unit} @ {cur} {sellPrice}
        </Txt>
        <Txt v="body" c="onSurfaceSecondary" style={{ marginBottom: 16 }}>
          Dana {fmtIDR(proceeds)} masuk ke Kas IDR · Realized {fmtIDR(realized)}
        </Txt>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn style={{ flex: 1 }} variant="secondary" label="Batal" onPress={() => setConfirmSell(false)} testID="sell-cancel-button" />
          <Btn style={{ flex: 1 }} variant="danger" label="Konfirmasi Jual" onPress={doSell} testID="sell-confirm-button" />
        </View>
      </Sheet>

      <Sheet visible={zeroSheet} onClose={() => setZeroSheet(false)} title="Posisi sudah 0" testID="zero-qty-sheet">
        <Txt v="body" c="onSurfaceSecondary" style={{ marginBottom: 16 }}>
          Sembunyikan atau hapus {a.ticker} dari daftar?
        </Txt>
        <View style={{ gap: 8 }}>
          <Btn label="Sembunyikan" onPress={() => { update((st) => setHidden(st, a.id, true)); setZeroSheet(false); }} testID="zero-hide-button" />
          <Btn variant="danger" label="Hapus" onPress={() => { setZeroSheet(false); update((st) => deleteAsset(st, a.id)); router.back(); }} testID="zero-delete-button" />
          <Btn variant="secondary" label="Biarkan" onPress={() => setZeroSheet(false)} testID="zero-keep-button" />
        </View>
      </Sheet>

      <Sheet visible={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Hapus ${a.ticker}?`} testID="delete-confirm-sheet">
        <Txt v="body" c="onSurfaceSecondary" style={{ marginBottom: 16 }}>
          Aset dihapus dari portofolio. Riwayat ledger tetap tersimpan.
        </Txt>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn style={{ flex: 1 }} variant="secondary" label="Batal" onPress={() => setConfirmDelete(false)} testID="delete-cancel-button" />
          <Btn style={{ flex: 1 }} variant="danger" label="Hapus" onPress={() => { setConfirmDelete(false); update((st) => deleteAsset(st, a.id)); router.back(); }} testID="delete-confirm-button" />
        </View>
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  preview: { gap: 4, padding: 10, borderRadius: 8, backgroundColor: c.surfaceTertiary },
}));
