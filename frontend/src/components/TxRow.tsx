import React from "react";
import { View } from "react-native";

import { Txt } from "@/src/components/ui";
import { fmtDate, fmtIDR, fmtNum } from "@/src/lib/calc";
import { Tx, TxType } from "@/src/lib/types";
import { makeStyles, ThemeColors, useTheme } from "@/src/theme";

const TYPE_META: Record<TxType, { label: string; color: keyof ThemeColors }> = {
  BUY: { label: "BELI", color: "success" },
  DCA: { label: "DCA", color: "brandSecondary" },
  SELL: { label: "JUAL", color: "error" },
  EDIT: { label: "EDIT", color: "warning" },
  INIT: { label: "INIT", color: "muted" },
};

export function TxRow({ t }: { t: Tx }) {
  const s = useStyles();
  const { colors } = useTheme();
  const meta = TYPE_META[t.type];
  return (
    <View style={s.tx} testID={`ledger-row-${t.id}`}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View style={[s.badge, { borderColor: colors[meta.color] }]}>
          <Txt v="label" style={{ color: colors[meta.color], fontSize: 10 }}>
            {meta.label}
          </Txt>
        </View>
        <Txt v="title" style={{ flex: 1 }} numberOfLines={1}>
          {t.ticker}
        </Txt>
        <Txt v="num">{fmtIDR(t.total)}</Txt>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4, gap: 8 }}>
        <Txt v="caption" numberOfLines={1} style={{ flex: 1 }}>
          {t.type === "DCA" ? `Rutin ${fmtIDR(t.rutin ?? 0)} · Bonus ${fmtIDR(t.bonus ?? 0)}` : `${fmtNum(t.quantity, 4)} × ${fmtNum(t.price, 2)}`}
        </Txt>
        <Txt v="caption">{fmtDate(t.date, true)}</Txt>
      </View>
      {t.realizedPL !== undefined && (
        <Txt v="caption" c={t.realizedPL >= 0 ? "success" : "error"}>
          Realized P/L {t.realizedPL >= 0 ? "+" : ""}
          {fmtIDR(t.realizedPL)}
        </Txt>
      )}
      {t.note ? (
        <Txt v="caption" numberOfLines={2}>
          {t.note}
        </Txt>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((c) => ({
  tx: { backgroundColor: c.surfaceSecondary, borderRadius: 10, borderWidth: 1, borderColor: c.border, padding: 10, gap: 2 },
  badge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
}));
