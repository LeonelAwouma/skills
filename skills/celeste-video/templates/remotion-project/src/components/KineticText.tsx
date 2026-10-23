import React from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, FONT_DISPLAY, GRADIENT_ACCENT_DARK } from "../design/tokens";
import { fitFont } from "../engine/layout";

export type Word = {
  t: string;
  /** base = main colour, accent = gradient highlight, warn = problem colour */
  tone?: "base" | "accent" | "warn";
};

type Props = {
  lines: Word[][];
  fontSize: number;
  /** Frame (local to the parent Sequence) when the first word starts. */
  start?: number;
  /** Frames between two consecutive words. */
  stagger?: number;
  color?: string;
  accentGradient?: string;
  weight?: 500 | 700 | 800;
  lineHeight?: number;
  letterSpacing?: number;
  align?: "center" | "left";
  /** "slam" = bigger overshoot, used for the hook. */
  variant?: "pop" | "slam";
  /** Max width in px: the font shrinks so that the longest line fits (never grows). */
  fit?: number;
  style?: React.CSSProperties;
};

export const KineticText: React.FC<Props> = ({
  lines,
  fontSize,
  start = 0,
  stagger = 4,
  color = COLORS.white,
  accentGradient = GRADIENT_ACCENT_DARK,
  weight = 800,
  lineHeight = 1.08,
  letterSpacing = -0.02,
  align = "center",
  variant = "pop",
  fit,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let index = 0;
  const slam = variant === "slam";
  const size = fit ? fitFont(lines.map((l) => l.map((w) => w.t).join(" ")), fontSize, fit) : fontSize;

  return (
    <div
      style={{
        fontFamily: FONT_DISPLAY,
        fontSize: size,
        fontWeight: weight,
        lineHeight,
        letterSpacing: `${letterSpacing}em`,
        color,
        textAlign: align,
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        ...style,
      }}
    >
      {lines.map((line, li) => (
        <div
          key={li}
          style={{ display: "flex", gap: "0.26em", whiteSpace: "nowrap" }}
        >
          {line.map((word) => {
            const i = index++;
            const s = spring({
              frame: frame - start - i * stagger,
              fps,
              config: slam
                ? { damping: 11, stiffness: 220, mass: 0.7 }
                : { damping: 16, stiffness: 170, mass: 0.8 },
            });
            const visible = Math.min(1, Math.max(0, s * 2));
            const tone = word.tone ?? "base";
            const accent: React.CSSProperties =
              tone === "accent"
                ? {
                    backgroundImage: accentGradient,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    color: "transparent",
                    WebkitTextFillColor: "transparent",
                    paddingRight: "0.04em",
                  }
                : tone === "warn"
                  ? { color: COLORS.warn }
                  : {};
            const sc = slam
              ? 1.5 - 0.5 * Math.min(1.2, s)
              : 0.82 + 0.18 * Math.min(1.2, s);
            return (
              <span
                key={`${li}-${word.t}-${i}`}
                style={{
                  display: "inline-block",
                  opacity: visible,
                  translate: `0px ${(1 - s) * (slam ? 120 : 70)}px`,
                  scale: `${sc}`,
                  filter: `blur(${Math.max(0, (1 - s) * 14)}px)`,
                  ...accent,
                }}
              >
                {word.t}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

/** Build Word[][] from string lines, marking some words as accent. */
export const toWords = (
  lines: readonly (readonly string[])[],
  accentWords: readonly string[] = [],
  accentTone: Word["tone"] = "accent",
): Word[][] =>
  lines.map((line) =>
    line.map((t) => ({
      t,
      tone: accentWords.indexOf(t) >= 0 ? accentTone : "base",
    })),
  );

/**
 * Lines written as strings with *accent* markers -> Word[][].
 * "Votre *projet* mérite" -> accent on "projet". Markers may span several words.
 */
export const parseMarkup = (lines: readonly string[], accentTone: Word["tone"] = "accent"): Word[][] =>
  lines.map((line) => {
    const words: Word[] = [];
    line.split("*").forEach((chunk, i) => {
      chunk
        .split(" ")
        .filter((t) => t.length > 0)
        .forEach((t) => words.push({ t, tone: i % 2 === 1 ? accentTone : "base" }));
    });
    return words;
  });
