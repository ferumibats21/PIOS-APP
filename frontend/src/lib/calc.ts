import type { ThemeColors } from "@/src/theme";
import { AppState, Asset, CategoryId, Snapshot, Tx } from "./types";

type CatColor = "catCash" | "catReksadana" | "catIdStocks" | "catUsdStocks" | "catGold";

export const CATEGORIES: { id: CategoryId; label: string; colorKey: CatColor; unit: string }[] = [
  { id: "cash", label: "Uang Cash", colorKey: "catCash", unit: "" },
  { id: "reksadana", label: "Reksadana", colorKey: "catReksadana", unit: "unit" },
  { id: "id_stocks", label: "ID Stocks", colorKey: "catIdStocks", unit: "lot" },
  { id: "usd_stocks", label: "USD Stocks", colorKey: "catUsdStocks", unit: "unit" },
  { id: "gold", label: "Emas", colorKey: "catGold", unit: "gr" },
];
export const catOf = (id: CategoryId) => CATEGORIES.find((c) => c.id === id)!;

// ---------- formatting ----------
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function fmtNum(n: number, dec = 0): string {
  if (!isFinite(n)) n = 0;
  const neg = n < 0;
  const [i, d] = Math.abs(n).toFixed(dec).split(".");
  const int = i.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (neg ? "-" : "") + int + (d && Number(d) !== 0 ? "," + d : "");
}
export const fmtIDR = (n: number) => (n < 0 ? "-Rp " : "Rp ") + fmtNum(Math.abs(Math.round(n)));
export function fmtCompact(n: number): string {
  const a = Math.abs(n);
  const s = n < 0 ? "-" : "";
  if (a >= 1e12) return `${s}${fmtNum(a / 1e12, 2)} T`;
  if (a >= 1e9) return `${s}${fmtNum(a / 1e9, 2)} M`;
  if (a >= 1e6) return `${s}${fmtNum(a / 1e6, 1)} jt`;
  if (a >= 1e3) return `${s}${fmtNum(a / 1e3, 0)} rb`;
  return `${s}${fmtNum(a, 0)}`;
}
export const fmtPct = (n: number, dec = 2) => `${n > 0 ? "+" : ""}${fmtNum(n, dec)}%`;
export function fmtPrice(a: Pick<Asset, "categoryId" | "currency">, price: number) {
  if (isUSD(a)) return `$${fmtNum(price, 2)}`;
  return `Rp ${fmtNum(price, price < 1000 ? 2 : 0)}`;
}
export function fmtQty(a: Pick<Asset, "categoryId" | "currency" | "quantity">) {
  if (a.categoryId === "cash") return a.currency === "USD" ? `$${fmtNum(a.quantity, 2)}` : fmtIDR(a.quantity);
  const unit = catOf(a.categoryId).unit;
  return `${fmtNum(a.quantity, 4)} ${unit}`;
}
export function fmtDate(iso: string, withTime = false) {
  const d = new Date(iso);
  const base = `${String(d.getDate()).padStart(2, "0")} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  if (!withTime) return base;
  return `${base} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
export const monthLabel = (d: Date) => `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
export const monthName = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

// parsing
export const parseDec = (s: string) => {
  const n = parseFloat(String(s).replace(/\s/g, "").replace(",", "."));
  return isFinite(n) ? n : 0;
};
export const parseRp = (s: string) => Number(String(s).replace(/\D/g, "")) || 0;
export const fmtRpInput = (s: string) => {
  const n = parseRp(s);
  return n ? fmtNum(n) : "";
};

export const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
export const dayKey = (d: Date) => `${monthKey(d)}-${String(d.getDate()).padStart(2, "0")}`;
export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// ---------- valuation ----------
export const isUSD = (a: Pick<Asset, "categoryId" | "currency">) =>
  a.categoryId === "usd_stocks" || (a.categoryId === "cash" && a.currency === "USD");
export const lotMult = (a: Pick<Asset, "categoryId">) => (a.categoryId === "id_stocks" ? 100 : 1);
export const fxOf = (a: Pick<Asset, "categoryId" | "currency">, rate: number) => (isUSD(a) ? rate : 1);
export const unitValueIDR = (a: Asset, price: number, rate: number) => price * lotMult(a) * fxOf(a, rate);

export function floating(a: Asset, rate: number) {
  const mv = a.quantity * unitValueIDR(a, a.currentPrice, rate);
  const inv = a.quantity * unitValueIDR(a, a.avgBuyPrice, rate);
  const pl = mv - inv;
  return { mv, inv, pl, pct: inv > 0 ? (pl / inv) * 100 : 0 };
}

export function totals(state: AppState) {
  const rate = state.settings.usdRate;
  const byCat: Record<CategoryId, { mv: number; inv: number }> = {
    cash: { mv: 0, inv: 0 },
    reksadana: { mv: 0, inv: 0 },
    id_stocks: { mv: 0, inv: 0 },
    usd_stocks: { mv: 0, inv: 0 },
    gold: { mv: 0, inv: 0 },
  };
  let netWorth = 0;
  let invested = 0;
  for (const a of state.assets) {
    const f = floating(a, rate);
    byCat[a.categoryId].mv += f.mv;
    byCat[a.categoryId].inv += f.inv;
    netWorth += f.mv;
    invested += f.inv;
  }
  const floatingPL = netWorth - invested;
  return { netWorth, invested, floatingPL, floatingPct: invested > 0 ? (floatingPL / invested) * 100 : 0, byCat };
}

export const cashIDR = (state: AppState) =>
  state.assets.filter((a) => a.categoryId === "cash" && a.currency !== "USD").reduce((s, a) => s + a.quantity, 0);

export function totalContribution(state: AppState) {
  return (
    state.initialContribution +
    state.ledger.filter((t) => t.type === "DCA" && t.source === "new").reduce((s, t) => s + t.total, 0)
  );
}

export const wac = (qOld: number, aOld: number, qNew: number, pNew: number) =>
  qOld + qNew > 0 ? (qOld * aOld + qNew * pNew) / (qOld + qNew) : pNew;

// ---------- EMA Auto DCA ----------
export function emaDCA(ledger: Tx[], now = new Date()) {
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) months.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  const values = months.map((k) =>
    ledger
      .filter((t) => t.type === "DCA" && monthKey(new Date(t.date)) === k)
      .reduce((s, t) => s + (t.rutin ?? 0), 0),
  );
  const first = values.findIndex((v) => v > 0);
  if (first < 0) return { ema: 0, values, months };
  let ema = values[first];
  for (let i = first + 1; i < values.length; i++) ema = 0.2 * values[i] + 0.8 * ema;
  return { ema, values, months };
}

export function portfolioAssumption(state: AppState) {
  const t = totals(state);
  if (t.netWorth <= 0) return { mu: 7, sigma: 12 };
  let mu = 0;
  let sigma = 0;
  for (const c of CATEGORIES) {
    const w = t.byCat[c.id].mv / t.netWorth;
    mu += w * state.settings.assumptions[c.id].ret;
    sigma += w * state.settings.assumptions[c.id].vol;
  }
  return { mu, sigma };
}

// ---------- Monte Carlo ----------
function gauss() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function monteCarlo(p: {
  start: number;
  monthly: number;
  mu: number;
  sigma: number;
  target: number;
  years?: number;
  iterations?: number;
}) {
  const years = p.years ?? 40;
  const n = p.iterations ?? 250;
  const mMu = p.mu / 100 / 12;
  const mSig = p.sigma / 100 / Math.sqrt(12);
  const reach: number[] = [];
  const yearVals: number[][] = Array.from({ length: years + 1 }, () => []);
  for (let it = 0; it < n; it++) {
    let v = p.start;
    let hit = v >= p.target ? 0 : Infinity;
    yearVals[0].push(v);
    for (let m = 1; m <= years * 12; m++) {
      v = Math.max(0, v * (1 + mMu + mSig * gauss()) + p.monthly);
      if (hit === Infinity && v >= p.target) hit = m / 12;
      if (m % 12 === 0) yearVals[m / 12].push(v);
    }
    reach.push(hit);
  }
  reach.sort((a, b) => a - b);
  const pick = (q: number) => reach[Math.min(n - 1, Math.max(0, Math.ceil(q * n) - 1))];
  const pct = (arr: number[], q: number) => {
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.min(s.length - 1, Math.max(0, Math.floor(q * s.length)))];
  };
  return {
    conservative: pick(0.9),
    baseline: pick(0.5),
    optimistic: pick(0.1),
    successRate: (reach.filter((r) => r <= years).length / n) * 100,
    p10: yearVals.map((v) => pct(v, 0.1)),
    p50: yearVals.map((v) => pct(v, 0.5)),
    p90: yearVals.map((v) => pct(v, 0.9)),
    years,
  };
}

// ---------- BTC cycle ----------
const HALVINGS = [new Date(2020, 4, 1), new Date(2024, 3, 1), new Date(2028, 3, 1), new Date(2032, 3, 1), new Date(2036, 3, 1)];

export type PhaseKey = "bull" | "tp" | "bear" | "acc" | "pre";
export const BTC_PHASES: {
  key: PhaseKey;
  from: number;
  to: number;
  title: string;
  subtitle: string;
  action: string;
  colorKey: keyof ThemeColors;
}[] = [
  { key: "bull", from: 0, to: 12, title: "BULL RUN", subtitle: "Post-Halving Expansion", action: "Hold posisi, DCA normal, pantau euforia pasar.", colorKey: "success" },
  { key: "tp", from: 12, to: 19, title: "TAKE PROFIT WARNING", subtitle: "Puncak Siklus / Distribusi", action: "Realisasi profit bertahap 25–50%, naikkan porsi Cash.", colorKey: "warning" },
  { key: "bear", from: 19, to: 24, title: "BEAR MARKET", subtitle: "Koreksi & Kapitulasi", action: "DCA ringan, kumpulkan amunisi Cash, hindari panic sell.", colorKey: "error" },
  { key: "acc", from: 24, to: 36, title: "ZONA AKUMULASI AGRESIF", subtitle: "BEST DCA", action: "Maksimalkan DCA rutin + Dana Bonus ke aset berisiko.", colorKey: "brandSecondary" },
  { key: "pre", from: 36, to: 48, title: "PRE-HALVING", subtitle: "Akumulasi Bertahap", action: "Lanjutkan DCA rutin, bangun posisi sebelum halving.", colorKey: "catGold" },
];

const monthsBetween = (a: Date, b: Date) => (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());

function phaseAt(d: Date) {
  let idx = 0;
  for (let i = 0; i < HALVINGS.length; i++) if (HALVINGS[i] <= d) idx = i;
  const months = monthsBetween(HALVINGS[idx], d);
  const phase = BTC_PHASES.find((p) => months >= p.from && months < p.to) ?? BTC_PHASES[4];
  return { idx, months, phase };
}

export function btcCycle(now = new Date()) {
  const { idx, months, phase } = phaseAt(now);
  const halving = HALVINGS[idx];
  const next = HALVINGS[idx + 1];
  return {
    phase,
    monthsSinceHalving: months,
    lastHalving: halving,
    nextHalving: next,
    monthsToNext: next ? monthsBetween(now, next) : 0,
    cycleProgress: Math.min(1, months / 48),
  };
}

export function btcTimeline(startYear = 2024, endYear = 2034) {
  const segs: { key: PhaseKey; colorKey: keyof ThemeColors; months: number }[] = [];
  for (let y = startYear; y <= endYear; y++) {
    for (let m = 0; m < 12; m++) {
      const p = phaseAt(new Date(y, m, 15)).phase;
      const last = segs[segs.length - 1];
      if (last && last.key === p.key) last.months++;
      else segs.push({ key: p.key, colorKey: p.colorKey, months: 1 });
    }
  }
  return segs;
}

// ---------- net worth series ----------
export function netWorthSeries(snaps: Snapshot[], mode: "month" | "year") {
  const sorted = [...snaps].sort((a, b) => a.date.localeCompare(b.date));
  const map = new Map<string, number>();
  for (const s of sorted) map.set(mode === "month" ? s.date.slice(0, 7) : s.date.slice(0, 4), s.netWorth);
  let entries = [...map.entries()];
  if (mode === "month") entries = entries.slice(-12);
  return entries.map(([k, v]) => ({
    label: mode === "month" ? monthLabel(new Date(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, 1)) : k,
    value: v,
  }));
}
