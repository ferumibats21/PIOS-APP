# PIOS — Personal Investment Operating System

## Original Problem Statement
Production-ready, 100% offline, mobile-first investment OS. All state stored locally, device clock for timestamps. 5 asset categories (Cash IDR/USD, Reksadana, ID Stocks (lot), USD Stocks (USD/IDR rate), Gold grams), multi-item per category. 5 tabs: Dashboard, Audit, Decision Engine, Journal & Ledger, Playbook & Settings. WAC DCA, floating P/L, EMA auto-DCA (α 0.2, 6 months, excl. bonus), FIRE (expense×25) + Monte Carlo 250 iterations (Conservative P90 / Baseline P50 / Optimistic P10), BTC 4-year cycle playbook 2024–2034, backup/restore JSON, PIN lock, setup wizard on first run, reset app.

## User Choices
Mixed Indonesian + English UI · Dark default + light toggle · PIN 4 digit only · 5 tabs · empty wizard.

## Architecture
- Expo Router (SDK 57), frontend only — no backend used. State in `src/store.tsx` (AsyncStorage/localStorage via `@/src/utils/storage`, key `pios_state_v1`), pure logic in `src/lib/calc.ts` + `src/lib/actions.ts`.
- Charts: custom react-native-svg (Donut, LineChart). Icons: lucide-react-native. Fonts: Barlow Condensed + IBM Plex Sans (local TTF).
- Backup: expo-file-system + expo-sharing (native), Blob download (web); import via expo-document-picker.
- NativeTabs on iOS 26+, classic Tabs elsewhere.

## Implemented (Oct 2026)
- Setup wizard (profile, cash, base assets, FIRE target), persistence, PIN lock screen (re-lock after 30s background)
- Dashboard: net worth, floating P/L, FIRE progress, total contribution, donut, net worth chart (monthly/yearly, daily auto-snapshots), BTC signal banner, review reminder (≥25th)
- Audit: accordion, add asset (merge with WAC), bulk price updater (+USD rate), ticker detail (price edit, manual correction, sell w/ realized P/L → Kas IDR, zero-qty hide/delete, history)
- Decision engine: two-way %/Rp sync, 100% guard, Bagi Rata, source new money vs cash, ID stocks whole lots (leftover → cash)
- Journal: ledger with filter chips, thesis notes
- Playbook: BTC cycle tracker/timeline, FIRE Monte Carlo with editable return/vol assumptions, theme, USD rate, PIN, export/import, reset
- Tested: iteration_1 all flows pass

## Backlog
- P1: Per-ticker price history sparkline; target allocation presets in engine
- P2: Biometric unlock (needs native build), CSV export of ledger, multi-currency for reksadana
