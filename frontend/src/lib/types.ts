export type CategoryId = "cash" | "reksadana" | "id_stocks" | "usd_stocks" | "gold";

export interface Asset {
  id: string;
  categoryId: CategoryId;
  ticker: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  currency?: "IDR" | "USD"; // only for cash
  hidden?: boolean;
  createdAt: string;
}

export type TxType = "INIT" | "BUY" | "SELL" | "EDIT" | "DCA";

export interface Tx {
  id: string;
  date: string;
  type: TxType;
  assetId?: string;
  ticker: string;
  categoryId?: CategoryId;
  quantity: number;
  price: number;
  total: number; // IDR
  realizedPL?: number;
  rutin?: number;
  bonus?: number;
  source?: "new" | "cash";
  note?: string;
}

export interface Note {
  id: string;
  date: string;
  title: string;
  body: string;
  ticker?: string;
}

export interface Snapshot {
  date: string; // YYYY-MM-DD
  netWorth: number;
}

export interface Assumption {
  ret: number; // % per year
  vol: number; // % per year
}

export interface Settings {
  userName: string;
  usdRate: number;
  theme: "dark" | "light";
  pinEnabled: boolean;
  pin: string;
  annualExpense: number;
  assumptions: Record<CategoryId, Assumption>;
  lastRutin: number;
  lastBonus: number;
  reviewDoneMonth?: string;
}

export interface AppState {
  version: 1;
  isInitialized: boolean;
  initialContribution: number;
  settings: Settings;
  assets: Asset[];
  ledger: Tx[];
  notes: Note[];
  snapshots: Snapshot[];
}

export interface AssetDraft {
  categoryId: CategoryId;
  ticker: string;
  quantity: number;
  avgBuyPrice: number;
  currentPrice: number;
  currency?: "IDR" | "USD";
}
