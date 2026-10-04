import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState as RNAppState } from "react-native";

import { dayKey, totals } from "@/src/lib/calc";
import { AppState } from "@/src/lib/types";
import { setColorScheme } from "@/src/theme";

// Persistence layer — AsyncStorage (modul native @react-native-async-storage/async-storage).
// Di web preview, package ini memakai shim bawaannya sendiri agar app tetap jalan;
// kode aplikasi tidak pernah menyentuh localStorage secara langsung.
const KEY = "PIOS_STATE";
const LEGACY_KEY = "pios_state_v1"; // dipakai versi lama (tersimpan double-encoded lewat wrapper)

// Baca state tersimpan. PENTING: fungsi ini TIDAK pernah menulis/menimpa storage —
// jika parse gagal, data lama dibiarkan utuh (tidak ditimpa state default/demo).
async function loadPersistedState(): Promise<{ state: AppState | null; hadData: boolean }> {
  try {
    let raw = await AsyncStorage.getItem(KEY);
    if (raw === null) raw = await AsyncStorage.getItem(LEGACY_KEY); // migrasi dari key lama
    if (raw === null) return { state: null, hadData: false };
    // Versi lama menyimpan lewat wrapper yang JSON-encode dua kali — kupas sampai dapat objek.
    let parsed: unknown = JSON.parse(raw);
    while (typeof parsed === "string") parsed = JSON.parse(parsed);
    if (typeof parsed !== "object" || parsed === null || !(parsed as Partial<AppState>).settings) {
      return { state: null, hadData: true };
    }
    return { state: normalize(parsed as Partial<AppState>), hadData: true };
  } catch (e) {
    console.warn("[pios] gagal membaca data tersimpan — data lama dibiarkan utuh", e);
    return { state: null, hadData: true };
  }
}

async function persistState(s: AppState) {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch (e) {
    console.warn("[pios] gagal menyimpan data", e);
  }
}

export function createDefaultState(): AppState {
  return {
    version: 1,
    isInitialized: false,
    initialContribution: 0,
    settings: {
      userName: "",
      usdRate: 15500,
      theme: "dark",
      pinEnabled: false,
      pin: "",
      annualExpense: 120000000,
      assumptions: {
        cash: { ret: 4, vol: 1 },
        reksadana: { ret: 7, vol: 8 },
        id_stocks: { ret: 10, vol: 22 },
        usd_stocks: { ret: 11, vol: 18 },
        gold: { ret: 6, vol: 13 },
      },
      lastRutin: 0,
      lastBonus: 0,
    },
    assets: [],
    ledger: [],
    notes: [],
    snapshots: [],
  };
}

export function normalize(s: Partial<AppState>): AppState {
  const d = createDefaultState();
  return {
    ...d,
    ...s,
    settings: {
      ...d.settings,
      ...(s.settings ?? {}),
      assumptions: { ...d.settings.assumptions, ...(s.settings?.assumptions ?? {}) },
    },
    assets: s.assets ?? [],
    ledger: s.ledger ?? [],
    notes: s.notes ?? [],
    snapshots: s.snapshots ?? [],
  } as AppState;
}

function withSnapshot(s: AppState): AppState {
  if (!s.isInitialized) return s;
  const today = dayKey(new Date());
  const nw = totals(s).netWorth;
  const snaps = s.snapshots.filter((x) => x.date !== today);
  snaps.push({ date: today, netWorth: nw });
  snaps.sort((a, b) => a.date.localeCompare(b.date));
  return { ...s, snapshots: snaps.slice(-1000) };
}

interface StoreCtx {
  state: AppState;
  ready: boolean;
  locked: boolean;
  setLocked: (v: boolean) => void;
  update: (fn: (s: AppState) => AppState) => void;
  replace: (s: AppState) => void;
  reset: () => void;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(createDefaultState);
  const [ready, setReady] = useState(false);
  const [locked, setLocked] = useState(false);
  const bgAt = useRef<number | null>(null);
  const pinRef = useRef(false);
  pinRef.current = state.settings.pinEnabled;

  const hadStoredData = useRef(false);

  // Hydration: baca data tersimpan SEKALI saat app mount.
  useEffect(() => {
    (async () => {
      const { state: saved, hadData } = await loadPersistedState();
      hadStoredData.current = hadData;
      if (saved) {
        setState(withSnapshot(saved));
        if (saved.settings.pinEnabled) setLocked(true);
      }
      setReady(true);
    })();
  }, []);

  // Auto-save: setiap perubahan state (DCA, update harga, transaksi ledger, settings)
  // langsung disimpan real-time. Jangan pernah menimpa data tersimpan dengan state kosong/default.
  useEffect(() => {
    setColorScheme(state.settings.theme);
    if (!ready) return;
    if (!state.isInitialized && hadStoredData.current) return;
    persistState(state);
  }, [state, ready]);

  // Re-lock when returning from background after 30s
  useEffect(() => {
    const sub = RNAppState.addEventListener("change", (st) => {
      if (st === "background") bgAt.current = Date.now();
      if (st === "active" && bgAt.current && pinRef.current && Date.now() - bgAt.current > 30000) setLocked(true);
      if (st === "active") bgAt.current = null;
    });
    return () => sub.remove();
  }, []);

  const update = useCallback((fn: (s: AppState) => AppState) => setState((prev) => withSnapshot(fn(prev))), []);
  const replace = useCallback((s: AppState) => setState(withSnapshot(normalize(s))), []);
  const reset = useCallback(() => {
    hadStoredData.current = false;
    setLocked(false);
    setState(createDefaultState());
    AsyncStorage.removeItem(KEY).catch(() => {});
    AsyncStorage.removeItem(LEGACY_KEY).catch(() => {});
  }, []);

  return (
    <Ctx.Provider value={{ state, ready, locked, setLocked, update, replace, reset }}>{children}</Ctx.Provider>
  );
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}
