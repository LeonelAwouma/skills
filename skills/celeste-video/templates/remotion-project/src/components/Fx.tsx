import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { COLORS } from "../design/tokens";
import { EASE_IN_OUT, lerp, progress } from "../design/motion";

/** Expanding circle of `color` from (cx, cy). `t` = frames since the bloom started. */
export const Bloom: React.FC<{
  t: number;
  duration: number;
  color: string;
  cx?: number;
  cy?: number;
  ring?: boolean;
}> = ({ t, duration, color, cx, cy, ring = true }) => {
  const { width, height } = useVideoConfig();
  const x = cx ?? width / 2;
  const y = cy ?? height * 0.45;
  const p = progress(t, 0, duration, EASE_IN_OUT);
  if (p <= 0) {
    return null;
  }
  if (p >= 1) {
    return <AbsoluteFill style={{ background: color }} />;
  }
  const r = lerp(0, Math.hypot(width, height), p);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: color, clipPath: `circle(${r}px at ${x}px ${y}px)` }} />
      {ring ? (
        <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: 1 - p * 0.6 }}>
          <circle cx={x} cy={y} r={r} fill="none" stroke={COLORS.cyan} strokeWidth={10} style={{ filter: "blur(4px)" }} />
          <circle cx={x} cy={y} r={r} fill="none" stroke={COLORS.white} strokeWidth={3} />
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};

/**
 * Diagonal wipe revealing `children` from left to right. `t` = frames since start.
 * The leading edge carries a light line.
 */
export const DiagonalWipe: React.FC<{ t: number; duration: number; children: React.ReactNode }> = ({ t, duration, children }) => {
  const { width, height } = useVideoConfig();
  const p = progress(t, 0, duration, EASE_IN_OUT);
  const skew = height * 0.2;
  const edge = lerp(-skew, width + skew, p);
  const done = p >= 1;
  return (
    <AbsoluteFill
      style={{
        clipPath: done ? undefined : `polygon(0 0, ${edge + skew}px 0, ${edge - skew}px 100%, 0 100%)`,
      }}
    >
      {children}
      {!done && p > 0 ? (
        <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
          <line x1={edge + skew} y1={0} x2={edge - skew} y2={height} stroke={COLORS.cyan} strokeWidth={14} style={{ filter: "blur(10px)" }} />
          <line x1={edge + skew} y1={0} x2={edge - skew} y2={height} stroke={COLORS.white} strokeWidth={4} />
        </svg>
      ) : null}
    </AbsoluteFill>
  );
};
