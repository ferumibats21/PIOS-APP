import React, { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Stop, Text as SvgText } from "react-native-svg";

import { fonts, useTheme } from "@/src/theme";

export function Donut({
  data,
  size = 148,
  thickness = 18,
  children,
  testID,
}: {
  data: { value: number; color: string }[];
  size?: number;
  thickness?: number;
  children?: React.ReactNode;
  testID?: string;
}) {
  const { colors } = useTheme();
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  const items = data.filter((d) => d.value > 0);
  const total = items.reduce((s, d) => s + d.value, 0);
  const gap = items.length > 1 ? 3 : 0;
  let offset = 0;
  return (
    <View testID={testID} style={{ width: size, height: size }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: "-90deg" }] }}>
        <G>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceTertiary} strokeWidth={thickness} fill="none" />
          {total > 0 &&
            items.map((d, i) => {
              const len = (d.value / total) * C;
              const el = (
                <Circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={d.color}
                  strokeWidth={thickness}
                  fill="none"
                  strokeDasharray={`${Math.max(len - gap, 0.01)} ${C}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return el;
            })}
        </G>
      </Svg>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>{children}</View>
    </View>
  );
}

export interface Series {
  values: number[];
  color: string;
  fill?: boolean;
  dashed?: boolean;
}

export function LineChart({
  series,
  labels,
  height = 160,
  formatY,
  testID,
}: {
  series: Series[];
  labels: string[];
  height?: number;
  formatY: (n: number) => string;
  testID?: string;
}) {
  const { colors } = useTheme();
  const [w, setW] = useState(0);
  const padT = 14;
  const padB = 20;
  const padL = 2;
  const padR = 2;
  const all = series.flatMap((s) => s.values).filter((v) => isFinite(v));
  let min = all.length ? Math.min(...all) : 0;
  let max = all.length ? Math.max(...all) : 1;
  if (max === min) {
    min = min * 0.9;
    max = max === 0 ? 1 : max * 1.1;
  }
  const innerW = Math.max(1, w - padL - padR);
  const innerH = height - padT - padB;
  const n = Math.max(...series.map((s) => s.values.length), 1);
  const x = (i: number) => padL + (n <= 1 ? innerW / 2 : (i * innerW) / (n - 1));
  const y = (v: number) => padT + innerH - ((v - min) / (max - min)) * innerH;
  const labelStep = Math.max(1, Math.ceil(labels.length / 6));

  return (
    <View testID={testID} style={{ height }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      {w > 0 && (
        <Svg width={w} height={height}>
          <Defs>
            <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.brandPrimary} stopOpacity={0.35} />
              <Stop offset="1" stopColor={colors.brandPrimary} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {[0, 0.5, 1].map((t) => (
            <Line key={t} x1={0} x2={w} y1={padT + innerH * t} y2={padT + innerH * t} stroke={colors.border} strokeDasharray="3 4" strokeWidth={1} />
          ))}
          {series.map((s, si) => {
            if (!s.values.length) return null;
            const pts = s.values.length === 1 ? [s.values[0], s.values[0]] : s.values;
            const xs = (i: number) => (s.values.length === 1 ? (i === 0 ? padL : padL + innerW) : x(i));
            const d = pts.map((v, i) => `${i === 0 ? "M" : "L"}${xs(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
            const area = `${d} L${xs(pts.length - 1).toFixed(1)},${padT + innerH} L${xs(0).toFixed(1)},${padT + innerH} Z`;
            return (
              <G key={si}>
                {s.fill ? <Path d={area} fill="url(#areaFill)" /> : null}
                <Path d={d} stroke={s.color} strokeWidth={2} fill="none" strokeDasharray={s.dashed ? "5 4" : undefined} strokeLinejoin="round" />
              </G>
            );
          })}
          <SvgText x={4} y={10} fontSize={9} fill={colors.muted} fontFamily={fonts.regular}>
            {formatY(max)}
          </SvgText>
          <SvgText x={4} y={padT + innerH - 4} fontSize={9} fill={colors.muted} fontFamily={fonts.regular}>
            {formatY(min)}
          </SvgText>
          {labels.map((l, i) =>
            i % labelStep === 0 || i === labels.length - 1 ? (
              <SvgText
                key={i}
                x={labels.length === 1 ? w / 2 : x(i)}
                y={height - 4}
                fontSize={9}
                fill={colors.muted}
                fontFamily={fonts.regular}
                textAnchor={labels.length === 1 ? "middle" : i === 0 ? "start" : i === labels.length - 1 ? "end" : "middle"}
              >
                {l}
              </SvgText>
            ) : null,
          )}
        </Svg>
      )}
    </View>
  );
}
