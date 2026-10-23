import React from "react";
import { AbsoluteFill, random } from "remotion";
import { DarkBackdrop } from "../components/Backdrop";
import { KineticText, parseMarkup } from "../components/KineticText";
import { COLORS, FONT_UI } from "../design/tokens";
import { EASE_IN_OUT, EASE_OUT, lerp, progress } from "../design/motion";
import { useSceneTime } from "../engine/context";
import { FitBox, useLayout } from "../engine/layout";
import type { Scene } from "../engine/types";

type S = Extract<Scene, { type: "value" }>;

const LINES = 14;
const DW = 1080;
const DH = 640;
const HUB = { x: 540, y: 320 };
const TARGETS = [80, 200, 320, 440, 560].map((y) => ({ x: 960, y }));

/** A tangle of lines is simplified into one line that opens onto many possibilities. */
export const ValueScene: React.FC<{ scene: S }> = ({ scene }) => {
  const t = useSceneTime();
  const layout = useLayout();
  const landscape = layout.orientation === "landscape";
  const simplify = progress(t, 28, 40, EASE_IN_OUT);
  const chaos = 1 - simplify;
  const hubIn = progress(t, 64, 14, EASE_OUT);
  const pulse = 0.5 + 0.5 * Math.sin(t / 5);

  const half = Math.ceil(scene.lines.length / 2);
  const first = scene.lines.slice(0, half);
  const second = scene.lines.slice(half);
  const size = layout.headline * 1.1;
  const tz = layout.text;
  const top = landscape ? tz.y + tz.h * 0.15 : layout.H * 0.0885;
  const lineH = size * 1.1;
  const secondTop = top + first.length * lineH + 18 * layout.u;
  const x = landscape ? tz.x : 0;
  const w = landscape ? tz.w : layout.W;
  const fit = landscape ? tz.w : layout.W * 0.88;

  return (
    <AbsoluteFill>
      <DarkBackdrop offset={Math.max(0, t) + 300} glow={1.2} />
      <div style={{ position: "absolute", left: x, width: w, top }}>
        <KineticText fontSize={size} fit={fit} start={2} stagger={4} align={layout.align} lines={parseMarkup(first)} style={{ filter: "drop-shadow(0 6px 30px rgba(4,8,33,0.8))" }} />
      </div>
      {second.length ? (
        <div style={{ position: "absolute", left: x, width: w, top: secondTop }}>
          <KineticText fontSize={size} fit={fit} start={40} stagger={4} align={layout.align} lines={parseMarkup(second)} style={{ filter: "drop-shadow(0 6px 30px rgba(4,8,33,0.8))" }} />
        </div>
      ) : null}

      <FitBox box={layout.visual} dw={DW} dh={DH}>
        <svg width={DW} height={DH} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          {Array.from({ length: LINES }).map((_, i) => {
            const spread = (i - (LINES - 1) / 2) * 34;
            const y0 = HUB.y + spread * chaos + (random(`y${i}`) - 0.5) * 120 * chaos;
            const x0 = 80;
            const dx = HUB.x - x0;
            const c1x = x0 + dx * 0.33 + (random(`a${i}`) - 0.5) * 520 * chaos;
            const c1y = y0 + (random(`b${i}`) - 0.5) * 900 * chaos;
            const c2x = HUB.x - dx * 0.33 + (random(`c${i}`) - 0.5) * 520 * chaos;
            const c2y = HUB.y + (random(`d${i}`) - 0.5) * 900 * chaos;
            return (
              <path
                key={i}
                d={`M ${x0} ${y0} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${HUB.x} ${HUB.y}`}
                fill="none"
                stroke={simplify > 0.85 ? COLORS.cyan : i % 2 ? COLORS.slate : COLORS.sky}
                strokeOpacity={lerp(0.5, 0.9, simplify)}
                strokeWidth={lerp(3, 6, simplify)}
                strokeLinecap="round"
                opacity={progress(t, 2 + i * 0.6, 10)}
              />
            );
          })}
          {TARGETS.map((tg, i) => {
            const p = progress(t, 70 + i * 3, 18, EASE_OUT);
            return (
              <g key={i}>
                <path
                  d={`M ${HUB.x} ${HUB.y} C ${HUB.x + 190} ${HUB.y}, ${tg.x - 190} ${tg.y}, ${tg.x} ${tg.y}`}
                  fill="none"
                  stroke={COLORS.cyan}
                  strokeWidth={6}
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1 - p}
                  style={{ filter: "drop-shadow(0 0 8px rgba(34,211,238,0.8))" }}
                />
                <circle cx={tg.x} cy={tg.y} r={30 * p} fill={COLORS.navy900} stroke={COLORS.cyan} strokeWidth={5} />
                <circle cx={tg.x} cy={tg.y} r={11 * p} fill={COLORS.white} />
              </g>
            );
          })}
          <circle cx={HUB.x} cy={HUB.y} r={(54 + pulse * 6) * hubIn} fill="rgba(34,211,238,0.18)" />
          <circle cx={HUB.x} cy={HUB.y} r={34 * hubIn} fill={COLORS.blue} stroke={COLORS.white} strokeWidth={5} />
        </svg>
      </FitBox>

      {scene.sub ? (
        <div
          style={{
            position: "absolute",
            left: layout.visual.x + layout.visual.w * 0.08,
            width: layout.visual.w * 0.84,
            top: layout.visual.y + layout.visual.h - 190 * layout.u,
            textAlign: "center",
            fontFamily: FONT_UI,
            fontSize: 46 * layout.u,
            fontWeight: 600,
            lineHeight: 1.3,
            color: COLORS.ice,
            opacity: progress(t, 86, 14),
            translate: `0px ${(1 - progress(t, 86, 18, EASE_OUT)) * 36}px`,
          }}
        >
          {scene.sub}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
