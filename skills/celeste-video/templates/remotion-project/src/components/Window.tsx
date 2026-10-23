import React from "react";
import { COLORS, FONT_UI } from "../design/tokens";

/** Generic application window (light UI) used for all the interface illustrations. */
export const Window: React.FC<{
  width: number;
  height: number;
  title: string;
  accent?: string;
  children?: React.ReactNode;
  style?: React.CSSProperties;
  titleSize?: number;
}> = ({ width, height, title, accent = COLORS.blue, children, style, titleSize = 22 }) => (
  <div
    style={{
      width,
      height,
      borderRadius: 24,
      background: COLORS.white,
      boxShadow:
        "0 40px 90px rgba(0,0,0,0.5), 0 0 0 1.5px rgba(255,255,255,0.25), inset 0 0 0 1px rgba(11,18,51,0.06)",
      overflow: "hidden",
      fontFamily: FONT_UI,
      display: "flex",
      flexDirection: "column",
      ...style,
    }}
  >
    <div
      style={{
        height: 54,
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 20px",
        background: COLORS.mist,
        borderBottom: `1px solid ${COLORS.line}`,
        position: "relative",
      }}
    >
      {[COLORS.danger, COLORS.warn, COLORS.ok].map((c) => (
        <div
          key={c}
          style={{ width: 13, height: 13, borderRadius: "50%", background: c, opacity: 0.9 }}
        />
      ))}
      <div
        style={{
          marginLeft: 12,
          fontSize: titleSize,
          fontWeight: 600,
          color: COLORS.ink,
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </div>
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: -1,
          height: 3,
          width: "100%",
          background: accent,
          opacity: 0.9,
        }}
      />
    </div>
    <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>{children}</div>
  </div>
);

export const CheckIcon: React.FC<{ size: number; color?: string; stroke?: number }> = ({
  size,
  color = COLORS.white,
  stroke = 3.4,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path
      d="M5 12.5l4.5 4.5L19 7.5"
      stroke={color}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Pill: React.FC<{
  children: React.ReactNode;
  color?: string;
  bg?: string;
  size?: number;
  style?: React.CSSProperties;
}> = ({ children, color = COLORS.ice, bg = "rgba(31,91,255,0.22)", size = 34, style }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 14,
      padding: "12px 28px",
      borderRadius: 999,
      background: bg,
      border: "1.5px solid rgba(120,170,255,0.4)",
      color,
      fontFamily: FONT_UI,
      fontWeight: 600,
      fontSize: size,
      letterSpacing: 0.2,
      ...style,
    }}
  >
    {children}
  </div>
);
