import { Bitcoin } from "lucide-react-native";
import React from "react";
import { View } from "react-native";

import { Card, Txt } from "@/src/components/ui";
import { BTC_PHASES, btcCycle, btcTimeline, monthName } from "@/src/lib/calc";
import { useTheme } from "@/src/theme";

const START = 2024;
const END = 2034;
const TOTAL_MONTHS = (END - START + 1) * 12;

export function BtcPlaybook() {
  const { colors } = useTheme();
  const now = new Date();
  const cycle = btcCycle(now);
  const segs = btcTimeline(START, END);
  const nowIdx = (now.getFullYear() - START) * 12 + now.getMonth() + 0.5;
  const nowPct = Math.max(0, Math.min(100, (nowIdx / TOTAL_MONTHS) * 100));
  const halvingPct = (y: number) => (((y - START) * 12 + 3) / TOTAL_MONTHS) * 100;
  const pc = colors[cycle.phase.colorKey];

  return (
    <Card testID="btc-playbook-card" style={{ gap: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Bitcoin color={pc} size={18} />
        <Txt v="title" style={{ flex: 1 }}>
          BTC 10-Year Cycle Playbook
        </Txt>
        <Txt v="label">2024–2034</Txt>
      </View>

      <View style={{ borderLeftWidth: 4, borderLeftColor: pc, paddingLeft: 10, gap: 2 }}>
        <Txt v="label">Status · {monthName(now)}</Txt>
        <Txt v="h1" style={{ color: pc }} testID="playbook-current-phase">
          {cycle.phase.title}
        </Txt>
        <Txt v="bodyStrong" c="onSurfaceSecondary">
          {cycle.phase.subtitle}
        </Txt>
        <Txt v="caption" style={{ marginTop: 2 }}>
          {cycle.phase.action}
        </Txt>
      </View>

      <View style={{ flexDirection: "row", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Txt v="label">Sejak Halving</Txt>
          <Txt v="numStrong">{cycle.monthsSinceHalving} bln</Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt v="label">Halving Berikutnya</Txt>
          <Txt v="numStrong" testID="playbook-next-halving">
            {cycle.nextHalving ? monthName(cycle.nextHalving) : "-"}
          </Txt>
        </View>
        <View style={{ flex: 1 }}>
          <Txt v="label">Countdown</Txt>
          <Txt v="numStrong">{cycle.monthsToNext} bln</Txt>
        </View>
      </View>

      {/* Timeline */}
      <View testID="btc-timeline">
        <View style={{ height: 18, marginBottom: 2 }}>
          <View style={{ position: "absolute", left: `${nowPct}%`, marginLeft: -14, width: 28, alignItems: "center" }}>
            <Txt v="label" c="onSurface" style={{ fontSize: 9 }}>
              NOW
            </Txt>
          </View>
        </View>
        <View style={{ flexDirection: "row", height: 14, borderRadius: 4, overflow: "hidden" }}>
          {segs.map((sg, i) => (
            <View key={i} style={{ flex: sg.months, backgroundColor: colors[sg.colorKey], opacity: 0.85 }} />
          ))}
        </View>
        <View style={{ position: "absolute", top: 16, left: `${nowPct}%`, marginLeft: -1, width: 2, height: 22, backgroundColor: colors.onSurface }} />
        <View style={{ height: 22, marginTop: 4 }}>
          {[2024, 2028, 2032].map((y) => (
            <View key={y} style={{ position: "absolute", left: `${halvingPct(y)}%`, marginLeft: -22, width: 44, alignItems: "center" }}>
              <Txt v="label" style={{ fontSize: 9 }}>
                ⛏ {y}
              </Txt>
            </View>
          ))}
        </View>
      </View>

      <View style={{ gap: 6 }}>
        {BTC_PHASES.map((p) => {
          const active = p.key === cycle.phase.key;
          return (
            <View
              key={p.key}
              testID={`btc-phase-${p.key}`}
              style={{
                flexDirection: "row",
                gap: 10,
                padding: 8,
                borderRadius: 8,
                backgroundColor: active ? colors.surfaceTertiary : "transparent",
                borderWidth: 1,
                borderColor: active ? colors[p.colorKey] : colors.border,
              }}
            >
              <View style={{ width: 4, borderRadius: 2, backgroundColor: colors[p.colorKey] }} />
              <View style={{ flex: 1 }}>
                <Txt v="bodyStrong" style={{ fontSize: 13 }}>
                  {p.title} <Txt v="caption">· bln {p.from}–{p.to} pasca-halving</Txt>
                </Txt>
                <Txt v="caption">{p.action}</Txt>
              </View>
            </View>
          );
        })}
      </View>
      <Txt v="caption">Heuristik siklus 4-tahun berbasis tanggal halving (Apr 2024, ~Apr 2028, ~Apr 2032). Bukan saran keuangan.</Txt>
    </Card>
  );
}
