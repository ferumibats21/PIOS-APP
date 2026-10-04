import { floating, isUSD, lotMult, uid, unitValueIDR, wac } from "./calc";
import { AppState, Asset, AssetDraft, Settings, Tx } from "./types";

const now = () => new Date().toISOString();

function tx(p: Omit<Tx, "id" | "date">): Tx {
  return { id: uid(), date: now(), ...p };
}

function newAsset(d: AssetDraft): Asset {
  const isCash = d.categoryId === "cash";
  return {
    id: uid(),
    categoryId: d.categoryId,
    ticker: d.ticker.trim() || (isCash ? `Kas ${d.currency ?? "IDR"}` : "ASET"),
    quantity: d.quantity,
    avgBuyPrice: isCash ? 1 : d.avgBuyPrice,
    currentPrice: isCash ? 1 : d.currentPrice || d.avgBuyPrice,
    currency: isCash ? d.currency ?? "IDR" : undefined,
    createdAt: now(),
  };
}

// Ensure a "Kas IDR" exists, return [assets, index]
function ensureCashIDR(assets: Asset[]): [Asset[], number] {
  const idx = assets.findIndex((a) => a.categoryId === "cash" && a.currency !== "USD" && !a.hidden);
  if (idx >= 0) return [assets, idx];
  const cash = newAsset({ categoryId: "cash", ticker: "Kas IDR", quantity: 0, avgBuyPrice: 1, currentPrice: 1, currency: "IDR" });
  return [[...assets, cash], assets.length];
}

export function completeSetup(
  s: AppState,
  p: { name: string; usdRate: number; annualExpense: number; cashIDR: number; cashUSD: number; assets: AssetDraft[] },
): AppState {
  const rate = p.usdRate || 15500;
  const drafts: AssetDraft[] = [
    { categoryId: "cash", ticker: "Kas IDR", quantity: p.cashIDR, avgBuyPrice: 1, currentPrice: 1, currency: "IDR" },
    ...(p.cashUSD > 0
      ? [{ categoryId: "cash" as const, ticker: "Kas USD", quantity: p.cashUSD, avgBuyPrice: 1, currentPrice: 1, currency: "USD" as const }]
      : []),
    ...p.assets,
  ];
  const assets = drafts.map(newAsset);
  const ledger = assets
    .filter((a) => a.quantity > 0)
    .map((a) =>
      tx({
        type: "INIT",
        assetId: a.id,
        ticker: a.ticker,
        categoryId: a.categoryId,
        quantity: a.quantity,
        price: a.avgBuyPrice,
        total: floating(a, rate).inv,
        note: "Saldo awal (Setup Wizard)",
      }),
    );
  const initialContribution = assets.reduce((sum, a) => sum + floating(a, rate).inv, 0);
  return {
    ...s,
    isInitialized: true,
    initialContribution,
    settings: { ...s.settings, userName: p.name.trim() || "Investor", usdRate: rate, annualExpense: p.annualExpense },
    assets,
    ledger,
  };
}

export function addOrMergeAsset(s: AppState, d: AssetDraft): AppState {
  const rate = s.settings.usdRate;
  const ticker = d.ticker.trim().toUpperCase() === d.ticker.trim() ? d.ticker.trim() : d.ticker.trim();
  const idx = s.assets.findIndex(
    (a) =>
      a.categoryId === d.categoryId &&
      a.ticker.toLowerCase() === ticker.toLowerCase() &&
      (d.categoryId !== "cash" || (a.currency ?? "IDR") === (d.currency ?? "IDR")),
  );
  if (idx >= 0) {
    const a = s.assets[idx];
    const isCash = a.categoryId === "cash";
    const updated: Asset = {
      ...a,
      hidden: false,
      quantity: a.quantity + d.quantity,
      avgBuyPrice: isCash ? 1 : wac(a.quantity, a.avgBuyPrice, d.quantity, d.avgBuyPrice),
      currentPrice: isCash ? 1 : d.currentPrice || a.currentPrice,
    };
    const assets = [...s.assets];
    assets[idx] = updated;
    return {
      ...s,
      assets,
      ledger: [
        tx({ type: "BUY", assetId: a.id, ticker: a.ticker, categoryId: a.categoryId, quantity: d.quantity, price: isCash ? 1 : d.avgBuyPrice, total: d.quantity * unitValueIDR(a, isCash ? 1 : d.avgBuyPrice, rate), note: "Tambah aset (merge WAC)" }),
        ...s.ledger,
      ],
    };
  }
  const a = newAsset({ ...d, ticker });
  return {
    ...s,
    assets: [...s.assets, a],
    ledger: [
      tx({ type: "BUY", assetId: a.id, ticker: a.ticker, categoryId: a.categoryId, quantity: a.quantity, price: a.avgBuyPrice, total: floating(a, rate).inv, note: "Aset baru" }),
      ...s.ledger,
    ],
  };
}

function patchAsset(s: AppState, id: string, patch: Partial<Asset>): Asset[] {
  return s.assets.map((a) => (a.id === id ? { ...a, ...patch } : a));
}

export function updatePrice(s: AppState, id: string, price: number): AppState {
  const a = s.assets.find((x) => x.id === id);
  if (!a || a.currentPrice === price) return s;
  return {
    ...s,
    assets: patchAsset(s, id, { currentPrice: price }),
    ledger: [
      tx({ type: "EDIT", assetId: id, ticker: a.ticker, categoryId: a.categoryId, quantity: a.quantity, price, total: a.quantity * unitValueIDR(a, price, s.settings.usdRate), note: `Update harga ${a.currentPrice} → ${price}` }),
      ...s.ledger,
    ],
  };
}

