import { Download, Lock, Moon, RotateCcw, Sun, Upload } from "lucide-react-native";
import React, { useState } from "react";
import { Switch, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BtcPlaybook } from "@/src/components/BtcPlaybook";
import { FireCalculator } from "@/src/components/FireCalculator";
import { Btn, Card, Field, ScreenHeader, Sheet, Txt, useToast } from "@/src/components/ui";
import { setSettings } from "@/src/lib/actions";
import { exportBackup, importBackup } from "@/src/lib/backup";
import { parseDec } from "@/src/lib/calc";
import { AppState } from "@/src/lib/types";
import { usesNativeTabs } from "@/src/navigation";
import { useStore } from "@/src/store";
import { makeStyles, useTheme } from "@/src/theme";

export default function Playbook() {
  const { state, update, replace, reset, setLocked } = useStore();
  const toast = useToast();
  const { colors } = useTheme();
  const s = useStyles();
  const insets = useSafeAreaInsets();
  const bottomChrome = usesNativeTabs ? insets.bottom : 0;
  const st = state.settings;

  const [name, setName] = useState(st.userName);
  const [rate, setRate] = useState(String(st.usdRate));
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [pinOld, setPinOld] = useState("");
  const [pendingImport, setPendingImport] = useState<AppState | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);

  const enablePin = () => {
    if (!/^\d{4}$/.test(pin1) || pin1 !== pin2) return toast("PIN harus 4 digit & sama", "error");
    update((x) => setSettings(x, { pinEnabled: true, pin: pin1 }));
    setPin1("");
    setPin2("");
    toast("PIN lock aktif");
  };
  const disablePin = () => {
    if (pinOld !== st.pin) return toast("PIN lama salah", "error");
    update((x) => setSettings(x, { pinEnabled: false, pin: "" }));
    setPinOld("");
    toast("PIN lock dinonaktifkan");
  };

  const doExport = async () => {
    try {
      setBusy(true);
      const n = await exportBackup(state);
      toast(`Backup dibuat: ${n}`);
    } catch (e: any) {
      toast(`Gagal export: ${e?.message ?? e}`, "error");
    } finally {
      setBusy(false);
    }
  };
  const doImport = async () => {
    try {
      const data = await importBackup();
      if (data) setPendingImport(data);
    } catch (e: any) {
      toast(`Gagal import: ${e?.message ?? e}`, "error");
    }
  };

  return (
    <View style={s.root} testID="playbook-screen">
      <ScreenHeader title="Playbook & Settings" subtitle="Strategi · FIRE · Sistem" />
      <KeyboardAwareScrollView bottomOffset={24} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: bottomChrome + 32 }}>
        <Txt v="label">Strategy</Txt>
        <BtcPlaybook />
        <FireCalculator />

        <Txt v="label" style={{ marginTop: 8 }}>
          System
        </Txt>
        <Card style={{ gap: 12 }}>
          <View style={s.rowBetween}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              {st.theme === "dark" ? <Moon color={colors.onSurface} size={18} /> : <Sun color={colors.onSurface} size={18} />}
              <Txt v="title">Dark Mode</Txt>
            </View>
            <Switch
              testID="theme-toggle-switch"
              value={st.theme === "dark"}
              onValueChange={(v) => update((x) => setSettings(x, { theme: v ? "dark" : "light" }))}
              trackColor={{ true: colors.brandPrimary, false: colors.borderStrong }}
              thumbColor={colors.surfaceInverse}
            />
          </View>
          <Field label="Nama" value={name} onChangeText={setName} onEndEditing={() => update((x) => setSettings(x, { userName: name.trim() }))} onBlur={() => update((x) => setSettings(x, { userName: name.trim() }))} testID="settings-name-input" />
          <Field
            label="Kurs USD/IDR (global)"
            prefix="Rp"
            keyboardType="decimal-pad"
            value={rate}
            onChangeText={setRate}
            onBlur={() => {
              const r = parseDec(rate);
              if (r > 0) update((x) => setSettings(x, { usdRate: r }));
            }}
            testID="settings-usd-rate-input"
          />
        </Card>

        <Card style={{ gap: 10 }} testID="pin-settings-card">
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Lock color={colors.onSurface} size={18} />
            <Txt v="title" style={{ flex: 1 }}>
              PIN Lock 4 Digit
            </Txt>
            <Txt v="label" c={st.pinEnabled ? "success" : "muted"} testID="pin-status">
              {st.pinEnabled ? "Aktif" : "Nonaktif"}
            </Txt>
          </View>
          {st.pinEnabled ? (
            <>
              <Field label="PIN saat ini" value={pinOld} onChangeText={(v) => setPinOld(v.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" secureTextEntry maxLength={4} testID="pin-current-input" />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Btn style={{ flex: 1 }} variant="secondary" label="Kunci Sekarang" onPress={() => setLocked(true)} testID="pin-lock-now-button" />
                <Btn style={{ flex: 1 }} variant="ghost" label="Nonaktifkan" onPress={disablePin} disabled={pinOld.length !== 4} testID="pin-disable-button" />
              </View>
            </>
          ) : (
            <>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Field containerStyle={{ flex: 1 }} label="PIN baru" value={pin1} onChangeText={(v) => setPin1(v.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" secureTextEntry maxLength={4} testID="pin-new-input" />
                <Field containerStyle={{ flex: 1 }} label="Ulangi PIN" value={pin2} onChangeText={(v) => setPin2(v.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" secureTextEntry maxLength={4} testID="pin-confirm-input" />
              </View>
              <Btn label="Aktifkan PIN" onPress={enablePin} disabled={pin1.length !== 4 || pin2.length !== 4} testID="pin-enable-button" />
            </>
          )}
        </Card>

        <Card style={{ gap: 10 }}>
          <Txt v="title">Backup & Restore</Txt>
          <Txt v="caption">Semua data tersimpan lokal di perangkat. Export rutin untuk keamanan.</Txt>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <Btn style={{ flex: 1 }} variant="secondary" icon={Download} label="Export JSON" onPress={doExport} loading={busy} testID="backup-export-button" />
            <Btn style={{ flex: 1 }} variant="secondary" icon={Upload} label="Import JSON" onPress={doImport} testID="backup-import-button" />
          </View>
        </Card>

        <Txt v="label" style={{ marginTop: 8 }} c="error">
          Danger Zone
        </Txt>
        <Card style={{ gap: 10, borderColor: colors.error }}>
          <Txt v="caption">Hapus semua data & jalankan ulang Setup Wizard.</Txt>
          <Btn variant="danger" icon={RotateCcw} label="Reset App Data" onPress={() => setConfirmReset(true)} testID="reset-app-button" />
        </Card>
        <Txt v="caption" style={{ textAlign: "center", marginTop: 8 }}>
          PIOS · Personal Investment Operating System · 100% Offline
        </Txt>
      </KeyboardAwareScrollView>

      <Sheet visible={!!pendingImport} onClose={() => setPendingImport(null)} title="Restore data dari backup?" testID="import-confirm-sheet">
        <Txt v="body" c="onSurfaceSecondary" style={{ marginBottom: 16 }}>
          {pendingImport ? `${pendingImport.assets.length} aset · ${pendingImport.ledger?.length ?? 0} transaksi. ` : ""}Data saat ini akan ditimpa sepenuhnya.
        </Txt>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn style={{ flex: 1 }} variant="secondary" label="Batal" onPress={() => setPendingImport(null)} testID="import-cancel-button" />
          <Btn
            style={{ flex: 1 }}
            label="Restore"
            testID="import-confirm-button"
            onPress={() => {
              replace({ ...pendingImport!, isInitialized: true });
              setPendingImport(null);
              toast("Data berhasil di-restore");
            }}
          />
        </View>
      </Sheet>

      <Sheet visible={confirmReset} onClose={() => setConfirmReset(false)} title="Reset semua data?" testID="reset-confirm-sheet">
        <Txt v="body" c="onSurfaceSecondary" style={{ marginBottom: 16 }}>
          Semua aset, ledger, thesis & pengaturan akan dihapus. Tindakan ini tidak bisa dibatalkan.
        </Txt>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn style={{ flex: 1 }} variant="secondary" label="Batal" onPress={() => setConfirmReset(false)} testID="reset-cancel-button" />
          <Btn
            style={{ flex: 1 }}
            variant="danger"
            label="Reset"
            testID="reset-confirm-button"
            onPress={() => {
              setConfirmReset(false);
              reset();
            }}
          />
        </View>
      </Sheet>
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  root: { flex: 1, backgroundColor: c.surface },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44 },
}));