export function bulkPrices(s: AppState, prices: Record<string, number>, usdRate: number): AppState {
  let next: AppState = { ...s, settings: { ...s.settings, usdRate } };
  for (const [id, p] of Object.entries(prices)) next = updatePrice(next, id, p);
  return next;
}

export function correctAsset(s: AppState, id: string, qty: number, avg: number): AppState {
  const a = s.assets.find((x) => x.id === id);
  if (!a) return s;
  const isCash = a.categoryId === "cash";
  const finalAvg = isCash ? 1 : avg;
  return {
    ...s,
    assets: patchAsset(s, id, { quantity: qty, avgBuyPrice: finalAvg }),
    ledger: [
      tx({ type: "EDIT", assetId: id, ticker: a.ticker, categoryId: a.categoryId, quantity: qty, price: finalAvg, total: qty * unitValueIDR(a, finalAvg, s.settings.usdRate), note: `Koreksi manual: qty ${a.quantity} → ${qty}${isCash ? "" : `, avg ${a.avgBuyPrice} → ${finalAvg}`}` }),
      ...s.ledger,
    ],
  };
}

export function sellAsset(s: AppState, id: string, units: number, price: number): AppState {
  const a = s.assets.find((x) => x.id === id);
  if (!a || units <= 0) return s;
  const rate = s.settings.usdRate;
  const proceeds = units * unitValueIDR(a, price, rate);
  const realized = units * lotMult(a) * (price - a.avgBuyPrice) * (isUSD(a) ? rate : 1);
  let assets = patchAsset(s, id, { quantity: Math.max(0, a.quantity - units) });
  let ci: number;
  [assets, ci] = ensureCashIDR(assets);
  assets = assets.map((x, i) => (i === ci ? { ...x, quantity: x.quantity + proceeds } : x));
  return {
    ...s,
    assets,
    ledger: [
      tx({ type: "SELL", assetId: id, ticker: a.ticker, categoryId: a.categoryId, quantity: units, price, total: proceeds, realizedPL: realized, note: "Dana masuk ke Kas IDR" }),
      ...s.ledger,
    ],
  };
}

export const setHidden = (s: AppState, id: string, hidden: boolean): AppState => ({ ...s, assets: patchAsset(s, id, { hidden }) });
export const deleteAsset = (s: AppState, id: string): AppState => ({ ...s, assets: s.assets.filter((a) => a.id !== id) });

export interface AllocationRow {
  assetId: string;
  nominal: number;
}

export function previewUnits(a: Asset, nominal: number, rate: number) {
  if (a.categoryId === "cash") {
    const units = isUSD(a) ? nominal / rate : nominal;
    return { units, spent: nominal };
  }
  const per = unitValueIDR(a, a.currentPrice, rate);
  if (per <= 0) return { units: 0, spent: 0 };
  let units = nominal / per;
  if (a.categoryId === "id_stocks") units = Math.floor(units);
  return { units, spent: units * per };
}

export function executeAllocation(
  s: AppState,
  p: { rutin: number; bonus: number; source: "new" | "cash"; rows: AllocationRow[] },
): AppState {
  const rate = s.settings.usdRate;
  const T = p.rutin + p.bonus;
  let assets = [...s.assets];
  const logs: Tx[] = [];
  let spentTotal = 0;
  for (const r of p.rows) {
    if (r.nominal <= 0) continue;
    const idx = assets.findIndex((a) => a.id === r.assetId);
    if (idx < 0) continue;
    const a = assets[idx];
    const { units, spent } = previewUnits(a, r.nominal, rate);
    if (units <= 0) continue;
    spentTotal += spent;
    const isCash = a.categoryId === "cash";
    assets[idx] = {
      ...a,
      hidden: false,
      quantity: a.quantity + units,
      avgBuyPrice: isCash ? 1 : wac(a.quantity, a.avgBuyPrice, units, a.currentPrice),
    };
    logs.push(
      tx({ type: "BUY", assetId: a.id, ticker: a.ticker, categoryId: a.categoryId, quantity: units, price: a.currentPrice, total: spent, source: p.source, note: `DCA ${Math.round((r.nominal / T) * 10000) / 100}%` }),
    );
  }
  const leftover = T - spentTotal;
  let ci: number;
  [assets, ci] = ensureCashIDR(assets);
  if (p.source === "new" && leftover > 0.5) {
    assets = assets.map((x, i) => (i === ci ? { ...x, quantity: x.quantity + leftover } : x));
  }
  if (p.source === "cash") {
    assets = assets.map((x, i) => (i === ci ? { ...x, quantity: Math.max(0, x.quantity - spentTotal) } : x));
  }
  const summary = tx({
    type: "DCA",
    ticker: "ALOKASI",
    quantity: p.rows.filter((r) => r.nominal > 0).length,
    price: 0,
    total: T,
    rutin: p.rutin,
    bonus: p.bonus,
    source: p.source,
    note: p.source === "new" ? `Dana baru · sisa ${Math.round(leftover)} ke Kas IDR` : `Dari saldo Cash · terpakai ${Math.round(spentTotal)}`,
  });
  return {
    ...s,
    assets,
    settings: { ...s.settings, lastRutin: p.rutin, lastBonus: p.bonus },
    ledger: [summary, ...logs, ...s.ledger],
  };
}

export const setSettings = (s: AppState, patch: Partial<Settings>): AppState => ({ ...s, settings: { ...s.settings, ...patch } });

export const addNote = (s: AppState, title: string, body: string, ticker?: string): AppState => ({
  ...s,
  notes: [{ id: uid(), date: now(), title, body, ticker }, ...s.notes],
});
export const deleteNote = (s: AppState, id: string): AppState => ({ ...s, notes: s.notes.filter((n) => n.id !== id) });
